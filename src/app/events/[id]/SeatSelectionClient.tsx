"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { reserveSeats, approvePayment } from "@/app/actions/reservations";
import { 
  updateEvent, 
  updateSeatPricing, 
  resetEventSeats, 
  generateSeatsFromBlueprint,
  updateSeatPositions,
  deleteSeat,
  createSeat,
  toggleSeatHold
} from "@/app/actions/admin";
import { 
  CheckCircleIcon, 
  InformationCircleIcon, 
  UserIcon, 
  TicketIcon, 
  ClockIcon, 
  XCircleIcon,
  PencilSquareIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  CodeBracketIcon,
  TrashIcon,
  PlusIcon,
  SparklesIcon
} from "@heroicons/react/24/solid";

// Recreate Seat type from serialized DB object
type Seat = {
  id: string;
  eventId: string;
  label: string;
  row: string;
  number: number;
  price: string;
  status: "AVAILABLE" | "LOCKED" | "SOLD" | "HELD";
  lockedUntil: Date | null;
  lockedBy: string | null;
  version: number;
};

type SeatSelectionClientProps = {
  eventId: string;
  seats: any[];
  isAdmin?: boolean;
  reservations?: any[];
  eventDetails?: {
    title: string;
    description: string;
    venue: string;
    date: string;
    imageUrl: string | null;
    isActive: boolean;
    currency: string;
  };
};

// Seating Blueprint templates
const PRESETS = {
  standard: `A: [A1] [A2] [A3] [A4] [A5] [A6] [A7] [A8] [A9] [A10] [A11] [A12]
B: [B1] [B2] [B3] [B4] [B5] [B6] [B7] [B8] [B9] [B10] [B11] [B12]
C: [C1] [C2] [C3] [C4] [C5] [C6] [C7] [C8] [C9] [C10] [C11] [C12]
D: [D1] [D2] [D3] [D4] [D5] [D6] [D7] [D8] [D9] [D10] [D11] [D12]
E: [E1] [E2] [E3] [E4] [E5] [E6] [E7] [E8] [E9] [E10] [E11] [E12]`,
  theater: `1: _ _ _ _ _ _ _ _ _ [1-22,300] [1-20,300] [1-18,300] _ [♿-1-14,400] _ _ [1-10,400] [1-8,400] [1-6,400] [1-4,400] [1-2,400] [1-1,400] [1-3,400] [1-5,400] [1-7,400] [1-9,400] _ [♿-1-28,400] _ _ [1-17,300] [1-19,300] [1-21,300] _ _ _ _ _ _ _ _ _
2: _ _ _ _ _ _ _ _ [2-20,300] [2-18,300] [2-16,300] [2-14,300] _ _ _ [2-12,400] [2-10,400] [2-8,400] [2-6,400] [2-4,400] [2-2,400] [2-1,400] [2-3,400] [2-5,400] [2-7,400] [2-9,400] [2-11,400] _ _ _ [2-13,300] [2-15,300] [2-17,300] [2-19,300] _ _ _ _ _ _ _ _
3: _ _ _ [3-28,300] [3-26,300] [3-24,300] [3-22,300] [3-20,300] [3-18,300] [3-16,300] [3-14,300] [3-12,300] _ _ _ _ [3-10,400] [3-8,400] [3-6,400] [3-4,400] [3-2,400] [3-1,400] [3-3,400] [3-5,400] [3-7,400] [3-9,400] [3-11,400] _ _ _ [3-13,300] [3-15,300] [3-17,300] [3-19,300] [3-21,300] [3-23,300] [3-25,300] [3-27,300] [3-29,300] _ _ _
4: _ _ _ [4-30,300] [4-28,300] [4-26,300] [4-24,300] [4-22,300] [4-20,300] [4-18,300] [4-16,300] [4-14,300] _ _ _ [4-12,400] [4-10,400] [4-8,400] [4-6,400] [4-4,400] [4-2,400] [4-1,400] [4-3,400] [4-5,400] [4-7,400] [4-9,400] [4-11,400] _ _ _ [4-13,300] [4-15,300] [4-17,300] [4-19,300] [4-21,300] [4-23,300] [4-25,300] [4-27,300] [4-29,300] _ _ _
5: _ _ [5-30,300] [5-28,300] [5-26,300] [5-24,300] [5-22,300] [5-20,300] [5-18,300] [5-16,300] [5-14,300] [5-12,300] _ _ _ _ [5-10,400] [5-8,400] [5-6,400] [5-4,400] [5-2,400] [5-1,400] [5-3,400] [5-5,400] [5-7,400] [5-9,400] [5-11,400] _ _ _ [5-13,300] [5-15,300] [5-17,300] [5-19,300] [5-21,300] [5-23,300] [5-25,300] [5-27,300] [5-29,300] [5-31,300] [5-33,300] _
6: _ _ [6-32,300] [6-30,300] [6-28,300] [6-26,300] [6-24,300] [6-22,300] [6-20,300] [6-18,300] [6-16,300] [6-14,300] _ _ _ [6-12,400] [6-10,400] [6-8,400] [6-6,400] [6-4,400] [6-2,400] [6-1,400] [6-3,400] [6-5,400] [6-7,400] [6-9,400] [6-11,400] _ _ _ [6-13,300] [6-15,300] [6-17,300] [6-19,300] [6-21,300] [6-23,300] [6-25,300] [6-27,300] [6-29,300] [6-31,300] _ _
7: _ _ [7-30,300] [7-28,300] [7-26,300] [7-24,300] [7-22,300] [7-20,300] [7-18,300] [7-16,300] [7-14,300] [7-12,300] _ _ _ _ [7-10,400] [7-8,400] [7-6,400] [7-4,400] [7-2,400] [7-1,400] [7-3,400] [7-5,400] [7-7,400] [7-9,400] [7-11,400] _ _ _ [7-13,300] [7-15,300] [7-17,300] [7-19,300] [7-21,300] [7-23,300] [7-25,300] [7-27,300] [7-29,300] [7-31,300] _ _
8: _ _ [8-32,300] [8-30,300] [8-28,300] [8-26,300] [8-24,300] [8-22,300] [8-20,300] [8-18,300] [8-16,300] [8-14,300] _ _ _ [8-12,400] [8-10,400] [8-8,400] [8-6,400] [8-4,400] [8-2,400] [8-1,400] [8-3,400] [8-5,400] [8-7,400] [8-9,400] [8-11,400] _ _ _ [8-13,300] [8-15,300] [8-17,300] [8-19,300] [8-21,300] [8-23,300] [8-25,300] [8-27,300] [8-29,300] [8-31,300] _ _
9: _ [9-32,300] [9-30,300] [9-28,300] [9-26,300] [9-24,300] [9-22,300] [9-20,300] [9-18,300] [9-16,300] [9-14,300] [9-12,300] _ _ _ _ [9-10,400] [9-8,400] [9-6,400] [9-4,400] [9-2,400] [9-1,400] [9-3,400] [9-5,400] [9-7,400] [9-9,400] [9-11,400] _ _ _ [9-13,300] [9-15,300] [9-17,300] [9-19,300] [9-21,300] [9-23,300] [9-25,300] [9-27,300] [9-29,300] [9-31,300] [9-33,300] [9-35,300]
10: [10-28,300] [10-26,300] [10-24,300] [10-22,300] [10-20,300] [10-18,300] [10-16,300] [10-14,300] [10-12,300] [10-10,300] [10-8,300] [10-6,300] _ _ _ _ _ [10-4,400] [10-2,400] _ _ _ _ [10-1,400] [10-3,400] _ _ _ _ _ [10-5,300] [10-7,300] [10-9,300] [10-11,300] [10-13,300] [10-15,300] [10-17,300] [10-19,300] [10-21,300] [10-23,300] [10-25,300] [10-27,300]
11: _ _ [11-20,300] [11-18,300] [11-16,300] [11-14,300] [11-12,300] [11-10,300] [11-8,300] [11-6,300] [11-4,300] [11-2,300] _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ [11-1,300] [11-3,300] [11-5,300] [11-7,300] [11-9,300] [11-11,300] [11-13,300] [11-15,300] [11-17,300] [11-19,300] _ _`
};

export default function SeatSelectionClient({ 
  eventId, 
  seats, 
  isAdmin = false, 
  reservations = [],
  eventDetails 
}: SeatSelectionClientProps) {
  const router = useRouter();
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Seating Designer States
  const [isDesignerMode, setIsDesignerMode] = useState(false);
  const [designerSeats, setDesignerSeats] = useState<Seat[]>([]);
  const [draggedSeatId, setDraggedSeatId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ row: string; col: number } | null>(null);
  const [dragOverTrash, setDragOverTrash] = useState(false);
  const [deletedSeatIds, setDeletedSeatIds] = useState<string[]>([]);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showFloatingAdd, setShowFloatingAdd] = useState(false);
  const [zoom, setZoom] = useState(0.85); // Grid zoom layout controller (0.4 to 1.2)
  const [isAutoFit, setIsAutoFit] = useState(true); // Automatically fit grid to viewport width

  // Quick Add Seat States
  const [quickAddRow, setQuickAddRow] = useState("A");
  const [quickAddLabel, setQuickAddLabel] = useState("");
  const [quickAddPrice, setQuickAddPrice] = useState(100);
  const [quickAddIsWheelchair, setQuickAddIsWheelchair] = useState(false);

  // Admin Active Tab state
  const [activeTab, setActiveTab] = useState<"bookings" | "settings" | "seats">("bookings");

  // Admin Event Form state
  const [formTitle, setFormTitle] = useState(eventDetails?.title || "");
  const [formVenue, setFormVenue] = useState(eventDetails?.venue || "");
  const [formDescription, setFormDescription] = useState(eventDetails?.description || "");
  const [formImageUrl, setFormImageUrl] = useState(eventDetails?.imageUrl || "");
  const [formDate, setFormDate] = useState(
    eventDetails?.date ? new Date(eventDetails.date).toISOString().slice(0, 16) : ""
  );
  const [formIsActive, setFormIsActive] = useState(eventDetails?.isActive ?? true);
  const [formCurrency, setFormCurrency] = useState(eventDetails?.currency || "$");

  // Admin Seating Blueprint text state
  const [blueprintText, setBlueprintText] = useState(PRESETS.theater);

  const activeSeats = isDesignerMode ? designerSeats : (seats as Seat[]);

  const containerRef = useRef<HTMLDivElement>(null);

  const adjustZoomToFit = useCallback(() => {
    if (!isAutoFit || !containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    if (!containerWidth) return;

    const maxCol = Math.max(...activeSeats.map(s => s.number), 0);
    const colCount = isDesignerMode ? Math.max(12, maxCol + 2) : maxCol;
    if (colCount <= 0) return;

    // Width of row label + seat buttons + gaps in Grid layout
    // 32px label + colCount * 48px seats + colCount * 10px gaps
    const rawRowWidth = 32 + colCount * 58;
    const availableWidth = containerWidth - 80; // subtracting container horizontal padding + extra safety margin
    const optimalZoom = Math.min(1.2, Math.max(0.35, availableWidth / rawRowWidth));
    
    setZoom(Math.round(optimalZoom * 100) / 100);
  }, [isAutoFit, activeSeats, isDesignerMode]);

  useEffect(() => {
    if (!isFocusMode) return;
    adjustZoomToFit();

    const handleResize = () => {
      adjustZoomToFit();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isFocusMode, adjustZoomToFit]);

  useEffect(() => {
    if (isFocusMode && isAutoFit) {
      adjustZoomToFit();
    }
  }, [activeSeats.length, isDesignerMode, isFocusMode, isAutoFit, adjustZoomToFit]);

  const uniqueRows = Array.from(new Set(activeSeats.map(s => s.row))).sort((a, b) => {
    const aNum = parseInt(a, 10);
    const bNum = parseInt(b, 10);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return a.localeCompare(b);
  });
  const initialRowPricing = uniqueRows.reduce((acc: Record<string, number>, row) => {
    const rowSeat = activeSeats.find(s => s.row === row);
    acc[row] = rowSeat ? parseFloat(rowSeat.price) : 0;
    return acc;
  }, {});
  const [rowPricing, setRowPricing] = useState<Record<string, number>>(initialRowPricing);

  // Seat reset confirm state
  const [confirmReset, setConfirmReset] = useState(false);

  // Group seats by row for layout
  const rows = activeSeats.reduce((acc: Record<string, Seat[]>, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {});

  const toggleSeat = (seat: Seat) => {
    if (isAdmin) return; // Admins use handleAdminSeatClick instead
    if (seat.status !== "AVAILABLE") return;

    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      } else {
        return [...prev, seat.id];
      }
    });
  };

  const handleAdminSeatClick = async (seat: Seat) => {
    if (!isAdmin) return;
    if (isDesignerMode) return; // Don't toggle hold in designer mode
    if (seat.status === "LOCKED" || seat.status === "SOLD") return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await toggleSeatHold(eventId, seat.id);
    if (res.success) {
      const action = res.newStatus === "HELD" ? "held (VIP)" : "released";
      setSuccessMsg(`Seat ${seat.label} ${action} successfully!`);
      router.refresh();
    } else {
      setError(res.error || "Failed to toggle seat hold.");
    }
    setLoading(false);
  };

  const selectedSeats = seats.filter(s => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeats.reduce((sum, s) => sum + parseFloat(s.price), 0);

  const handleReserve = async () => {
    if (selectedSeatIds.length === 0) return;
    setLoading(true);
    setError(null);

    const res = await reserveSeats(eventId, selectedSeatIds);

    if (res.success && res.reservation) {
      router.push(`/reservations/${res.reservation.id}`);
    } else {
      setError(res.error || "Failed to reserve seats.");
      setLoading(false);
    }
  };

  // Admin Handlers
  const handleApprovePayment = async (reservationId: string) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await approvePayment(reservationId);
    if (res.success) {
      setSuccessMsg("Payment successfully approved!");
      router.refresh();
    } else {
      setError(res.error || "Failed to approve payment.");
    }
    setLoading(false);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await updateEvent(eventId, {
      title: formTitle,
      description: formDescription,
      venue: formVenue,
      date: new Date(formDate).toISOString(),
      imageUrl: formImageUrl || null,
      isActive: formIsActive,
      currency: formCurrency
    });

    if (res.success) {
      setSuccessMsg("Event details updated successfully!");
      router.refresh();
    } else {
      setError(res.error || "Failed to update event.");
    }
    setLoading(false);
  };

  const handleUpdatePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await updateSeatPricing(eventId, rowPricing);
    if (res.success) {
      setSuccessMsg("Seat pricing updated successfully!");
      router.refresh();
    } else {
      setError(res.error || "Failed to update seat pricing.");
    }
    setLoading(false);
  };

  const handleResetSeats = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await resetEventSeats(eventId);
    if (res.success) {
      setSuccessMsg("Event seats successfully reset to Available!");
      setConfirmReset(false);
      router.refresh();
    } else {
      setError(res.error || "Failed to reset event seats.");
    }
    setLoading(false);
  };

  const handleGenerateBlueprint = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await generateSeatsFromBlueprint(eventId, blueprintText);
    if (res.success) {
      setSuccessMsg(`Successfully generated ${res.count} seats from blueprint layout!`);
      router.refresh();
    } else {
      setError(res.error || "Failed to generate seats from blueprint.");
    }
    setLoading(false);
  };

  // Seating Designer Handlers
  const handleToggleDesignerMode = () => {
    if (isDesignerMode) {
      setIsDesignerMode(false);
      setIsFocusMode(false);
      setShowFloatingAdd(false);
      setDesignerSeats([]);
      setDraggedSeatId(null);
      setDragOverCell(null);
      setDeletedSeatIds([]);
    } else {
      const seatsCopy = seats.map((s) => ({
        ...s,
        price: s.price.toString(),
      })) as Seat[];
      setDesignerSeats(seatsCopy);
      setDeletedSeatIds([]);
      setIsDesignerMode(true);
    }
    setError(null);
    setSuccessMsg(null);
  };

  const handleDragStart = (e: React.DragEvent, seatId: string) => {
    setDraggedSeatId(seatId);
    e.dataTransfer.setData("text/plain", seatId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedSeatId(null);
    setDragOverCell(null);
  };

  const handleDragOverCell = (e: React.DragEvent, row: string, col: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCell?.row !== row || dragOverCell?.col !== col) {
      setDragOverCell({ row, col });
    }
  };

  const handleDragLeaveCell = () => {
    setDragOverCell(null);
  };

  const handleDragOverSeat = (e: React.DragEvent, seatId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnEmptySlot = (e: React.DragEvent, targetRow: string, targetCol: number) => {
    e.preventDefault();
    const seatId = e.dataTransfer.getData("text/plain") || draggedSeatId;
    if (!seatId) return;

    setDesignerSeats((prev) =>
      prev.map((s) => {
        if (s.id === seatId) {
          let newLabel = s.label;
          const isWheelchair = s.label.includes("♿");
          
          const oldExpected = `${s.row}-${s.number}`;
          const oldExpectedWheelchair = `♿-${s.row}-${s.number}`;
          if (s.label === oldExpected) {
            newLabel = `${targetRow}-${targetCol}`;
          } else if (s.label === oldExpectedWheelchair || (isWheelchair && s.label.includes(oldExpected))) {
            newLabel = `♿-${targetRow}-${targetCol}`;
          } else {
            const standardPattern = new RegExp(`^♿?\\-?${s.row}\\-${s.number}$`);
            if (standardPattern.test(s.label)) {
              newLabel = isWheelchair ? `♿-${targetRow}-${targetCol}` : `${targetRow}-${targetCol}`;
            }
          }

          return {
            ...s,
            row: targetRow,
            number: targetCol,
            label: newLabel,
          };
        }
        return s;
      })
    );

    setDraggedSeatId(null);
    setDragOverCell(null);
  };

  const handleDropOnSeat = (e: React.DragEvent, targetSeatId: string) => {
    e.preventDefault();
    const sourceSeatId = e.dataTransfer.getData("text/plain") || draggedSeatId;
    if (!sourceSeatId || sourceSeatId === targetSeatId) return;

    setDesignerSeats((prev) => {
      const sourceSeat = prev.find((s) => s.id === sourceSeatId);
      const targetSeat = prev.find((s) => s.id === targetSeatId);

      if (!sourceSeat || !targetSeat) return prev;

      const sourceRow = sourceSeat.row;
      const sourceNum = sourceSeat.number;
      const targetRow = targetSeat.row;
      const targetNum = targetSeat.number;

      return prev.map((s) => {
        if (s.id === sourceSeatId) {
          let newLabel = s.label;
          if (s.label === `${sourceRow}-${sourceNum}`) {
            newLabel = `${targetRow}-${targetNum}`;
          } else if (s.label === `♿-${sourceRow}-${sourceNum}`) {
            newLabel = `♿-${targetRow}-${targetNum}`;
          }
          return {
            ...s,
            row: targetRow,
            number: targetNum,
            label: newLabel,
          };
        }
        if (s.id === targetSeatId) {
          let newLabel = s.label;
          if (s.label === `${targetRow}-${targetNum}`) {
            newLabel = `${sourceRow}-${sourceNum}`;
          } else if (s.label === `♿-${targetRow}-${targetNum}`) {
            newLabel = `♿-${sourceRow}-${sourceNum}`;
          }
          return {
            ...s,
            row: sourceRow,
            number: sourceNum,
            label: newLabel,
          };
        }
        return s;
      });
    });

    setDraggedSeatId(null);
  };

  const handleDragOverTrash = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!dragOverTrash) setDragOverTrash(true);
  };

  const handleDragLeaveTrash = () => {
    setDragOverTrash(false);
  };

  const handleDropOnTrash = (e: React.DragEvent) => {
    e.preventDefault();
    const seatId = e.dataTransfer.getData("text/plain") || draggedSeatId;
    if (!seatId) return;

    const seatToDelete = designerSeats.find((s) => s.id === seatId);
    if (seatToDelete?.status === "SOLD") {
      setError("Cannot delete a seat that has already been purchased/sold.");
      setDraggedSeatId(null);
      setDragOverTrash(false);
      return;
    }

    if (seatId.startsWith("temp-")) {
      setDesignerSeats((prev) => prev.filter((s) => s.id !== seatId));
    } else {
      setDeletedSeatIds((prev) => [...prev, seatId]);
      setDesignerSeats((prev) => prev.filter((s) => s.id !== seatId));
    }

    setDraggedSeatId(null);
    setDragOverTrash(false);
  };

  const handleQuickAddLocalSeat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddRow || !quickAddLabel) {
      setError("Please specify both row and label.");
      return;
    }

    let seatLabel = quickAddLabel.trim();
    if (quickAddIsWheelchair && !seatLabel.includes("♿")) {
      seatLabel = `♿-${seatLabel}`;
    }

    const rowSeats = designerSeats.filter((s) => s.row === quickAddRow);
    const maxCol = rowSeats.reduce((max, s) => Math.max(max, s.number), 0);
    const nextCol = maxCol + 1;

    const duplicate = designerSeats.find(
      (s) => s.label.toLowerCase() === seatLabel.toLowerCase()
    );
    if (duplicate) {
      setError(`A seat with the label "${seatLabel}" already exists.`);
      return;
    }

    const newTempSeat: Seat = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventId,
      label: seatLabel,
      row: quickAddRow,
      number: nextCol,
      price: quickAddPrice.toString(),
      status: "AVAILABLE",
      lockedUntil: null,
      lockedBy: null,
      version: 0,
    };

    setDesignerSeats((prev) => [...prev, newTempSeat]);
    setSuccessMsg(`Added seat ${seatLabel} locally to Row ${quickAddRow}. Drag it to place it!`);
    setError(null);
    setQuickAddLabel("");
  };

  const handleSaveVisualLayout = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (deletedSeatIds.length > 0) {
        for (const seatId of deletedSeatIds) {
          const res = await deleteSeat(eventId, seatId);
          if (!res.success) {
            setError(`Failed to delete some seats: ${res.error}`);
            setLoading(false);
            return;
          }
        }
      }

      const tempSeats = designerSeats.filter((s) => s.id.startsWith("temp-"));
      const finalSeatUpdates: Array<{ id: string; row: string; number: number; label: string }> = [];

      const existingDesignerSeats = designerSeats.filter((s) => !s.id.startsWith("temp-"));
      existingDesignerSeats.forEach((s) => {
        finalSeatUpdates.push({
          id: s.id,
          row: s.row,
          number: s.number,
          label: s.label,
        });
      });

      for (const tempSeat of tempSeats) {
        const res = await createSeat(eventId, {
          row: tempSeat.row,
          label: tempSeat.label,
          price: parseFloat(tempSeat.price),
        });
        if (res.success && res.seat) {
          finalSeatUpdates.push({
            id: res.seat.id,
            row: tempSeat.row,
            number: tempSeat.number,
            label: tempSeat.label,
          });
        } else {
          setError(`Failed to create new seat ${tempSeat.label}: ${res.error}`);
          setLoading(false);
          return;
        }
      }

      if (finalSeatUpdates.length > 0) {
        const res = await updateSeatPositions(eventId, finalSeatUpdates);
        if (!res.success) {
          setError(res.error || "Failed to update seat positions.");
          setLoading(false);
          return;
        }
      }

      setSuccessMsg("Visual layout saved successfully!");
      setIsDesignerMode(false);
      setIsFocusMode(false);
      setShowFloatingAdd(false);
      setDeletedSeatIds([]);
      router.refresh();
    } catch (err: any) {
      console.error("Failed to save layout:", err);
      setError("An unexpected error occurred while saving the visual layout.");
    } finally {
      setLoading(false);
    }
  };

  const renderSeatMap = () => {
    // Define dynamically scaled dimensions based on zoom state!
    const activeZoom = isFocusMode ? zoom : 1.0;
    const size = 48 * activeZoom;
    const gap = 10 * activeZoom;
    const labelWidth = 32 * activeZoom;
    const labelSize = 12 * activeZoom;
    const seatFontSize = 10 * activeZoom;
    const plusIconSize = 16 * activeZoom;
    const wheelchairIconSize = 20 * activeZoom;

    const maxColAcrossAll = activeSeats.length > 0 ? Math.max(...activeSeats.map(s => s.number), 0) : 0;
    const colCount = isDesignerMode ? Math.max(12, maxColAcrossAll + 2) : maxColAcrossAll;

    const isCellOccupiedByWheelchairSpan = (rowLabel: string, colIndex: number) => {
      const rowIndex = uniqueRows.indexOf(rowLabel);
      
      // 1. Same row, previous column: check if seat at colIndex - 1 is a wheelchair
      const seatLeft = rows[rowLabel]?.find(s => s.number === colIndex - 1);
      if (seatLeft && (seatLeft.label.includes("♿") || seatLeft.label.toLowerCase().startsWith("w"))) {
        return true;
      }
      
      // 2. Row above: check if seat above or diagonally above-left is a wheelchair
      if (rowIndex > 0) {
        const rowAbove = uniqueRows[rowIndex - 1];
        
        // Directly above
        const seatAbove = rows[rowAbove]?.find(s => s.number === colIndex);
        if (seatAbove && (seatAbove.label.includes("♿") || seatAbove.label.toLowerCase().startsWith("w"))) {
          return true;
        }
        
        // Diagonally top-left
        const seatAboveLeft = rows[rowAbove]?.find(s => s.number === colIndex - 1);
        if (seatAboveLeft && (seatAboveLeft.label.includes("♿") || seatAboveLeft.label.toLowerCase().startsWith("w"))) {
          return true;
        }
      }
      
      return false;
    };

    // Calculate curve parameters dynamically (disabled/straight layout as requested)
    const getCurveStyle = (colIndex: number, rowIndex: number) => {
      return {};
    };

    const cells: React.ReactNode[] = [];

    uniqueRows.forEach((rowLabel, rowIndex) => {
      const rowSeats = rows[rowLabel] || [];
      const seatNumbers = rowSeats.map(s => s.number);
      const firstSeatCol = seatNumbers.length > 0 ? Math.min(...seatNumbers) : 1;
      const lastSeatCol = seatNumbers.length > 0 ? Math.max(...seatNumbers) : colCount;
      const rowColCount = colCount;
      const cols = Array.from({ length: rowColCount }, (_, i) => i + 1);

      // 1. Render Row Label
      cells.push(
        <div 
          key={`label-${rowLabel}`}
          className="text-center text-gray-500 font-bold flex items-center justify-center h-full select-none"
          style={{ 
            gridRow: `${rowIndex + 1}`,
            gridColumn: `1`,
            fontSize: `${labelSize}px`,
            ...getCurveStyle(0, rowIndex),
            zIndex: 10
          }}
        >
          {rowLabel}
        </div>
      );

      // 2. Render Cells
      cols.forEach((colIndex) => {
        // Check if this cell is covered by a wheelchair seat's 2x2 span
        if (isCellOccupiedByWheelchairSpan(rowLabel, colIndex)) {
          return;
        }



        const seat = rowSeats.find(s => s.number === colIndex);

        if (!seat) {
          // Render empty spacer / + slot
          if (isDesignerMode) {
            const isOverThisCell = dragOverCell?.row === rowLabel && dragOverCell?.col === colIndex;
            cells.push(
              <div
                key={`gap-${rowLabel}-${colIndex}`}
                onDragOver={(e) => handleDragOverCell(e, rowLabel, colIndex)}
                onDragLeave={handleDragLeaveCell}
                onDrop={(e) => handleDropOnEmptySlot(e, rowLabel, colIndex)}
                className={`
                  flex-shrink-0 rounded-lg flex items-center justify-center transition-all duration-200 border-2
                  ${isOverThisCell
                    ? 'border-emerald-500 bg-emerald-500/20 shadow-lg shadow-emerald-500/20 scale-105'
                    : 'border-dashed border-gray-700/60 hover:border-gray-500 hover:bg-gray-700/20 bg-gray-800/10'
                  }
                `}
                style={{ 
                  width: `${size}px`, 
                  height: `${size}px`,
                  gridRow: `${rowIndex + 1}`,
                  gridColumn: `${colIndex + 1}`,
                  ...getCurveStyle(colIndex, rowIndex),
                  zIndex: 10
                }}
              >
                <PlusIcon className="text-gray-600 hover:text-gray-400" style={{ width: `${plusIconSize}px`, height: `${plusIconSize}px` }} />
              </div>
            );
          } else {
            cells.push(
              <div 
                key={`gap-${rowLabel}-${colIndex}`} 
                className="flex-shrink-0" 
                style={{ 
                  width: `${size}px`, 
                  height: `${size}px`,
                  gridRow: `${rowIndex + 1}`,
                  gridColumn: `${colIndex + 1}`,
                  ...getCurveStyle(colIndex, rowIndex)
                }}
              />
            );
          }
          return;
        }

        // Render Seat Button
        const isAvailable = seat.status === "AVAILABLE";
        const isSelected = selectedSeatIds.includes(seat.id);
        const isLocked = seat.status === "LOCKED";
        const isSold = seat.status === "SOLD";
        const isHeld = seat.status === "HELD";
        const isWheelchair = seat.label.includes("♿") || seat.label.toLowerCase().startsWith("w");

        let tooltip = `${seat.label} - ${eventDetails?.currency || "$"}${parseFloat(seat.price).toFixed(2)}`;
        if (isWheelchair) tooltip = `♿ Accessible Seat (Takes 2 Rows, 2 Columns): ${tooltip}`;
        if (isHeld) tooltip = `🔒 VIP / Held: ${tooltip}`;
        if (isAdmin) {
          if (isLocked) tooltip += " | STATUS: Locked (Pending Payment)";
          if (isSold) tooltip += " | STATUS: Sold (Payment Confirmed)";
          if (isHeld) tooltip += " | STATUS: Held (VIP) — Click to release";
          if (isAvailable) tooltip += " | STATUS: Available — Click to hold for VIP";
        }
        
        const isBeingDragged = draggedSeatId === seat.id;

        cells.push(
          <button
            key={seat.id}
            draggable={isDesignerMode}
            onDragStart={(e) => handleDragStart(e, seat.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOverSeat(e, seat.id)}
            onDrop={(e) => handleDropOnSeat(e, seat.id)}
            disabled={isDesignerMode ? false : (!isAdmin && !isAvailable)}
            onClick={() => isAdmin ? handleAdminSeatClick(seat as Seat) : toggleSeat(seat as Seat)}
            className={`
              rounded-t-lg rounded-b-sm font-semibold transition-all flex flex-col items-center justify-center flex-shrink-0 relative
              ${isBeingDragged ? 'opacity-30 scale-90' : ''}
              ${isSelected 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 border-emerald-700 transform -translate-y-1' 
                : isHeld
                  ? 'bg-violet-500/25 text-violet-300 border-violet-500/40 shadow-md shadow-violet-500/10'
                  : isAvailable 
                    ? isWheelchair
                      ? 'bg-sky-600/90 text-white hover:bg-sky-500 border-sky-850 hover:border-sky-700 shadow-md shadow-sky-500/10'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-805 hover:border-gray-700' 
                    : isLocked
                      ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                      : 'bg-red-500/20 text-red-500 border-red-500/30'
              }
              ${isDesignerMode
                ? 'ring-2 ring-emerald-500/30 hover:ring-emerald-500 border-emerald-600/50 hover:bg-gray-650 cursor-grab active:cursor-grabbing'
                : (isAdmin ? 'cursor-pointer hover:brightness-125' : '')
              }
            `}
            style={{ 
              width: isWheelchair ? "100%" : `${size}px`, 
              height: isWheelchair ? "100%" : `${size}px`, 
              fontSize: `${seatFontSize}px`, 
              borderBottomWidth: `${Math.max(1, Math.round(4 * activeZoom))}px`,
              gridRow: isWheelchair ? `${rowIndex + 1} / span 2` : `${rowIndex + 1}`,
              gridColumn: isWheelchair ? `${colIndex + 1} / span 2` : `${colIndex + 1}`,
              alignSelf: isWheelchair ? "stretch" : "center",
              justifySelf: isWheelchair ? "stretch" : "center",
              ...getCurveStyle(colIndex, rowIndex),
              zIndex: 20
            }}
            title={tooltip}
          >
            {isWheelchair ? (
              <div className="flex flex-col items-center justify-center gap-1">
                <svg className="text-sky-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: `${wheelchairIconSize}px`, height: `${wheelchairIconSize}px` }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14a2 2 0 11-4 0 2 2 0 014 0zM8 21a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1M8 11h6M8 15h3" />
                </svg>
                <span className="font-bold truncate max-w-full px-0.5" style={{ fontSize: `${seatFontSize + 1}px` }}>{seat.label}</span>
              </div>
            ) : (
              <span className="font-bold truncate max-w-full px-0.5" style={{ fontSize: `${seatFontSize + 1}px` }}>{seat.label}</span>
            )}
            <span className="opacity-75 mt-0.5" style={{ fontSize: `${seatFontSize - 1}px` }}>{eventDetails?.currency || "$"}{Math.round(parseFloat(seat.price))}</span>
          </button>
        );
      });
    });



    return (
      <>
        {/* Stage Element */}
        <div className="w-full max-w-2xl mx-auto bg-gradient-to-r from-emerald-950/40 via-emerald-800/20 to-emerald-950/40 rounded-b-3xl h-14 flex flex-col items-center justify-center mb-14 border-t-4 border-x border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] relative overflow-hidden group">
          {/* Animated Glow overlay */}
          <div className="absolute inset-0 bg-emerald-500/5 opacity-50 group-hover:opacity-100 transition-opacity duration-700 animate-pulse pointer-events-none" />
          <span className="text-emerald-400 font-black tracking-[0.25em] text-xs sm:text-sm uppercase flex items-center gap-2 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            舞台區 / STAGE AREA
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          </span>
        </div>

        {/* Seat Grid via Advanced CSS Grid */}
        <div className="overflow-x-auto pb-4 w-full custom-scrollbar">
          <div 
            style={{
              display: "grid",
              gridTemplateColumns: `${labelWidth}px repeat(${colCount}, ${size}px)`,
              gridTemplateRows: `repeat(${uniqueRows.length}, ${size}px)`,
              columnGap: `${gap}px`,
              rowGap: `${gap * 2.4}px`, // beautiful dynamic proportional spacing matching 24px gap at 1.0 zoom
              justifyContent: "center",
              alignItems: "center",
              minWidth: "max-content",
              margin: "0 auto",
              paddingBottom: `${80 * activeZoom}px`
            }}
          >
            {cells}
          </div>
        </div>

        {/* Visual Trash Bin */}
        {isDesignerMode && (
          <div
            onDragOver={handleDragOverTrash}
            onDragLeave={handleDragLeaveTrash}
            onDrop={handleDropOnTrash}
            className={`
              mt-6 p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-300 w-full
              ${dragOverTrash
                ? 'border-red-500 bg-red-500/20 text-red-200 scale-102 shadow-lg shadow-red-500/10'
                : 'border-red-500/30 bg-red-950/10 text-red-400 hover:border-red-500/50 hover:bg-red-950/20'
              }
            `}
          >
            <TrashIcon className={`h-8 w-8 transition-transform duration-300 ${dragOverTrash ? 'scale-125 rotate-6 text-red-400' : 'text-red-500/70'}`} />
            <div className="text-center">
              <p className="text-sm font-bold">Trash Drop Zone</p>
              <p className="text-xs opacity-75">Drag and drop seats here to delete them</p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-10 flex justify-center gap-6 border-t border-gray-700 pt-6 flex-wrap w-full">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t bg-gray-700 border-b-2 border-gray-800"></div>
            <span className="text-sm text-gray-400">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t bg-sky-600 border-b-2 border-sky-800 flex items-center justify-center">
              <svg className="h-4 w-4 text-sky-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14a2 2 0 11-4 0 2 2 0 014 0zM8 21a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1M8 11h6M8 15h3" />
              </svg>
            </div>
            <span className="text-sm text-gray-400">Accessible (Wheelchair)</span>
          </div>
          {!isAdmin && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-t bg-emerald-500 border-b-2 border-emerald-700"></div>
              <span className="text-sm text-gray-400">Selected</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t bg-violet-500/25 border-b-2 border-violet-500/40"></div>
            <span className="text-sm text-gray-400">Held / VIP</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t bg-amber-500/20 border-b-2 border-amber-500/30"></div>
            <span className="text-sm text-gray-400">Locked (Pending Payment)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t bg-red-500/20 border-b-2 border-red-500/30"></div>
            <span className="text-sm text-gray-400">Sold / Confirmed</span>
          </div>
        </div>
      </>
    );
  };

  if (isFocusMode) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col overflow-y-auto text-white selection:bg-emerald-500/30 min-h-screen">
        {/* Gorgeous Premium Header Bar */}
        <header className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <SparklesIcon className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-wide text-white">Seating Layout Designer</h1>
                <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-bold tracking-widest uppercase animate-pulse">
                  Focus Mode
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium">
                Designing for: <span className="text-gray-200 font-semibold">{eventDetails?.title || "Event Layout"}</span>
              </p>
            </div>
          </div>

          {/* Action buttons in header */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {/* Grid Sizing Slider Control */}
            <div className="flex items-center gap-2.5 bg-gray-900/90 px-3 py-1.5 rounded-xl border border-gray-800 text-xs shadow-inner">
              <span className="text-gray-400 font-bold select-none uppercase tracking-wider text-[9px]">Seat Size:</span>
              <input
                type="range"
                min="0.3"
                max="1.2"
                step="0.01"
                value={zoom}
                onChange={(e) => {
                  setZoom(parseFloat(e.target.value));
                  setIsAutoFit(false);
                }}
                className="w-20 sm:w-28 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                title="Adjust Seating Map Grid Size"
              />
              <span className="text-emerald-400 font-mono font-bold w-10 text-right text-[10px]">{Math.round(zoom * 100)}%</span>
              
              {/* Vertical Separator */}
              <div className="h-4 w-[1px] bg-gray-800"></div>

              {/* Auto Fit Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  setIsAutoFit(prev => {
                    const next = !prev;
                    if (next) {
                      // Trigger adjustZoomToFit immediately
                      setTimeout(() => {
                        if (containerRef.current) {
                          const containerWidth = containerRef.current.clientWidth;
                          const maxCol = Math.max(...activeSeats.map(s => s.number), 0);
                          const colCount = isDesignerMode ? Math.max(12, maxCol + 2) : maxCol;
                          if (containerWidth && colCount > 0) {
                            const rawRowWidth = 32 + colCount * 58;
                            const availableWidth = containerWidth - 80;
                            const optimalZoom = Math.min(1.2, Math.max(0.35, availableWidth / rawRowWidth));
                            setZoom(Math.round(optimalZoom * 100) / 100);
                          }
                        }
                      }, 0);
                    }
                    return next;
                  });
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all select-none border ${
                  isAutoFit
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm"
                    : "bg-gray-800 border-gray-700/60 text-gray-400 hover:text-gray-300 hover:border-gray-650"
                }`}
                title="Toggle Seating Map Auto-Fit Viewport Width"
              >
                Auto-Fit
              </button>
            </div>

            {/* Quick Add Toggle */}
            <button
              type="button"
              onClick={() => setShowFloatingAdd(!showFloatingAdd)}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 shadow ${
                showFloatingAdd
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-gray-850 hover:bg-gray-800 border-gray-750 text-gray-300'
              }`}
            >
              <PlusIcon className={`h-4 w-4 transition-transform duration-300 ${showFloatingAdd ? 'rotate-45 text-emerald-400' : 'text-gray-400'}`} />
              <span>Quick Create Drawer</span>
            </button>

            {/* Save Layout */}
            <button
              type="button"
              onClick={handleSaveVisualLayout}
              disabled={loading}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-900 border border-transparent hover:shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5 shadow font-extrabold"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving Layout...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>

            {/* Exit Focus */}
            <button
              type="button"
              onClick={() => {
                setIsFocusMode(false);
                setShowFloatingAdd(false);
              }}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700 text-gray-300 hover:text-white transition-all shadow"
            >
              Exit Focus
            </button>
          </div>
        </header>

        {/* Designer Workspace Container */}
        <main className="flex-1 p-6 md:p-12 flex flex-col items-center justify-start w-full relative">
          {/* Notifications in Fullscreen */}
          {error && (
            <div className="mb-6 w-full max-w-4xl bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300">
              <XCircleIcon className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 w-full max-w-4xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300">
              <CheckCircleIcon className="h-5 w-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Seat Map Area */}
          <div 
            ref={containerRef}
            className="w-full max-w-[95vw] bg-gray-900/60 border border-gray-800 p-8 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.04)] backdrop-blur-md flex flex-col items-center border-t-emerald-500/10"
          >
            {renderSeatMap()}
          </div>

          {/* Glassmorphic Floating Quick Create Seat Drawer */}
          {showFloatingAdd && (
            <div className="fixed top-24 right-6 w-80 bg-gray-900/95 border border-gray-800 p-6 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-right duration-300 backdrop-blur-md">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
                <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                  <PlusIcon className="h-5 w-5 text-emerald-400" />
                  Quick Create & Place
                </h4>
                <button
                  type="button"
                  onClick={() => setShowFloatingAdd(false)}
                  className="text-gray-400 hover:text-white text-xs font-semibold p-1 hover:bg-gray-800 rounded transition-all"
                >
                  Close
                </button>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
                Create a standard or wheelchair seat. It will be added to the row's end, and you can drag it into position.
              </p>

              <form onSubmit={handleQuickAddLocalSeat} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Row
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. A"
                      value={quickAddRow}
                      onChange={(e) => setQuickAddRow(e.target.value.toUpperCase())}
                      className="w-full px-2.5 py-2 rounded-lg bg-gray-950 text-white border border-gray-800 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Seat Label
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. A-13"
                      value={quickAddLabel}
                      onChange={(e) => setQuickAddLabel(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-gray-950 text-white border border-gray-800 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Price ({eventDetails?.currency || "$"})
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={quickAddPrice}
                      onChange={(e) => setQuickAddPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-2 rounded-lg bg-gray-950 text-white border border-gray-800 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quickAddIsWheelchair}
                        onChange={(e) => setQuickAddIsWheelchair(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="relative w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                      <span className="ms-2 text-[11px] font-semibold text-gray-300">Wheelchair?</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-gray-900 transition-all font-extrabold shadow-md hover:shadow-emerald-500/25"
                >
                  Add Seat to Grid
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Left: Seat Map */}
      <div className="lg:w-2/3 bg-gray-900/60 p-8 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.04)] border border-gray-800/80 border-t-emerald-500/10 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {isDesignerMode ? (
              <>
                <SparklesIcon className="h-5 w-5 text-emerald-400" />
                <span>Visual Seating Designer</span>
              </>
            ) : (
              isAdmin ? "Seat Map (Read-Only Mode)" : "Select Your Seats"
            )}
          </h2>
          <div className="flex items-center gap-2">
            {isDesignerMode && (
              <button
                type="button"
                onClick={() => setIsFocusMode(true)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-650 border border-gray-650 text-gray-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow"
              >
                <svg className="h-4 w-4 text-emerald-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
                Focus Seating Map
              </button>
            )}
            {isAdmin && !isDesignerMode && (
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold">
                Admin View
              </span>
            )}
          </div>
        </div>

        {renderSeatMap()}
      </div>

      {/* Right side: standard User Checkout vs comprehensive Admin Control Panel */}
      <div className="lg:w-1/3">
        {isAdmin ? (
          <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden sticky top-6">
            {/* Tabs Header */}
            <div className="flex border-b border-gray-700 bg-gray-900/40">
              <button
                onClick={() => { setActiveTab("bookings"); setError(null); setSuccessMsg(null); }}
                className={`flex-1 py-3 px-2 text-center text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5
                  ${activeTab === "bookings" 
                    ? 'border-emerald-500 text-emerald-400 bg-gray-850' 
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'}`}
              >
                <TicketIcon className="h-4 w-4" />
                Bookings
              </button>
              <button
                onClick={() => { setActiveTab("settings"); setError(null); setSuccessMsg(null); }}
                className={`flex-1 py-3 px-2 text-center text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5
                  ${activeTab === "settings" 
                    ? 'border-emerald-500 text-emerald-400 bg-gray-850' 
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'}`}
              >
                <PencilSquareIcon className="h-4 w-4" />
                Settings
              </button>
              <button
                onClick={() => { setActiveTab("seats"); setError(null); setSuccessMsg(null); }}
                className={`flex-1 py-3 px-2 text-center text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5
                  ${activeTab === "seats" 
                    ? 'border-emerald-500 text-emerald-400 bg-gray-850' 
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'}`}
              >
                <Cog6ToothIcon className="h-4 w-4" />
                Seats
              </button>
            </div>

            <div className="p-6">
              {/* Notifications */}
              {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                  <XCircleIcon className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-sm flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Tab 1: Bookings List */}
              {activeTab === "bookings" && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-md mb-2 flex items-center gap-2 border-b border-gray-700 pb-2">
                    Event Reservation List
                    <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300 font-normal">
                      {reservations.length} total
                    </span>
                  </h3>
                  
                  {reservations.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-10">No bookings made for this event yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                      {reservations.map((res: any) => {
                        const isPending = res.status === "PENDING_PAYMENT";
                        const isSuccess = res.status === "SUCCESS";
                        
                        return (
                          <div key={res.id} className="bg-gray-700/40 p-4 rounded-xl border border-gray-700 flex flex-col justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-mono text-xs font-semibold bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                                  {res.bankRef || "NO_REF"}
                                </span>
                                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded
                                  ${isPending ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                                    isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                    'bg-red-500/10 text-red-400 border border-red-500/20'}`}
                                >
                                  {res.status.replace("_", " ")}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-white mt-1 flex items-center gap-1">
                                <UserIcon className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                                {res.user.name}
                              </p>
                              <p className="text-xs text-gray-400">{res.user.email}</p>
                              <p className="text-xs text-gray-300 font-medium">
                                Seats: <span className="font-mono font-semibold">{res.seats.map((s: any) => s.label).join(", ")}</span>
                              </p>
                              <p className="text-sm font-extrabold text-emerald-400 pt-1">
                                {eventDetails?.currency || "$"}{Number(res.totalAmount).toFixed(2)}
                              </p>
                            </div>

                            {isPending && (
                              <button
                                onClick={() => handleApprovePayment(res.id)}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg bg-emerald-500 text-gray-900 hover:bg-emerald-400 transition-all disabled:opacity-50"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                                Confirm Bank Transfer
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Settings Editor */}
              {activeTab === "settings" && (
                <form onSubmit={handleUpdateEvent} className="space-y-4">
                  <h3 className="font-bold text-white text-md border-b border-gray-700 pb-2">
                    Edit Event Details
                  </h3>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Event Title
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Venue Location
                    </label>
                    <input
                      type="text"
                      required
                      value={formVenue}
                      onChange={(e) => setFormVenue(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Currency Symbol
                    </label>
                    <input
                      type="text"
                      required
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-emerald-500 text-sm"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex items-center pt-5">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formIsActive}
                          onChange={(e) => setFormIsActive(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="relative w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        <span className="ms-2 text-xs font-semibold text-gray-300">Is Active?</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Cover Image URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/cover.png"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Description
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-emerald-500 text-sm resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl text-white font-bold bg-emerald-500 hover:bg-emerald-400 shadow-md hover:shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    {loading ? "Saving Changes..." : "Save Details"}
                  </button>
                </form>
              )}

              {/* Tab 3: Seat Management */}
              {activeTab === "seats" && (
                <div className="space-y-6">
                  {/* Visual Designer Control Panel! */}
                  <div className="bg-emerald-950/20 border border-emerald-500/25 p-4 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                          <SparklesIcon className="h-5 w-5 text-emerald-400" />
                          Visual Layout Designer
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Drag seats on the map to reorder, swap, or delete.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleDesignerMode}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                          isDesignerMode
                            ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                            : 'bg-emerald-500 text-gray-900 border-transparent hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
                        }`}
                      >
                        {isDesignerMode ? "Cancel Designer" : "Start Designer"}
                      </button>
                    </div>

                    {isDesignerMode && (
                      <div className="pt-2 border-t border-emerald-500/20">
                        <button
                          type="button"
                          onClick={handleSaveVisualLayout}
                          disabled={loading}
                          className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/25 text-xs"
                        >
                          {loading ? (
                            <>
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                              Saving Layout Changes...
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="h-4 w-4" />
                              Save Layout Changes
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {isDesignerMode ? (
                    /* Visual Designer Side Panel: Quick Add Form */
                    <form onSubmit={handleQuickAddLocalSeat} className="space-y-4 bg-gray-750/30 p-4 rounded-xl border border-gray-700">
                      <h4 className="font-bold text-white text-sm flex items-center gap-1.5 border-b border-gray-700 pb-2">
                        <PlusIcon className="h-5 w-5 text-emerald-400" />
                        Quick Create & Place Seat
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        Create a standard or wheelchair seat. It will be added to the row's end, and you can drag it into position.
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Row
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. A"
                            value={quickAddRow}
                            onChange={(e) => setQuickAddRow(e.target.value.toUpperCase())}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-gray-900 text-white border border-gray-750 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Seat Label
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. A-13"
                            value={quickAddLabel}
                            onChange={(e) => setQuickAddLabel(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-gray-900 text-white border border-gray-750 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Price ({eventDetails?.currency || "$"})
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={quickAddPrice}
                            onChange={(e) => setQuickAddPrice(parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-gray-900 text-white border border-gray-750 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                          />
                        </div>
                        <div className="flex items-center pt-5">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={quickAddIsWheelchair}
                              onChange={(e) => setQuickAddIsWheelchair(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="relative w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                            <span className="ms-2 text-[11px] font-semibold text-gray-300">Wheelchair?</span>
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 px-3 text-xs font-bold rounded bg-emerald-500 text-gray-900 hover:bg-emerald-400 transition-all"
                      >
                        Add Seat to Grid
                      </button>
                    </form>
                  ) : (
                    <>
                      {/* Seating Blueprint Generator Form */}
                      <form onSubmit={handleGenerateBlueprint} className="space-y-4 bg-gray-750/30 p-4 rounded-xl border border-gray-700">
                        <h4 className="font-bold text-white text-sm flex items-center gap-1.5 border-b border-gray-700 pb-2">
                          <CodeBracketIcon className="h-5 w-5 text-emerald-400" />
                          Seating Blueprint Builder
                        </h4>
                        
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          Write or paste a seating layout. Use <code>[label]</code> for standard seats, <code>[label,price]</code> for prices, <code>♿</code> for accessible seating, and <code>_</code> for aisle gaps.
                        </p>

                        {/* Pre-set template buttons */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setBlueprintText(PRESETS.theater)}
                            className="flex-1 py-1.5 px-2 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-400 rounded text-xs font-semibold transition-all"
                          >
                            Curved Theater
                          </button>
                          <button
                            type="button"
                            onClick={() => setBlueprintText(PRESETS.standard)}
                            className="flex-1 py-1.5 px-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs font-semibold transition-all"
                          >
                            12x5 Grid
                          </button>
                        </div>

                        <div>
                          <textarea
                            rows={8}
                            value={blueprintText}
                            onChange={(e) => setBlueprintText(e.target.value)}
                            className="w-full p-2.5 rounded-lg bg-gray-900 font-mono text-[10px] text-emerald-400 border border-gray-700 focus:outline-none focus:border-emerald-500 resize-y"
                            placeholder="Row 1: [1-22] [1-20] _ [1-1]..."
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-2 px-3 text-xs font-bold rounded bg-emerald-500 text-gray-900 hover:bg-emerald-400 transition-all disabled:opacity-50"
                        >
                          {loading ? "Generating..." : "Build Layout"}
                        </button>
                      </form>

                      {/* Seat pricing configurator */}
                      <form onSubmit={handleUpdatePricing} className="space-y-4 border-t border-gray-750 pt-5">
                        <h3 className="font-bold text-white text-md flex items-center gap-1.5">
                          <CurrencyDollarIcon className="h-5 w-5 text-emerald-400" />
                          Configure Row Pricing
                        </h3>

                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                          {uniqueRows.map((row) => (
                            <div key={row} className="flex items-center justify-between bg-gray-700/30 p-2.5 rounded-lg border border-gray-700">
                              <span className="font-bold text-xs text-white">Row {row}</span>
                              <div className="flex items-center gap-1 max-w-[100px]">
                                <span className="text-gray-400 text-xs font-semibold">{eventDetails?.currency || "$"}</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  required
                                  value={rowPricing[row] ?? 0}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setRowPricing(prev => ({ ...prev, [row]: val }));
                                  }}
                                  className="w-full px-2 py-0.5 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none text-right font-semibold text-xs"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-2 px-4 rounded-lg text-white font-bold bg-emerald-500 hover:bg-emerald-400 transition-all disabled:opacity-50 text-xs"
                        >
                          {loading ? "Updating prices..." : "Update Pricing Grid"}
                        </button>
                      </form>

                      {/* Seat map reset */}
                      <div className="border-t border-gray-750 pt-5 space-y-3">
                        <h3 className="font-bold text-red-400 text-md flex items-center gap-1.5">
                          <ArrowPathIcon className="h-5 w-5 text-red-500" />
                          Reset Seat Map / Bookings
                        </h3>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          Resets all seats back to Available. All reservations will be deleted.
                        </p>

                        {confirmReset ? (
                          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg space-y-3">
                            <p className="text-xs text-red-300 font-semibold leading-relaxed">
                              ⚠️ WARNING: This operation is destructive and cannot be undone. Are you sure?
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={handleResetSeats}
                                disabled={loading}
                                className="flex-1 py-2 px-3 rounded text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-50"
                              >
                                Yes, Reset
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmReset(false)}
                                className="flex-1 py-2 px-3 rounded text-xs font-bold bg-gray-700 hover:bg-gray-650 text-gray-200 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmReset(true)}
                            className="w-full py-2.5 px-4 rounded-lg text-red-400 font-bold bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:text-red-300 transition-all text-sm"
                          >
                            Reset Seat map
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700 sticky top-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              Booking Summary
            </h2>

            {selectedSeatIds.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <InformationCircleIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Select seats from the map to continue</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {selectedSeats.map(seat => (
                    <div key={seat.id} className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-emerald-400 mr-2" />
                        <span className="text-gray-200 font-medium">Seat {seat.label}</span>
                      </div>
                      <span className="text-gray-300">{eventDetails?.currency || "$"}{parseFloat(seat.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-700 pt-4 mb-6">
                  <div className="flex justify-between items-end">
                    <span className="text-gray-400 font-medium">Total Price</span>
                    <span className="text-3xl font-bold text-emerald-400">{eventDetails?.currency || "$"}{totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleReserve}
                  disabled={loading}
                  className="w-full py-4 px-4 rounded-xl text-white font-bold bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Locking Seats..." : "Reserve & Proceed to Payment"}
                </button>
                
                <p className="mt-4 text-xs text-gray-500 text-center">
                  Seats will be locked for 8 hours to complete payment.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
