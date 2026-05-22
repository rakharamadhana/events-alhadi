"use client";

import { useState } from "react";
import { ChevronDownIcon, MapPinIcon } from "@heroicons/react/24/outline";
import FindMySeatMap, { type FindMySeatMapSeat } from "./FindMySeatMap";

type FindMySeatSectionProps = {
  seats: FindMySeatMapSeat[];
  highlightedSeatIds: string[];
  labels: {
    title: string;
    description: string;
    showMap: string;
    hideMap: string;
    stageArea: string;
    legendYourSeat: string;
    legendOtherSeat: string;
    legendWheelchair: string;
  };
};

export default function FindMySeatSection({
  seats,
  highlightedSeatIds,
  labels,
}: FindMySeatSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (highlightedSeatIds.length === 0 || seats.length === 0) {
    return null;
  }

  return (
    <section className="find-my-seat-section no-print rounded-2xl border border-gray-700/80 bg-gray-800/40 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center text-lg font-bold text-white sm:text-xl">
            <MapPinIcon className="mr-2 h-6 w-6 text-emerald-400" />
            {labels.title}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-400">
            {labels.description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
          aria-expanded={isOpen}
        >
          {isOpen ? labels.hideMap : labels.showMap}
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </div>

      {isOpen && (
        <div className="mt-6">
          <FindMySeatMap
            seats={seats}
            highlightedSeatIds={highlightedSeatIds}
            labels={{
              stageArea: labels.stageArea,
              legendYourSeat: labels.legendYourSeat,
              legendOtherSeat: labels.legendOtherSeat,
              legendWheelchair: labels.legendWheelchair,
            }}
          />
        </div>
      )}
    </section>
  );
}
