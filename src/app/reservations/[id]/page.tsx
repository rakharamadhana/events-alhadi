import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatSeatLabelsForDisplay } from "@/lib/seatLabel";
import { getI18n } from "@/lib/i18n";
import { localizeEvent } from "@/lib/i18n.shared";
import type { Metadata } from "next";
import ReservationClient from "./ReservationClient";

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
  const isAnySeatCheckedIn = reservation.seats.some((s) => s.isCheckedIn);
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
      isCheckedIn: seat.isCheckedIn,
    })),
    event: {
      title: localizedEvent.title,
      date: reservation.event.date.toISOString(),
      venue: localizedEvent.venue,
      imageUrl: reservation.event.imageUrl,
      currency: reservation.event.currency,
      sponsors: JSON.parse(JSON.stringify(reservation.event.sponsors || [])),
    },
  };
  return (
    <ReservationClient
      reservation={JSON.parse(JSON.stringify(reservation))}
      locale={locale}
      t={t}
      localizedEvent={localizedEvent}
      formattedSeatList={formattedSeatList}
      eventMapSeats={eventMapSeats}
      highlightedSeatIds={highlightedSeatIds}
      showFindMySeat={showFindMySeat}
      ticketTotal={ticketTotal}
      transferAmountDue={transferAmountDue}
      TRANSFER_VERIFICATION_TOP_UP={TRANSFER_VERIFICATION_TOP_UP}
      seatLabelFormat={seatLabelFormat}
      ticketReservation={ticketReservation}
      isPending={isPending}
      isSuccess={isSuccess}
      isRefundRequested={isRefundRequested}
      isRefunded={isRefunded}
      isExpired={isExpired}
      isClosed={isClosed}
      isAnySeatCheckedIn={isAnySeatCheckedIn}
      findMySeatLabels={findMySeatLabels}
    />
  );
}
