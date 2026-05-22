"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  TicketIcon,
  QrCodeIcon
} from "@heroicons/react/24/outline";
import { formatBankRefForTransfer } from "@/lib/bankRef";
import {
  formatSeatLabelForDisplay,
  type SeatLabelFormat,
} from "@/lib/seatLabel";

interface Seat {
  id: string;
  row: string;
  number: number;
  label: string;
}

interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  tier: "PLATINUM" | "GOLD" | "SILVER" | "BRONZE";
}

interface Event {
  title: string;
  date: Date | string;
  venue: string;
  imageUrl?: string | null;
  currency: string;
  sponsors?: Sponsor[];
}

interface Reservation {
  id: string;
  bankRef?: string | null;
  seats: Seat[];
  event: Event;
}

interface TicketZoomSliderProps {
  reservation: Reservation;
  t: any;
  locale: string;
  seatLabelFormat: SeatLabelFormat;
}

function TicketSponsorRibbon({ sponsors, isZoomed = false }: { sponsors: Sponsor[]; isZoomed?: boolean }) {
  if (!sponsors || sponsors.length === 0) return null;

  const sortedSponsors = [...sponsors].sort((a, b) => {
    const TIER_ORDER = { PLATINUM: 0, GOLD: 1, SILVER: 2, BRONZE: 3 };
    return TIER_ORDER[a.tier as keyof typeof TIER_ORDER] - TIER_ORDER[b.tier as keyof typeof TIER_ORDER];
  });

  return (
    <div className="border-t border-gray-700/40 pt-3 mt-3">
      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2">
        {isZoomed ? "Proudly Sponsored By" : "Sponsored By"}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {sortedSponsors.map((sponsor) => {
          let sizeClasses = "h-7 md:h-9 max-w-[100px]"; // default platinum std
          if (isZoomed) {
            if (sponsor.tier === "PLATINUM") sizeClasses = "h-9 md:h-11 max-w-[130px]";
            else if (sponsor.tier === "GOLD") sizeClasses = "h-8 md:h-9.5 max-w-[110px]";
            else if (sponsor.tier === "SILVER") sizeClasses = "h-7 md:h-8 max-w-[90px]";
            else if (sponsor.tier === "BRONZE") sizeClasses = "h-6 md:h-7 max-w-[75px]";
          } else {
            if (sponsor.tier === "PLATINUM") sizeClasses = "h-7 md:h-9 max-w-[100px]";
            else if (sponsor.tier === "GOLD") sizeClasses = "h-6.5 md:h-8 max-w-[85px]";
            else if (sponsor.tier === "SILVER") sizeClasses = "h-6 md:h-7 max-w-[75px]";
            else if (sponsor.tier === "BRONZE") sizeClasses = "h-5.5 md:h-6 max-w-[65px]";
          }

          let tierBorder = "border-purple-500/20";
          if (sponsor.tier === "GOLD") tierBorder = "border-amber-500/20";
          else if (sponsor.tier === "SILVER") tierBorder = "border-slate-400/20";
          else if (sponsor.tier === "BRONZE") tierBorder = "border-orange-700/20";

          return (
            <div
              key={sponsor.id}
              className="relative flex items-center justify-center transition-all duration-300 hover:scale-105 shrink-0"
              title={`${sponsor.name} (${sponsor.tier})`}
            >
              {sponsor.logoUrl ? (
                <img
                  src={sponsor.logoUrl}
                  alt={sponsor.name}
                  className={`${sizeClasses} object-contain filter brightness-90 contrast-[1.05] hover:brightness-100 transition-all duration-300`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent) {
                      const fallback = parent.querySelector('.fallback-badge');
                      if (fallback) fallback.classList.remove('hidden');
                    }
                  }}
                />
              ) : null}

              <div
                className={`fallback-badge ${sponsor.logoUrl ? 'hidden' : ''} bg-gray-900/60 backdrop-blur-md border ${tierBorder} px-2 py-1 rounded-md text-center max-w-[100px] truncate`}
              >
                <span className="text-[8px] md:text-[9px] font-black text-gray-300 tracking-wide uppercase select-none">
                  {sponsor.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TicketZoomSlider({
  reservation,
  t,
  locale,
  seatLabelFormat,
}: TicketZoomSliderProps) {
  const formatSeat = (label: string) =>
    formatSeatLabelForDisplay(label, seatLabelFormat);
  const [activeZoomIndex, setActiveZoomIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX - touchEndX;
    
    // swipe sensitivity (50px)
    const minSwipeDistance = 50;

    if (diffX > minSwipeDistance) {
      // Swipe Left -> Next ticket
      handleNext();
    } else if (diffX < -minSwipeDistance) {
      // Swipe Right -> Previous ticket
      handlePrev();
    }

    setTouchStartX(null);
  };

  const handlePrev = useCallback(() => {
    if (activeZoomIndex === null) return;
    setActiveZoomIndex((prev) => 
      prev !== null ? (prev === 0 ? reservation.seats.length - 1 : prev - 1) : null
    );
  }, [activeZoomIndex, reservation.seats.length]);

  const handleNext = useCallback(() => {
    if (activeZoomIndex === null) return;
    setActiveZoomIndex((prev) => 
      prev !== null ? (prev === reservation.seats.length - 1 ? 0 : prev + 1) : null
    );
  }, [activeZoomIndex, reservation.seats.length]);

  const handleClose = useCallback(() => {
    setActiveZoomIndex(null);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (activeZoomIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeZoomIndex, handlePrev, handleNext, handleClose]);

  // Disable background scrolling when modal is open
  useEffect(() => {
    if (activeZoomIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [activeZoomIndex]);

  return (
    <>
      <div className="grid grid-cols-1 gap-6">
        {reservation.seats.map((seat, index) => {
          const qrData = `${reservation.id}_${seat.id}`;
          // dynamic emerald-colored high contrast QR code
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}&color=047857`;

          return (
            <div
              key={seat.id}
              onClick={() => setActiveZoomIndex(index)}
              className="ticket-card group flex flex-col md:flex-row bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-xl relative min-h-[220px] transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/50 cursor-pointer"
            >
              {/* Interactive Hover Prompt (Hidden in Print) */}
              <div className="absolute inset-0 bg-emerald-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none no-print z-20">
                <div className="bg-gray-900/90 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-full font-bold text-xs shadow-xl flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                  <QrCodeIcon className="h-4 w-4 animate-pulse" />
                  {t.clickToZoomForCheckIn}
                </div>
              </div>

              {/* Left Portion: Ticket Main Info */}
              <div className="flex-1 flex flex-col">
                {/* Event Header artwork banner */}
                {reservation.event.imageUrl ? (
                  <div className="h-28 w-full relative bg-gray-950">
                    <img
                      src={reservation.event.imageUrl}
                      alt={reservation.event.title}
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-880 to-transparent" />
                    <div className="absolute bottom-3 left-4">
                      <span className="official-admission-badge text-[10px] uppercase font-extrabold tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-500/30">
                        {t.officialAdmission}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-28 w-full bg-gradient-to-r from-emerald-600 to-teal-700 relative flex flex-col justify-end p-4 overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="relative">
                      <span className="official-admission-badge text-[10px] uppercase font-extrabold tracking-widest text-emerald-100 bg-emerald-800/80 px-2.5 py-1 rounded border border-emerald-500/20">
                        {t.officialAdmission}
                      </span>
                    </div>
                  </div>
                )}

                {/* Metadata Fields */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{t.eventName}</p>
                        <h4 className="text-lg font-bold text-white leading-snug">{reservation.event.title}</h4>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{t.serialNumber}</p>
                        <p className="text-xs font-mono font-bold text-gray-300">
                          {reservation.id.slice(0, 8).toUpperCase()}-{seat.id.slice(-6).toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-gray-700/50 pt-3">
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{t.dateTime}</p>
                        <p className="text-sm font-semibold text-white mt-0.5">
                          {new Date(reservation.event.date).toLocaleDateString(locale === "zh-TW" ? "zh-TW" : "en-US", {
                            month: "short", day: "numeric", year: "numeric"
                          })}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(reservation.event.date).toLocaleTimeString(locale === "zh-TW" ? "zh-TW" : "en-US", {
                            hour: "2-digit", minute: "2-digit"
                          })}
                        </p>
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{t.venue}</p>
                        <p className="text-sm font-semibold text-white mt-0.5 line-clamp-2">{reservation.event.venue}</p>
                      </div>
                    </div>

                    {/* Event Sponsors Row */}
                    {reservation.event.sponsors && reservation.event.sponsors.length > 0 && (
                      <TicketSponsorRibbon sponsors={reservation.event.sponsors} />
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-700/50 flex justify-between items-center bg-gray-900/40 -mx-5 -mb-5 px-5 py-3 rounded-b-2xl md:rounded-b-none md:rounded-bl-2xl">
                    <div>
                      <span className="text-[9px] text-gray-400 block uppercase font-medium">{t.referenceCode}</span>
                      <p className="text-xs font-mono font-bold text-emerald-400">{reservation.bankRef ? formatBankRefForTransfer(reservation.bankRef) : t.verifiedMember}</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-1 text-center">
                      <span className="text-[9px] text-emerald-300 font-semibold block uppercase tracking-wide">{t.assignedSeat}</span>
                      <p className="text-sm font-bold text-white font-mono">
                        {formatSeat(seat.label)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vertical Separator with punch hole cut-outs */}
              <div className="hidden md:flex flex-col items-center justify-between py-2 relative w-6 z-10">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gray-900 border border-gray-700 punch-hole" />
                <div className="h-full border-l border-dashed border-gray-600" />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gray-900 border border-gray-700 punch-hole" />
              </div>

              {/* Right Portion: Ticket Tear-off Stub */}
              <div className="ticket-stub md:w-52 bg-gray-800/50 p-5 flex flex-row md:flex-col justify-between items-center border-t md:border-t-0 md:border-l border-gray-700/50 gap-4">
                <div className="text-left md:text-center space-y-1">
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">{t.ticketStub}</p>
                  <h5 className="text-xs font-bold text-white truncate max-w-[120px] md:max-w-none">{reservation.event.title}</h5>
                  <p className="text-[9px] font-mono text-gray-400 truncate">REF: {formatBankRefForTransfer(reservation.bankRef)}</p>
                </div>

                <div className="bg-white p-2 rounded-xl border border-gray-700 flex items-center justify-center shadow-inner">
                  <img
                    src={qrUrl}
                    alt="Check-in QR Code"
                    className="w-20 h-20 object-contain animate-fade-in"
                  />
                </div>

                <div className="text-right md:text-center space-y-0.5">
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider block">{t.yourSeat}</span>
                  <p className="text-md font-extrabold text-emerald-400 font-mono">
                    {formatSeat(seat.label)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ticket Zoom & Navigation Overlay Modal */}
      {activeZoomIndex !== null && (
        <div className="fixed inset-0 bg-gray-950/95 backdrop-blur-md z-[150] flex h-[100dvh] flex-col gap-3 overflow-hidden p-3 sm:p-6 no-print">
          {/* Modal Top Control Bar */}
          <div className="flex w-full max-w-lg shrink-0 items-center justify-between mx-auto">
            <div className="flex items-center gap-2">
              <TicketIcon className="h-5 w-5 text-emerald-400 sm:h-6 sm:w-6" />
              <div>
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">{t.mobileTicket}</h4>
                <p className="hidden text-[10px] text-gray-400 sm:block">{t.scanAtEntryPoint}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-white p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 rounded-full transition-all cursor-pointer shadow-lg"
              aria-label="Close ticket"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Main Slider Area */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            {/* Desktop / Large screen navigation arrow: Left */}
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-3 bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800 hover:border-gray-700 rounded-full transition-all cursor-pointer shadow-2xl z-30 hidden sm:flex"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>

            {/* Ticket Zoomed Content Card */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="relative flex max-h-full w-full max-w-sm touch-pan-y flex-col overflow-hidden rounded-3xl border border-gray-880 bg-gray-900 shadow-2xl"
            >
              {/* Event Header Card Image/Gradient Banner */}
              {reservation.event.imageUrl ? (
                <div className="relative h-24 w-full shrink-0 bg-gray-950 sm:h-32">
                  <img
                    src={reservation.event.imageUrl}
                    alt={reservation.event.title}
                    className="w-full h-full object-cover opacity-70"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                  <div className="absolute bottom-3 left-4 flex items-center gap-2 sm:bottom-4 sm:left-5">
                    <span className="text-[9px] uppercase font-black tracking-widest text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/20">
                      {t.secureEntry}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative flex h-24 w-full shrink-0 flex-col justify-end overflow-hidden bg-gradient-to-br from-emerald-700 to-teal-800 p-4 sm:h-32 sm:p-5">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="relative">
                    <span className="text-[9px] uppercase font-black tracking-widest text-emerald-100 bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-500/20">
                      {t.secureEntry}
                    </span>
                  </div>
                </div>
              )}

              {/* Zoomed Ticket Details and Centered QR Code */}
              <div className="flex min-h-0 flex-1 flex-col justify-between gap-4 overflow-y-auto p-4 sm:gap-6 sm:p-6 custom-scrollbar">
                <div className="text-center space-y-1">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                    {t.ticketIndexText.replace("{index}", String(activeZoomIndex + 1)).replace("{total}", String(reservation.seats.length))}
                  </span>
                  <h3 className="text-lg font-black text-white tracking-tight leading-snug line-clamp-2 sm:text-xl">
                    {reservation.event.title}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono">
                    ID: {reservation.id.slice(0, 8).toUpperCase()}-{reservation.seats[activeZoomIndex].id.slice(-6).toUpperCase()}
                  </p>
                </div>

                {/* Massive Scanner-Optimized QR Code */}
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-800 bg-gray-950/50 p-3 sm:gap-3 sm:p-4">
                  <div className="flex items-center justify-center rounded-2xl border-4 border-emerald-500/20 bg-white p-2 shadow-xl sm:p-3">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        `${reservation.id}_${reservation.seats[activeZoomIndex].id}`
                      )}&color=047857`}
                      alt="Check-in QR Code Large"
                      className="h-36 w-36 object-contain sm:h-44 sm:w-44"
                    />
                  </div>
                  <p className="text-[9px] text-gray-500 font-medium">{t.pleasePresentQrCode}</p>
                </div>

                {/* Assigned Seat Block (Extra large for ushers) */}
                <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-center shadow-inner sm:py-3">
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest leading-none mb-1">
                    {t.assignedSeat}
                  </span>
                  <p className="text-lg font-black text-white font-mono leading-none sm:text-xl">
                    {formatSeat(reservation.seats[activeZoomIndex].label)}
                  </p>
                </div>

                {/* Micro Event Details */}
                <div className="grid grid-cols-2 gap-3 border-t border-gray-805 pt-3 text-xs text-gray-400 sm:gap-4 sm:pt-4">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider block font-semibold text-gray-500">{t.dateTime}</span>
                    <span className="font-bold text-white block mt-0.5">
                      {new Date(reservation.event.date).toLocaleDateString(locale === "zh-TW" ? "zh-TW" : "en-US", {
                        month: "short", day: "numeric", year: "numeric"
                      })}
                    </span>
                    <span className="block text-[10px]">
                      {new Date(reservation.event.date).toLocaleTimeString(locale === "zh-TW" ? "zh-TW" : "en-US", {
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider block font-semibold text-gray-500">{t.venue}</span>
                    <span className="font-bold text-white block mt-0.5 line-clamp-2">
                      {reservation.event.venue}
                    </span>
                  </div>
                </div>

                {/* Event Sponsors Row (Zoomed Ticket) */}
                {reservation.event.sponsors && reservation.event.sponsors.length > 0 && (
                  <TicketSponsorRibbon sponsors={reservation.event.sponsors} isZoomed={true} />
                )}
              </div>

              {/* Bottom Card Tear-off effect */}
              <div className="relative flex h-3 shrink-0 items-center justify-between border-t border-gray-850 bg-gray-950 px-6">
                <div className="absolute -left-3 -top-1.5 w-6 h-6 rounded-full bg-gray-950 border border-gray-950" />
                <div className="w-full border-t border-dashed border-gray-800" />
                <div className="absolute -right-3 -top-1.5 w-6 h-6 rounded-full bg-gray-950 border border-gray-950" />
              </div>

              {/* Card Footer */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-850 bg-gray-950/80 px-4 py-3 text-center text-[10px] font-semibold text-gray-400 sm:px-6 sm:py-4">
                <span className="truncate">REF: {reservation.bankRef ? formatBankRefForTransfer(reservation.bankRef) : t.verifiedMember}</span>
                <span className="text-emerald-400">{t.officialAdmission}</span>
              </div>
            </div>

            {/* Desktop / Large screen navigation arrow: Right */}
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-3 bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800 hover:border-gray-700 rounded-full transition-all cursor-pointer shadow-2xl z-30 hidden sm:flex"
            >
              <ChevronRightIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Modal Bottom Controls for Swipe / Mobile Navigation */}
          <div className="w-full max-w-md shrink-0 mx-auto space-y-2 pb-[env(safe-area-inset-bottom)] text-center sm:space-y-4">
            {/* Quick Arrow buttons for Mobile */}
            <div className="flex sm:hidden items-center justify-center gap-4">
              <button
                type="button"
                onClick={handlePrev}
                className="text-gray-400 hover:text-white p-2.5 bg-gray-900 border border-gray-800 rounded-full active:scale-95 transition-all shadow-xl"
                aria-label="Previous ticket"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <span className="text-xs font-mono font-bold text-gray-300 px-3 py-1 bg-gray-900 border border-gray-800 rounded-full">
                {activeZoomIndex + 1} / {reservation.seats.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="text-gray-400 hover:text-white p-2.5 bg-gray-900 border border-gray-800 rounded-full active:scale-95 transition-all shadow-xl"
                aria-label="Next ticket"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Slide Indicator Dots for larger & smaller screens */}
            <div className="flex justify-center gap-2">
              {reservation.seats.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveZoomIndex(idx)}
                  className={`h-2.5 rounded-full transition-all cursor-pointer ${
                    idx === activeZoomIndex 
                      ? "w-8 bg-emerald-500" 
                      : "w-2.5 bg-gray-700 hover:bg-gray-600"
                  }`}
                  aria-label={`Go to ticket ${idx + 1}`}
                />
              ))}
            </div>

            {/* Helper Help Text */}
            <p className="hidden text-[10px] text-gray-500 leading-normal max-w-xs mx-auto sm:block">
              {t.swipeInstructions}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
