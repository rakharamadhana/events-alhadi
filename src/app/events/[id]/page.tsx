import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SeatSelectionClient from "./SeatSelectionClient";
import {
  CalendarIcon,
  MapPinIcon,
  ArrowLeftIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { auth } from "@/auth";
import { getEventCountdown } from "@/lib/eventCountdown";
import { getI18n, getLocale } from "@/lib/i18n";
import { localizeEvent } from "@/lib/i18n.shared";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

const TIER_ORDER = {
  PLATINUM: 0,
  GOLD: 1,
  SILVER: 2,
  BRONZE: 3,
};

type EventPageProps = { params: Promise<{ id: string }> };
type AdminReservation = Prisma.ReservationGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    seats: {
      select: {
        id: true;
        label: true;
      };
    };
  };
}>;

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = await getLocale();
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      title: true,
      titleZhTw: true,
      description: true,
      descriptionZhTw: true,
      venue: true,
      venueZhTw: true,
    },
  });

  if (!event) {
    return {
      title: locale === "zh-TW" ? "找不到活動" : "Event Not Found",
    };
  }

  const localizedEvent = localizeEvent(event, locale);

  return {
    title: localizedEvent.title,
    description: localizedEvent.description,
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { id: eventId } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const { locale, t } = await getI18n();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      seats: {
        orderBy: [{ row: "asc" }, { number: "asc" }],
      },
      sponsors: true,
    },
  });

  if (!event || (!event.isActive && !isAdmin)) {
    notFound();
  }

  const localizedEvent = localizeEvent(event, locale);
  const availableSeats = event.seats.filter(
    (seat) => seat.status === "AVAILABLE",
  ).length;
  const totalSeats = event.seats.length;
  const countdown = getEventCountdown(event.date);

  const couponCount = await prisma.coupon.count({
    where: { eventId },
  });
  const hasEventCoupon = couponCount > 0 || Boolean(event.couponCode && event.couponDiscountPercent);

  // Fetch reservations only if admin
  let reservations: AdminReservation[] = [];
  let coupons: any[] = [];
  if (isAdmin) {
    [reservations, coupons] = await Promise.all([
      prisma.reservation.findMany({
        where: { eventId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          seats: {
            select: {
              id: true,
              label: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.coupon.findMany({
        where: { eventId },
        orderBy: { createdAt: "desc" },
      }),
    ]);
  }

  // Convert Decimal prices to string for safe client serialization
  const serializedSeats = event.seats.map((seat) => ({
    ...seat,
    price: seat.price.toString(),
  }));


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            {t.eventDetails.backToEvents}
          </Link>
        </div>

        {/* Event Header */}
        <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden mb-8">
          <div className="md:flex">
            <div className="md:w-1/3 h-64 md:h-auto relative overflow-hidden bg-gray-950/20 min-h-[240px]">
              {event.imageUrl ? (
                <img
                  src={event.imageUrl}
                  alt={localizedEvent.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                  <CalendarIcon className="h-16 w-16 text-gray-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent pointer-events-none" />

              {/* Countdown badge (Top Left) */}
              <span className="absolute left-3 top-3 rounded-full border border-emerald-400/30 bg-gray-950/80 px-3 py-1 text-xs font-bold text-emerald-300 backdrop-blur">
                {countdown.hasStarted
                  ? t.dashboard.eventStarted
                  : locale === "en"
                    ? `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`
                    : `${countdown.days}${t.dashboard.days} ${countdown.hours}${t.dashboard.hours} ${countdown.minutes}${t.dashboard.minutes}`}
              </span>

              {/* Status Badge (Below Countdown) */}
              {isAdmin && (event.isActive ? (
                <span className="absolute left-3 top-12 rounded-full border border-emerald-500/30 bg-emerald-950/80 px-3 py-1 text-xs font-bold text-emerald-400 backdrop-blur">
                  {t.dashboard.active}
                </span>
              ) : (
                <span className="absolute left-3 top-12 rounded-full border border-amber-500/30 bg-amber-950/80 px-3 py-1 text-xs font-bold text-amber-400 backdrop-blur">
                  {t.dashboard.draft}
                </span>
              ))}

              {/* Seats Left badge (Top Right) */}
              <span className="absolute right-3 top-3 rounded-full border border-emerald-400/30 bg-gray-950/80 px-3 py-1 text-xs font-bold text-emerald-300 backdrop-blur">
                {availableSeats > 0
                  ? `${availableSeats} ${t.dashboard.seatsLeft}`
                  : t.dashboard.soldOut}
              </span>
            </div>

            <div className="p-5 sm:p-8 md:w-2/3 flex flex-col justify-center">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
                {localizedEvent.title}
              </h1>

              <div className="space-y-3 mb-6">
                <div className="flex items-center text-emerald-400">
                  <CalendarIcon className="flex-shrink-0 mr-3 h-5 w-5" />
                  <span className="text-gray-200">
                    {new Date(event.date).toLocaleDateString(locale === "zh-TW" ? "zh-TW" : "en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center text-emerald-400">
                  <MapPinIcon className="flex-shrink-0 mr-3 h-5 w-5" />
                  <span className="text-gray-200">{localizedEvent.venue}</span>
                </div>
              </div>

              <p className="text-gray-400 leading-relaxed">
                {localizedEvent.description}
              </p>

              {/* Event Sponsors Showcase on Event Detail Page */}
              {event.sponsors && event.sponsors.length > 0 && (
                <div className="border-t border-gray-700/50 pt-4 mt-6">
                  <p className="text-xs uppercase tracking-wider text-emerald-400 font-extrabold mb-3">
                    {t.common.sponsors || "Sponsors"}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {[...event.sponsors]
                      .sort((a, b) => {
                        const orderA = TIER_ORDER[a.tier as keyof typeof TIER_ORDER] ?? 99;
                        const orderB = TIER_ORDER[b.tier as keyof typeof TIER_ORDER] ?? 99;
                        return orderA - orderB;
                      })
                      .map((sp) => {
                        let heightClass = "h-6 sm:h-6";
                        let maxWClass = "max-w-[65px]";
                        if (sp.tier === "PLATINUM") {
                          heightClass = "h-9 sm:h-10";
                          maxWClass = "max-w-[110px]";
                        } else if (sp.tier === "GOLD") {
                          heightClass = "h-8 sm:h-8.5";
                          maxWClass = "max-w-[95px]";
                        } else if (sp.tier === "SILVER") {
                          heightClass = "h-7 sm:h-7.5";
                          maxWClass = "max-w-[80px]";
                        }

                        return (
                          <div
                            key={sp.id}
                            title={`${sp.name} (${sp.tier})`}
                            className="flex-shrink-0 bg-gray-900/50 p-1.5 rounded-lg border border-gray-700/50 hover:border-emerald-500/30 transition-all flex items-center justify-center"
                          >
                            {sp.logoUrl ? (
                              <img
                                src={sp.logoUrl}
                                alt={sp.name}
                                className={`${heightClass} ${maxWClass} object-contain filter brightness-90 hover:brightness-100 transition-all`}
                              />
                            ) : (
                              <span className="text-xs font-bold text-gray-300 px-2">{sp.name}</span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Interactive / Read-Only Seat Selection & Controls */}
        <SeatSelectionClient
          eventId={event.id}
          seats={serializedSeats}
          isAdmin={isAdmin}
          isAuthenticated={Boolean(session)}
          reservations={JSON.parse(JSON.stringify(reservations))}
          coupons={JSON.parse(JSON.stringify(coupons))}
          sponsors={JSON.parse(JSON.stringify(event.sponsors))}
          t={t}
          locale={locale}
          eventDetails={{
            title: event.title,
            titleZhTw: event.titleZhTw,
            description: event.description,
            descriptionZhTw: event.descriptionZhTw,
            venue: event.venue,
            venueZhTw: event.venueZhTw,
            date: event.date.toISOString(),
            imageUrl: event.imageUrl,
            isActive: event.isActive,
            currency: event.currency,
            bankName: event.bankName,
            bankNameZhTw: event.bankNameZhTw,
            bankCode: event.bankCode,
            bankAccount: event.bankAccount,
            bankAccountHolder: event.bankAccountHolder,
            couponCode: isAdmin ? event.couponCode : null,
            couponDiscountPercent: isAdmin
              ? event.couponDiscountPercent
              : null,
            hasEventCoupon,
          }}
        />
      </div>
    </div>
  );
}
