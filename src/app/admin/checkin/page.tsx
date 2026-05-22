import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CheckinClient from "./CheckinClient";
import { getI18n } from "@/lib/i18n";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Check-in Desk | Admin",
};

type SearchParams = Promise<{ eventId?: string }>;

export default async function CheckinPage(props: {
  searchParams: SearchParams;
}) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const events = await prisma.event.findMany({
    orderBy: { date: "asc" },
  });

  const searchParams = await props.searchParams;
  const selectedEventId = searchParams.eventId || events[0]?.id;

  let seats: any[] = [];
  if (selectedEventId) {
    seats = await prisma.seat.findMany({
      where: { eventId: selectedEventId },
      include: {
        reservation: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImageUrl: true,
                city: true,
                country: true,
                gender: true,
                birthYear: true,
              },
            },
          },
        },
      },
      orderBy: [
        { row: "asc" },
        { number: "asc" },
      ],
    });
  }

  const { t } = await getI18n();

  // Convert decimal price to number to avoid serializing issues in Next.js Server/Client transfer
  const serializedSeats = seats.map((seat) => ({
    ...seat,
    price: Number(seat.price),
    reservation: seat.reservation
      ? {
          ...seat.reservation,
          totalAmount: Number(seat.reservation.totalAmount),
        }
      : null,
  }));

  const serializedEvents = events.map((event) => ({
    id: event.id,
    title: event.title,
    titleZhTw: event.titleZhTw,
    date: event.date.toISOString(),
    venue: event.venue,
    venueZhTw: event.venueZhTw,
    isActive: event.isActive,
  }));

  return (
    <CheckinClient
      events={serializedEvents}
      selectedEventId={selectedEventId || ""}
      initialSeats={serializedSeats}
      translations={t}
    />
  );
}
