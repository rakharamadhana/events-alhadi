"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function approveUser(userId: string) {
  const session = await auth();
  
  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { status: "APPROVED" }
    });
    
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to approve user" };
  }
}

export async function rejectUser(userId: string) {
  const session = await auth();
  
  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { status: "REJECTED" }
    });
    
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to reject user" };
  }
}

export async function updateEvent(
  eventId: string,
  data: {
    title: string;
    description: string;
    venue: string;
    date: string;
    imageUrl?: string | null;
    isActive: boolean;
    currency?: string;
  }
) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.event.update({
      where: { id: eventId },
      data: {
        title: data.title,
        description: data.description,
        venue: data.venue,
        date: new Date(data.date),
        imageUrl: data.imageUrl || null,
        isActive: data.isActive,
        currency: data.currency || "$",
      },
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to update event:", error);
    return { success: false, error: "Failed to update event details" };
  }
}

export async function updateSeatPricing(eventId: string, rowPricing: Record<string, number>) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.$transaction(
      Object.entries(rowPricing).map(([row, price]) =>
        prisma.seat.updateMany({
          where: { eventId, row },
          data: { price },
        })
      )
    );

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update seat pricing:", error);
    return { success: false, error: "Failed to update seat pricing" };
  }
}

export async function resetEventSeats(eventId: string) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete all reservations for this event
      await tx.reservation.deleteMany({
        where: { eventId },
      });

      // 2. Reset all seats back to AVAILABLE
      await tx.seat.updateMany({
        where: { eventId },
        data: {
          status: "AVAILABLE",
          lockedUntil: null,
          lockedBy: null,
          reservationId: null,
          version: 0,
        },
      });
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to reset event seats:", error);
    return { success: false, error: "Failed to reset seats" };
  }
}

export async function generateSeatsFromBlueprint(eventId: string, blueprint: string) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const lines = blueprint.split("\n").map(line => line.trim()).filter(line => line.length > 0);
    const seatsToCreate: Array<{
      eventId: string;
      label: string;
      row: string;
      number: number;
      price: number;
      status: "AVAILABLE";
    }> = [];

    lines.forEach((line, rowIndex) => {
      let rowLabel = "";
      let tokensString = line;
      const colonIndex = line.indexOf(":");
      
      if (colonIndex !== -1) {
        rowLabel = line.substring(0, colonIndex).trim();
        tokensString = line.substring(colonIndex + 1).trim();
      } else {
        rowLabel = String(rowIndex + 1);
      }

      // Regex matches: [label] or [label,price] or _ (gap) or ♿ (wheelchair)
      const tokenRegex = /\[([^\]]+)\]|(_)|(♿)/g;
      let match;
      let colIndex = 1;

      while ((match = tokenRegex.exec(tokensString)) !== null) {
        if (match[2] === "_") {
          // Gap! Move to next column index
          colIndex++;
        } else if (match[3] === "♿") {
          // Accessible seat shortcut
          seatsToCreate.push({
            eventId,
            label: `♿-${rowLabel}-${colIndex}`,
            row: rowLabel,
            number: colIndex,
            price: 100, // default price
            status: "AVAILABLE",
          });
          colIndex++;
        } else if (match[1]) {
          const parts = match[1].split(",");
          const seatLabel = parts[0].trim();
          const price = parts[1] ? parseFloat(parts[1]) : 100;

          seatsToCreate.push({
            eventId,
            label: seatLabel,
            row: rowLabel,
            number: colIndex,
            price,
            status: "AVAILABLE",
          });
          colIndex++;
        }
      }
    });

    if (seatsToCreate.length === 0) {
      return { success: false, error: "No valid seats found in blueprint." };
    }

    // Run transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete all reservations for this event
      await tx.reservation.deleteMany({
        where: { eventId }
      });

      // 2. Delete all existing seats for this event
      await tx.seat.deleteMany({
        where: { eventId }
      });

      // 3. Batch create new seats
      await tx.seat.createMany({
        data: seatsToCreate
      });
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/");
    return { success: true, count: seatsToCreate.length };
  } catch (error) {
    console.error("Failed to generate seats from blueprint:", error);
    return { success: false, error: "Failed to generate seats from blueprint." };
  }
}

export async function updateSeatPositions(
  eventId: string,
  seatUpdates: Array<{ id: string; row: string; number: number; label: string }>
) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Pre-check: verify all seat IDs actually exist in the database.
    // This prevents the cryptic P2025 "record not found" error when the
    // designer was opened before a db:seed / blueprint regeneration.
    const idsToUpdate = seatUpdates.map((u) => u.id);
    const existingSeats = await prisma.seat.findMany({
      where: { id: { in: idsToUpdate }, eventId },
      select: { id: true },
    });

    const existingIds = new Set(existingSeats.map((s) => s.id));
    const missingIds = idsToUpdate.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      return {
        success: false,
        error: `${missingIds.length} seat(s) no longer exist in the database (they may have been regenerated). Please refresh the page and try again.`,
      };
    }

    await prisma.$transaction(
      seatUpdates.map((update) =>
        prisma.seat.update({
          where: { id: update.id, eventId },
          data: {
            row: update.row,
            number: update.number,
            label: update.label,
            version: { increment: 1 },
          },
        })
      )
    );

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update seat positions:", error);
    return { success: false, error: "Failed to update seat positions in database." };
  }
}

export async function deleteSeat(eventId: string, seatId: string) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const seat = await prisma.seat.findUnique({
      where: { id: seatId },
    });

    if (!seat) {
      return { success: false, error: "Seat not found." };
    }

    if (seat.status === "SOLD") {
      return { success: false, error: "Cannot delete a seat that has already been purchased/sold." };
    }

    await prisma.seat.delete({
      where: { id: seatId },
    });

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete seat:", error);
    return { success: false, error: "Failed to delete seat." };
  }
}

export async function createSeat(
  eventId: string,
  seatData: { row: string; label: string; price: number }
) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const existingSeats = await prisma.seat.findMany({
      where: { eventId, row: seatData.row },
      select: { number: true },
    });

    const maxNumber = existingSeats.reduce((max, s) => Math.max(max, s.number), 0);
    const nextNumber = maxNumber + 1;

    const newSeat = await prisma.seat.create({
      data: {
        eventId,
        row: seatData.row,
        number: nextNumber,
        label: seatData.label,
        price: seatData.price,
        status: "AVAILABLE",
      },
    });

    revalidatePath(`/events/${eventId}`);
    return { success: true, seat: newSeat };
  } catch (error) {
    console.error("Failed to create seat:", error);
    return { success: false, error: "Failed to create seat. Check if label is unique." };
  }
}

export async function toggleSeatHold(eventId: string, seatId: string) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const seat = await prisma.seat.findUnique({
      where: { id: seatId },
    });

    if (!seat || seat.eventId !== eventId) {
      return { success: false, error: "Seat not found." };
    }

    if (seat.status === "LOCKED" || seat.status === "SOLD") {
      return { success: false, error: "Cannot hold a seat that is locked or sold." };
    }

    const newStatus = seat.status === "HELD" ? "AVAILABLE" : "HELD";

    await prisma.seat.update({
      where: { id: seatId },
      data: {
        status: newStatus,
        version: { increment: 1 },
      },
    });

    revalidatePath(`/events/${eventId}`);
    return { success: true, newStatus };
  } catch (error) {
    console.error("Failed to toggle seat hold:", error);
    return { success: false, error: "Failed to toggle seat hold status." };
  }
}
