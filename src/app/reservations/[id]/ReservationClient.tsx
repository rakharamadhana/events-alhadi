"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircleIcon,
  ClockIcon,
  BuildingLibraryIcon,
  ArrowLeftIcon,
  TicketIcon,
  InformationCircleIcon,
  MapPinIcon,
  ArrowUturnLeftIcon,
  XMarkIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";

import ProofUploadClient from "./ProofUploadClient";
import PrintButton from "./PrintButton";
import TicketZoomSlider from "./TicketZoomSlider";
import ProofZoomClient from "./ProofZoomClient";
import CancelReservationButton from "./CancelReservationButton";
import CopyClipboardButton from "./CopyClipboardButton";
import RefundRequestForm from "./RefundRequestForm";
import FindMySeatMap, { type FindMySeatMapSeat } from "./FindMySeatMap";
import { formatBankRefForTransfer } from "@/lib/bankRef";

type ReservationClientProps = {
  reservation: any;
  locale: string;
  t: any;
  localizedEvent: any;
  formattedSeatList: string;
  eventMapSeats: FindMySeatMapSeat[];
  highlightedSeatIds: string[];
  showFindMySeat: boolean;
  ticketTotal: number;
  transferAmountDue: number;
  TRANSFER_VERIFICATION_TOP_UP: number;
  seatLabelFormat: any;
  ticketReservation: any;
  isPending: boolean;
  isSuccess: boolean;
  isRefundRequested: boolean;
  isRefunded: boolean;
  isExpired: boolean;
  isClosed: boolean;
  isAnySeatCheckedIn: boolean;
  findMySeatLabels: any;
};

// Generic Modal Component with Custom Dark Overlay CSS protection
type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in no-print">
      <div className="reservation-modal-container rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col relative max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 flex justify-between items-center reservation-modal-header shrink-0">
          <h3 className="text-lg font-bold reservation-modal-title flex items-center gap-2">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors reservation-modal-close-btn cursor-pointer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 reservation-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ReservationClient({
  reservation,
  locale,
  t,
  localizedEvent,
  formattedSeatList,
  eventMapSeats,
  highlightedSeatIds,
  showFindMySeat,
  ticketTotal,
  transferAmountDue,
  TRANSFER_VERIFICATION_TOP_UP,
  seatLabelFormat,
  ticketReservation,
  isPending,
  isSuccess,
  isRefundRequested,
  isRefunded,
  isExpired,
  isClosed,
  isAnySeatCheckedIn,
  findMySeatLabels,
}: ReservationClientProps) {
  const [activeModal, setActiveModal] = useState<"receipt" | "seats" | "details" | "refund" | null>(null);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans py-8 px-4 sm:px-6 lg:px-8 lg:py-12">
      {/* Modal Specific Dark/Light Responsive Styling Protection */}
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --rm-bg: #111827;
          --rm-border: #1f2937;
          --rm-header-bg: rgba(3, 7, 18, 0.4);
          --rm-title-color: #ffffff;
          --rm-close-color: #9ca3af;
          --rm-close-hover-color: #ffffff;
          --rm-close-hover-bg: #1f2937;
          
          --rm-child-bg: #1f2937;
          --rm-text-strong: #ffffff;
          --rm-text-muted: #d1d5db;
          --rm-text-dim: #9ca3af;
          --rm-child-border: #374151;
        }

        :root[data-theme="light"],
        [data-theme="light"],
        .light {
          --rm-bg: var(--surface);
          --rm-border: var(--border-strong);
          --rm-header-bg: var(--surface-muted);
          --rm-title-color: var(--foreground);
          --rm-close-color: var(--muted);
          --rm-close-hover-color: var(--foreground);
          --rm-close-hover-bg: var(--surface-strong);
          
          --rm-child-bg: var(--surface-muted);
          --rm-text-strong: var(--foreground);
          --rm-text-muted: var(--muted-strong);
          --rm-text-dim: var(--muted);
          --rm-child-border: var(--border);
        }

        /* Custom reservation details modal styling overrides to guarantee perfect light/dark theme contrast */
        .reservation-modal-container {
          background-color: var(--rm-bg) !important;
          border: 1px solid var(--rm-border) !important;
        }
        .reservation-modal-header {
          background-color: var(--rm-header-bg) !important;
          border-bottom: 1px solid var(--rm-border) !important;
        }
        .reservation-modal-title {
          color: var(--rm-title-color) !important;
        }
        .reservation-modal-close-btn {
          color: var(--rm-close-color) !important;
        }
        .reservation-modal-close-btn:hover {
          color: var(--rm-close-hover-color) !important;
          background-color: var(--rm-close-hover-bg) !important;
        }
        .reservation-modal-body {
          background-color: var(--rm-bg) !important;
          color: var(--rm-text-muted) !important;
        }

        /* Specific nested child overrides inside the modal */
        .reservation-modal-container .bg-gray-950,
        .reservation-modal-container .bg-gray-900,
        .reservation-modal-container .bg-gray-850,
        .reservation-modal-container .bg-gray-800,
        .reservation-modal-container .bg-gray-750,
        .reservation-modal-container .bg-gray-700/50,
        .reservation-modal-container .bg-gray-800/40,
        .reservation-modal-container .bg-gray-800/60,
        .reservation-modal-container .bg-gray-800/70,
        .reservation-modal-container .bg-gray-900/30,
        .reservation-modal-container .bg-gray-900/40,
        .reservation-modal-container .bg-gray-900/50,
        .reservation-modal-container .bg-gray-950/45,
        .reservation-modal-container .bg-gray-950/50,
        .reservation-modal-container .bg-sky-950/40,
        .reservation-modal-container .bg-sky-950/50 {
          background-color: var(--rm-child-bg) !important;
        }

        .reservation-modal-container .text-white,
        .reservation-modal-container .text-gray-100,
        .reservation-modal-container .text-gray-200 {
          color: var(--rm-text-strong) !important;
        }

        .reservation-modal-container .text-gray-300 {
          color: var(--rm-text-muted) !important;
        }

        .reservation-modal-container .text-gray-400,
        .reservation-modal-container .text-gray-500,
        .reservation-modal-container .text-sky-300/70 {
          color: var(--rm-text-dim) !important;
        }

        .reservation-modal-container .border-gray-800,
        .reservation-modal-container .border-gray-750,
        .reservation-modal-container .border-gray-700,
        .reservation-modal-container .border-gray-600,
        .reservation-modal-container .border-sky-900/40,
        .reservation-modal-container .border-sky-900/50 {
          border-color: var(--rm-child-border) !important;
        }

        .reservation-modal-container textarea::placeholder,
        .reservation-modal-container input::placeholder {
          color: var(--rm-text-dim) !important;
          opacity: 0.7 !important;
        }

        /* Pulsing ring for pending action items */
        .pulse-border-amber {
          box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
          animation: pulse-amber 2s infinite;
        }
        @keyframes pulse-amber {
          0% {
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(245, 158, 11, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
          }
        }
      `}} />

      <div className="max-w-3xl mx-auto space-y-8">
        <div className="no-print">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            {t.reservationDetails.backToDashboard}
          </Link>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
          {/* Header Status Bar */}
          <div
            className={`p-5 sm:p-6 flex items-center justify-center space-x-3 
            ${
              isPending
                ? "bg-amber-500/20 text-amber-400 border-b border-amber-500/30"
                : isSuccess
                  ? "bg-emerald-500/20 text-emerald-400 border-b border-emerald-500/30"
                  : isRefundRequested
                    ? "bg-sky-500/20 text-sky-400 border-b border-sky-500/30"
                    : isRefunded
                      ? "bg-gray-500/20 text-gray-300 border-b border-gray-500/30"
                      : "bg-red-500/20 text-red-400 border-b border-red-500/30"
            }`}
          >
            {isPending && <ClockIcon className="h-8 w-8" />}
            {isSuccess && <CheckCircleIcon className="h-8 w-8" />}

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {isPending && t.reservationDetails.paymentPending}
              {isSuccess && t.reservationDetails.paymentConfirmed}
              {isRefundRequested && t.reservationDetails.refundRequested}
              {isRefunded && t.reservationDetails.refunded}
              {isExpired && t.reservationDetails.reservationExpired}
            </h2>
          </div>

          <div className="p-5 sm:p-8 md:p-10 space-y-8 sm:space-y-10">
            
            {/* Visual Admission Tickets Section (Stays on main page for Success/Refunded/Requested) */}
            {isSuccess && (
              <div className="space-y-6 print-container">
                {/* Print Styles Sheet */}
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                      @media print {
                        /* Hide everything else on the page */
                        body * {
                          visibility: hidden !important;
                          background: transparent !important;
                        }
                        /* Show only the print-container and its children */
                        .print-container, .print-container * {
                          visibility: visible !important;
                        }
                        .print-container {
                          position: absolute !important;
                          left: 0 !important;
                          top: 0 !important;
                          width: 100% !important;
                          padding: 0 !important;
                          margin: 0 !important;
                        }
                        /* Specific style overrides for printable tickets */
                        .ticket-card {
                          background: white !important;
                          color: black !important;
                          border: 2px solid #000000 !important;
                          page-break-inside: avoid !important;
                          break-inside: avoid !important;
                          margin-bottom: 2rem !important;
                          box-shadow: none !important;
                          display: flex !important;
                          flex-direction: row !important;
                          width: 100% !important;
                          min-height: 220px !important;
                          border-radius: 16px !important;
                          overflow: hidden !important;
                          -webkit-print-color-adjust: exact !important;
                          print-color-adjust: exact !important;
                        }
                        .ticket-card * {
                          color: #000000 !important;
                        }
                        .ticket-card .official-admission-badge {
                          background-color: #047857 !important;
                          color: #ffffff !important;
                          border: 1px solid #047857 !important;
                          -webkit-print-color-adjust: exact !important;
                          print-color-adjust: exact !important;
                        }
                        .ticket-card .checked-in-stamp-badge {
                          background-color: #047857 !important;
                          color: #ffffff !important;
                          border: 1px solid #047857 !important;
                          -webkit-print-color-adjust: exact !important;
                          print-color-adjust: exact !important;
                        }
                        .ticket-card .checked-in-stamp-badge * {
                          color: #ffffff !important;
                        }
                        .ticket-card .text-emerald-400, 
                        .ticket-card .text-emerald-300,
                        .ticket-card .text-emerald-100 {
                          color: #047857 !important;
                          font-weight: bold !important;
                        }
                        .ticket-card .bg-emerald-500\\/10 {
                          background-color: #f0fdf4 !important;
                          border: 1px solid #a7f3d0 !important;
                        }
                        .ticket-card .bg-gray-800, 
                        .ticket-card .bg-gray-900\\/40, 
                        .ticket-card .bg-gray-800\\/50,
                        .ticket-card .bg-gray-950,
                        .ticket-card .bg-gray-900 {
                          background-color: #ffffff !important;
                          background: #ffffff !important;
                        }
                        .ticket-card .border-gray-700, 
                        .ticket-card .border-gray-700\\/50,
                        .ticket-card .border-gray-600 {
                          border-color: #e5e7eb !important;
                        }
                        .punch-hole {
                          background-color: #ffffff !important;
                          border-color: #000000 !important;
                        }
                        .no-print {
                          display: none !important;
                        }
                      }
                    `,
                  }}
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print border-b border-gray-700 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center">
                      <TicketIcon className="h-6 w-6 text-emerald-400 mr-2" />
                      {t.reservationDetails.yourTicketsTitle}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {t.reservationDetails.yourTicketsTip}
                    </p>
                  </div>
                  <PrintButton label={t.reservationDetails.printTickets} />
                </div>

                <TicketZoomSlider
                  reservation={ticketReservation}
                  t={t.reservationDetails}
                  locale={locale}
                  seatLabelFormat={seatLabelFormat}
                />
              </div>
            )}

            {/* Admission Tickets fallback for other visual states */}
            {!isSuccess && !isPending && (
              <div className="space-y-4 no-print text-center py-6 border border-dashed border-gray-700 rounded-xl bg-gray-900/10">
                <TicketIcon className="h-10 w-10 text-gray-500 mx-auto" />
                <p className="text-sm font-semibold text-gray-400">
                  {isRefunded && "Tickets Released (Refund Completed)"}
                  {isExpired && "Tickets Cancelled or Expired"}
                  {isRefundRequested && "Tickets Locked Under Refund Review"}
                </p>
              </div>
            )}

            {/* Premium Interactive Modal Control Center Panel Grid */}
            <div className="no-print space-y-6 pt-4 border-t border-gray-700">
              <div>
                <h3 className="text-base font-extrabold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                  <CreditCardIcon className="h-5 w-5 text-emerald-400" />
                  Reservation Desk Control Panel
                </h3>
                <p className="text-xs text-gray-400">
                  Select any option below to view transfer details, check seating blueprints, view receipts, or manage options.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. Payment / Receipt Trigger Button */}
                <button
                  onClick={() => setActiveModal("receipt")}
                  className={`flex items-start text-left p-4 rounded-xl border transition-all duration-300 group cursor-pointer
                    ${isPending 
                      ? "bg-amber-950/20 border-amber-500/50 hover:bg-amber-950/40 hover:border-amber-400 pulse-border-amber" 
                      : "bg-gray-850 border-gray-700 hover:bg-gray-800 hover:border-gray-650"
                    }
                  `}
                >
                  <div className={`p-2.5 rounded-lg mr-3.5 border shrink-0
                    ${isPending 
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    }
                  `}>
                    <BuildingLibraryIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {isPending ? t.reservationDetails.transferInstructions : t.reservationDetails.verifiedReceipt}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      {isPending 
                        ? "View bank account details and submit payment proof transfer receipt."
                        : "Review verified bank transaction receipt and payment confirmation logs."
                      }
                    </p>
                  </div>
                </button>

                {/* 2. Find My Seat Trigger Button */}
                {showFindMySeat && (
                  <button
                    onClick={() => setActiveModal("seats")}
                    className="flex items-start text-left p-4 rounded-xl border border-gray-700 bg-gray-850 hover:bg-gray-800 hover:border-gray-650 transition-all duration-300 group cursor-pointer"
                  >
                    <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg mr-3.5 shrink-0">
                      <MapPinIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {t.reservationDetails.findMySeatTitle}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Identify where your assigned green seat is located relative to the stage layout.
                      </p>
                    </div>
                  </button>
                )}

                {/* 3. Reservation Details Trigger Button */}
                <button
                  onClick={() => setActiveModal("details")}
                  className="flex items-start text-left p-4 rounded-xl border border-gray-700 bg-gray-850 hover:bg-gray-800 hover:border-gray-650 transition-all duration-300 group cursor-pointer"
                >
                  <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg mr-3.5 shrink-0">
                    <InformationCircleIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                      {t.reservationDetails.detailsTitle}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      View invoice receipt details, reserved seats lists, applied coupons, and timestamps.
                    </p>
                  </div>
                </button>

                {/* 4. Refund Options Trigger Button (Only visible if Success or already in Refund flows) */}
                {(isSuccess || isRefundRequested || isRefunded) && (
                  <button
                    onClick={() => setActiveModal("refund")}
                    className="flex items-start text-left p-4 rounded-xl border border-gray-700 bg-gray-850 hover:bg-gray-800 hover:border-gray-650 transition-all duration-300 group cursor-pointer"
                  >
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg mr-3.5 shrink-0">
                      <ArrowUturnLeftIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                        Refund Options
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        {isRefundRequested && "Your refund request is under review. Check details."}
                        {isRefunded && "Your refund has been processed. Check confirmation."}
                        {isSuccess && "Request a ticket cancellation refund if you cannot attend."}
                      </p>
                    </div>
                  </button>
                )}

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 1. Payment Receipt / Instructions Modal Overlay */}
      {/* ==================================================== */}
      <Modal
        isOpen={activeModal === "receipt"}
        onClose={() => setActiveModal(null)}
        title={isPending ? t.reservationDetails.transferInstructions : t.reservationDetails.verifiedReceipt}
      >
        {isPending ? (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-750 space-y-4">
              <h4 className="text-base font-bold text-white flex items-center">
                <BuildingLibraryIcon className="h-5 w-5 text-emerald-400 mr-2" />
                {t.reservationDetails.transferInstructions}
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                {t.reservationDetails.instructionsDescription}
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
                  <p className="mb-1 text-xs text-gray-400">
                    {t.reservationDetails.bankName}
                  </p>
                  <p className="font-semibold text-white">
                    {locale === "zh-TW"
                      ? reservation.event.bankNameZhTw || reservation.event.bankName
                      : reservation.event.bankName}
                  </p>
                </div>
                {reservation.event.bankCode && (
                  <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
                    <p className="mb-1 text-xs text-gray-400">
                      {t.reservationDetails.bankCode}
                    </p>
                    <p className="font-mono text-base text-white">
                      {reservation.event.bankCode}
                    </p>
                  </div>
                )}
                <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
                  <p className="mb-1 text-xs text-gray-400">
                    {t.reservationDetails.accountHolderName}
                  </p>
                  <p className="font-semibold text-white">
                    {reservation.event.bankAccountHolder}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
                  <p className="mb-1 text-xs text-gray-400">
                    {t.reservationDetails.accountNumber}
                  </p>
                  <p className="font-mono text-base font-bold text-emerald-400">
                    {reservation.event.bankAccount}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">{t.reservationDetails.ticketAmountLabel}</p>
                    <p className="font-bold text-white mt-0.5">
                      {reservation.event.currency}
                      {ticketTotal.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t.reservationDetails.verificationTopUpLabel}</p>
                    <p className="font-bold text-white mt-0.5">
                      + {reservation.event.currency}
                      {TRANSFER_VERIFICATION_TOP_UP.toFixed(2)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs font-bold text-emerald-400">{t.reservationDetails.amountToTransferLabel}</p>
                    <p className="text-lg font-black text-emerald-400 mt-0.5">
                      {reservation.event.currency}
                      {transferAmountDue.toFixed(2)}
                    </p>
                    <CopyClipboardButton
                      value={String(Math.trunc(transferAmountDue))}
                      copyLabel={t.reservationDetails.copyTransferAmount}
                      copiedLabel={t.reservationDetails.copiedTransferAmount}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed pt-2 border-t border-gray-700/60">
                  {t.reservationDetails.verificationTopUpDisclaimer.replace(
                    "{amount}",
                    `${reservation.event.currency}${TRANSFER_VERIFICATION_TOP_UP.toFixed(2)}`,
                  )}
                </p>
              </div>

              <div className="border border-gray-700 bg-gray-900/30 p-5 rounded-xl flex flex-col items-center justify-center text-center">
                <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 mb-1">
                  {t.reservationDetails.referenceCodeCode}
                </p>
                <p className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-white break-all">
                  {formatBankRefForTransfer(reservation.bankRef)}
                </p>
                {reservation.bankRef && (
                  <div className="mt-1">
                    <CopyClipboardButton
                      value={formatBankRefForTransfer(reservation.bankRef)}
                      copyLabel={t.reservationDetails.copyReferenceCode}
                      copiedLabel={t.reservationDetails.copiedReferenceCode}
                    />
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-2">
                  {t.reservationDetails.referenceCodeTip}
                </p>
              </div>
            </div>

            <ProofUploadClient
              reservationId={reservation.id}
              initialProofUrl={reservation.paymentProofUrl}
              t={t.reservationDetails}
            />

            <CancelReservationButton
              reservationId={reservation.id}
              labels={{
                cancelReservation: t.reservationDetails.cancelReservation,
                confirmCancelReservation: t.reservationDetails.confirmCancelReservation,
                cancellingReservation: t.reservationDetails.cancellingReservation,
                cancelReservationHelp: t.reservationDetails.cancelReservationHelp,
              }}
            />
          </div>
        ) : isSuccess && reservation.paymentProofUrl ? (
          <div className="bg-gray-800 p-6 rounded-xl border border-emerald-500/20 space-y-4">
            <h4 className="text-sm font-semibold text-emerald-300 flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-emerald-400 mr-2" />
              {t.reservationDetails.verifiedReceipt}
            </h4>
            <div className="flex justify-center p-2 bg-gray-950/45 rounded-lg border border-gray-750">
              <ProofZoomClient
                src={reservation.paymentProofUrl}
                alt={t.reservationDetails.verifiedReceiptAlt}
                clickToZoomLabel={t.reservationDetails.clickToZoomProof}
                modalTitleLabel={t.reservationDetails.verifiedReceipt}
                modalSubTitleLabel={t.reservationDetails.reviewReceiptDetails}
                footerLabel={t.reservationDetails.receiptVerification}
                closeLabel={t.reservationDetails.closeView}
                containerClassName="relative group overflow-hidden rounded-lg flex items-center justify-center max-h-[360px] w-64 cursor-zoom-in"
                imageClassName="max-h-[340px] w-auto object-contain rounded transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <p className="text-xs text-gray-400 text-center mt-1">
              Your transaction transfer proof receipt has been validated by admins.
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No active payment instructions or receipts found for this order.
          </div>
        )}
      </Modal>

      {/* ==================================================== */}
      {/* 2. Seating Map Floor layout Modal Overlay */}
      {/* ==================================================== */}
      {showFindMySeat && (
        <Modal
          isOpen={activeModal === "seats"}
          onClose={() => setActiveModal(null)}
          title={t.reservationDetails.findMySeatTitle}
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-300">
                {t.reservationDetails.findMySeatDescription}
              </p>
            </div>

            <div className="bg-gray-950/50 p-4 sm:p-6 rounded-xl border border-gray-800 mt-4 overflow-hidden relative">
              <FindMySeatMap
                seats={eventMapSeats}
                highlightedSeatIds={highlightedSeatIds}
                labels={{
                  stageArea: findMySeatLabels.stageArea,
                  legendYourSeat: findMySeatLabels.legendYourSeat,
                  legendOtherSeat: findMySeatLabels.legendOtherSeat,
                  legendWheelchair: findMySeatLabels.legendWheelchair,
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================== */}
      {/* 3. Detailed Invoice Meta Reservation Modal Overlay */}
      {/* ==================================================== */}
      <Modal
        isOpen={activeModal === "details"}
        onClose={() => setActiveModal(null)}
        title={t.reservationDetails.detailsTitle}
      >
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-750">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 text-sm">
            <div className="sm:col-span-2 border-b border-gray-700/60 pb-3">
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t.reservationDetails.eventLabel}
              </dt>
              <dd className="mt-1 text-lg font-bold text-white">
                {localizedEvent.title}
              </dd>
            </div>

            <div className="sm:col-span-1">
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t.reservationDetails.seatsReservedLabel}
              </dt>
              <dd className="mt-1 text-base text-white font-bold">
                {formattedSeatList}
              </dd>
              <dd className="text-xs text-gray-400 mt-0.5">
                ({t.reservationDetails.seatsCountText.replace("{count}", String(reservation.seatCount))})
              </dd>
            </div>

            <div className="sm:col-span-1">
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t.reservationDetails.totalAmountLabel}
              </dt>
              <dd className="mt-1 text-lg font-black text-emerald-400 flex items-center">
                <span className="mr-1.5 font-semibold text-emerald-500">
                  {reservation.event.currency}
                </span>
                {ticketTotal.toFixed(2)}
              </dd>
            </div>

            {reservation.couponCode && reservation.couponDiscountPercent != null && (
              <div className="sm:col-span-2 border-t border-gray-700/40 pt-4">
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t.reservationDetails.couponAppliedLabel}
                </dt>
                <dd className="mt-1 font-mono text-emerald-400 font-bold">
                  {t.reservationDetails.couponDiscountSummary
                    .replace("{code}", reservation.couponCode)
                    .replace("{percent}", String(reservation.couponDiscountPercent))}
                </dd>
              </div>
            )}

            <div className="sm:col-span-1 border-t border-gray-700/40 pt-4">
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t.reservationDetails.paymentStatusLabel}
              </dt>
              {isSuccess ? (
                <dd className="mt-1 font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {t.reservationDetails.paymentConfirmedStatus}
                </dd>
              ) : (
                <dd className="mt-1 font-bold text-amber-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  Pending Proof
                </dd>
              )}
            </div>

            <div className="sm:col-span-1 border-t border-gray-700/40 pt-4">
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {isClosed ? t.reservationDetails.expiredAtLabel : t.reservationDetails.deadlineLabel}
              </dt>
              <dd className={`mt-1 font-medium ${isExpired ? "text-red-400" : "text-amber-400"}`}>
                {new Date(reservation.expiresAt).toLocaleString(
                  locale === "zh-TW" ? "zh-TW" : "en-US",
                  {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </dd>
            </div>

            <div className="sm:col-span-2 border-t border-gray-700/40 pt-4">
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t.reservationDetails.reservationIdLabel}
              </dt>
              <dd className="mt-1 font-mono text-xs text-gray-300 break-all bg-gray-900/60 p-2.5 rounded-lg border border-gray-700">
                {reservation.id}
              </dd>
            </div>
          </dl>
        </div>
      </Modal>

      {/* ==================================================== */}
      {/* 4. Request Refund / Status Review Modal Overlay */}
      {/* ==================================================== */}
      <Modal
        isOpen={activeModal === "refund"}
        onClose={() => setActiveModal(null)}
        title="Refund Options Desk"
      >
        <div className="space-y-6">
          {/* A. If Already Checked In (Blocking Refunds) */}
          {isAnySeatCheckedIn && (
            <div className="bg-rose-950/20 border border-rose-500/20 p-5 rounded-xl text-sm text-rose-300 flex items-start gap-3">
              <InformationCircleIcon className="h-6 w-6 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-base">Refund Eligibility Blocked</h4>
                <p className="mt-2 text-gray-300 leading-relaxed">
                  {t.admin.refundBlockedCheckedIn || "Refunds are disabled as this ticket is marked as used."}
                </p>
                <p className="text-xs text-gray-450 mt-1.5 leading-relaxed">
                  One or more seats on this ticket have already checked in at the venue. Verified used tickets cannot be cancelled or refunded.
                </p>
              </div>
            </div>
          )}

          {/* B. If Success & Not Checked In (Form is active) */}
          {isSuccess && !isAnySeatCheckedIn && (
            <div className="space-y-4">
              {/* Review Note if refund request was previously rejected */}
              {reservation.refundReviewNote && (
                <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-5">
                  <h4 className="text-base font-bold text-white flex items-center">
                    <XMarkIcon className="h-5 w-5 text-rose-400 mr-2" />
                    {t.reservationDetails.refundRejectedTitle}
                  </h4>
                  <p className="mt-1.5 text-xs text-gray-400">
                    {t.reservationDetails.refundRejectedDesc}
                  </p>
                  <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      {t.reservationDetails.refundReviewNoteLabel}
                    </p>
                    <p className="mt-1 text-sm text-gray-250 font-medium">
                      {reservation.refundReviewNote}
                    </p>
                  </div>
                </div>
              )}

              <RefundRequestForm
                reservationId={reservation.id}
                labels={{
                  requestRefundTitle: t.reservationDetails.requestRefundTitle,
                  requestRefundDesc: t.reservationDetails.requestRefundDesc,
                  refundReasonLabel: t.reservationDetails.refundReasonLabel,
                  refundReasonPlaceholder: t.reservationDetails.refundReasonPlaceholder,
                  submitRefundRequest: t.reservationDetails.submitRefundRequest,
                  submittingRefundRequest: t.reservationDetails.submittingRefundRequest,
                }}
              />
            </div>
          )}

          {/* C. If Refund Request is pending review */}
          {isRefundRequested && (
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-6 space-y-4">
              <h4 className="text-base font-bold text-white flex items-center">
                <ClockIcon className="h-5 w-5 text-sky-400 mr-2" />
                {t.reservationDetails.refundUnderReview}
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                {t.reservationDetails.refundUnderReviewDesc}
              </p>
              {reservation.refundReason && (
                <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    {t.reservationDetails.refundReasonLabel}
                  </p>
                  <p className="mt-1 text-sm text-gray-200">
                    {reservation.refundReason}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* D. If Refund is already approved/completed */}
          {isRefunded && (
            <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 space-y-4">
              <h4 className="text-base font-bold text-white flex items-center">
                <CheckCircleIcon className="mr-2 h-5 w-5 text-emerald-400" />
                {t.reservationDetails.refundProofTitle}
              </h4>
              <p className="text-sm text-gray-300">
                {reservation.refundProofUrl
                  ? t.reservationDetails.refundProofDesc
                  : t.reservationDetails.refundProofPending}
              </p>

              {reservation.refundProofUrl && (
                <div className="mt-4 flex justify-center p-2 bg-gray-950/45 rounded-lg border border-gray-750">
                  <ProofZoomClient
                    src={reservation.refundProofUrl}
                    alt={t.reservationDetails.refundProofAlt}
                    clickToZoomLabel={t.clickToZoomProof}
                    modalTitleLabel={t.reservationDetails.refundProofTitle}
                    modalSubTitleLabel={t.reservationDetails.refundProofDesc}
                    footerLabel={t.reservationDetails.refunded}
                    closeLabel={t.reservationDetails.closeView}
                    containerClassName="relative group overflow-hidden rounded-lg flex items-center justify-center max-h-[300px] w-60 cursor-zoom-in"
                    imageClassName="max-h-[280px] w-auto object-contain rounded transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
