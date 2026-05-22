"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { formatBankRefForTransfer } from "@/lib/bankRef";
import {
  formatSeatLabelsForDisplay,
  type SeatLabelFormat,
} from "@/lib/seatLabel";

type ReservationStatus =
  | "PENDING_PAYMENT"
  | "SUCCESS"
  | "REFUND_REQUESTED"
  | "REFUNDED"
  | "EXPIRED"
  | "CANCELLED";

type ReservationItem = {
  id: string;
  status: ReservationStatus;
  seatCount: number;
  totalAmount: string;
  bankRef: string;
  event: {
    title: string;
    venue: string;
    date: string;
    currency: string;
  };
  seats: Array<{ label: string }>;
};

type ProfileReservationsClientProps = {
  reservations: ReservationItem[];
  dateLocale?: string;
  labels: {
    searchReservations: string;
    filterAll: string;
    noReservations: string;
    noReservationsMatch: string;
    showingReservations: string;
    seats: string;
    totalPrice: string;
    viewDetails: string;
    pendingPayment: string;
    activeTicket: string;
    refundRequested: string;
    refunded: string;
    expired: string;
    cancelled: string;
    seatLabelFormat: SeatLabelFormat;
  };
};

const statusFilters: Array<ReservationStatus | "ALL"> = [
  "ALL",
  "PENDING_PAYMENT",
  "SUCCESS",
  "REFUND_REQUESTED",
  "REFUNDED",
  "EXPIRED",
  "CANCELLED",
];

function statusLabel(
  status: ReservationStatus | "ALL",
  labels: ProfileReservationsClientProps["labels"],
) {
  const labelMap = {
    ALL: labels.filterAll,
    PENDING_PAYMENT: labels.pendingPayment,
    SUCCESS: labels.activeTicket,
    REFUND_REQUESTED: labels.refundRequested,
    REFUNDED: labels.refunded,
    EXPIRED: labels.expired,
    CANCELLED: labels.cancelled,
  };

  return labelMap[status];
}

export default function ProfileReservationsClient({
  reservations,
  dateLocale,
  labels,
}: ProfileReservationsClientProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "ALL">(
    "ALL",
  );

  const statusCounts = useMemo(() => {
    return reservations.reduce(
      (counts, reservation) => {
        counts.ALL += 1;
        counts[reservation.status] += 1;
        return counts;
      },
      {
        ALL: 0,
        PENDING_PAYMENT: 0,
        SUCCESS: 0,
        REFUND_REQUESTED: 0,
        REFUNDED: 0,
        EXPIRED: 0,
        CANCELLED: 0,
      } as Record<ReservationStatus | "ALL", number>,
    );
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return reservations.filter((reservation) => {
      const matchesStatus =
        statusFilter === "ALL" || reservation.status === statusFilter;
      if (!matchesStatus) return false;

      if (!normalizedQuery) return true;

      const searchableText = [
        reservation.id,
        reservation.bankRef,
        formatBankRefForTransfer(reservation.bankRef),
        reservation.event.title,
        reservation.event.venue,
        reservation.seats.map((seat) => seat.label).join(" "),
        formatSeatLabelsForDisplay(
          reservation.seats.map((seat) => seat.label),
          labels.seatLabelFormat,
          " ",
        ),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [query, reservations, statusFilter]);

  if (reservations.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-8 text-center text-gray-400">
        {labels.noReservations}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-700 bg-gray-800/80 p-4 shadow-xl">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.searchReservations}
            className="w-full rounded-xl border border-gray-700 bg-gray-900 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-emerald-500"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {statusFilters.map((status) => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? "border-emerald-400 bg-emerald-500/15 text-emerald-300"
                    : "border-gray-700 bg-gray-900/70 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                }`}
              >
                {statusLabel(status, labels)}
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                    isActive
                      ? "bg-emerald-400/15 text-emerald-200"
                      : "bg-gray-700 text-gray-300"
                  }`}
                >
                  {statusCounts[status]}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-gray-500">
          {labels.showingReservations
            .replace("{count}", String(filteredReservations.length))
            .replace("{total}", String(reservations.length))}
        </p>
      </div>

      {filteredReservations.length === 0 ? (
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-8 text-center text-gray-400">
          {labels.noReservationsMatch}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filteredReservations.map((reservation) => {
            const isPending = reservation.status === "PENDING_PAYMENT";
            const isSuccess = reservation.status === "SUCCESS";
            const isRefundRequested = reservation.status === "REFUND_REQUESTED";
            const isRefunded = reservation.status === "REFUNDED";
            const isClosed =
              reservation.status === "EXPIRED" ||
              reservation.status === "CANCELLED" ||
              isRefunded;

            return (
              <div
                key={reservation.id}
                className={`rounded-2xl border bg-gray-800 p-5 shadow-xl ${
                  isPending
                    ? "border-amber-500/30"
                    : isSuccess
                      ? "border-emerald-500/30"
                      : isRefundRequested
                        ? "border-sky-500/30"
                        : "border-gray-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="line-clamp-1 text-lg font-bold text-white">
                    {reservation.event.title}
                  </h2>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      isPending
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                        : isSuccess
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : isRefundRequested
                            ? "border-sky-500/20 bg-sky-500/10 text-sky-400"
                            : "border-gray-600 bg-gray-700/50 text-gray-300"
                    }`}
                  >
                    {isPending && <ClockIcon className="mr-1 h-3.5 w-3.5" />}
                    {isSuccess && (
                      <CheckCircleIcon className="mr-1 h-3.5 w-3.5" />
                    )}
                    {isClosed && <XCircleIcon className="mr-1 h-3.5 w-3.5" />}
                    {statusLabel(reservation.status, labels)}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-gray-400">
                  <div className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                    {new Date(reservation.event.date).toLocaleDateString(
                      dateLocale,
                    )}
                  </div>
                  <div className="flex items-center">
                    <MapPinIcon className="mr-2 h-4 w-4 text-gray-500" />
                    <span className="truncate">{reservation.event.venue}</span>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-gray-700/60 bg-gray-900/50 p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">
                      {labels.seats} ({reservation.seatCount})
                    </span>
                    <span className="text-right font-mono font-semibold text-white">
                      {formatSeatLabelsForDisplay(
                        reservation.seats.map((seat) => seat.label),
                        labels.seatLabelFormat,
                      )}
                    </span>
                  </div>
                  <div className="mt-3 flex justify-between border-t border-gray-800 pt-3">
                    <span className="text-gray-400">{labels.totalPrice}</span>
                    <span className="font-bold text-emerald-400">
                      {reservation.event.currency}
                      {Number(reservation.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/reservations/${reservation.id}`}
                  className="mt-5 flex w-full items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition hover:border-emerald-500/30 hover:bg-emerald-500/20"
                >
                  {labels.viewDetails}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
