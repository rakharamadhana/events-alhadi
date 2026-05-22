"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapPinIcon } from "@heroicons/react/24/outline";

export type FindMySeatMapSeat = {
  id: string;
  label: string;
  row: string;
  number: number;
  status: "AVAILABLE" | "LOCKED" | "SOLD" | "HELD";
};

type FindMySeatMapLabels = {
  stageArea: string;
  legendYourSeat: string;
  legendOtherSeat: string;
  legendWheelchair: string;
};

type FindMySeatMapProps = {
  seats: FindMySeatMapSeat[];
  highlightedSeatIds: string[];
  labels: FindMySeatMapLabels;
};

function isWheelchairSeat(label: string) {
  return label.includes("♿") || label.toLowerCase().startsWith("w");
}

function sortRows(rows: string[]) {
  return [...rows].sort((a, b) => {
    const aNum = Number(a);
    const bNum = Number(b);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
    return a.localeCompare(b);
  });
}

export default function FindMySeatMap({
  seats,
  highlightedSeatIds,
  labels,
}: FindMySeatMapProps) {
  const highlightSet = useMemo(
    () => new Set(highlightedSeatIds),
    [highlightedSeatIds],
  );
  const firstHighlightRef = useRef<HTMLDivElement | null>(null);

  const uniqueRows = useMemo(
    () => sortRows([...new Set(seats.map((s) => s.row))]),
    [seats],
  );

  const rows = useMemo(() => {
    const grouped: Record<string, FindMySeatMapSeat[]> = {};
    for (const seat of seats) {
      if (!grouped[seat.row]) grouped[seat.row] = [];
      grouped[seat.row].push(seat);
    }
    return grouped;
  }, [seats]);

  const colCount = useMemo(() => {
    if (seats.length === 0) return 0;
    return Math.max(...seats.map((s) => s.number), 0);
  }, [seats]);

  useEffect(() => {
    firstHighlightRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }, [highlightedSeatIds]);

  if (seats.length === 0 || highlightedSeatIds.length === 0) {
    return null;
  }

  const size = 44;
  const gap = 8;
  const labelWidth = 32;
  const labelSize = 11;
  const seatFontSize = 9;

  const isCellOccupiedByWheelchairSpan = (
    rowLabel: string,
    colIndex: number,
  ) => {
    const rowIndex = uniqueRows.indexOf(rowLabel);
    const seatLeft = rows[rowLabel]?.find((s) => s.number === colIndex - 1);
    if (seatLeft && isWheelchairSeat(seatLeft.label)) return true;

    if (rowIndex > 0) {
      const rowAbove = uniqueRows[rowIndex - 1];
      const seatAbove = rows[rowAbove]?.find((s) => s.number === colIndex);
      if (seatAbove && isWheelchairSeat(seatAbove.label)) return true;

      const seatAboveLeft = rows[rowAbove]?.find(
        (s) => s.number === colIndex - 1,
      );
      if (seatAboveLeft && isWheelchairSeat(seatAboveLeft.label)) return true;
    }

    return false;
  };

  const cells: React.ReactNode[] = [];

  uniqueRows.forEach((rowLabel, rowIndex) => {
    const rowSeats = rows[rowLabel] || [];
    const cols = Array.from({ length: colCount }, (_, i) => i + 1);

    cells.push(
      <div
        key={`label-${rowLabel}`}
        className="flex h-full select-none items-center justify-center text-center font-bold text-gray-500"
        style={{
          gridRow: `${rowIndex + 1}`,
          gridColumn: "1",
          fontSize: `${labelSize}px`,
          zIndex: 10,
        }}
      >
        {rowLabel}
      </div>,
    );

    cols.forEach((colIndex) => {
      if (isCellOccupiedByWheelchairSpan(rowLabel, colIndex)) return;

      const seat = rowSeats.find((s) => s.number === colIndex);

      if (!seat) {
        cells.push(
          <div
            key={`gap-${rowLabel}-${colIndex}`}
            className="flex-shrink-0"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              gridRow: `${rowIndex + 1}`,
              gridColumn: `${colIndex + 1}`,
            }}
          />,
        );
        return;
      }

      const isHighlighted = highlightSet.has(seat.id);
      const isWheelchair = isWheelchairSeat(seat.label);
      const isFirstHighlight =
        isHighlighted && seat.id === highlightedSeatIds[0];

      cells.push(
        <div
          key={seat.id}
          ref={isFirstHighlight ? firstHighlightRef : undefined}
          title={seat.label}
          className={`
            relative flex flex-shrink-0 flex-col items-center justify-center rounded-b-sm rounded-t-lg border-2 font-semibold transition-all
            ${
              isHighlighted
                ? "z-30 border-emerald-200 bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 ring-2 ring-emerald-300 animate-pulse"
                : isWheelchair
                  ? "z-10 border-sky-900/40 bg-sky-950/40 text-sky-300/70 opacity-50"
                  : "z-10 border-gray-800 bg-gray-800/60 text-gray-500 opacity-45"
            }
          `}
          style={{
            width: isWheelchair ? "100%" : `${size}px`,
            height: isWheelchair ? "100%" : `${size}px`,
            fontSize: `${seatFontSize}px`,
            gridRow: isWheelchair ? `${rowIndex + 1} / span 2` : `${rowIndex + 1}`,
            gridColumn: isWheelchair
              ? `${colIndex + 1} / span 2`
              : `${colIndex + 1}`,
            alignSelf: isWheelchair ? "stretch" : "center",
            justifySelf: isWheelchair ? "stretch" : "center",
          }}
        >
          {isHighlighted && (
            <MapPinIcon
              className="absolute -right-1 -top-1 h-3.5 w-3.5 text-emerald-100 drop-shadow"
              aria-hidden
            />
          )}
          {isWheelchair ? (
            <svg
              className={isHighlighted ? "text-white" : "text-sky-400/80"}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              style={{ width: 14, height: 14 }}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 14a2 2 0 11-4 0 2 2 0 014 0zM8 21a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1M8 11h6M8 15h3"
              />
            </svg>
          ) : null}
          <span
            className="max-w-full truncate px-0.5 font-bold"
            style={{ fontSize: `${seatFontSize + 1}px` }}
          >
            {seat.label}
          </span>
        </div>,
      );
    });
  });

  return (
    <div className="find-my-seat-map space-y-6">
      <div className="relative mx-auto mb-10 flex h-12 w-full max-w-2xl flex-col items-center justify-center overflow-hidden rounded-b-3xl border-x border-t-4 border-emerald-400 bg-gradient-to-r from-emerald-950/40 via-emerald-800/20 to-emerald-950/40 shadow-[0_0_30px_rgba(52,211,153,0.12)]">
        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-400 sm:text-sm">
          {labels.stageArea}
        </span>
      </div>

      <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `${labelWidth}px repeat(${colCount}, ${size}px)`,
            gridTemplateRows: `repeat(${uniqueRows.length}, ${size}px)`,
            columnGap: `${gap}px`,
            rowGap: `${gap * 2.2}px`,
            justifyContent: "center",
            alignItems: "center",
            minWidth: "max-content",
            margin: "0 auto",
            paddingBottom: "24px",
          }}
        >
          {cells}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-5 border-t border-gray-700/80 pt-5 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-t-lg border-2 border-emerald-200 bg-emerald-500 shadow-md shadow-emerald-500/30" />
          <span className="text-gray-300">{labels.legendYourSeat}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-t-lg border-2 border-gray-800 bg-gray-800/70 opacity-50" />
          <span className="text-gray-400">{labels.legendOtherSeat}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-t-lg border-2 border-sky-900/50 bg-sky-950/50 opacity-60">
            <svg
              className="h-3.5 w-3.5 text-sky-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 14a2 2 0 11-4 0 2 2 0 014 0zM8 21a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1M8 11h6M8 15h3"
              />
            </svg>
          </div>
          <span className="text-gray-400">{labels.legendWheelchair}</span>
        </div>
      </div>
    </div>
  );
}
