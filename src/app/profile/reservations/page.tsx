import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { localizeEvent } from "@/lib/i18n.shared";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeftIcon, TicketIcon } from "@heroicons/react/24/outline";
import ProfileReservationsClient from "./ProfileReservationsClient";

export const metadata: Metadata = {
  title: "My Reservations",
};

export default async function ProfileReservationsPage() {
  const session = await auth();
  const { locale, t } = await getI18n();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const reservations = await prisma.reservation.findMany({
    where: { userId: session.user.id },
    include: {
      event: true,
      seats: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const dateLocale = locale === "zh-TW" ? "zh-TW" : undefined;
  const serializedReservations = reservations.map((reservation) => {
    const localizedEvent = localizeEvent(reservation.event, locale);

    return {
      id: reservation.id,
      status: reservation.status,
      seatCount: reservation.seatCount,
      totalAmount: reservation.totalAmount.toString(),
      bankRef: reservation.bankRef ?? "",
      event: {
        title: localizedEvent.title,
        venue: localizedEvent.venue,
        date: reservation.event.date.toISOString(),
        currency: reservation.event.currency,
      },
      seats: reservation.seats.map((seat) => ({
        label: seat.label,
      })),
    };
  });

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8 text-gray-100 sm:px-6 lg:px-8 lg:py-12">
      <main className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          {t.profile.backToDashboard}
        </Link>

        <div className="mb-6">
          <h1 className="flex items-center text-3xl font-black tracking-tight text-white">
            <TicketIcon className="mr-3 h-7 w-7 text-emerald-400" />
            {t.dashboard.myReservations}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {t.profile.reservationsDescription}
          </p>
        </div>

        <ProfileReservationsClient
          reservations={serializedReservations}
          dateLocale={dateLocale}
          labels={{
            searchReservations: t.profile.searchReservations,
            filterAll: t.profile.filterAll,
            noReservations: t.profile.noReservations,
            noReservationsMatch: t.profile.noReservationsMatch,
            showingReservations: t.profile.showingReservations,
            seats: t.dashboard.seats,
            totalPrice: t.dashboard.totalPrice,
            viewDetails: t.dashboard.viewDetails,
            pendingPayment: t.dashboard.pendingPayment,
            activeTicket: t.dashboard.activeTicket,
            refundRequested: t.dashboard.refundRequested,
            refunded: t.dashboard.refunded,
            expired: t.dashboard.expired,
            cancelled: t.dashboard.cancelled,
            seatLabelFormat: {
              rowSeat: t.common.seatRowSeatFormat,
              wheelchairRowSeat: t.common.seatWheelchairRowSeatFormat,
            },
          }}
        />
      </main>
    </div>
  );
}
