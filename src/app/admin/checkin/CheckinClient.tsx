"use client";

import React, { useState, useMemo, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  QrCodeIcon,
  CheckIcon,
  UserIcon,
  MapPinIcon,
  ChartBarIcon,
  XMarkIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { checkInParticipant, toggleSeatCheckIn } from "@/app/actions/checkin";
import Link from "next/link";

function playCheckInSound(type: "success" | "warning" | "error") {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    if (type === "success") {
      // Satisfying double-beep success chime (e.g., C5 [523.25Hz] -> E5 [659.25Hz])
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.32);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.32);
    } else if (type === "warning") {
      // Informative warning slide (300Hz -> 200Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else {
      // Clear sawtooth error buzz (120Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sawtooth";
      
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (err) {
    console.warn("Web Audio API not allowed or supported on this device/browser context", err);
  }
}


type Event = {
  id: string;
  title: string;
  titleZhTw?: string | null;
  date: string;
  venue: string;
  venueZhTw?: string | null;
  isActive: boolean;
};

type Seat = {
  id: string;
  eventId: string;
  label: string;
  row: string;
  number: number;
  price: number;
  status: "AVAILABLE" | "LOCKED" | "SOLD" | "HELD";
  isCheckedIn: boolean;
  checkedInAt?: string | null;
  reservationId?: string | null;
  reservation?: {
    id: string;
    status: string;
    bankRef?: string | null;
    paymentProofUrl?: string | null;
    user?: {
      id: string;
      name: string;
      email: string;
      profileImageUrl?: string | null;
      city?: string | null;
      country?: string | null;
      gender?: string | null;
      birthYear?: number | null;
    } | null;
  } | null;
};

type CheckinClientProps = {
  events: Event[];
  selectedEventId: string;
  initialSeats: Seat[];
  translations: any;
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

export default function CheckinClient({
  events,
  selectedEventId,
  initialSeats,
  translations,
}: CheckinClientProps) {
  const router = useRouter();
  const t = translations;

  const [seats, setSeats] = useState<Seat[]>(initialSeats);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSeat, setActiveSeat] = useState<Seat | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error" | "warning";
    message: string;
    details?: string;
    show: boolean;
  }>({ type: "success", message: "", show: false });

  // Audio-visual confirmation overlay state
  const [checkInResult, setCheckInResult] = useState<{
    status: "success" | "warning" | "error";
    attendeeName: string;
    seatLabel: string;
    message: string;
    details?: string;
    checkedInAt?: string;
    wasCameraOpen?: boolean;
  } | null>(null);

  // Scanner Modal & Stream States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string>("");
  const [cameraStarting, setCameraStarting] = useState(true);

  // Sync state if initialSeats prop changes
  useEffect(() => {
    setSeats(initialSeats);
    // Refresh active seat if it exists
    if (activeSeat) {
      const updatedActive = initialSeats.find((s) => s.id === activeSeat.id);
      if (updatedActive) {
        setActiveSeat(updatedActive);
      }
    }
  }, [initialSeats]);

  // Autoclose Toast after 4 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Auto-dismiss Success validation overlay after 3.5 seconds
  useEffect(() => {
    if (checkInResult && checkInResult.status === "success") {
      const timer = setTimeout(() => {
        const wasCam = checkInResult.wasCameraOpen;
        setCheckInResult(null);
        if (wasCam) {
          setIsCameraOpen(true); // Restart camera for hands-free scanning
        }
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [checkInResult]);

  // Camera scanner manager effect
  useEffect(() => {
    if (!isCameraOpen) return;

    let html5QrCode: any = null;
    let isActive = true;

    async function initScanner() {
      try {
        setCameraStarting(true);
        setCameraError("");
        
        // Dynamically import to ensure browser APIs like navigator/window are not loaded in node SSR
        const { Html5Qrcode } = await import("html5-qrcode");
        
        // Wait briefly for the DOM element to be fully rendered
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        if (!isActive) return;

        html5QrCode = new Html5Qrcode("qr-scanner-viewport");

        // Attempt listing cameras (this triggers permissions if not yet granted)
        let devices: any[] = [];
        try {
          devices = await Html5Qrcode.getCameras();
          if (isActive) {
            setCameras(devices);
          }
        } catch (e) {
          console.warn("Could not retrieve camera list, starting directly", e);
        }

        const config = {
          fps: 10,
          qrbox: (width: number, height: number) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
        };

        const successCallback = (decodedText: string) => {
          if (!isActive) return;
          // Scanned QR is processed - pass true for isFromCamera
          handleCheckInSubmit(undefined, decodedText, true);
        };

        const errorCallback = () => {
          // Silent verbose scanner errors
        };

        const cameraParam = selectedCameraId ? selectedCameraId : { facingMode: "environment" };

        await html5QrCode.start(cameraParam, config, successCallback, errorCallback);
        
        if (isActive) {
          setCameraStarting(false);
        }
      } catch (err: any) {
        console.error("Camera init error", err);
        if (isActive) {
          setCameraError(err?.message || "Failed to start camera. Please verify camera permissions.");
          setCameraStarting(false);
        }
      }
    }

    initScanner();

    return () => {
      isActive = false;
      if (html5QrCode) {
        try {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
              html5QrCode.clear();
            }).catch((err: any) => console.error("Failed to stop scanning on unmount", err));
          }
        } catch (e) {
          console.error("Error stopping scanner on unmount", e);
        }
      }
    };
  }, [isCameraOpen, selectedCameraId]);

  // Statistics calculation
  const totalTicketsBought = useMemo(() => seats.filter((s) => s.status === "SOLD").length, [seats]);
  const seatsLeft = useMemo(() => seats.filter((s) => s.status === "AVAILABLE").length, [seats]);
  const seatsOccupied = useMemo(() => seats.filter((s) => s.isCheckedIn).length, [seats]);
  const seatsBooked = useMemo(() => seats.filter((s) => s.status === "SOLD" && !s.isCheckedIn).length, [seats]);
  const seatsPending = useMemo(() => seats.filter((s) => s.status === "LOCKED").length, [seats]);

  // Paid users filter (seats that are SOLD and have user profile populated)
  const paidSeats = useMemo(() => seats.filter((s) => s.status === "SOLD" && s.reservation?.user), [seats]);

  // Gender demographics calculation
  const genderData = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalWithGender = 0;

    paidSeats.forEach((s) => {
      const gender = s.reservation?.user?.gender?.trim();
      if (gender) {
        counts[gender] = (counts[gender] || 0) + 1;
        totalWithGender++;
      } else {
        counts["Unspecified"] = (counts["Unspecified"] || 0) + 1;
        totalWithGender++;
      }
    });

    return Object.entries(counts)
      .map(([label, count]) => ({
        label,
        count,
        percent: totalWithGender > 0 ? Math.round((count / totalWithGender) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [paidSeats]);

  // City demographics calculation
  const cityData = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalWithCity = 0;

    paidSeats.forEach((s) => {
      const city = s.reservation?.user?.city?.trim();
      if (city) {
        counts[city] = (counts[city] || 0) + 1;
        totalWithCity++;
      } else {
        counts["Unspecified"] = (counts["Unspecified"] || 0) + 1;
        totalWithCity++;
      }
    });

    return Object.entries(counts)
      .map(([label, count]) => ({
        label,
        count,
        percent: totalWithCity > 0 ? Math.round((count / totalWithCity) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5 cities
  }, [paidSeats]);

  // Nationality demographics calculation
  const nationalityData = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalWithNationality = 0;

    paidSeats.forEach((s) => {
      const country = s.reservation?.user?.country?.trim();
      if (country) {
        counts[country] = (counts[country] || 0) + 1;
        totalWithNationality++;
      } else {
        counts["Unspecified"] = (counts["Unspecified"] || 0) + 1;
        totalWithNationality++;
      }
    });

    return Object.entries(counts)
      .map(([label, count]) => ({
        label,
        count,
        percent: totalWithNationality > 0 ? Math.round((count / totalWithNationality) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5 nationalities
  }, [paidSeats]);

  // Age demographics calculation
  const ageData = useMemo(() => {
    const ageCounts = {
      under18: 0,
      age18to25: 0,
      age26to35: 0,
      age36to45: 0,
      age46to60: 0,
      over60: 0,
      unspecified: 0,
    };
    let totalWithAge = 0;

    paidSeats.forEach((s) => {
      const birthYear = s.reservation?.user?.birthYear;
      if (birthYear) {
        const age = 2026 - birthYear; // Current local year is 2026
        if (age < 18) ageCounts.under18++;
        else if (age <= 25) ageCounts.age18to25++;
        else if (age <= 35) ageCounts.age26to35++;
        else if (age <= 45) ageCounts.age36to45++;
        else if (age <= 60) ageCounts.age46to60++;
        else ageCounts.over60++;
        totalWithAge++;
      } else {
        ageCounts.unspecified++;
        totalWithAge++;
      }
    });

    const labelsMap = {
      under18: "< 18",
      age18to25: "18 - 25",
      age26to35: "26 - 35",
      age36to45: "36 - 45",
      age46to60: "46 - 60",
      over60: "60+",
      unspecified: "Unspecified",
    };

    return Object.entries(ageCounts)
      .map(([key, count]) => ({
        label: labelsMap[key as keyof typeof labelsMap],
        count,
        percent: totalWithAge > 0 ? Math.round((count / totalWithAge) * 100) : 0,
      }))
      .filter((item) => item.count > 0);
  }, [paidSeats]);

  // Live filtered search matches (Name, email, seat label)
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();

    return seats
      .filter((s) => {
        if (s.label.toLowerCase().includes(query)) return true;
        if (s.id.toLowerCase() === query) return true;
        if (s.reservationId?.toLowerCase() === query) return true;

        const user = s.reservation?.user;
        if (user) {
          if (user.name.toLowerCase().includes(query)) return true;
          if (user.email.toLowerCase().includes(query)) return true;
        }
        return false;
      })
      .slice(0, 6);
  }, [searchQuery, seats]);

  // Event handler for QR Code or Manual code checkin submission
  async function handleCheckInSubmit(e?: React.FormEvent, customQuery?: string, isFromCamera?: boolean) {
    if (e) e.preventDefault();
    const query = (customQuery || searchQuery).trim();
    if (!query) return;

    if (isFromCamera) {
      setIsCameraOpen(false); // Close camera before displaying feedback
    }

    setScannerLoading(true);
    try {
      const res = await checkInParticipant(selectedEventId, query);
      if (res.success) {
        // Play success chime!
        playCheckInSound("success");

        setCheckInResult({
          status: "success",
          attendeeName: res.attendeeName || "Participant",
          seatLabel: res.seatLabel || "N/A",
          message: t.admin.checkedInSuccess || "Participant checked in successfully!",
          checkedInAt: res.checkedInAt ? new Date(res.checkedInAt).toISOString() : new Date().toISOString(),
          wasCameraOpen: isFromCamera,
        });

        setToast({
          type: "success",
          message: t.admin.checkedInSuccess || "Participant checked in successfully!",
          details: `${res.attendeeName} (${res.seatLabel})`,
          show: true,
        });
        setSearchQuery(""); // Clear search input box

        // Optimistic UI checkin state update
        setSeats((prev) =>
          prev.map((s) => {
            if (
              s.label.toLowerCase() === res.seatLabel?.toLowerCase() ||
              s.id === query ||
              (query.includes("_") && s.id === query.split("_")[1])
            ) {
              return {
                ...s,
                isCheckedIn: true,
                checkedInAt: res.checkedInAt ? new Date(res.checkedInAt).toISOString() : new Date().toISOString(),
              };
            }
            return s;
          })
        );

        // Update active clicked seat popup if applicable
        if (activeSeat && activeSeat.label.toLowerCase() === res.seatLabel?.toLowerCase()) {
          setActiveSeat((prev) =>
            prev
              ? {
                  ...prev,
                  isCheckedIn: true,
                  checkedInAt: res.checkedInAt ? new Date(res.checkedInAt).toISOString() : new Date().toISOString(),
                }
              : null
          );
        }
        router.refresh();
      } else if (res.isAlreadyCheckedIn) {
        // Play warning slide tone!
        playCheckInSound("warning");

        setCheckInResult({
          status: "warning",
          attendeeName: res.attendeeName || "Participant",
          seatLabel: res.seatLabel || "N/A",
          message: t.admin.alreadyCheckedIn || "Participant already checked in!",
          checkedInAt: res.checkedInAt ? new Date(res.checkedInAt).toISOString() : undefined,
          wasCameraOpen: isFromCamera,
        });

        setToast({
          type: "warning",
          message: t.admin.alreadyCheckedIn || "Participant already checked in!",
          details: `${res.attendeeName} (${res.seatLabel}) at ${new Date(
            res.checkedInAt!
          ).toLocaleTimeString()}`,
          show: true,
        });
      } else {
        // Play error buzz!
        playCheckInSound("error");

        setCheckInResult({
          status: "error",
          attendeeName: "Unknown",
          seatLabel: "N/A",
          message: res.error || "Failed to check in.",
          wasCameraOpen: isFromCamera,
        });

        setToast({
          type: "error",
          message: res.error || "Failed to check in.",
          show: true,
        });
      }
    } catch (err) {
      playCheckInSound("error");
      setCheckInResult({
        status: "error",
        attendeeName: "Unknown",
        seatLabel: "N/A",
        message: "An unexpected error occurred.",
        wasCameraOpen: isFromCamera,
      });
      setToast({
        type: "error",
        message: "An unexpected error occurred.",
        show: true,
      });
    } finally {
      setScannerLoading(false);
    }
  }

  // Handle manual toggle (Check-in/Undo checkin) on seat card popup click
  async function handleToggleCheckInClick(seatId: string) {
    try {
      const res = await toggleSeatCheckIn(selectedEventId, seatId);
      if (res.success) {
        if (res.isCheckedIn) {
          playCheckInSound("success");
        } else {
          playCheckInSound("warning");
        }
        setToast({
          type: "success",
          message: res.isCheckedIn
            ? (t.admin.checkedInSuccess || "Participant checked in successfully!")
            : "Check-in undone successfully!",
          details: `${res.attendeeName} (${res.seatLabel})`,
          show: true,
        });

        // Update local seats array
        setSeats((prev) =>
          prev.map((s) => {
            if (s.id === seatId) {
              return {
                ...s,
                isCheckedIn: res.isCheckedIn ?? false,
                checkedInAt: res.checkedInAt ? new Date(res.checkedInAt).toISOString() : null,
              };
            }
            return s;
          })
        );

        // Update active seat details
        if (activeSeat && activeSeat.id === seatId) {
          setActiveSeat((prev) =>
            prev
              ? {
                  ...prev,
                  isCheckedIn: res.isCheckedIn ?? false,
                  checkedInAt: res.checkedInAt ? new Date(res.checkedInAt).toISOString() : null,
                }
              : null
          );
        }
        router.refresh();
      } else {
        setToast({
          type: "error",
          message: res.error || "Failed to toggle check-in.",
          show: true,
        });
      }
    } catch (err) {
      setToast({
        type: "error",
        message: "An unexpected error occurred.",
        show: true,
      });
    }
  }

  // Seating grid pre-calculations identical to FindMySeatMap
  const uniqueRows = useMemo(() => sortRows([...new Set(seats.map((s) => s.row))]), [seats]);
  const rows = useMemo(() => {
    const grouped: Record<string, Seat[]> = {};
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

  const size = 44;
  const gap = 8;
  const labelWidth = 32;
  const labelSize = 11;
  const seatFontSize = 9;

  const isCellOccupiedByWheelchairSpan = (rowLabel: string, colIndex: number) => {
    const rowIndex = uniqueRows.indexOf(rowLabel);
    const seatLeft = rows[rowLabel]?.find((s) => s.number === colIndex - 1);
    if (seatLeft && isWheelchairSeat(seatLeft.label)) return true;

    if (rowIndex > 0) {
      const rowAbove = uniqueRows[rowIndex - 1];
      const seatAbove = rows[rowAbove]?.find((s) => s.number === colIndex);
      if (seatAbove && isWheelchairSeat(seatAbove.label)) return true;

      const seatAboveLeft = rows[rowAbove]?.find((s) => s.number === colIndex - 1);
      if (seatAboveLeft && isWheelchairSeat(seatAboveLeft.label)) return true;
    }
    return false;
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans py-8 px-4 sm:px-6 lg:px-8">
      <style dangerouslySetInnerHTML={{__html: `
        /* Visual Check-in Confirmation Overlay Custom CSS Protection */
        .checkin-alert-modal {
          background-color: var(--page) !important;
          border-color: var(--border-strong) !important;
          color: var(--foreground) !important;
        }
        .checkin-alert-card {
          background-color: var(--surface) !important;
          border-color: var(--border) !important;
        }
        .checkin-alert-title {
          color: var(--foreground) !important;
        }
        .checkin-alert-text-strong {
          color: var(--foreground) !important;
        }
        .checkin-alert-text-muted {
          color: var(--muted-strong) !important;
        }
        .checkin-alert-text-dim {
          color: var(--muted) !important;
        }
        .checkin-alert-border {
          border-color: var(--border) !important;
        }

        /* Status specific icon wrappers and badges (Default Dark Mode) */
        /* SUCCESS */
        .checkin-alert-icon-success {
          background-color: rgba(6, 78, 59, 0.8) !important;
          border-color: #34d399 !important;
          color: #34d399 !important;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3) !important;
        }
        .checkin-alert-accent-success {
          color: #34d399 !important;
        }

        /* WARNING */
        .checkin-alert-icon-warning {
          background-color: rgba(120, 53, 4, 0.8) !important;
          border-color: #fbbf24 !important;
          color: #fbbf24 !important;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.3) !important;
        }
        .checkin-alert-accent-warning {
          color: #fbbf24 !important;
        }

        /* ERROR */
        .checkin-alert-icon-error {
          background-color: rgba(159, 18, 57, 0.8) !important;
          border-color: #f87171 !important;
          color: #f87171 !important;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.3) !important;
        }
        .checkin-alert-accent-error {
          color: #f87171 !important;
        }

        /* Opaque White card and strict high-contrast text overrides for Light Theme */
        :root[data-theme="light"] .checkin-alert-modal,
        [data-theme="light"] .checkin-alert-modal,
        .light .checkin-alert-modal {
          background-color: #fbfaf4 !important;
          border-color: rgba(6, 79, 67, 0.24) !important;
          color: #083f36 !important;
          box-shadow: 0 20px 40px rgba(8, 63, 54, 0.15) !important;
        }

        :root[data-theme="light"] .checkin-alert-card,
        [data-theme="light"] .checkin-alert-card,
        .light .checkin-alert-card {
          background-color: #ffffff !important;
          border-color: rgba(6, 79, 67, 0.16) !important;
          box-shadow: 0 4px 12px rgba(8, 63, 54, 0.05) !important;
        }

        :root[data-theme="light"] .checkin-alert-title,
        [data-theme="light"] .checkin-alert-title,
        .light .checkin-alert-title {
          color: #083f36 !important;
        }

        :root[data-theme="light"] .checkin-alert-text-strong,
        [data-theme="light"] .checkin-alert-text-strong,
        .light .checkin-alert-text-strong {
          color: #083f36 !important;
        }

        :root[data-theme="light"] .checkin-alert-text-muted,
        [data-theme="light"] .checkin-alert-text-muted,
        .light .checkin-alert-text-muted {
          color: #143f36 !important;
        }

        :root[data-theme="light"] .checkin-alert-text-dim,
        [data-theme="light"] .checkin-alert-text-dim,
        .light .checkin-alert-text-dim {
          color: #3b5a50 !important;
        }

        :root[data-theme="light"] .checkin-alert-border,
        [data-theme="light"] .checkin-alert-border,
        .light .checkin-alert-border {
          border-color: rgba(6, 79, 67, 0.12) !important;
        }

        /* Light Theme Status Badges & Icons */
        :root[data-theme="light"] .checkin-alert-icon-success,
        [data-theme="light"] .checkin-alert-icon-success,
        .light .checkin-alert-icon-success {
          background-color: #d1fae5 !important;
          border-color: #10b981 !important;
          color: #047857 !important;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.2) !important;
        }
        :root[data-theme="light"] .checkin-alert-accent-success,
        [data-theme="light"] .checkin-alert-accent-success,
        .light .checkin-alert-accent-success {
          color: #059669 !important;
        }

        :root[data-theme="light"] .checkin-alert-icon-warning,
        [data-theme="light"] .checkin-alert-icon-warning,
        .light .checkin-alert-icon-warning {
          background-color: #fffbeb !important;
          border-color: #f59e0b !important;
          color: #b45309 !important;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.25) !important;
        }
        :root[data-theme="light"] .checkin-alert-accent-warning,
        [data-theme="light"] .checkin-alert-accent-warning,
        .light .checkin-alert-accent-warning {
          color: #c25e00 !important; /* Dark amber-orange for high contrast */
        }

        :root[data-theme="light"] .checkin-alert-icon-error,
        [data-theme="light"] .checkin-alert-icon-error,
        .light .checkin-alert-icon-error {
          background-color: #fef2f2 !important;
          border-color: #ef4444 !important;
          color: #b91c1c !important;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.2) !important;
        }
        :root[data-theme="light"] .checkin-alert-accent-error,
        [data-theme="light"] .checkin-alert-accent-error,
        .light .checkin-alert-accent-error {
          color: #dc2626 !important;
        }

        /* Camera Scanner Modal overrides */
        .scanner-modal-container {
          background-color: #111827 !important; /* Dark Gray-900 */
          border: 1px solid #1f2937 !important; /* Border Gray-800 */
        }
        .scanner-modal-header {
          background-color: rgba(3, 7, 18, 0.4) !important; /* bg-gray-950/40 */
          border-bottom: 1px solid #1f2937 !important;
        }
        .scanner-modal-title {
          color: #ffffff !important;
        }
        .scanner-modal-subtitle {
          color: #9ca3af !important; /* text-gray-400 */
        }
        .scanner-modal-close-btn {
          color: #9ca3af !important;
        }
        .scanner-modal-close-btn:hover {
          color: #ffffff !important;
          background-color: #1f2937 !important;
        }
        .scanner-modal-footer {
          background-color: rgba(3, 7, 18, 0.2) !important; /* bg-gray-950/20 */
          border-top: 1px solid #1f2937 !important;
        }
        .scanner-modal-label {
          color: #9ca3af !important;
        }
        .scanner-modal-select {
          background-color: #1f2937 !important; /* bg-gray-800 */
          border: 1px solid #374151 !important; /* border-gray-700 */
          color: #ffffff !important;
        }
        .scanner-modal-select option {
          background-color: #111827 !important;
          color: #ffffff !important;
        }
        .scanner-modal-loader-bg {
          background-color: rgba(3, 7, 18, 0.9) !important;
        }
        .scanner-modal-loader-title {
          color: #ffffff !important;
        }
        .scanner-modal-loader-subtitle {
          color: #9ca3af !important;
        }
        .scanner-modal-error-bg {
          background-color: rgba(3, 7, 18, 0.95) !important;
        }
        .scanner-modal-error-title {
          color: #f87171 !important; /* text-rose-400 */
        }
        .scanner-modal-error-subtitle {
          color: #9ca3af !important;
        }
        .scanner-modal-error-btn {
          background-color: #1f2937 !important;
          border: 1px solid #374151 !important;
          color: #ffffff !important;
        }
        .scanner-modal-error-btn:hover {
          background-color: #374151 !important;
        }
        @keyframes scan-beam {
          0% { top: 15%; opacity: 0.8; }
          50% { top: 85%; opacity: 0.8; }
          100% { top: 15%; opacity: 0.8; }
        }
        .animate-scan-beam {
          position: absolute;
          animation: scan-beam 2.5s ease-in-out infinite;
        }

        /* Enforce absolute white text for confirmation modal buttons and disable global text-white overrides on them */
        .checkin-btn-white-text,
        button.checkin-btn-white-text,
        div.relative button.checkin-btn-white-text {
          color: #ffffff !important;
        }

        /* Custom style overrides for denial card */
        .checkin-denial-card {
          background-color: #fff1f2 !important; /* Soft rose-50 light background */
          border: 1px solid #fecdd3 !important; /* border-rose-200 */
          color: #be123c !important; /* text-rose-700 */
        }
        .checkin-denial-card .denial-title {
          color: #9f1239 !important; /* text-rose-800 */
        }
        .checkin-denial-card .denial-reason {
          color: #e11d48 !important; /* text-rose-600 */
        }
        .checkin-denial-card .denial-icon {
          color: #e11d48 !important; /* text-rose-600 */
        }

        /* Dark mode overrides for denial card */
        :root[data-theme="dark"] .checkin-denial-card,
        [data-theme="dark"] .checkin-denial-card,
        :root:not([data-theme="light"]) .checkin-denial-card {
          background-color: rgba(159, 18, 57, 0.15) !important; /* bg-rose-950/15 */
          border: 1px solid rgba(244, 63, 94, 0.2) !important; /* border-rose-500/20 */
          color: #fca5a5 !important; /* text-rose-300 */
        }
        :root[data-theme="dark"] .checkin-denial-card .denial-title,
        [data-theme="dark"] .checkin-denial-card .denial-title,
        :root:not([data-theme="light"]) .checkin-denial-card .denial-title {
          color: #ffffff !important; /* text-white */
        }
        :root[data-theme="dark"] .checkin-denial-card .denial-reason,
        [data-theme="dark"] .checkin-denial-card .denial-reason,
        :root:not([data-theme="light"]) .checkin-denial-card .denial-reason {
          color: #9ca3af !important; /* text-gray-400 */
        }
        :root[data-theme="dark"] .checkin-denial-card .denial-icon,
        [data-theme="dark"] .checkin-denial-card .denial-icon,
        :root:not([data-theme="light"]) .checkin-denial-card .denial-icon {
          color: #f87171 !important; /* text-rose-400 */
        }

        /* Custom checkin user icon container style overrides */
        .checkin-user-icon-container {
          background-color: rgba(99, 102, 241, 0.15) !important;
          border: 1px solid rgba(99, 102, 241, 0.3) !important;
          color: #818cf8 !important;
        }

        :root[data-theme="light"] .checkin-user-icon-container,
        [data-theme="light"] .checkin-user-icon-container,
        .light .checkin-user-icon-container {
          background-color: #e0e7ff !important;
          border-color: #c7d2fe !important;
          color: #4f46e5 !important;
        }
      `}} />

      {/* Toast Alert overlay */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 flex max-w-sm w-full rounded-xl border border-gray-700 bg-gray-900/95 p-4 shadow-2xl backdrop-blur transition-all duration-300 animate-slide-in">
          <div className="flex gap-3">
            {toast.type === "success" && (
              <CheckBadgeIcon className="h-6 w-6 text-emerald-400 shrink-0" />
            )}
            {toast.type === "warning" && (
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-400 shrink-0" />
            )}
            {toast.type === "error" && (
              <XMarkIcon className="h-6 w-6 text-rose-500 shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-sm font-bold text-white leading-tight">{toast.message}</p>
              {toast.details && (
                <p className="mt-1 text-xs text-gray-400">{toast.details}</p>
              )}
            </div>
            <button
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="text-gray-500 hover:text-white"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Upper Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <CheckBadgeIcon className="h-8 w-8 text-indigo-400" />
                {t.admin.checkinTitle || "Participant Check-in Desk"}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Scan QR ticket codes, search participants, view live map layout and demography.
              </p>
            </div>
          </div>

          {/* Agenda Switcher */}
          <div className="flex flex-col gap-1 min-w-[240px]">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
              {t.admin.selectEventAgenda || "Select Agenda / Event"}
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                const id = e.target.value;
                startTransition(() => {
                  router.push(`/admin/checkin?eventId=${id}`);
                });
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Highlighted Agenda Details card */}
        {selectedEvent && (
          <div className="bg-gray-900/80 border border-gray-800 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/30">
                <CalendarIcon className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {selectedEvent.title}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-1">
                  <span>📅 {new Date(selectedEvent.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span>📍 {selectedEvent.venue}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-500/30">
                Live Desk Active
              </span>
            </div>
          </div>
        )}

        {/* Dashboard Statistics & Search Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Console search scanner column */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Direct Ticket scanner console */}
            <div className="bg-gray-900/80 border border-gray-800 p-6 rounded-2xl shadow-xl backdrop-blur relative">
              <h3 className="text-sm uppercase font-extrabold text-indigo-400 tracking-wider mb-4 flex items-center gap-2">
                <QrCodeIcon className="h-5 w-5" />
                {t.admin.scanQrCode || "Scan or Type QR Code"}
              </h3>
              
              <div className="flex gap-2">
                <form onSubmit={(e) => handleCheckInSubmit(e)} className="relative flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.admin.checkinScanSearchPlaceholder || "Enter QR, name, email or seat..."}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-12 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-500 transition-all"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
                    </div>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute inset-y-0 right-10 pr-1.5 flex items-center text-gray-400 hover:text-white"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={scannerLoading || !searchQuery.trim()}
                      className="absolute inset-y-1.5 right-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-40"
                    >
                      {scannerLoading ? "..." : (t.admin.checkinButton || "Check In")}
                    </button>
                  </div>
                </form>
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="p-3 rounded-xl bg-gray-800 hover:bg-gray-705 border border-gray-700 text-gray-400 hover:text-white transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-sm"
                  title="Scan QR Code with Camera"
                >
                  <QrCodeIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Dynamic search suggestions matched dropdown */}
              {searchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-40 max-h-[300px] overflow-y-auto custom-scrollbar">
                  <div className="p-2 border-b border-gray-800 text-[10px] font-bold text-gray-500 tracking-wider bg-gray-950/40">
                    MATCHED TICKETS ({searchMatches.length})
                  </div>
                  {searchMatches.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500">
                      No matching reservations found.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-850">
                      {searchMatches.map((seat) => (
                        <div
                          key={seat.id}
                          onClick={() => {
                            setActiveSeat(seat);
                          }}
                          className="p-3 hover:bg-gray-800 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">
                                {seat.label}
                              </span>
                              <span className="font-bold text-xs text-white truncate">
                                {seat.reservation?.user?.name || "Anonymous"}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 truncate mt-0.5">
                              {seat.reservation?.user?.email || "No email"}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {seat.isCheckedIn ? (
                              <span className="text-[9px] uppercase font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <CheckIcon className="h-3 w-3 shrink-0" /> Arrived
                              </span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCheckInSubmit(undefined, `${seat.reservation?.id}_${seat.id}`);
                                }}
                                className="text-[9px] uppercase font-extrabold bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/20 px-2.5 py-1 rounded-full text-white transition-all shadow-md"
                              >
                                {t.admin.checkinButton || "Check In"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Agendas breakdown statistics counters */}
            <div className="bg-gray-900/80 border border-gray-800 p-6 rounded-2xl shadow-xl backdrop-blur space-y-4">
              <h3 className="text-sm uppercase font-extrabold text-indigo-400 tracking-wider flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5" />
                Live Seating Analytics
              </h3>
              
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-800/40 border border-gray-800 p-3 rounded-xl flex flex-col justify-center">
                  <span className="text-2xl font-black text-white">{totalTicketsBought + seatsLeft}</span>
                  <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">Total capacity</span>
                </div>
                <div className="bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-xl flex flex-col justify-center">
                  <span className="text-2xl font-black text-indigo-400">{totalTicketsBought}</span>
                  <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">{t.admin.totalTicketsBought || "Tickets Bought"}</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                {/* Checked in (Arrived) */}
                <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/10">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-gray-300 font-medium">{t.admin.seatsOccupied || "Checked In (Arrived)"}</span>
                  </div>
                  <span className="font-extrabold text-emerald-400">{seatsOccupied} / {totalTicketsBought} ({totalTicketsBought > 0 ? Math.round((seatsOccupied / totalTicketsBought) * 100) : 0}%)</span>
                </div>

                {/* Booked (Not Arrived) */}
                <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/10">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-gray-300 font-medium">{t.admin.seatsBooked || "Booked (Not Arrived)"}</span>
                  </div>
                  <span className="font-extrabold text-rose-400">{seatsBooked} / {totalTicketsBought} ({totalTicketsBought > 0 ? Math.round((seatsBooked / totalTicketsBought) * 100) : 0}%)</span>
                </div>

                {/* Seats Left */}
                <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-gray-800/50 border border-gray-700/30">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gray-500 shrink-0" />
                    <span className="text-gray-300 font-medium">{t.admin.seatsLeft || "Seats Left"}</span>
                  </div>
                  <span className="font-extrabold text-gray-300">{seatsLeft}</span>
                </div>

                {/* Seats Pending / Locked */}
                <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/10">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-gray-300 font-medium">{t.admin.seatsPending || "Pending Payment / Locked"}</span>
                  </div>
                  <span className="font-extrabold text-amber-400">{seatsPending}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Demographic dashboards column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Demographics analysis card panel */}
            <div className="bg-gray-900/80 border border-gray-800 p-6 rounded-2xl shadow-xl backdrop-blur">
              <h3 className="text-sm uppercase font-extrabold text-indigo-400 tracking-wider mb-6 flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5" />
                {t.admin.demographicsTitle || "Participant Demographics"} (Paid Ticket buyers)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Gender breakdown chart widget */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-2">
                    {t.admin.genderBreakdown || "Gender Breakdown"}
                  </h4>
                  {genderData.length === 0 ? (
                    <p className="text-xs text-gray-500 py-4 text-center">No paid participant demographics found.</p>
                  ) : (
                    <div className="space-y-3">
                      {genderData.map((item) => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-gray-300">
                              {item.label === "Male" ? "Male" : item.label === "Female" ? "Female" : item.label}
                            </span>
                            <span className="text-gray-400 font-semibold">{item.count} tickets ({item.percent}%)</span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full transition-all duration-700"
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* City distribution chart widget */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-2">
                    {t.admin.cityBreakdown || "City Distribution"}
                  </h4>
                  {cityData.length === 0 ? (
                    <p className="text-xs text-gray-500 py-4 text-center">No paid participant demographics found.</p>
                  ) : (
                    <div className="space-y-3">
                      {cityData.map((item) => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-gray-300 truncate max-w-[120px]">{item.label}</span>
                            <span className="text-gray-400 font-semibold">{item.count} tickets ({item.percent}%)</span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-teal-500 h-full rounded-full transition-all duration-700"
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Age breakdown chart widget */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-2">
                    {t.admin.ageBreakdown || "Age Breakdown"}
                  </h4>
                  {ageData.length === 0 ? (
                    <p className="text-xs text-gray-500 py-4 text-center">No paid participant demographics found.</p>
                  ) : (
                    <div className="space-y-3">
                      {ageData.map((item) => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-gray-300">{item.label}</span>
                            <span className="text-gray-400 font-semibold">{item.count} tickets ({item.percent}%)</span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nationality distribution chart widget */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-2">
                    {t.admin.nationalityBreakdown || "Nationality Distribution"}
                  </h4>
                  {nationalityData.length === 0 ? (
                    <p className="text-xs text-gray-500 py-4 text-center">No paid participant demographics found.</p>
                  ) : (
                    <div className="space-y-3">
                      {nationalityData.map((item) => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-gray-300 truncate max-w-[120px]">{item.label}</span>
                            <span className="text-gray-400 font-semibold">{item.count} tickets ({item.percent}%)</span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-violet-500 h-full rounded-full transition-all duration-700"
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>

        </div>

        {/* Bottom Area containing Seating Map Layout Grid and clicked participant profile Hovercard details */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* Main seating map container column */}
          <div className="xl:col-span-3 bg-gray-900/60 border border-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl overflow-hidden relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-emerald-400" />
                Live Seating Floor Map Layout
              </h3>
              
              <div className="flex gap-2">
                <span className="text-[10px] font-bold text-gray-400 bg-gray-800 px-2 py-1 rounded">
                  Scroll or Zoom to view full desk
                </span>
              </div>
            </div>

            {/* Reusable Stage visual design matching seat page details */}
            <div className="relative mx-auto mb-10 flex h-10 w-full max-w-xl flex-col items-center justify-center overflow-hidden rounded-b-3xl border-x border-t-4 border-indigo-500/40 bg-gradient-to-r from-indigo-950/30 via-indigo-900/20 to-indigo-950/30 shadow-[0_0_30px_rgba(99,102,241,0.06)]">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">
                {t.eventDetails.stageArea || "STAGE AREA"}
              </span>
            </div>

            {/* Visual Seating map grids cells */}
            <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
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
                {uniqueRows.map((rowLabel, rowIndex) => {
                  const rowSeats = rows[rowLabel] || [];
                  const cols = Array.from({ length: colCount }, (_, i) => i + 1);

                  return (
                    <React.Fragment key={`row-${rowLabel}`}>
                      <div
                        className="flex h-full select-none items-center justify-center text-center font-bold text-gray-600"
                        style={{
                          gridRow: `${rowIndex + 1}`,
                          gridColumn: "1",
                          fontSize: `${labelSize}px`,
                          zIndex: 10,
                        }}
                      >
                        {rowLabel}
                      </div>

                      {cols.map((colIndex) => {
                        if (isCellOccupiedByWheelchairSpan(rowLabel, colIndex)) return null;

                        const seat = rowSeats.find((s) => s.number === colIndex);

                        if (!seat) {
                          return (
                            <div
                              key={`gap-${rowLabel}-${colIndex}`}
                              className="flex-shrink-0"
                              style={{
                                width: `${size}px`,
                                height: `${size}px`,
                                gridRow: `${rowIndex + 1}`,
                                gridColumn: `${colIndex + 1}`,
                              }}
                            />
                          );
                        }

                        const isWheelchair = isWheelchairSeat(seat.label);
                        const isActive = activeSeat?.id === seat.id;

                        // Color Coding Logic
                        // Available: Grey
                        // Pending Payment / Locked: Orange
                        // Booked / Not Arrived (Paid, status SOLD, isCheckedIn false): Red
                        // Checked-in / Arrived (isCheckedIn true): Emerald Green
                        // VIP / Held: Violet
                        let seatColorClass = "";
                        if (seat.isCheckedIn) {
                          seatColorClass = isActive
                            ? "bg-emerald-500 border-white text-white shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300"
                            : "bg-emerald-600/90 border-emerald-500 text-white hover:bg-emerald-500";
                        } else if (seat.status === "SOLD") {
                          seatColorClass = isActive
                            ? "bg-rose-500 border-white text-white shadow-lg shadow-rose-500/40 ring-2 ring-rose-300"
                            : "bg-rose-950/60 border-rose-900 text-rose-300 hover:bg-rose-900/80";
                        } else if (seat.status === "LOCKED") {
                          seatColorClass = isActive
                            ? "bg-amber-500 border-white text-white shadow-lg shadow-amber-500/40 ring-2 ring-amber-300"
                            : "bg-amber-950/60 border-amber-900 text-amber-300 hover:bg-amber-900/80";
                        } else if (seat.status === "HELD") {
                          seatColorClass = isActive
                            ? "bg-purple-600 border-white text-white shadow-lg shadow-purple-500/40 ring-2 ring-purple-350"
                            : "bg-purple-950/60 border-purple-900 text-purple-300 hover:bg-purple-900/80";
                        } else {
                          // AVAILABLE
                          seatColorClass = isActive
                            ? "bg-gray-700 border-white text-white ring-2 ring-gray-400"
                            : "bg-gray-800/40 border-gray-700 text-gray-500 hover:bg-gray-850 hover:text-gray-400";
                        }

                        return (
                          <div
                            key={seat.id}
                            title={`${seat.label} - ${seat.status}`}
                            onClick={() => {
                              setActiveSeat(seat);
                            }}
                            className={`
                              relative flex flex-shrink-0 flex-col items-center justify-center rounded-b-sm rounded-t-lg border-2 font-bold cursor-pointer transition-all duration-200 text-center select-none
                              ${seatColorClass}
                            `}
                            style={{
                              width: isWheelchair ? "100%" : `${size}px`,
                              height: isWheelchair ? "100%" : `${size}px`,
                              fontSize: `${seatFontSize}px`,
                              gridRow: isWheelchair ? `${rowIndex + 1} / span 2` : `${rowIndex + 1}`,
                              gridColumn: isWheelchair ? `${colIndex + 1} / span 2` : `${colIndex + 1}`,
                              alignSelf: isWheelchair ? "stretch" : "center",
                              justifySelf: isWheelchair ? "stretch" : "center",
                            }}
                          >
                            {seat.isCheckedIn && (
                              <CheckIcon className="absolute top-0.5 right-0.5 h-2.5 w-2.5 text-white font-black drop-shadow" />
                            )}
                            {isWheelchair && !seat.isCheckedIn ? (
                              <svg
                                className={`shrink-0 ${seat.status === "SOLD" ? "text-rose-400" : seat.status === "LOCKED" ? "text-amber-400" : "text-gray-600"}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                                style={{ width: 12, height: 12, marginBottom: 1 }}
                                aria-hidden
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 14a2 2 0 11-4 0 2 2 0 014 0zM8 21a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1M8 11h6M8 15h3"
                                />
                              </svg>
                            ) : null}
                            <span className="truncate max-w-full px-0.5 text-[9.5px]">
                              {seat.label}
                            </span>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Color coding legend key */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-gray-800/80 pt-5 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <div className="h-3.5 w-3.5 rounded bg-gray-800 border border-gray-700" />
                <span>{t.eventDetails.legendAvailable || "Available"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3.5 w-3.5 rounded bg-amber-950 border border-amber-900" />
                <span>{t.eventDetails.legendLocked || "Locked (Pending Payment)"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3.5 w-3.5 rounded bg-rose-950 border border-rose-900" />
                <span>{t.admin.seatsBooked || "Booked (Not Arrived)"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3.5 w-3.5 rounded bg-emerald-600 border border-emerald-500" />
                <span>{t.admin.seatsOccupied || "Checked In (Arrived)"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3.5 w-3.5 rounded bg-purple-950 border border-purple-900" />
                <span>{t.eventDetails.legendHeld || "Held / VIP"}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Participant Details Glassmorphic Hovercard Card */}
          <div className="xl:col-span-1">
            {activeSeat ? (
              <div className="bg-gray-900/80 border border-gray-800 p-6 rounded-2xl shadow-xl backdrop-blur relative space-y-5 h-full flex flex-col">
                <button
                  onClick={() => setActiveSeat(null)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-white p-1 hover:bg-gray-800 rounded-lg transition-all"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>

                <div className="border-b border-gray-850 pb-4 text-center shrink-0">
                  <span className={`inline-block font-extrabold text-sm px-3 py-1 rounded-full border mb-3
                    ${activeSeat.isCheckedIn 
                      ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/30" 
                      : activeSeat.status === "SOLD"
                        ? "bg-rose-950/80 text-rose-400 border-rose-500/30"
                        : activeSeat.status === "LOCKED"
                          ? "bg-amber-950/80 text-amber-400 border-amber-500/30"
                          : activeSeat.status === "HELD"
                            ? "bg-purple-950/80 text-purple-400 border-purple-500/30"
                            : "bg-gray-950/80 text-gray-400 border-gray-800"
                    }
                  `}>
                    Seat {activeSeat.label}
                  </span>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {activeSeat.isCheckedIn 
                      ? "Checked In & Arrived" 
                      : activeSeat.status === "SOLD"
                        ? "Booked (Not Arrived)"
                        : activeSeat.status === "LOCKED"
                          ? "Pending Payment"
                          : activeSeat.status === "HELD"
                            ? "VIP Reservation (Held)"
                            : "Available Spot"
                    }
                  </h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold mt-1">
                    Seat price: ${activeSeat.price}
                  </p>
                </div>

                {/* Reservation attendee user details block */}
                <div className="flex-1 space-y-4 overflow-y-auto max-h-[350px] custom-scrollbar pr-1">
                  {activeSeat.reservation ? (
                    <>
                      {/* Attendee profile header card */}
                      <div className="bg-gray-850/50 p-4 rounded-xl border border-gray-800 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                          {activeSeat.reservation.user?.profileImageUrl ? (
                            <img
                              src={activeSeat.reservation.user.profileImageUrl}
                              alt={activeSeat.reservation.user.name}
                              className="h-full w-full object-cover rounded-full"
                            />
                          ) : (
                            <UserIcon className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-white truncate">
                            {activeSeat.reservation.user?.name || "Anonymous Participant"}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {activeSeat.reservation.user?.email || "No email provided"}
                          </p>
                        </div>
                      </div>

                      {/* Seat Metadata detail items */}
                      <div className="space-y-2 text-xs text-gray-400">
                        {/* Reference code check */}
                        <div className="flex justify-between py-1 border-b border-gray-850">
                          <span className="font-semibold text-gray-500">Bank Reference</span>
                          <span className="font-bold text-gray-300 font-mono">
                            {activeSeat.reservation.bankRef || "N/A"}
                          </span>
                        </div>

                        {/* Reservation status */}
                        <div className="flex justify-between py-1 border-b border-gray-850">
                          <span className="font-semibold text-gray-500">Payment Status</span>
                          <span className="font-bold text-gray-300">
                            {activeSeat.reservation.status}
                          </span>
                        </div>

                        {/* Exact scanned check-in timestamp arrival */}
                        {activeSeat.isCheckedIn && activeSeat.checkedInAt && (
                          <div className="flex flex-col gap-1 py-1 border-b border-gray-850">
                            <span className="font-semibold text-gray-500 flex items-center gap-1">
                              <ClockIcon className="h-3.5 w-3.5 text-emerald-400" />
                              Arrival Timestamp
                            </span>
                            <span className="font-extrabold text-emerald-400 pl-4.5">
                              {new Date(activeSeat.checkedInAt).toLocaleDateString()} {new Date(activeSeat.checkedInAt).toLocaleTimeString()}
                            </span>
                          </div>
                        )}

                        {/* Demographics checklist */}
                        <div className="pt-2 space-y-1.5">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                            ATTENDEE DEMOGRAPHICS
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                            <div className="bg-gray-850 p-2 rounded-lg border border-gray-800">
                              <span className="block text-gray-500">Gender</span>
                              <span className="block font-bold text-gray-300 mt-0.5">
                                {activeSeat.reservation.user?.gender || "Unspecified"}
                              </span>
                            </div>
                            <div className="bg-gray-850 p-2 rounded-lg border border-gray-800">
                              <span className="block text-gray-500">City / Town</span>
                              <span className="block font-bold text-gray-300 mt-0.5 truncate">
                                {activeSeat.reservation.user?.city || "Unspecified"}
                              </span>
                            </div>
                            <div className="bg-gray-850 p-2 rounded-lg border border-gray-800">
                              <span className="block text-gray-500">Nationality</span>
                              <span className="block font-bold text-gray-300 mt-0.5 truncate">
                                {activeSeat.reservation.user?.country || "Unspecified"}
                              </span>
                            </div>
                            <div className="bg-gray-850 p-2 rounded-lg border border-gray-800">
                              <span className="block text-gray-500">Birth Year / Age</span>
                              <span className="block font-bold text-gray-300 mt-0.5">
                                {activeSeat.reservation.user?.birthYear
                                  ? `${activeSeat.reservation.user.birthYear} (Age: ${2026 - activeSeat.reservation.user.birthYear})`
                                  : "Unspecified"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Refund warning alert (if already checked in, blocking refunds) */}
                        {activeSeat.isCheckedIn && (
                          <div className="bg-rose-950/20 border border-rose-500/20 p-3 rounded-lg text-[10px] text-rose-300 flex items-start gap-1.5 mt-2.5">
                            <InformationCircleIcon className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Refund Eligibility Blocked</p>
                              <p className="text-[9px] text-gray-400 mt-0.5">
                                {t.admin.refundBlockedCheckedIn || "Refunds are disabled as this ticket is marked as used."}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-xs text-gray-500">
                      This seat is currently available. Admins can hold this seat for VIPs or let participants reserve it on their app.
                    </div>
                  )}
                </div>

                {/* Direct action button manual toggle check-in desk at bottom */}
                <div className="shrink-0 pt-4 border-t border-gray-850">
                  {activeSeat.reservation && activeSeat.reservation.status === "SUCCESS" && (
                    <button
                      onClick={() => handleToggleCheckInClick(activeSeat.id)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5
                        ${activeSeat.isCheckedIn
                          ? "bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white"
                        }
                      `}
                    >
                      {activeSeat.isCheckedIn ? (
                        <>
                          <XMarkIcon className="h-4 w-4" />
                          {t.admin.undoCheckin || "Undo Check-in"}
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-4 w-4" />
                          {t.admin.manualCheckin || "Manual Check-in"}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-900/40 border border-gray-850 border-dashed p-8 rounded-2xl text-center h-full flex flex-col justify-center items-center text-gray-500 min-h-[350px]">
                <MapPinIcon className="h-10 w-10 text-gray-600 mb-3 animate-pulse" />
                <p className="text-xs font-bold">No seat selected</p>
                <p className="text-[10px] text-gray-600 mt-1 max-w-[180px] mx-auto leading-relaxed">
                  Click any seat on the grid visualizer map to check attendee info, arrival status, or toggle check-in manually.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Native Camera QR Scanner Modal Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="scanner-modal-container rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col relative">
            {/* Modal Header */}
            <div className="p-4 flex justify-between items-center scanner-modal-header">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2 scanner-modal-title">
                  <QrCodeIcon className="h-5 w-5 text-indigo-400" />
                  {t.admin.scanQrCode || "Scan QR Ticket"}
                </h3>
                <p className="text-[10px] scanner-modal-subtitle mt-0.5">
                  Point your device camera at the ticket's QR code
                </p>
              </div>
              <button
                onClick={() => setIsCameraOpen(false)}
                className="p-1 rounded-lg transition-colors scanner-modal-close-btn"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Camera Viewport Area */}
            <div className="relative aspect-square m-4 rounded-xl bg-black overflow-hidden border border-gray-800 flex items-center justify-center">
              {/* Target mounting element for html5-qrcode video element */}
              <div id="qr-scanner-viewport" className="w-full h-full object-cover [&>video]:object-cover" />

              {/* Glowing pulses and target scans overlay */}
              {!cameraError && !cameraStarting && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[70%] h-[70%] border-2 border-emerald-500/70 rounded-lg relative animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    {/* Corners highlights */}
                    <div className="absolute -top-[2px] -left-[2px] w-4 h-4 border-t-[3px] border-l-[3px] border-emerald-400 rounded-tl-sm"></div>
                    <div className="absolute -top-[2px] -right-[2px] w-4 h-4 border-t-[3px] border-r-[3px] border-emerald-400 rounded-tr-sm"></div>
                    <div className="absolute -bottom-[2px] -left-[2px] w-4 h-4 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-sm"></div>
                    <div className="absolute -bottom-[2px] -right-[2px] w-4 h-4 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-sm"></div>
                    {/* Pulsing beam bar */}
                    <div className="absolute left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-scan-beam"></div>
                  </div>
                </div>
              )}

              {/* Startup / Permission Loader */}
              {cameraStarting && !cameraError && (
                <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-6 space-y-3 z-10 scanner-modal-loader-bg">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <div>
                    <p className="text-xs font-bold scanner-modal-loader-title">Starting Camera Stream</p>
                    <p className="text-[9px] mt-1 max-w-[200px] scanner-modal-loader-subtitle">
                      Please approve camera permission prompt if requested by your browser
                    </p>
                  </div>
                </div>
              )}

              {/* Initialization Error Alert */}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-6 space-y-4 z-10 scanner-modal-error-bg">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500">
                    <ExclamationTriangleIcon className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-xs font-black scanner-modal-error-title">Camera Stream Failed</p>
                    <p className="text-[9px] mt-2 max-w-[240px] leading-relaxed mx-auto scanner-modal-error-subtitle">
                      {cameraError}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Trigger a retry cycle
                      setSelectedCameraId("");
                      setCameraError("");
                      setCameraStarting(true);
                      // Force scanner restart by temporarily cycling open state
                      setIsCameraOpen(false);
                      setTimeout(() => setIsCameraOpen(true), 150);
                    }}
                    className="px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all scanner-modal-error-btn"
                  >
                    Retry Initialization
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer & Camera controls */}
            {!cameraError && cameras.length > 1 && (
              <div className="p-4 flex flex-col space-y-2 shrink-0 scanner-modal-footer">
                <label className="text-[9px] uppercase font-bold tracking-wider scanner-modal-label">
                  Switch Active Camera Lens
                </label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="w-full rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 scanner-modal-select"
                >
                  <option value="">Default Rear/Environment Camera</option>
                  {cameras.map((camera, i) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual Check-in Confirmation Fullscreen Overlay */}
      {checkInResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/90 backdrop-blur-xl animate-fade-in">
          <div className={`relative w-full max-w-lg rounded-3xl p-8 border text-center shadow-2xl overflow-hidden transition-all duration-300 transform scale-100 checkin-alert-modal
            ${checkInResult.status === "success" 
              ? "border-emerald-500/40 shadow-emerald-500/10" 
              : checkInResult.status === "warning"
                ? "border-amber-500/40 shadow-amber-500/10"
                : "border-rose-500/40 shadow-rose-500/10"
            }
          `}>
            {/* Pulsing Radial Background Glow */}
            <div className={`absolute -inset-10 opacity-20 pointer-events-none blur-3xl rounded-full transition-colors duration-500
              ${checkInResult.status === "success"
                ? "bg-emerald-500 animate-pulse"
                : checkInResult.status === "warning"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-rose-500 animate-pulse"
              }
            `} />

            {/* Glowing Icon Container */}
            <div className="relative flex justify-center mb-6">
              <div className={`p-5 rounded-full border-2 transition-all duration-500 animate-bounce
                ${checkInResult.status === "success"
                  ? "checkin-alert-icon-success"
                  : checkInResult.status === "warning"
                    ? "checkin-alert-icon-warning"
                    : "checkin-alert-icon-error"
                }
              `}>
                {checkInResult.status === "success" && (
                  <CheckBadgeIcon className="h-16 w-16 stroke-[1.5]" />
                )}
                {checkInResult.status === "warning" && (
                  <ExclamationTriangleIcon className="h-16 w-16 stroke-[1.5]" />
                )}
                {checkInResult.status === "error" && (
                  <XMarkIcon className="h-16 w-16 stroke-[1.5]" />
                )}
              </div>
            </div>

            {/* Title / Banner Text */}
            <div className="relative space-y-2 mb-6">
              <p className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]
                ${checkInResult.status === "success"
                  ? "checkin-alert-accent-success"
                  : checkInResult.status === "warning"
                    ? "checkin-alert-accent-warning"
                    : "checkin-alert-accent-error"
                }
              `}>
                {checkInResult.status === "success" && "SUCCESSFULLY ARRIVED"}
                {checkInResult.status === "warning" && "ALREADY CHECKED IN"}
                {checkInResult.status === "error" && "CHECK-IN DENIED"}
              </p>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight checkin-alert-title">
                {checkInResult.status === "success" && "Ticket Validated!"}
                {checkInResult.status === "warning" && "Duplicate Check-in!"}
                {checkInResult.status === "error" && "Validation Failed!"}
              </h2>
            </div>

            {/* Attendee Details Card */}
            <div className="relative p-6 rounded-2xl space-y-4 mb-8 text-left checkin-alert-card border">
              {checkInResult.status !== "error" && (
                <div className="flex items-center gap-3 pb-4 checkin-alert-border border-b">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 checkin-user-icon-container">
                    <UserIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider checkin-alert-text-dim">ATTENDEE NAME</p>
                    <p className="font-extrabold text-lg truncate leading-tight mt-0.5 checkin-alert-text-strong">
                      {checkInResult.attendeeName}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider checkin-alert-text-dim">SEAT ASSIGNMENT</p>
                  <p className={`font-black text-2xl tracking-tight mt-0.5
                    ${checkInResult.status === "success"
                      ? "checkin-alert-accent-success"
                      : checkInResult.status === "warning"
                        ? "checkin-alert-accent-warning"
                        : "checkin-alert-accent-error"
                    }
                  `}>
                    {checkInResult.seatLabel}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider checkin-alert-text-dim">AGENDA / VENUE</p>
                  <p className="font-extrabold text-sm mt-1.5 truncate leading-tight checkin-alert-text-strong">
                    {selectedEvent?.title || "Event Agenda"}
                  </p>
                </div>
              </div>

              {/* Status details or error messages */}
              <div className="pt-2 border-t checkin-alert-border">
                {checkInResult.status === "success" && (
                  <div className="flex items-center gap-1.5 text-xs font-bold checkin-alert-accent-success">
                    <ClockIcon className="h-4 w-4 shrink-0" />
                    <span>Checked in at {checkInResult.checkedInAt ? new Date(checkInResult.checkedInAt).toLocaleTimeString() : new Date().toLocaleTimeString()}</span>
                  </div>
                )}
                {checkInResult.status === "warning" && (
                  <div className="space-y-1">
                    <div className="flex items-start gap-1.5 text-xs font-bold leading-normal checkin-alert-accent-warning">
                      <ClockIcon className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Originally checked in:</span>
                    </div>
                    <p className="text-xs pl-5.5 font-semibold checkin-alert-text-dim">
                      {checkInResult.checkedInAt ? new Date(checkInResult.checkedInAt).toLocaleString() : "Previous check-in session"}
                    </p>
                  </div>
                )}
                {checkInResult.status === "error" && (
                  <div className="checkin-denial-card p-4 rounded-xl text-xs flex items-start gap-2 border">
                    <ExclamationTriangleIcon className="h-5 w-5 denial-icon shrink-0" />
                    <div className="space-y-1">
                      <p className="font-bold denial-title">Reason for Denial</p>
                      <p className="leading-relaxed font-medium denial-reason">{checkInResult.message}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Direct Action Button */}
            <div className="relative">
              <button
                onClick={() => {
                  const wasCam = checkInResult.wasCameraOpen;
                  setCheckInResult(null);
                  if (wasCam) {
                    setIsCameraOpen(true); // Restart camera instantly
                  }
                }}
                className={`w-full py-4 px-6 rounded-2xl text-sm font-black tracking-wider uppercase transition-all duration-200 shadow-lg cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] checkin-btn-white-text
                  ${checkInResult.status === "success"
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20 hover:shadow-emerald-500/30"
                    : checkInResult.status === "warning"
                      ? "bg-amber-600 hover:bg-amber-500 shadow-amber-500/20 hover:shadow-amber-500/30"
                      : "bg-rose-600 hover:bg-rose-500 shadow-rose-500/20 hover:shadow-rose-500/30"
                  }
                `}
              >
                {checkInResult.wasCameraOpen ? "Scan Next Ticket" : "Dismiss Result"}
              </button>
              
              {checkInResult.status === "success" && (
                <p className="text-[10px] text-gray-500 mt-3 font-semibold animate-pulse">
                  Auto-dismissing and resuming camera in a moment...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
