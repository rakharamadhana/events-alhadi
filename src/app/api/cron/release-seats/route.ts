// =============================================================================
// src/app/api/cron/release-seats/route.ts — Cron Job API Route Handler
// =============================================================================
// This endpoint is called by an external cPanel Cron Job every 5 minutes.
// It queries for all seats where `lockedUntil` has passed and reverts them
// to AVAILABLE, also marking their associated reservations as EXPIRED.
//
// Security: Protected by a shared secret in the `x-cron-secret` header.
//           The cPanel cron job is configured with:
//             curl -H "x-cron-secret: <SECRET>" https://yourdomain.com/api/cron/release-seats
// =============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  // -------------------------------------------------------------------------
  // 1. Verify the cron secret header
  // -------------------------------------------------------------------------
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("[release-seats] CRON_SECRET environment variable is not set.");
    return NextResponse.json(
      { error: "Server misconfiguration." },
      { status: 500 }
    );
  }

  if (cronSecret !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const now = new Date();

    // -----------------------------------------------------------------------
    // 2. Find all expired locked seats in a single query
    // -----------------------------------------------------------------------
    const expiredSeats = await prisma.seat.findMany({
      where: {
        status: "LOCKED",
        lockedUntil: {
          lte: now,
        },
      },
      select: {
        id: true,
        label: true,
        eventId: true,
        reservationId: true,
        version: true,
      },
    });

    if (expiredSeats.length === 0) {
      return NextResponse.json({
        released: 0,
        message: "No expired seat locks found.",
        timestamp: now.toISOString(),
      });
    }

    // -----------------------------------------------------------------------
    // 3. Collect unique reservation IDs to expire
    // -----------------------------------------------------------------------
    const reservationIds = [
      ...new Set(
        expiredSeats
          .map((s) => s.reservationId)
          .filter((id): id is string => id !== null)
      ),
    ];

    // -----------------------------------------------------------------------
    // 4. Run cleanup inside a transaction
    // -----------------------------------------------------------------------
    await prisma.$transaction(async (tx) => {
      // 4a. Revert all expired seats to AVAILABLE
      await tx.seat.updateMany({
        where: {
          id: { in: expiredSeats.map((s) => s.id) },
          status: "LOCKED",
          lockedUntil: { lte: now },
        },
        data: {
          status: "AVAILABLE",
          lockedUntil: null,
          lockedBy: null,
          reservationId: null,
        },
      });

      // 4b. Mark their parent reservations as EXPIRED
      //     Only transition PENDING_PAYMENT reservations (don't touch SUCCESS).
      if (reservationIds.length > 0) {
        await tx.reservation.updateMany({
          where: {
            id: { in: reservationIds },
            status: "PENDING_PAYMENT",
          },
          data: {
            status: "EXPIRED",
          },
        });
      }
    });

    // -----------------------------------------------------------------------
    // 5. Log and respond
    // -----------------------------------------------------------------------
    const eventSummary = expiredSeats.reduce<Record<string, string[]>>(
      (acc, seat) => {
        if (!acc[seat.eventId]) acc[seat.eventId] = [];
        acc[seat.eventId].push(seat.label);
        return acc;
      },
      {}
    );

    console.log(
      `[release-seats] Released ${expiredSeats.length} expired seat(s):`,
      JSON.stringify(eventSummary)
    );

    return NextResponse.json({
      released: expiredSeats.length,
      reservationsExpired: reservationIds.length,
      details: eventSummary,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[release-seats] Error during cleanup:", error);
    return NextResponse.json(
      { error: "Failed to release expired seats." },
      { status: 500 }
    );
  }
}
