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
  seats: Array<{ label: string; isCheckedIn?: boolean }>;
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
    checkedIn: string;
    partiallyCheckedIn: string;
    refundRequested: string;
    refunded: string;
    expired: string;
    cancelled: string;
    seatLabelFormat: SeatLabelFormat;
  };
};

const statusFilters: Array<ReservationStatus | "ALL" | "CHECKED_IN"> = [
  "ALL",
  "PENDING_PAYMENT",
  "SUCCESS",
  "CHECKED_IN",
  "REFUND_REQUESTED",
  "REFUNDED",
  "EXPIRED",
  "CANCELLED",
];

function statusLabel(
  status: ReservationStatus | "ALL" | "CHECKED_IN",
  labels: ProfileReservationsClientProps["labels"],
) {
  const labelMap = {
    ALL: labels.filterAll,
    PENDING_PAYMENT: labels.pendingPayment,
    SUCCESS: labels.activeTicket,
    CHECKED_IN: labels.checkedIn,
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
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "ALL" | "CHECKED_IN">(
    "ALL",
  );

  const statusCounts = useMemo(() => {
    return reservations.reduce(
      (counts, reservation) => {
        counts.ALL += 1;
        if (reservation.status === "SUCCESS") {
          const checkedInCount = reservation.seats.filter((s) => s.isCheckedIn).length;
          if (checkedInCount > 0) {
            counts.CHECKED_IN += 1;
          } else {
            counts.SUCCESS += 1;
          }
        } else {
          counts[reservation.status] += 1;
        }
        return counts;
      },
      {
        ALL: 0,
        PENDING_PAYMENT: 0,
        SUCCESS: 0,
        CHECKED_IN: 0,
        REFUND_REQUESTED: 0,
        REFUNDED: 0,
        EXPIRED: 0,
        CANCELLED: 0,
      } as Record<ReservationStatus | "ALL" | "CHECKED_IN", number>,
    );
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return reservations.filter((reservation) => {
      const checkedInCount = reservation.seats.filter((s) => s.isCheckedIn).length;
      let matchesStatus = false;

      if (statusFilter === "ALL") {
        matchesStatus = true;
      } else if (statusFilter === "CHECKED_IN") {
        matchesStatus = reservation.status === "SUCCESS" && checkedInCount > 0;
      } else if (statusFilter === "SUCCESS") {
        matchesStatus = reservation.status === "SUCCESS" && checkedInCount === 0;
      } else {
        matchesStatus = reservation.status === statusFilter;
      }

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
  }, [query, reservations, statusFilter, labels.seatLabelFormat]);

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

             const checkedInCount = reservation.seats.filter((s) => s.isCheckedIn).length;
             const totalCount = reservation.seats.length;
             const isFullyCheckedIn = isSuccess && checkedInCount === totalCount;
             const isPartiallyCheckedIn = isSuccess && checkedInCount > 0 && checkedInCount < totalCount;

             let badgeClasses = "border-gray-600 bg-gray-700/50 text-gray-300";
             let badgeText = statusLabel(reservation.status, labels);

             if (isPending) {
               badgeClasses = "border-amber-500/20 bg-amber-500/10 text-amber-400";
             } else if (isRefundRequested) {
               badgeClasses = "border-sky-500/20 bg-sky-500/10 text-sky-400";
             } else if (isSuccess) {
               if (isFullyCheckedIn) {
                 badgeClasses = "border-emerald-500/30 bg-emerald-500/20 text-emerald-300";
                 badgeText = labels.checkedIn;
               } else if (isPartiallyCheckedIn) {
                 badgeClasses = "border-teal-500/20 bg-teal-500/15 text-teal-300";
                 badgeText = labels.partiallyCheckedIn
                   .replace("{checked}", String(checkedInCount))
                   .replace("{total}", String(totalCount));
               } else {
                 badgeClasses = "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
               }
             }

             return (
               <div
                 key={reservation.id}
                 className={`rounded-2xl border bg-gray-800 p-5 shadow-xl ${
                   isPending
                     ? "border-amber-500/30"
                     : isSuccess
                       ? isFullyCheckedIn
                         ? "border-emerald-500/40 shadow-emerald-500/5 shadow-lg"
                         : isPartiallyCheckedIn
                           ? "border-teal-500/30 shadow-teal-500/5 shadow-lg"
                           : "border-emerald-500/30 shadow-lg shadow-emerald-500/5"
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
                     className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClasses}`}
                   >
                     {isPending && <ClockIcon className="mr-1 h-3.5 w-3.5" />}
                     {(isSuccess || isFullyCheckedIn || isPartiallyCheckedIn) && (
                       <CheckCircleIcon className="mr-1 h-3.5 w-3.5" />
                     )}
                     {isClosed && <XCircleIcon className="mr-1 h-3.5 w-3.5" />}
                     {badgeText}
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
                   <div className="flex justify-between gap-4 items-start">
                     <span className="text-gray-400 pt-0.5">
                       {labels.seats} ({reservation.seatCount})
                     </span>
                     <div className="flex flex-wrap justify-end gap-1.5 max-w-[70%]">
                       {reservation.seats.map((seat) => {
                         const seatDisplayName = formatSeatLabelsForDisplay(
                           [seat.label],
                           labels.seatLabelFormat,
                         );
                         return (
                           <span
                             key={seat.label}
                             className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border font-mono tracking-tight transition-all duration-300
                               ${
                                 seat.isCheckedIn
                                   ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/5"
                                   : "bg-gray-800 text-gray-300 border-gray-700"
                               }`}
                           >
                             {seat.isCheckedIn && (
                               <>
                                 <span className="relative mr-1.5 flex h-1.5 w-1.5">
                                   <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                   <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                 </span>
                                 <span className="mr-0.5 text-emerald-400 font-bold">✓</span>
                               </>
                             )}
                             {seatDisplayName}
                           </span>
                         );
                       })}
                     </div>
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
