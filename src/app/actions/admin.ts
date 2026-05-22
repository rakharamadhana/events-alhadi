"use server";

import { auth } from "@/auth";
import {
  isValidDiscountPercent,
  normalizeCouponCode,
} from "@/lib/coupon";
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
      data: { status: "APPROVED" },
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
      data: { status: "REJECTED" },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to reject user" };
  }
}

export async function createEvent(data: {
  title: string;
  titleZhTw?: string | null;
  description: string;
  descriptionZhTw?: string | null;
  venue: string;
  venueZhTw?: string | null;
  date: string;
  imageUrl?: string | null;
  isActive: boolean;
  currency?: string;
  blueprint?: string | null;
  bankName?: string;
  bankNameZhTw?: string | null;
  bankCode?: string;
  bankAccount?: string;
  bankAccountHolder?: string;
  couponCode?: string;
  couponDiscountPercent?: number;
}) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const coupon = parseCouponFields(
      data.couponCode,
      data.couponDiscountPercent,
    );

    const newEvent = await prisma.event.create({
      data: {
        title: data.title,
        titleZhTw: data.titleZhTw?.trim() || null,
        description: data.description,
        descriptionZhTw: data.descriptionZhTw?.trim() || null,
        venue: data.venue,
        venueZhTw: data.venueZhTw?.trim() || null,
        date: new Date(data.date),
        imageUrl: data.imageUrl || null,
        isActive: data.isActive,
        currency: data.currency || "$",
        bankName: data.bankName || "Global Tech Bank",
        bankNameZhTw: data.bankNameZhTw?.trim() || "環球科技銀行",
        bankCode: data.bankCode || "",
        bankAccount: data.bankAccount || "1029-4837-9912",
        bankAccountHolder: data.bankAccountHolder?.trim() || "Al-Hadi TIECC",
        couponCode: coupon.couponCode,
        couponDiscountPercent: coupon.couponDiscountPercent,
      },
    });

    if (data.blueprint && data.blueprint.trim().length > 0) {
      await generateSeatsFromBlueprint(newEvent.id, data.blueprint);
    } else {
      // Default starting seating grid
      await generateSeatsFromBlueprint(newEvent.id, "Row A: [A-1] [A-2] [A-3] [A-4]");
    }

    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true, eventId: newEvent.id };
  } catch (error) {
    console.error("Failed to create event:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create new event";
    return { success: false, error: message };
  }
}

function parseCouponFields(
  code: string | undefined,
  percent: number | undefined,
): { couponCode: string | null; couponDiscountPercent: number | null } {
  const trimmed = code?.trim() || "";
  if (!trimmed) {
    return { couponCode: null, couponDiscountPercent: null };
  }

  if (percent == null || !isValidDiscountPercent(percent)) {
    throw new Error(
      "Coupon discount must be a whole number from 1 to 100 when a code is set.",
    );
  }

  return {
    couponCode: normalizeCouponCode(trimmed),
    couponDiscountPercent: percent,
  };
}

function parseEventDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatUpdateEventError(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as { code?: string; meta?: { column?: string } };
    if (prismaError.code === "P2022") {
      return "Database schema is out of date. Run: npx prisma db push";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Failed to update event details";
}

export async function updateEvent(
  eventId: string,
  data: {
    title: string;
    titleZhTw?: string | null;
    description: string;
    descriptionZhTw?: string | null;
    venue: string;
    venueZhTw?: string | null;
    date: string;
    imageUrl?: string | null;
    isActive: boolean;
    currency?: string;
    bankName?: string;
    bankNameZhTw?: string | null;
    bankCode?: string;
    bankAccount?: string;
    bankAccountHolder?: string;
    couponCode?: string;
    couponDiscountPercent?: number;
  },
) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const parsedDate = parseEventDate(data.date);
  if (!parsedDate) {
    return { success: false, error: "Invalid event date. Please check the date field." };
  }

  try {
    const coupon = parseCouponFields(
      data.couponCode,
      data.couponDiscountPercent,
    );

    await prisma.event.update({
      where: { id: eventId },
      data: {
        title: data.title.trim(),
        titleZhTw: data.titleZhTw?.trim() || null,
        description: data.description,
        descriptionZhTw: data.descriptionZhTw?.trim() || null,
        venue: data.venue.trim(),
        venueZhTw: data.venueZhTw?.trim() || null,
        date: parsedDate,
        imageUrl: data.imageUrl || null,
        isActive: data.isActive,
        currency: data.currency || "$",
        bankName: data.bankName?.trim() || "Global Tech Bank",
        bankNameZhTw: data.bankNameZhTw?.trim() || "環球科技銀行",
        bankCode: data.bankCode?.trim() || "",
        bankAccount: data.bankAccount?.trim() || "1029-4837-9912",
        bankAccountHolder:
          data.bankAccountHolder?.trim() || "Al-Hadi TIECC",
        couponCode: coupon.couponCode,
        couponDiscountPercent: coupon.couponDiscountPercent,
      },
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to update event:", error);
    return { success: false, error: formatUpdateEventError(error) };
  }
}

export async function updateSeatPricing(
  eventId: string,
  rowPricing: Record<string, number>,
) {
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
        }),
      ),
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

export async function generateSeatsFromBlueprint(
  eventId: string,
  blueprint: string,
) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const lines = blueprint
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
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
        where: { eventId },
      });

      // 2. Delete all existing seats for this event
      await tx.seat.deleteMany({
        where: { eventId },
      });

      // 3. Batch create new seats
      await tx.seat.createMany({
        data: seatsToCreate,
      });
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/");
    return { success: true, count: seatsToCreate.length };
  } catch (error) {
    console.error("Failed to generate seats from blueprint:", error);
    return {
      success: false,
      error: "Failed to generate seats from blueprint.",
    };
  }
}

export async function updateSeatPositions(
  eventId: string,
  seatUpdates: Array<{
    id: string;
    row: string;
    number: number;
    label: string;
  }>,
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
        }),
      ),
    );

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update seat positions:", error);
    return {
      success: false,
      error: "Failed to update seat positions in database.",
    };
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
      return {
        success: false,
        error: "Cannot delete a seat that has already been purchased/sold.",
      };
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
  seatData: { row: string; label: string; price: number },
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

    const maxNumber = existingSeats.reduce(
      (max, s) => Math.max(max, s.number),
      0,
    );
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
    return {
      success: false,
      error: "Failed to create seat. Check if label is unique.",
    };
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
      return {
        success: false,
        error: "Cannot hold a seat that is locked or sold.",
      };
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

export async function deleteEvent(eventId: string) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.event.delete({
      where: { id: eventId },
    });

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete event:", error);
    return { success: false, error: "Failed to delete event." };
  }
}

export async function createCoupon(
  eventId: string,
  data: {
    code: string;
    discountPercent: number;
    maxUses: number;
    expiresAt: string;
  },
) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const normalized = normalizeCouponCode(data.code);
  if (!normalized) {
    return { success: false, error: "Coupon code cannot be empty" };
  }

  if (!isValidDiscountPercent(data.discountPercent)) {
    return { success: false, error: "Discount percent must be between 1 and 100" };
  }

  if (!Number.isInteger(data.maxUses) || data.maxUses < 1) {
    return { success: false, error: "Max uses must be a positive integer" };
  }

  const parsedExpiry = new Date(data.expiresAt);
  if (isNaN(parsedExpiry.getTime())) {
    return { success: false, error: "Invalid expiration date" };
  }

  try {
    const coupon = await prisma.coupon.create({
      data: {
        eventId,
        code: normalized,
        discountPercent: data.discountPercent,
        maxUses: data.maxUses,
        expiresAt: parsedExpiry,
      },
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/admin");
    return { success: true, coupon };
  } catch (error: any) {
    console.error("Failed to create coupon:", error);
    if (error.code === "P2002") {
      return { success: false, error: "A coupon with this code already exists for this event." };
    }
    return { success: false, error: "Failed to create coupon." };
  }
}

export async function deleteCoupon(eventId: string, couponId: string) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.coupon.delete({
      where: { id: couponId, eventId },
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete coupon:", error);
    return { success: false, error: "Failed to delete coupon." };
  }
}

export async function createSponsor(
  eventId: string,
  data: {
    name: string;
    logoUrl: string;
    tier: "PLATINUM" | "GOLD" | "SILVER" | "BRONZE";
  },
) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const name = data.name.trim();
  const logoUrl = data.logoUrl.trim();
  const tier = data.tier;

  if (!name) {
    return { success: false, error: "Sponsor name cannot be empty" };
  }

  if (!tier || !["PLATINUM", "GOLD", "SILVER", "BRONZE"].includes(tier)) {
    return { success: false, error: "Invalid sponsor tier" };
  }

  try {
    const sponsor = await prisma.sponsor.create({
      data: {
        eventId,
        name,
        logoUrl,
        tier,
      },
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true, sponsor };
  } catch (error) {
    console.error("Failed to create sponsor:", error);
    return { success: false, error: "Failed to create sponsor." };
  }
}

export async function deleteSponsor(eventId: string, sponsorId: string) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.sponsor.delete({
      where: { id: sponsorId, eventId },
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete sponsor:", error);
    return { success: false, error: "Failed to delete sponsor." };
  }
}


