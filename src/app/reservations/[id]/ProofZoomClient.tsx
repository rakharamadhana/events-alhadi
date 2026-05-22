"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, MagnifyingGlassPlusIcon } from "@heroicons/react/24/outline";

interface ProofZoomClientProps {
  src: string;
  alt?: string;
  containerClassName?: string;
  imageClassName?: string;
  clickToZoomLabel?: string;
  modalTitleLabel?: string;
  modalSubTitleLabel?: string;
  footerLabel?: string;
  closeLabel?: string;
}

export default function ProofZoomClient({
  src,
  alt = "Receipt proof",
  containerClassName = "relative group overflow-hidden rounded-xl border border-gray-700 bg-gray-900/50 flex justify-center items-center p-2 max-h-[300px] cursor-zoom-in",
  imageClassName = "max-h-[280px] w-auto object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]",
  clickToZoomLabel = "Click to Zoom Proof",
  modalTitleLabel = "Verified Payment Receipt",
  modalSubTitleLabel = "Review transfer or transaction receipt details",
  footerLabel = "Payment Proof Verification",
  closeLabel = "Close View"
}: ProofZoomClientProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Disable background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Keyboard escape handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className={containerClassName}
      >
        <img
          src={src}
          alt={alt}
          className={imageClassName}
        />
        
        {/* Subtle magnifying glass hover prompt */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="bg-gray-900/90 text-emerald-400 border border-emerald-500/25 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-xl flex items-center gap-1.5">
            <MagnifyingGlassPlusIcon className="h-3.5 w-3.5" />
            {clickToZoomLabel}
          </div>
        </div>
      </div>

      {/* Fullscreen Backdrop Blur Modal */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in no-print"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-800 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl animate-scale-up"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">{modalTitleLabel}</h3>
                <p className="text-[10px] text-gray-400">{modalSubTitleLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-all cursor-pointer"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Main Preview (Image) */}
            <div className="p-6 bg-gray-950 flex justify-center items-center flex-1 overflow-y-auto max-h-[70vh]">
              <img
                src={src}
                alt={alt}
                className="max-w-full max-h-[60vh] w-auto h-auto object-contain rounded-lg shadow-2xl border border-gray-850"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-700 flex items-center justify-between bg-gray-800/55 text-[10px] text-gray-400 px-6">
              <span>{footerLabel}</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 text-[10px] font-bold rounded-lg text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-650 transition-colors cursor-pointer border border-gray-650"
              >
                {closeLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
