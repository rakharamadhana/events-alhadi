import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";
import { getEventCountdown } from "@/lib/eventCountdown";
import { getI18n } from "@/lib/i18n";
import { formatBankRefForTransfer } from "@/lib/bankRef";
import { formatSeatLabelsForDisplay } from "@/lib/seatLabel";
import { localizeEvent } from "@/lib/i18n.shared";
import {
  CalendarIcon,
  MapPinIcon,
  UserCircleIcon,
  TicketIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

export const metadata: Metadata = {
  title: {
    absolute: "Al-Hadi TIECC - Events | Dashboard",
  },
};

const TIER_ORDER = {
  PLATINUM: 0,
  GOLD: 1,
  SILVER: 2,
  BRONZE: 3,
};

export default async function Dashboard() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const { locale, t } = await getI18n();
  const seatLabelFormat = {
    rowSeat: t.common.seatRowSeatFormat,
    wheelchairRowSeat: t.common.seatWheelchairRowSeatFormat,
  };

  const [events, reservations] = await Promise.all([
    prisma.event.findMany({
      where: isAdmin ? {} : { isActive: true },
      include: {
        seats: {
          select: {
            status: true,
          },
        },
        sponsors: true,
      },
      orderBy: { date: "asc" },
    }),
    session
      ? prisma.reservation.findMany({
          where: {
            userId: session.user.id,
            status: {
              in: ["PENDING_PAYMENT", "SUCCESS", "REFUND_REQUESTED"],
            },
          },
          include: {
            event: true,
            seats: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const dateLocale = locale === "zh-TW" ? "zh-TW" : undefined;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* My Reservations Section */}
        {reservations.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <TicketIcon className="h-6 w-6 text-emerald-400 mr-2" />
              {t.dashboard.myReservations}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reservations.map((res) => {
                const isPending = res.status === "PENDING_PAYMENT";
                const isSuccess = res.status === "SUCCESS";
                const isRefundRequested = res.status === "REFUND_REQUESTED";
                const isRefunded = res.status === "REFUNDED";
                const isExpired =
                  res.status === "EXPIRED" ||
                  res.status === "CANCELLED" ||
                  res.status === "REFUNDED";
                const localizedEvent = localizeEvent(res.event, locale);

                return (
                  <div
                    key={res.id}
                    className={`bg-gray-800 rounded-2xl border p-6 flex flex-col justify-between transition-all duration-300
                      ${
                        isPending
                          ? "border-amber-500/30 hover:border-amber-500/50 shadow-lg shadow-amber-500/5"
                          : isSuccess
                            ? "border-emerald-500/30 hover:border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                            : isRefundRequested
                              ? "border-sky-500/30 hover:border-sky-500/50 shadow-lg shadow-sky-500/5"
                              : "border-gray-700 hover:border-gray-600"
                      }`}
                  >
                    <div>
                      {/* Event Header & Status */}
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <h3 className="font-bold text-lg text-white line-clamp-1">
                          {localizedEvent.title}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0
                          ${
                            isPending
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : isSuccess
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : isRefundRequested
                                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                  : isRefunded
                                    ? "bg-gray-500/10 text-gray-300 border border-gray-500/20"
                                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {isPending && (
                            <ClockIcon className="h-3.5 w-3.5 mr-1" />
                          )}
                          {isSuccess && (
                            <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />
                          )}
                          {isExpired && (
                            <XCircleIcon className="h-3.5 w-3.5 mr-1" />
                          )}

                          {res.status === "PENDING_PAYMENT" &&
                            t.dashboard.pendingPayment}
                          {res.status === "SUCCESS" && t.dashboard.activeTicket}
                          {res.status === "REFUND_REQUESTED" &&
                            t.dashboard.refundRequested}
                          {res.status === "REFUNDED" && t.dashboard.refunded}
                          {res.status === "EXPIRED" && t.dashboard.expired}
                          {res.status === "CANCELLED" && t.dashboard.cancelled}
                        </span>
                      </div>

                      {/* Event details summary */}
                      <div className="space-y-1.5 mb-4 text-sm text-gray-400">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                          <span>
                            {new Date(res.event.date).toLocaleDateString(
                              dateLocale,
                            )}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="truncate">
                            {localizedEvent.venue}
                          </span>
                        </div>
                      </div>

                      {/* Seats & Cost info */}
                      <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50 mb-6 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">
                            {t.dashboard.seats} ({res.seatCount})
                          </span>
                          <span className="font-semibold text-white font-mono">
                            {formatSeatLabelsForDisplay(
                              res.seats.map((s) => s.label),
                              seatLabelFormat,
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-t border-gray-800 pt-2">
                          <span className="text-gray-400">
                            {t.dashboard.totalPrice}
                          </span>
                          <span className="font-bold text-emerald-400">
                            {res.event.currency}
                            {Number(res.totalAmount).toFixed(2)}
                          </span>
                        </div>
                        {isPending && res.bankRef && (
                          <div className="flex justify-between items-center text-sm border-t border-gray-800 pt-2">
                            <span className="text-gray-400">
                              {t.dashboard.bankRef}
                            </span>
                            <span className="font-bold text-amber-400 font-mono tracking-wider">
                              {formatBankRefForTransfer(res.bankRef)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      {/* Action buttons */}
                      {isPending ? (
                        <div className="space-y-2">
                          <div className="flex items-center text-xs text-amber-400 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-2 shrink-0" />
                            <span>
                              {t.dashboard.expires}:{" "}
                              {new Date(res.expiresAt).toLocaleTimeString(
                                dateLocale,
                                { hour: "2-digit", minute: "2-digit" },
                              )}{" "}
                              (
                              {new Date(res.expiresAt).toLocaleDateString(
                                dateLocale,
                              )}
                              )
                            </span>
                          </div>
                          <Link
                            href={`/reservations/${res.id}`}
                            className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-lg text-gray-900 bg-amber-500 hover:bg-amber-400 shadow-md hover:shadow-amber-500/20 transition-all"
                          >
                            <BanknotesIcon className="h-4 w-4 mr-2" />
                            {t.dashboard.completePayment}
                          </Link>
                        </div>
                      ) : (
                        <Link
                          href={`/reservations/${res.id}`}
                          className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-lg text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 transition-all"
                        >
                          {t.dashboard.viewDetails}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {t.dashboard.upcomingEvents}
          </h1>
          <p className="mt-2 text-base sm:text-lg text-gray-400">
            {t.dashboard.upcomingEventsDescription}
          </p>
        </div>

        {events.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-10 text-center border border-gray-700">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-500" />
            <h3 className="mt-4 text-lg font-medium text-white">
              {t.dashboard.noActiveEvents}
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              {t.dashboard.noActiveEventsDescription}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const localizedEvent = localizeEvent(event, locale);
              const availableSeats = event.seats.filter(
                (seat) => seat.status === "AVAILABLE",
              ).length;
              const totalSeats = event.seats.length;
              const countdown = getEventCountdown(event.date);

              return (
                <div
                  key={event.id}
                  className="bg-gray-800 overflow-hidden rounded-2xl shadow-xl border border-gray-700 hover:border-emerald-500/50 transition-all duration-300 group flex flex-col"
                >
                  {event.imageUrl ? (
                    <div className="h-48 w-full bg-gray-700 overflow-hidden relative">
                      <img
                        src={event.imageUrl}
                        alt={localizedEvent.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-80" />

                      {/* Countdown badge (Top Left) */}
                      <span className="absolute left-3 top-3 rounded-full border border-emerald-400/30 bg-gray-950/80 px-3 py-1 text-xs font-bold text-emerald-300 backdrop-blur">
                        {countdown.hasStarted
                          ? t.dashboard.eventStarted
                          : locale === "en"
                            ? `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`
                            : `${countdown.days}${t.dashboard.days} ${countdown.hours}${t.dashboard.hours} ${countdown.minutes}${t.dashboard.minutes}`}
                      </span>

                      {isAdmin &&
                        (event.isActive ? (
                          <span className="absolute left-3 top-12 rounded-full border border-emerald-500/30 bg-emerald-950/80 px-3 py-1 text-xs font-bold text-emerald-400 backdrop-blur">
                            {t.dashboard.active}
                          </span>
                        ) : (
                          <span className="absolute left-3 top-12 rounded-full border border-amber-500/30 bg-amber-950/80 px-3 py-1 text-xs font-bold text-amber-400 backdrop-blur">
                            {t.dashboard.draft}
                          </span>
                        ))}
                      <span className="absolute right-3 top-3 rounded-full border border-emerald-400/30 bg-gray-950/80 px-3 py-1 text-xs font-bold text-emerald-300 backdrop-blur">
                        {availableSeats > 0
                          ? `${availableSeats} ${t.dashboard.seatsLeft}`
                          : t.dashboard.soldOut}
                      </span>
                    </div>
                  ) : (
                    <div className="h-48 w-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative overflow-hidden">
                      <CalendarIcon className="h-16 w-16 text-gray-600" />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-60" />

                      {/* Countdown badge (Top Left) */}
                      <span className="absolute left-3 top-3 rounded-full border border-emerald-400/30 bg-gray-950/80 px-3 py-1 text-xs font-bold text-emerald-300 backdrop-blur">
                        {countdown.hasStarted
                          ? t.dashboard.eventStarted
                          : locale === "en"
                            ? `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`
                            : `${countdown.days}${t.dashboard.days} ${countdown.hours}${t.dashboard.hours} ${countdown.minutes}${t.dashboard.minutes}`}
                      </span>

                      {isAdmin &&
                        (event.isActive ? (
                          <span className="absolute left-3 top-12 rounded-full border border-emerald-500/30 bg-emerald-950/80 px-3 py-1 text-xs font-bold text-emerald-400 backdrop-blur">
                            {t.dashboard.active}
                          </span>
                        ) : (
                          <span className="absolute left-3 top-12 rounded-full border border-amber-500/30 bg-amber-950/80 px-3 py-1 text-xs font-bold text-amber-400 backdrop-blur">
                            {t.dashboard.draft}
                          </span>
                        ))}
                      <span className="absolute right-3 top-3 rounded-full border border-emerald-400/30 bg-gray-950/80 px-3 py-1 text-xs font-bold text-emerald-300 backdrop-blur">
                        {availableSeats > 0
                          ? `${availableSeats} ${t.dashboard.seatsLeft}`
                          : t.dashboard.soldOut}
                      </span>
                    </div>
                  )}

                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {localizedEvent.title}
                    </h3>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center text-sm text-emerald-400">
                        <CalendarIcon className="flex-shrink-0 mr-2 h-4 w-4" />
                        {new Date(event.date).toLocaleDateString(dateLocale, {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                      <div className="flex items-center text-sm text-gray-400">
                        <MapPinIcon className="flex-shrink-0 mr-2 h-4 w-4" />
                        {localizedEvent.venue}
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm line-clamp-3 mb-6 flex-1">
                      {localizedEvent.description}
                    </p>

                    {/* Event Sponsors Showcase on Dashboard Card */}
                    {event.sponsors && event.sponsors.length > 0 && (
                      <div className="border-t border-gray-700/50 pt-3 mt-auto mb-4">
                        <p className="text-[9px] uppercase tracking-widest text-emerald-400 font-extrabold mb-2">
                          {t.common.sponsors || "Sponsors"}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {[...event.sponsors]
                            .sort((a, b) => {
                              const orderA = TIER_ORDER[a.tier as keyof typeof TIER_ORDER] ?? 99;
                              const orderB = TIER_ORDER[b.tier as keyof typeof TIER_ORDER] ?? 99;
                              return orderA - orderB;
                            })
                            .map((sp) => {
                              let heightClass = "h-5";
                              if (sp.tier === "PLATINUM") heightClass = "h-7";
                              else if (sp.tier === "GOLD") heightClass = "h-6.5";
                              else if (sp.tier === "SILVER") heightClass = "h-5.5";

                              return (
                                <div
                                  key={sp.id}
                                  title={`${sp.name} (${sp.tier})`}
                                  className="flex-shrink-0 bg-gray-900/50 p-1 rounded border border-gray-700/30 hover:border-emerald-500/20 transition-all flex items-center justify-center"
                                >
                                  {sp.logoUrl ? (
                                    <img
                                      src={sp.logoUrl}
                                      alt={sp.name}
                                      className={`${heightClass} max-w-[65px] object-contain filter brightness-90 hover:brightness-100 transition-all`}
                                    />
                                  ) : (
                                    <span className="text-[8px] font-bold text-gray-300 px-1">{sp.name}</span>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    <Link
                      href={`/events/${event.id}`}
                      className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-semibold rounded-lg text-gray-900 bg-emerald-500 hover:bg-emerald-400 shadow-md hover:shadow-emerald-500/20 transition-all"
                    >
                      {t.dashboard.selectSeats}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
