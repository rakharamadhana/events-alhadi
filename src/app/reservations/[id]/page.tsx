import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CheckCircleIcon,
  ClockIcon,
  BuildingLibraryIcon,
  ArrowLeftIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import ProofUploadClient from "./ProofUploadClient";
import PrintButton from "./PrintButton";
import TicketZoomSlider from "./TicketZoomSlider";
import ProofZoomClient from "./ProofZoomClient";
import CancelReservationButton from "./CancelReservationButton";
import CopyClipboardButton from "./CopyClipboardButton";
import { formatBankRefForTransfer } from "@/lib/bankRef";
import { formatSeatLabelsForDisplay } from "@/lib/seatLabel";
import RefundRequestForm from "./RefundRequestForm";
import FindMySeatSection from "./FindMySeatSection";
import { getI18n } from "@/lib/i18n";
import { localizeEvent } from "@/lib/i18n.shared";
import type { Metadata } from "next";

type ReservationPageProps = { params: Promise<{ id: string }> };
const TRANSFER_VERIFICATION_TOP_UP = 1;

export async function generateMetadata({
  params,
}: ReservationPageProps): Promise<Metadata> {
  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      event: {
        select: {
          title: true,
          titleZhTw: true,
          description: true,
          descriptionZhTw: true,
          venue: true,
          venueZhTw: true,
        },
      },
    },
  });

  if (!reservation) {
    return {
      title: "Reservation Not Found",
    };
  }

  const { locale } = await getI18n();
  const localizedEvent = localizeEvent(reservation.event, locale);

  return {
    title: `Reservation - ${localizedEvent.title}`,
  };
}

export default async function ReservationPage({
  params,
}: ReservationPageProps) {
  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      seats: true,
      event: {
        include: {
          seats: {
            orderBy: [{ row: "asc" }, { number: "asc" }],
          },
          sponsors: true,
        },
      },
    },
  });

  if (!reservation) {
    notFound();
  }

  const { locale, t } = await getI18n();
  const localizedEvent = localizeEvent(reservation.event, locale);
  const isPending = reservation.status === "PENDING_PAYMENT";
  const isSuccess = reservation.status === "SUCCESS";
  const isRefundRequested = reservation.status === "REFUND_REQUESTED";
  const isRefunded = reservation.status === "REFUNDED";
  const isExpired =
    reservation.status === "EXPIRED" || reservation.status === "CANCELLED";
  const isClosed = isExpired || isRefunded;
  const ticketTotal = Number(reservation.totalAmount);
  const transferAmountDue = ticketTotal + TRANSFER_VERIFICATION_TOP_UP;
  const seatLabelFormat = {
    rowSeat: t.common.seatRowSeatFormat,
    wheelchairRowSeat: t.common.seatWheelchairRowSeatFormat,
  };
  const formattedSeatList = formatSeatLabelsForDisplay(
    reservation.seats.map((s) => s.label),
    seatLabelFormat,
  );
  const eventMapSeats = reservation.event.seats.map((seat) => ({
    id: seat.id,
    label: seat.label,
    row: seat.row,
    number: seat.number,
    status: seat.status,
  }));
  const highlightedSeatIds = reservation.seats.map((seat) => seat.id);
  const showFindMySeat =
    (isPending || isSuccess) &&
    highlightedSeatIds.length > 0 &&
    eventMapSeats.length > 0;
  const findMySeatLabels = {
    title: t.reservationDetails.findMySeatTitle,
    description: t.reservationDetails.findMySeatDescription,
    showMap: t.reservationDetails.findMySeatShowMap,
    hideMap: t.reservationDetails.findMySeatHideMap,
    stageArea: t.eventDetails.stageArea,
    legendYourSeat: t.reservationDetails.findMySeatLegendYours,
    legendOtherSeat: t.reservationDetails.findMySeatLegendOther,
    legendWheelchair: t.eventDetails.legendWheelchair,
  };
  const ticketReservation = {
    id: reservation.id,
    bankRef: reservation.bankRef,
    seats: reservation.seats.map((seat) => ({
      id: seat.id,
      row: seat.row,
      number: seat.number,
      label: seat.label,
    })),
    event: {
      title: localizedEvent.title,
      date: reservation.event.date.toISOString(),
      venue: localizedEvent.venue,
      imageUrl: reservation.event.imageUrl,
      currency: reservation.event.currency,
      sponsors: reservation.event.sponsors || [],
    },
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans py-8 px-4 sm:px-6 lg:px-8 lg:py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
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
            {isPending && (
              <div className="space-y-6">
                <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <BuildingLibraryIcon className="h-6 w-6 text-emerald-400 mr-2" />
                    {t.reservationDetails.transferInstructions}
                  </h3>
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    {t.reservationDetails.instructionsDescription}
                  </p>

                  <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-600 bg-gray-800 p-4">
                      <p className="mb-1 text-sm text-gray-400">
                        {t.reservationDetails.bankName}
                      </p>
                      <p className="font-semibold text-white">
                        {locale === "zh-TW"
                          ? reservation.event.bankNameZhTw ||
                            reservation.event.bankName
                          : reservation.event.bankName}
                      </p>
                    </div>
                    {reservation.event.bankCode && (
                      <div className="rounded-lg border border-gray-600 bg-gray-800 p-4">
                        <p className="mb-1 text-sm text-gray-400">
                          {t.reservationDetails.bankCode}
                        </p>
                        <p className="font-mono text-lg text-white">
                          {reservation.event.bankCode}
                        </p>
                      </div>
                    )}
                    <div className="rounded-lg border border-gray-600 bg-gray-800 p-4">
                      <p className="mb-1 text-sm text-gray-400">
                        {t.reservationDetails.accountHolderName}
                      </p>
                      <p className="text-lg font-semibold text-white">
                        {reservation.event.bankAccountHolder}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-600 bg-gray-800 p-4">
                      <p className="mb-1 text-sm text-gray-400">
                        {t.reservationDetails.accountNumber}
                      </p>
                      <p className="font-mono text-lg text-emerald-400">
                        {reservation.event.bankAccount}
                      </p>
                    </div>
                  </div>

                  <div className="transfer-amount-card mb-6 rounded-xl p-5">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="transfer-amount-label">
                          {t.reservationDetails.ticketAmountLabel}
                        </p>
                        <p className="transfer-amount-small">
                          {reservation.event.currency}
                          {ticketTotal.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="transfer-amount-label">
                          {t.reservationDetails.verificationTopUpLabel}
                        </p>
                        <p className="transfer-amount-small">
                          + {reservation.event.currency}
                          {TRANSFER_VERIFICATION_TOP_UP.toFixed(2)}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className="transfer-amount-label">
                          {t.reservationDetails.amountToTransferLabel}
                        </p>
                        <p className="transfer-amount-total">
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
                    <p className="transfer-amount-disclaimer mt-4 text-sm leading-relaxed">
                      {t.reservationDetails.verificationTopUpDisclaimer.replace(
                        "{amount}",
                        `${reservation.event.currency}${TRANSFER_VERIFICATION_TOP_UP.toFixed(2)}`,
                      )}
                    </p>
                  </div>

                  <div className="transfer-reference-card p-6 rounded-xl flex flex-col items-center justify-center text-center">
                    <p className="transfer-reference-label text-sm mb-1 uppercase tracking-wider font-semibold">
                      {t.reservationDetails.referenceCodeCode}
                    </p>
                    <p className="transfer-reference-code text-3xl sm:text-4xl font-extrabold font-mono tracking-widest break-all">
                      {formatBankRefForTransfer(reservation.bankRef)}
                    </p>
                    {reservation.bankRef && (
                      <CopyClipboardButton
                        value={formatBankRefForTransfer(reservation.bankRef)}
                        copyLabel={t.reservationDetails.copyReferenceCode}
                        copiedLabel={t.reservationDetails.copiedReferenceCode}
                      />
                    )}
                    <p className="transfer-reference-tip text-sm mt-2">
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
                    confirmCancelReservation:
                      t.reservationDetails.confirmCancelReservation,
                    cancellingReservation:
                      t.reservationDetails.cancellingReservation,
                    cancelReservationHelp:
                      t.reservationDetails.cancelReservationHelp,
                  }}
                />
              </div>
            )}

            {isSuccess && reservation.paymentProofUrl && (
              <div className="bg-gray-800/80 rounded-xl p-6 border border-emerald-500/20 space-y-3 no-print">
                <h4 className="text-sm font-semibold text-emerald-300 flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-400 mr-2" />
                  {t.reservationDetails.verifiedReceipt}
                </h4>
                <ProofZoomClient
                  src={reservation.paymentProofUrl}
                  alt={t.reservationDetails.verifiedReceiptAlt}
                  clickToZoomLabel={t.reservationDetails.clickToZoomProof}
                  modalTitleLabel={t.reservationDetails.verifiedReceipt}
                  modalSubTitleLabel={t.reservationDetails.reviewReceiptDetails}
                  footerLabel={t.reservationDetails.receiptVerification}
                  closeLabel={t.reservationDetails.closeView}
                  containerClassName="relative group overflow-hidden rounded-lg border border-gray-700 bg-gray-900/50 flex items-center justify-center p-2 max-h-[220px] w-48 cursor-zoom-in"
                  imageClassName="max-h-[200px] w-auto object-contain rounded transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
            )}

            {isRefundRequested && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 no-print">
                <h3 className="text-lg font-bold text-white">
                  {t.reservationDetails.refundUnderReview}
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  {t.reservationDetails.refundUnderReviewDesc}
                </p>
                {reservation.refundReason && (
                  <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      {t.reservationDetails.refundReasonLabel}
                    </p>
                    <p className="mt-1 text-sm text-gray-200">
                      {reservation.refundReason}
                    </p>
                  </div>
                )}
              </div>
            )}

            {isSuccess && reservation.refundReviewNote && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 no-print">
                <h3 className="text-lg font-bold text-white">
                  {t.reservationDetails.refundRejectedTitle}
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  {t.reservationDetails.refundRejectedDesc}
                </p>
                <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {t.reservationDetails.refundReviewNoteLabel}
                  </p>
                  <p className="mt-1 text-sm text-gray-200">
                    {reservation.refundReviewNote}
                  </p>
                </div>
              </div>
            )}

            {isRefunded && (
              <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-6 no-print">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <CheckCircleIcon className="mr-2 h-5 w-5 text-emerald-400" />
                  {t.reservationDetails.refundProofTitle}
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  {reservation.refundProofUrl
                    ? t.reservationDetails.refundProofDesc
                    : t.reservationDetails.refundProofPending}
                </p>

                {reservation.refundProofUrl && (
                  <div className="mt-4">
                    <ProofZoomClient
                      src={reservation.refundProofUrl}
                      alt={t.reservationDetails.refundProofAlt}
                      clickToZoomLabel={t.reservationDetails.clickToZoomProof}
                      modalTitleLabel={t.reservationDetails.refundProofTitle}
                      modalSubTitleLabel={t.reservationDetails.refundProofDesc}
                      footerLabel={t.reservationDetails.refunded}
                      closeLabel={t.reservationDetails.closeView}
                      containerClassName="relative group overflow-hidden rounded-lg border border-gray-700 bg-gray-900/50 flex items-center justify-center p-2 max-h-[260px] w-56 cursor-zoom-in"
                      imageClassName="max-h-[240px] w-auto object-contain rounded transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Admission Tickets Section */}
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

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print border-b border-gray-700 pb-4 mt-8">
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

                <RefundRequestForm
                  reservationId={reservation.id}
                  labels={{
                    requestRefundTitle: t.reservationDetails.requestRefundTitle,
                    requestRefundDesc: t.reservationDetails.requestRefundDesc,
                    refundReasonLabel: t.reservationDetails.refundReasonLabel,
                    refundReasonPlaceholder:
                      t.reservationDetails.refundReasonPlaceholder,
                    submitRefundRequest:
                      t.reservationDetails.submitRefundRequest,
                    submittingRefundRequest:
                      t.reservationDetails.submittingRefundRequest,
                  }}
                />
              </div>
            )}

            {showFindMySeat && (
              <FindMySeatSection
                seats={eventMapSeats}
                highlightedSeatIds={highlightedSeatIds}
                labels={findMySeatLabels}
              />
            )}

            <div className="no-print">
              <h3 className="text-lg font-bold text-white mb-6 border-b border-gray-700 pb-2">
                {t.reservationDetails.detailsTitle}
              </h3>

              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-400">
                    {t.reservationDetails.eventLabel}
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-white">
                    {localizedEvent.title}
                  </dd>
                </div>

                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-400">
                    {t.reservationDetails.seatsReservedLabel}
                  </dt>
                  <dd className="mt-1 text-md text-white">
                    {formattedSeatList} (
                    {t.reservationDetails.seatsCountText.replace(
                      "{count}",
                      String(reservation.seatCount),
                    )}
                    )
                  </dd>
                </div>

                {reservation.couponCode &&
                  reservation.couponDiscountPercent != null && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-400">
                        {t.reservationDetails.couponAppliedLabel}
                      </dt>
                      <dd className="mt-1 text-md font-mono coupon-discount-text font-semibold">
                        {t.reservationDetails.couponDiscountSummary
                          .replace("{code}", reservation.couponCode)
                          .replace(
                            "{percent}",
                            String(reservation.couponDiscountPercent),
                          )}
                      </dd>
                    </div>
                  )}

                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-400">
                    {t.reservationDetails.totalAmountLabel}
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-emerald-400 flex items-center">
                    <span className="mr-1.5 font-semibold text-emerald-500">
                      {reservation.event.currency}
                    </span>
                    {ticketTotal.toFixed(2)}
                  </dd>
                </div>

                <div className="sm:col-span-1">
                  {isSuccess ? (
                    <>
                      <dt className="text-sm font-medium text-gray-400">
                        {t.reservationDetails.paymentStatusLabel}
                      </dt>
                      <dd className="mt-1 text-md font-bold text-emerald-400 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        {t.reservationDetails.paymentConfirmedStatus}
                      </dd>
                    </>
                  ) : (
                    <>
                      <dt className="text-sm font-medium text-gray-400">
                        {isClosed
                          ? t.reservationDetails.expiredAtLabel
                          : t.reservationDetails.deadlineLabel}
                      </dt>
                      <dd
                        className={`mt-1 text-md font-medium ${isExpired ? "text-red-400" : "text-amber-400"}`}
                      >
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
                    </>
                  )}
                </div>

                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-400">
                    {t.reservationDetails.reservationIdLabel}
                  </dt>
                  <dd className="mt-1 text-sm font-mono text-gray-300 truncate">
                    {reservation.id}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
