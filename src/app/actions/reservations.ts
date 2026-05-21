// =============================================================================
// src/app/actions/reservations.ts — Server Actions for Seat Reservation Flow
// =============================================================================
// Contains two atomic operations:
//
//   reserveSeats(eventId, seatIds)
//     → Locks the requested seats for 8 hours using optimistic concurrency.
//     → Creates a PENDING_PAYMENT reservation with a unique bank reference.
//
//   approvePayment(reservationId)
//     → Admin-only. Runs an isolated transaction that marks the reservation
//       as SUCCESS, flips seats to SOLD, and clears the lockedUntil timer.
// =============================================================================

"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { nanoid } from "@/lib/nanoid";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const LOCK_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

// ---------------------------------------------------------------------------
// reserveSeats — Lock seats for an approved user
// ---------------------------------------------------------------------------
export async function reserveSeats(eventId: string, seatIds: string[]) {
  // 1. Authenticate
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to reserve seats." };
  }

  if (session.user.status !== "APPROVED") {
    return {
      success: false,
      error: "Your account must be approved before you can reserve seats.",
    };
  }

  if (!seatIds.length) {
    return { success: false, error: "Please select at least one seat." };
  }

  try {
    // 2. Run everything inside a serializable transaction to prevent races.
    const result = await prisma.$transaction(async (tx) => {
      // ---------------------------------------------------------------
      // 2a. Fetch the requested seats and verify they are AVAILABLE.
      //     We also read each seat's `version` for optimistic locking.
      // ---------------------------------------------------------------
      const seats = await tx.seat.findMany({
        where: {
          id: { in: seatIds },
          eventId,
        },
      });

      if (seats.length !== seatIds.length) {
        throw new Error(
          `Some seats could not be found. Expected ${seatIds.length}, got ${seats.length}.`
        );
      }

      const unavailable = seats.filter((s) => s.status !== "AVAILABLE");
      if (unavailable.length > 0) {
        const labels = unavailable.map((s) => s.label).join(", ");
        throw new Error(
          `The following seats are no longer available: ${labels}`
        );
      }

      // ---------------------------------------------------------------
      // 2b. Calculate total price and expiration timestamp
      // ---------------------------------------------------------------
      const totalAmount = seats.reduce(
        (sum, s) => sum + Number(s.price),
        0
      );
      const now = new Date();
      const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);
      const bankRef = `EVT-${nanoid(10).toUpperCase()}`;

      // ---------------------------------------------------------------
      // 2c. Create the reservation record
      // ---------------------------------------------------------------
      const reservation = await tx.reservation.create({
        data: {
          userId: session.user.id,
          eventId,
          status: "PENDING_PAYMENT",
          totalAmount,
          seatCount: seats.length,
          expiresAt,
          bankRef,
        },
      });

      // ---------------------------------------------------------------
      // 2d. Lock each seat with optimistic concurrency control.
      //     The WHERE clause includes `version` so a concurrent write
      //     that already incremented it will cause this update to match
      //     zero rows — which we detect and throw on.
      // ---------------------------------------------------------------
      for (const seat of seats) {
        const updated = await tx.seat.updateMany({
          where: {
            id: seat.id,
            version: seat.version, // optimistic lock guard
          },
          data: {
            status: "LOCKED",
            lockedUntil: expiresAt,
            lockedBy: session.user.id,
            reservationId: reservation.id,
            version: { increment: 1 },
          },
        });

        if (updated.count === 0) {
          throw new Error(
            `Seat "${seat.label}" was modified by another request. Please try again.`
          );
        }
      }

      return reservation;
    });

    revalidatePath(`/events/${eventId}`);

    return {
      success: true,
      reservation: {
        id: result.id,
        bankRef: result.bankRef,
        totalAmount: Number(result.totalAmount),
        expiresAt: result.expiresAt.toISOString(),
        seatCount: result.seatCount,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// approvePayment — Admin-only: finalize reservation & mark seats as SOLD
// ---------------------------------------------------------------------------
export async function approvePayment(reservationId: string) {
  // 1. Authenticate & authorize — admin only
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in." };
  }

  if (session.user.role !== "ADMIN") {
    return { success: false, error: "Only administrators can approve payments." };
  }

  try {
    // 2. Run an isolated transaction
    await prisma.$transaction(async (tx) => {
      // ---------------------------------------------------------------
      // 2a. Fetch the reservation and validate its current state
      // ---------------------------------------------------------------
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { seats: true },
      });

      if (!reservation) {
        throw new Error("Reservation not found.");
      }

      if (reservation.status === "SUCCESS") {
        throw new Error("This reservation has already been approved.");
      }

      if (
        reservation.status === "EXPIRED" ||
        reservation.status === "CANCELLED"
      ) {
        throw new Error(
          `Cannot approve a reservation with status "${reservation.status}".`
        );
      }

      // ---------------------------------------------------------------
      // 2b. Mark reservation as SUCCESS
      // ---------------------------------------------------------------
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: "SUCCESS" },
      });

      // ---------------------------------------------------------------
      // 2c. Mark all associated seats as SOLD and clear the lock timer
      // ---------------------------------------------------------------
      for (const seat of reservation.seats) {
        await tx.seat.update({
          where: { id: seat.id },
          data: {
            status: "SOLD",
            lockedUntil: null,
            lockedBy: null,
            version: { increment: 1 },
          },
        });
      }
    });

    revalidatePath("/admin");
    revalidatePath("/admin/reservations");

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// uploadPaymentProof — Customers upload bank transfer receipt
// ---------------------------------------------------------------------------
export async function uploadPaymentProof(reservationId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to upload a payment proof." };
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      return { success: false, error: "Reservation not found." };
    }

    if (reservation.userId !== session.user.id && session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized to update this reservation." };
    }

    if (reservation.status !== "PENDING_PAYMENT") {
      return { success: false, error: "Payment proof can only be uploaded for pending reservations." };
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file was selected." };
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return { success: false, error: "File size exceeds 5MB limit." };
    }

    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type)) {
      return { success: false, error: "Only JPEG, PNG, and WEBP image files are allowed." };
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const extension = file.type.split("/")[1] || "jpg";
    const filename = `${reservationId}_${Date.now()}.${extension}`;
    const filePath = path.join(uploadsDir, filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/${filename}`;

    await prisma.reservation.update({
      where: { id: reservationId },
      data: { paymentProofUrl: relativeUrl },
    });

    revalidatePath(`/reservations/${reservationId}`);
    revalidatePath("/admin");

    return { success: true, paymentProofUrl: relativeUrl };
  } catch (error) {
    console.error("Payment proof upload failed:", error);
    const message = error instanceof Error ? error.message : "Failed to upload payment proof.";
    return { success: false, error: message };
  }
}
