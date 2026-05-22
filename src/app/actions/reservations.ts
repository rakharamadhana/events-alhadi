// =============================================================================
// src/app/actions/reservations.ts — Server Actions for Seat Reservation Flow
// =============================================================================
// Contains two atomic operations:
//
//   reserveSeats(eventId, seatIds)
//     → Locks the requested seats for 2 hours using optimistic concurrency.
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
import {
  resolveEventCoupon,
  sumDiscountedSeatPrices,
  sumSeatPrices,
} from "@/lib/coupon";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const LOCK_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

// ---------------------------------------------------------------------------
// validateEventCoupon — Check coupon for an event (booking preview)
// ---------------------------------------------------------------------------
export async function validateEventCoupon(eventId: string, couponCode: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in." };
  }

  const normalized = couponCode.trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) {
    return { success: false, error: "Invalid coupon code." };
  }

  const coupon = await prisma.coupon.findUnique({
    where: {
      eventId_code: {
        eventId,
        code: normalized,
      },
    },
  });

  if (!coupon) {
    return { success: false, error: "Invalid coupon code for this event." };
  }

  const now = new Date();
  if (coupon.expiresAt < now) {
    return { success: false, error: "This coupon code has expired." };
  }

  const activeCount = await prisma.reservation.count({
    where: {
      couponId: coupon.id,
      status: {
        notIn: ["EXPIRED", "CANCELLED"],
      },
    },
  });

  if (activeCount >= coupon.maxUses) {
    return { success: false, error: "This coupon code has reached its usage limit." };
  }

  return {
    success: true,
    couponId: coupon.id,
    discountPercent: coupon.discountPercent,
    couponCode: coupon.code,
  };
}

// ---------------------------------------------------------------------------
// reserveSeats — Lock seats for an approved user
// ---------------------------------------------------------------------------
export async function reserveSeats(
  eventId: string,
  seatIds: string[],
  couponCode?: string,
) {
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
      const [seats, event] = await Promise.all([
        tx.seat.findMany({
          where: {
            id: { in: seatIds },
            eventId,
          },
        }),
        tx.event.findUnique({
          where: { id: eventId },
          select: {
            id: true,
          },
        }),
      ]);

      if (!event) {
        throw new Error("Event not found.");
      }

      if (seats.length !== seatIds.length) {
        throw new Error(
          `Some seats could not be found. Expected ${seatIds.length}, got ${seats.length}.`,
        );
      }

      const unavailable = seats.filter((s) => s.status !== "AVAILABLE");
      if (unavailable.length > 0) {
        const labels = unavailable.map((s) => s.label).join(", ");
        throw new Error(
          `The following seats are no longer available: ${labels}`,
        );
      }

      // ---------------------------------------------------------------
      // 2b. Calculate total price (optional coupon) and expiration
      // ---------------------------------------------------------------
      const seatPrices = seats.map((s) => Number(s.price));
      const subtotalAmount = sumSeatPrices(seatPrices);

      let appliedCoupon: {
        couponId: string;
        couponCode: string;
        couponDiscountPercent: number;
      } | null = null;

      if (couponCode?.trim()) {
        const normalized = couponCode.trim().toUpperCase().replace(/\s+/g, "");
        const coupon = await tx.coupon.findUnique({
          where: {
            eventId_code: {
              eventId,
              code: normalized,
            },
          },
        });

        if (!coupon) {
          throw new Error("Invalid coupon code for this event.");
        }

        const now = new Date();
        if (coupon.expiresAt < now) {
          throw new Error("This coupon code has expired.");
        }

        const activeCount = await tx.reservation.count({
          where: {
            couponId: coupon.id,
            status: {
              notIn: ["EXPIRED", "CANCELLED"],
            },
          },
        });

        if (activeCount >= coupon.maxUses) {
          throw new Error("This coupon code has reached its usage limit.");
        }

        appliedCoupon = {
          couponId: coupon.id,
          couponCode: coupon.code,
          couponDiscountPercent: coupon.discountPercent,
        };
      }

      const totalAmount = appliedCoupon
        ? sumDiscountedSeatPrices(
            seatPrices,
            appliedCoupon.couponDiscountPercent,
          )
        : subtotalAmount;

      const now = new Date();
      const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);
      const bankRef = `EVT${nanoid(10).toUpperCase()}`;

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
          couponCode: appliedCoupon?.couponCode ?? null,
          couponDiscountPercent:
            appliedCoupon?.couponDiscountPercent ?? null,
          couponId: appliedCoupon?.couponId ?? null,
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
            `Seat "${seat.label}" was modified by another request. Please try again.`,
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
        couponCode: result.couponCode,
        couponDiscountPercent: result.couponDiscountPercent,
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
    return {
      success: false,
      error: "Only administrators can approve payments.",
    };
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

      if (reservation.status !== "PENDING_PAYMENT") {
        throw new Error(
          `Cannot approve a reservation with status "${reservation.status}".`,
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
// ---------------------------------------------------------------------------
// cancelPendingReservation - Release locked seats before payment is approved
// ---------------------------------------------------------------------------
export async function cancelPendingReservation(reservationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: {
          seats: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      if (!reservation) {
        throw new Error("Reservation not found.");
      }

      if (
        reservation.userId !== session.user.id &&
        session.user.role !== "ADMIN"
      ) {
        throw new Error("Unauthorized to cancel this reservation.");
      }

      if (reservation.status !== "PENDING_PAYMENT") {
        throw new Error("Only pending reservations can be cancelled.");
      }

      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: "CANCELLED" },
      });

      await tx.seat.updateMany({
        where: {
          reservationId,
          status: "LOCKED",
        },
        data: {
          status: "AVAILABLE",
          lockedUntil: null,
          lockedBy: null,
          reservationId: null,
          version: { increment: 1 },
        },
      });

      return { eventId: reservation.eventId };
    });

    revalidatePath("/");
    revalidatePath(`/events/${result.eventId}`);
    revalidatePath(`/reservations/${reservationId}`);
    revalidatePath("/admin");

    return { success: true, eventId: result.eventId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

export async function requestRefund(reservationId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in." };
  }

  const trimmedReason = reason.trim();
  if (trimmedReason.length < 10) {
    return {
      success: false,
      error: "Please provide a refund reason with at least 10 characters.",
    };
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        userId: true,
        eventId: true,
        status: true,
      },
    });

    if (!reservation) {
      return { success: false, error: "Reservation not found." };
    }

    if (
      reservation.userId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return { success: false, error: "Unauthorized to request this refund." };
    }

    if (reservation.status !== "SUCCESS") {
      return {
        success: false,
        error: "Refunds can only be requested for confirmed paid tickets.",
      };
    }

    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: "REFUND_REQUESTED",
        refundReason: trimmedReason,
        refundRequestedAt: new Date(),
        refundReviewedAt: null,
        refundReviewNote: null,
      },
    });

    revalidatePath(`/reservations/${reservationId}`);
    revalidatePath(`/events/${reservation.eventId}`);
    revalidatePath("/");
    revalidatePath("/admin");

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

export async function approveRefund(reservationId: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return {
      success: false,
      error: "Only administrators can approve refunds.",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        throw new Error("Reservation not found.");
      }

      if (reservation.status !== "REFUND_REQUESTED") {
        throw new Error("Only refund-requested reservations can be refunded.");
      }

      await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: "REFUNDED",
          refundReviewedAt: new Date(),
        },
      });

      await tx.seat.updateMany({
        where: {
          reservationId,
          status: "SOLD",
        },
        data: {
          status: "AVAILABLE",
          lockedUntil: null,
          lockedBy: null,
          reservationId: null,
          version: { increment: 1 },
        },
      });

      return { eventId: reservation.eventId };
    });

    revalidatePath("/");
    revalidatePath(`/events/${result.eventId}`);
    revalidatePath(`/reservations/${reservationId}`);
    revalidatePath("/admin");

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

export async function rejectRefund(reservationId: string, reviewNote: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Only administrators can reject refunds." };
  }

  const trimmedNote = reviewNote.trim();
  if (trimmedNote.length < 5) {
    return {
      success: false,
      error: "Please provide a rejection note with at least 5 characters.",
    };
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        eventId: true,
        status: true,
      },
    });

    if (!reservation) {
      return { success: false, error: "Reservation not found." };
    }

    if (reservation.status !== "REFUND_REQUESTED") {
      return {
        success: false,
        error: "Only refund-requested reservations can be rejected.",
      };
    }

    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: "SUCCESS",
        refundReviewedAt: new Date(),
        refundReviewNote: trimmedNote,
      },
    });

    revalidatePath(`/reservations/${reservationId}`);
    revalidatePath(`/events/${reservation.eventId}`);
    revalidatePath("/");
    revalidatePath("/admin");

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

export async function uploadPaymentProof(
  reservationId: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be signed in to upload a payment proof.",
    };
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      return { success: false, error: "Reservation not found." };
    }

    if (
      reservation.userId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return {
        success: false,
        error: "Unauthorized to update this reservation.",
      };
    }

    if (reservation.status !== "PENDING_PAYMENT") {
      return {
        success: false,
        error: "Payment proof can only be uploaded for pending reservations.",
      };
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file was selected." };
    }

    const MAX_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_SIZE) {
      return { success: false, error: "File size exceeds 1MB limit." };
    }

    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type)) {
      return {
        success: false,
        error: "Only JPEG, PNG, and WEBP image files are allowed.",
      };
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
    const message =
      error instanceof Error
        ? error.message
        : "Failed to upload payment proof.";
    return { success: false, error: message };
  }
}

export async function uploadRefundProof(
  reservationId: string,
  formData: FormData,
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return {
      success: false,
      error: "Only administrators can upload refund proof.",
    };
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        eventId: true,
        status: true,
      },
    });

    if (!reservation) {
      return { success: false, error: "Reservation not found." };
    }

    if (reservation.status !== "REFUNDED") {
      return {
        success: false,
        error: "Refund proof can only be uploaded after refund approval.",
      };
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file was selected." };
    }

    const MAX_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_SIZE) {
      return { success: false, error: "File size exceeds 1MB limit." };
    }

    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type)) {
      return {
        success: false,
        error: "Only JPEG, PNG, and WEBP image files are allowed.",
      };
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const extension = file.type.split("/")[1] || "jpg";
    const filename = `refund_${reservationId}_${Date.now()}.${extension}`;
    const filePath = path.join(uploadsDir, filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/${filename}`;

    await prisma.reservation.update({
      where: { id: reservationId },
      data: { refundProofUrl: relativeUrl },
    });

    revalidatePath(`/reservations/${reservationId}`);
    revalidatePath(`/events/${reservation.eventId}`);
    revalidatePath("/admin");

    return { success: true, refundProofUrl: relativeUrl };
  } catch (error) {
    console.error("Refund proof upload failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload refund proof.";
    return { success: false, error: message };
  }
}
