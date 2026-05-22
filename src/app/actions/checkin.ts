"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function checkInParticipant(eventId: string, qrCodeData: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const query = qrCodeData.trim();
  if (!query) {
    return { success: false, error: "Input code cannot be empty." };
  }

  try {
    let seat = null;

    // 1. Try parsing as QR code (reservationId_seatId)
    if (query.includes("_")) {
      const parts = query.split("_");
      const reservationId = parts[0].trim();
      const seatId = parts[1].trim();

      seat = await prisma.seat.findFirst({
        where: {
          id: seatId,
          reservationId,
          eventId,
        },
        include: {
          reservation: {
            include: {
              user: true,
            },
          },
        },
      });
    }

    // 2. If not found, try by seat label (e.g. A1, B12)
    if (!seat) {
      seat = await prisma.seat.findFirst({
        where: {
          label: {
            equals: query,
            mode: "insensitive",
          },
          eventId,
        },
        include: {
          reservation: {
            include: {
              user: true,
            },
          },
        },
      });
    }

    // 3. If not found, try by seat ID directly
    if (!seat) {
      seat = await prisma.seat.findFirst({
        where: {
          id: query,
          eventId,
        },
        include: {
          reservation: {
            include: {
              user: true,
            },
          },
        },
      });
    }

    // 4. If not found, try by reservation ID directly (gets first seat in the reservation)
    if (!seat) {
      seat = await prisma.seat.findFirst({
        where: {
          reservationId: query,
          eventId,
        },
        include: {
          reservation: {
            include: {
              user: true,
            },
          },
        },
      });
    }

    if (!seat) {
      return { success: false, error: "No seat found matching this search or QR code." };
    }

    if (!seat.reservationId || !seat.reservation) {
      return { success: false, error: "This seat has not been reserved or booked." };
    }

    const reservation = seat.reservation;

    // Check reservation payment/status
    if (reservation.status === "PENDING_PAYMENT") {
      return { success: false, error: "Ticket is unpaid or pending validation!" };
    }

    if (
      reservation.status === "REFUNDED" ||
      reservation.status === "CANCELLED" ||
      reservation.status === "EXPIRED"
    ) {
      return { success: false, error: "Ticket is cancelled, expired, or refunded!" };
    }

    if (seat.isCheckedIn) {
      return {
        success: false,
        isAlreadyCheckedIn: true,
        seatLabel: seat.label,
        checkedInAt: seat.checkedInAt,
        attendeeName: reservation.user?.name || "Participant",
        attendeeEmail: reservation.user?.email || "",
      };
    }

    // Update check-in status
    const checkedInAt = new Date();
    await prisma.seat.update({
      where: { id: seat.id },
      data: {
        isCheckedIn: true,
        checkedInAt,
      },
    });

    revalidatePath("/admin/checkin");
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/reservations/${reservation.id}`);

    return {
      success: true,
      attendeeName: reservation.user?.name || "Participant",
      attendeeEmail: reservation.user?.email || "",
      seatLabel: seat.label,
      checkedInAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

export async function toggleSeatCheckIn(eventId: string, seatId: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const seat = await prisma.seat.findUnique({
      where: { id: seatId },
      include: {
        reservation: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!seat) {
      return { success: false, error: "Seat not found." };
    }

    if (seat.eventId !== eventId) {
      return { success: false, error: "Seat does not belong to this event." };
    }

    if (!seat.reservationId || !seat.reservation) {
      return { success: false, error: "Seat is not reserved or booked." };
    }

    if (seat.reservation.status === "PENDING_PAYMENT") {
      return { success: false, error: "Ticket is unpaid or pending validation!" };
    }

    const nextCheckedInState = !seat.isCheckedIn;
    const checkedInAt = nextCheckedInState ? new Date() : null;

    await prisma.seat.update({
      where: { id: seatId },
      data: {
        isCheckedIn: nextCheckedInState,
        checkedInAt,
      },
    });

    revalidatePath("/admin/checkin");
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/reservations/${seat.reservationId}`);

    return {
      success: true,
      isCheckedIn: nextCheckedInState,
      checkedInAt,
      attendeeName: seat.reservation.user?.name || "Participant",
      seatLabel: seat.label,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}
