"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  reserveSeats,
  validateEventCoupon,
  approvePayment,
  approveRefund,
  rejectRefund,
} from "@/app/actions/reservations";
import { formatBankRefForTransfer } from "@/lib/bankRef";
import { formatSeatLabelsForDisplay } from "@/lib/seatLabel";
import { applySeatDiscount } from "@/lib/coupon";
import RefundProofUpload from "./RefundProofUpload";
import {
  updateEvent,
  updateSeatPricing,
  resetEventSeats,
  generateSeatsFromBlueprint,
  updateSeatPositions,
  deleteSeat,
  createSeat,
  toggleSeatHold,
  deleteEvent,
  createCoupon,
  deleteCoupon,
  createSponsor,
  deleteSponsor,
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
  SparklesIcon,
} from "@heroicons/react/24/solid";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

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
  isAuthenticated?: boolean;
  reservations?: any[];
  coupons?: any[];
  sponsors?: any[];
  t: any;
  locale: string;
  eventDetails?: {
    title: string;
    titleZhTw?: string | null;
    description: string;
    descriptionZhTw?: string | null;
    venue: string;
    venueZhTw?: string | null;
    date: string;
    imageUrl: string | null;
    isActive: boolean;
    currency: string;
    bankName?: string;
    bankNameZhTw?: string | null;
    bankCode?: string;
    bankAccount?: string;
    bankAccountHolder?: string;
    couponCode?: string | null;
    couponDiscountPercent?: number | null;
    hasEventCoupon?: boolean;
  };
};

type BookingStatusFilter =
  | "ALL"
  | "PENDING_PAYMENT"
  | "SUCCESS"
  | "REFUND_REQUESTED"
  | "REFUNDED"
  | "EXPIRED"
  | "CANCELLED";

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
11: _ _ [11-20,300] [11-18,300] [11-16,300] [11-14,300] [11-12,300] [11-10,300] [11-8,300] [11-6,300] [11-4,300] [11-2,300] _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ [11-1,300] [11-3,300] [11-5,300] [11-7,300] [11-9,300] [11-11,300] [11-13,300] [11-15,300] [11-17,300] [11-19,300] _ _`,
};

export default function SeatSelectionClient({
  eventId,
  seats,
  isAdmin = false,
  isAuthenticated = false,
  reservations = [],
  coupons = [],
  sponsors = [],
  t,
  locale,
  eventDetails,
}: SeatSelectionClientProps) {
  const router = useRouter();
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showReservationConfirm, setShowReservationConfirm] = useState(false);

  // Seating Designer States
  const [isDesignerMode, setIsDesignerMode] = useState(false);
  const [designerSeats, setDesignerSeats] = useState<Seat[]>([]);
  const [selectedDesignerSeatIds, setSelectedDesignerSeatIds] = useState<
    string[]
  >([]);
  const [draggedSeatId, setDraggedSeatId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{
    row: string;
    col: number;
  } | null>(null);
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
  const [activeTab, setActiveTab] = useState<"bookings" | "settings" | "seats" | "coupons" | "sponsors">(
    "bookings",
  );

  const [couponsList, setCouponsList] = useState<any[]>(coupons);
  useEffect(() => {
    setCouponsList(coupons);
  }, [coupons]);

  // Sponsors States
  const [sponsorsList, setSponsorsList] = useState<any[]>(sponsors || []);
  useEffect(() => {
    setSponsorsList(sponsors || []);
  }, [sponsors]);

  const [sponsorNameInput, setSponsorNameInput] = useState("");
  const [sponsorLogoUrlInput, setSponsorLogoUrlInput] = useState("");
  const [sponsorTierInput, setSponsorTierInput] = useState<"PLATINUM" | "GOLD" | "SILVER" | "BRONZE">("PLATINUM");
  const [sponsorLoading, setSponsorLoading] = useState(false);
  const [sponsorError, setSponsorError] = useState<string | null>(null);
  const [sponsorSuccess, setSponsorSuccess] = useState<string | null>(null);

  const getDefaultExpiresAt = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [couponDiscountPercentInput, setCouponDiscountPercentInput] = useState("");
  const [couponMaxUsesInput, setCouponMaxUsesInput] = useState("10");
  const [couponExpiresAtInput, setCouponExpiresAtInput] = useState(getDefaultExpiresAt());
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [bookingStatusFilter, setBookingStatusFilter] =
    useState<BookingStatusFilter>("ALL");
  const [bookingSearchQuery, setBookingSearchQuery] = useState("");
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [refundRejectReservationId, setRefundRejectReservationId] = useState<
    string | null
  >(null);
  const [refundRejectNote, setRefundRejectNote] = useState("");
  const [refundRejectError, setRefundRejectError] = useState<string | null>(
    null,
  );

  // Admin Event Form state
  const [formTitle, setFormTitle] = useState(eventDetails?.title || "");
  const [formTitleZhTw, setFormTitleZhTw] = useState(
    eventDetails?.titleZhTw || "",
  );
  const [formVenue, setFormVenue] = useState(eventDetails?.venue || "");
  const [formVenueZhTw, setFormVenueZhTw] = useState(
    eventDetails?.venueZhTw || "",
  );
  const [formDescription, setFormDescription] = useState(
    eventDetails?.description || "",
  );
  const [formDescriptionZhTw, setFormDescriptionZhTw] = useState(
    eventDetails?.descriptionZhTw || "",
  );
  const [formImageUrl, setFormImageUrl] = useState(
    eventDetails?.imageUrl || "",
  );
  const [formDate, setFormDate] = useState(
    eventDetails?.date
      ? new Date(eventDetails.date).toISOString().slice(0, 16)
      : "",
  );
  const [formIsActive, setFormIsActive] = useState(
    eventDetails?.isActive ?? true,
  );
  const [formCurrency, setFormCurrency] = useState(
    eventDetails?.currency || "$",
  );
  const [formBankName, setFormBankName] = useState(
    eventDetails?.bankName || "Global Tech Bank",
  );
  const [formBankNameZhTw, setFormBankNameZhTw] = useState(
    eventDetails?.bankNameZhTw || "環球科技銀行",
  );
  const [formBankCode, setFormBankCode] = useState(
    eventDetails?.bankCode || "",
  );
  const [formBankAccount, setFormBankAccount] = useState(
    eventDetails?.bankAccount || "1029-4837-9912",
  );
  const [formBankAccountHolder, setFormBankAccountHolder] = useState(
    eventDetails?.bankAccountHolder || "Al-Hadi TIECC",
  );
  const [formCouponCode, setFormCouponCode] = useState(
    eventDetails?.couponCode || "",
  );
  const [formCouponDiscountPercent, setFormCouponDiscountPercent] = useState(
    eventDetails?.couponDiscountPercent != null
      ? String(eventDetails.couponDiscountPercent)
      : "",
  );

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercent: number;
  } | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [couponValidating, setCouponValidating] = useState(false);

  useEffect(() => {
    if (!eventDetails) return;
    setFormTitle(eventDetails.title || "");
    setFormTitleZhTw(eventDetails.titleZhTw || "");
    setFormVenue(eventDetails.venue || "");
    setFormVenueZhTw(eventDetails.venueZhTw || "");
    setFormDescription(eventDetails.description || "");
    setFormDescriptionZhTw(eventDetails.descriptionZhTw || "");
    setFormImageUrl(eventDetails.imageUrl || "");
    setFormDate(
      eventDetails.date
        ? new Date(eventDetails.date).toISOString().slice(0, 16)
        : "",
    );
    setFormIsActive(eventDetails.isActive ?? true);
    setFormCurrency(eventDetails.currency || "$");
    setFormBankName(eventDetails.bankName || "Global Tech Bank");
    setFormBankNameZhTw(eventDetails.bankNameZhTw || "環球科技銀行");
    setFormBankCode(eventDetails.bankCode || "");
    setFormBankAccount(eventDetails.bankAccount || "1029-4837-9912");
    setFormBankAccountHolder(
      eventDetails.bankAccountHolder || "Al-Hadi TIECC",
    );
    setFormCouponCode(eventDetails.couponCode || "");
    setFormCouponDiscountPercent(
      eventDetails.couponDiscountPercent != null
        ? String(eventDetails.couponDiscountPercent)
        : "",
    );
  }, [eventDetails]);

  // Admin Seating Blueprint text state
  const [blueprintText, setBlueprintText] = useState(PRESETS.theater);

  const activeSeats = isDesignerMode ? designerSeats : (seats as Seat[]);
  const bookingStatusFilters: Array<{
    value: BookingStatusFilter;
    label: string;
  }> = [
    { value: "ALL", label: t.admin.filterAll },
    { value: "PENDING_PAYMENT", label: t.dashboard.pendingPayment },
    { value: "SUCCESS", label: t.dashboard.activeTicket },
    { value: "REFUND_REQUESTED", label: t.dashboard.refundRequested },
    { value: "REFUNDED", label: t.dashboard.refunded },
    { value: "EXPIRED", label: t.dashboard.expired },
    { value: "CANCELLED", label: t.dashboard.cancelled },
  ];
  const bookingStatusCounts = useMemo(() => {
    return reservations.reduce(
      (counts: Record<string, number>, reservation: any) => {
        counts.ALL += 1;
        counts[reservation.status] = (counts[reservation.status] || 0) + 1;
        return counts;
      },
      {
        ALL: 0,
        PENDING_PAYMENT: 0,
        SUCCESS: 0,
        REFUND_REQUESTED: 0,
        REFUNDED: 0,
        EXPIRED: 0,
        CANCELLED: 0,
      } as Record<BookingStatusFilter, number>,
    );
  }, [reservations]);
  const filteredReservations = useMemo(() => {
    const normalizedQuery = bookingSearchQuery.trim().toLowerCase();

    return reservations.filter((reservation: any) => {
      const matchesStatus =
        bookingStatusFilter === "ALL" ||
        reservation.status === bookingStatusFilter;
      if (!matchesStatus) return false;

      if (!normalizedQuery) return true;

      const searchableText = [
        reservation.id,
        reservation.bankRef,
        reservation.status,
        reservation.user?.name,
        reservation.user?.email,
        reservation.totalAmount,
        reservation.refundReason,
        reservation.refundReviewNote,
        reservation.seats?.map((seat: any) => seat.label).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [bookingSearchQuery, bookingStatusFilter, reservations]);

  const containerRef = useRef<HTMLDivElement>(null);

  const adjustZoomToFit = useCallback(() => {
    if (!isAutoFit || !containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    if (!containerWidth) return;

    const maxCol = Math.max(...activeSeats.map((s) => s.number), 0);
    const colCount = isDesignerMode ? Math.max(12, maxCol + 2) : maxCol;
    if (colCount <= 0) return;

    // Width of row label + seat buttons + gaps in Grid layout
    // 32px label + colCount * 48px seats + colCount * 10px gaps
    const rawRowWidth = 32 + colCount * 58;
    const availableWidth = containerWidth - 80; // subtracting container horizontal padding + extra safety margin
    const optimalZoom = Math.min(
      1.2,
      Math.max(0.35, availableWidth / rawRowWidth),
    );

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
  }, [
    activeSeats.length,
    isDesignerMode,
    isFocusMode,
    isAutoFit,
    adjustZoomToFit,
  ]);

  const uniqueRows = Array.from(new Set(activeSeats.map((s) => s.row))).sort(
    (a, b) => {
      const aNum = parseInt(a, 10);
      const bNum = parseInt(b, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return a.localeCompare(b);
    },
  );
  const initialRowPricing = uniqueRows.reduce(
    (acc: Record<string, number>, row) => {
      const rowSeat = activeSeats.find((s) => s.row === row);
      acc[row] = rowSeat ? parseFloat(rowSeat.price) : 0;
      return acc;
    },
    {},
  );
  const [rowPricing, setRowPricing] =
    useState<Record<string, number>>(initialRowPricing);

  // Seat reset confirm state
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
  const subtotalPrice = selectedSeats.reduce(
    (sum, s) => sum + parseFloat(s.price),
    0,
  );
  const discountPercent = appliedCoupon?.discountPercent ?? 0;
  const totalPrice =
    discountPercent > 0
      ? selectedSeats.reduce(
          (sum, s) =>
            sum + applySeatDiscount(parseFloat(s.price), discountPercent),
          0,
        )
      : subtotalPrice;
  const hasEventCoupon = Boolean(eventDetails?.hasEventCoupon);

  const getSeatDisplayPrice = (price: number) => {
    if (discountPercent > 0) {
      return applySeatDiscount(price, discountPercent);
    }
    return price;
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      setCouponFeedback({
        type: "error",
        message: t.eventDetails.couponEnterCode,
      });
      return;
    }

    setCouponValidating(true);
    setCouponFeedback(null);

    const res = await validateEventCoupon(eventId, couponInput);
    setCouponValidating(false);

    if (res.success && res.discountPercent != null) {
      setAppliedCoupon({
        code: res.couponCode || couponInput.trim(),
        discountPercent: res.discountPercent,
      });
      setCouponFeedback({
        type: "success",
        message: t.eventDetails.couponAppliedSuccess.replace(
          "{percent}",
          String(res.discountPercent),
        ),
      });
    } else {
      setAppliedCoupon(null);
      setCouponFeedback({
        type: "error",
        message: res.error || t.eventDetails.couponInvalid,
      });
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponFeedback(null);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    setCouponSuccess(null);
    setCouponLoading(true);

    try {
      const res = await createCoupon(eventId, {
        code: couponCodeInput,
        discountPercent: parseInt(couponDiscountPercentInput, 10),
        maxUses: parseInt(couponMaxUsesInput, 10),
        expiresAt: couponExpiresAtInput,
      });

      if (res.success && res.coupon) {
        setCouponSuccess(t.admin.couponCreatedSuccess);
        setCouponCodeInput("");
        setCouponDiscountPercentInput("");
        setCouponMaxUsesInput("10");
        setCouponsList((prev) => [res.coupon, ...prev]);
        router.refresh();
      } else {
        setCouponError(res.error || "Failed to create coupon.");
      }
    } catch (err: any) {
      setCouponError(err.message || "An unexpected error occurred.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm(locale === "zh-TW" ? "確定要刪除此優惠碼嗎？" : "Are you sure you want to delete this coupon?")) {
      return;
    }

    setCouponError(null);
    setCouponSuccess(null);
    setCouponLoading(true);

    try {
      const res = await deleteCoupon(eventId, couponId);
      if (res.success) {
        setCouponSuccess(t.admin.couponDeletedSuccess);
        setCouponsList((prev) => prev.filter((c) => c.id !== couponId));
        router.refresh();
      } else {
        setCouponError(res.error || "Failed to delete coupon.");
      }
    } catch (err: any) {
      setCouponError(err.message || "An unexpected error occurred.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCreateSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSponsorError(null);
    setSponsorSuccess(null);
    setSponsorLoading(true);

    try {
      const res = await createSponsor(eventId, {
        name: sponsorNameInput,
        logoUrl: sponsorLogoUrlInput,
        tier: sponsorTierInput,
      });

      if (res.success && res.sponsor) {
        setSponsorSuccess(t.admin.sponsorCreatedSuccess || "Sponsor added successfully!");
        setSponsorNameInput("");
        setSponsorLogoUrlInput("");
        setSponsorTierInput("PLATINUM");
        setSponsorsList((prev) => [res.sponsor, ...prev]);
        router.refresh();
      } else {
        setSponsorError(res.error || "Failed to create sponsor.");
      }
    } catch (err: any) {
      setSponsorError(err.message || "An unexpected error occurred.");
    } finally {
      setSponsorLoading(false);
    }
  };

  const handleDeleteSponsor = async (sponsorId: string) => {
    if (!confirm(locale === "zh-TW" ? "確定要刪除此贊助商嗎？" : "Are you sure you want to delete this sponsor?")) {
      return;
    }

    setSponsorError(null);
    setSponsorSuccess(null);
    setSponsorLoading(true);

    try {
      const res = await deleteSponsor(eventId, sponsorId);
      if (res.success) {
        setSponsorSuccess(t.admin.sponsorDeletedSuccess || "Sponsor deleted successfully!");
        setSponsorsList((prev) => prev.filter((s) => s.id !== sponsorId));
        router.refresh();
      } else {
        setSponsorError(res.error || "Failed to delete sponsor.");
      }
    } catch (err: any) {
      setSponsorError(err.message || "An unexpected error occurred.");
    } finally {
      setSponsorLoading(false);
    }
  };

  const totalSeatCount = seats.length;
  const availableSeatCount = seats.filter(
    (seat) => seat.status === "AVAILABLE",
  ).length;
  const currency = eventDetails?.currency || "$";
  const eventDateLabel = eventDetails?.date
    ? new Date(eventDetails.date).toLocaleString(
        locale === "zh-TW" ? "zh-TW" : "en-US",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
      )
    : t.eventDetails.dateToAnnounce;

  const handleReserve = async () => {
    if (selectedSeatIds.length === 0) return;
    if (!isAuthenticated) {
      router.push(`/login?callbackUrl=/events/${eventId}`);
      return;
    }
    setError(null);
    setShowReservationConfirm(true);
  };

  const handleConfirmReservation = async () => {
    if (selectedSeatIds.length === 0) return;
    setLoading(true);
    setError(null);

    const res = await reserveSeats(
      eventId,
      selectedSeatIds,
      appliedCoupon?.code,
    );

    if (res.success && res.reservation) {
      router.push(`/reservations/${res.reservation.id}`);
    } else {
      setError(res.error || "Failed to reserve seats.");
      setLoading(false);
      setShowReservationConfirm(false);
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

  const handleApproveRefund = async (reservationId: string) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await approveRefund(reservationId);
    if (res.success) {
      setSuccessMsg(t.admin.refundApprovedMsg);
      router.refresh();
    } else {
      setError(res.error || t.admin.refundActionFailed);
    }
    setLoading(false);
  };

  const openRejectRefundModal = (reservationId: string) => {
    setRefundRejectReservationId(reservationId);
    setRefundRejectNote("");
    setRefundRejectError(null);
    setError(null);
    setSuccessMsg(null);
  };

  const closeRejectRefundModal = () => {
    if (loading) return;
    setRefundRejectReservationId(null);
    setRefundRejectNote("");
    setRefundRejectError(null);
  };

  const handleRejectRefund = async () => {
    if (!refundRejectReservationId) return;

    const reviewNote = refundRejectNote.trim();
    if (reviewNote.length < 5) {
      setRefundRejectError(t.admin.refundRejectNoteRequired);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setRefundRejectError(null);

    const res = await rejectRefund(refundRejectReservationId, reviewNote);
    if (res.success) {
      setSuccessMsg(t.admin.refundRejectedMsg);
      setRefundRejectReservationId(null);
      setRefundRejectNote("");
      router.refresh();
    } else {
      setRefundRejectError(res.error || t.admin.refundActionFailed);
    }
    setLoading(false);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (!formDate) {
      setError("Event date is required.");
      setLoading(false);
      return;
    }

    const parsedFormDate = new Date(formDate);
    if (Number.isNaN(parsedFormDate.getTime())) {
      setError("Invalid event date. Please check the date field.");
      setLoading(false);
      return;
    }

    const res = await updateEvent(eventId, {
      title: formTitle,
      titleZhTw: formTitleZhTw,
      description: formDescription,
      descriptionZhTw: formDescriptionZhTw,
      venue: formVenue,
      venueZhTw: formVenueZhTw,
      date: parsedFormDate.toISOString(),
      imageUrl: formImageUrl || null,
      isActive: formIsActive,
      currency: formCurrency,
      bankName: formBankName,
      bankNameZhTw: formBankNameZhTw,
      bankCode: formBankCode,
      bankAccount: formBankAccount,
      bankAccountHolder: formBankAccountHolder,
      couponCode: formCouponCode,
      couponDiscountPercent: formCouponDiscountPercent
        ? parseInt(formCouponDiscountPercent, 10)
        : undefined,
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

  const handleDeleteEvent = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await deleteEvent(eventId);
    if (res.success) {
      router.push("/admin");
      router.refresh();
    } else {
      setError(res.error || "Failed to delete event.");
      setConfirmDelete(false);
      setLoading(false);
    }
  };

  const handleGenerateBlueprint = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await generateSeatsFromBlueprint(eventId, blueprintText);
    if (res.success) {
      setSuccessMsg(
        `Successfully generated ${res.count} seats from blueprint layout!`,
      );
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
      setSelectedDesignerSeatIds([]);
      setDraggedSeatId(null);
      setDragOverCell(null);
      setDeletedSeatIds([]);
    } else {
      const seatsCopy = seats.map((s) => ({
        ...s,
        price: s.price.toString(),
      })) as Seat[];
      setDesignerSeats(seatsCopy);
      setSelectedDesignerSeatIds([]);
      setDeletedSeatIds([]);
      setIsDesignerMode(true);
    }
    setError(null);
    setSuccessMsg(null);
  };

  const handleDesignerSeatClick = (seat: Seat) => {
    setSelectedDesignerSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      } else {
        return [...prev, seat.id];
      }
    });
  };

  const handleDragStart = (e: React.DragEvent, seatId: string) => {
    setSelectedDesignerSeatIds((prev) => {
      if (!prev.includes(seatId)) {
        return [seatId];
      }
      return prev;
    });

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

  const handleDropOnEmptySlot = (
    e: React.DragEvent,
    targetRow: string,
    targetCol: number,
  ) => {
    e.preventDefault();
    const seatId = e.dataTransfer.getData("text/plain") || draggedSeatId;
    if (!seatId) return;

    const sourceSeat = designerSeats.find((s) => s.id === seatId);
    if (!sourceSeat) return;

    const sourceRowIdx = uniqueRows.indexOf(sourceSeat.row);
    const sourceCol = sourceSeat.number;
    const targetRowIdx = uniqueRows.indexOf(targetRow);

    const rowOffset = targetRowIdx - sourceRowIdx;
    const colOffset = targetCol - sourceCol;

    const idsToMove = selectedDesignerSeatIds.includes(seatId)
      ? selectedDesignerSeatIds
      : [seatId];

    setDesignerSeats((prev) =>
      prev.map((s) => {
        if (idsToMove.includes(s.id)) {
          const sRowIdx = uniqueRows.indexOf(s.row);
          const targetRowIdxForS = Math.min(
            uniqueRows.length - 1,
            Math.max(0, sRowIdx + rowOffset),
          );
          const newRow = uniqueRows[targetRowIdxForS];
          const newCol = Math.max(1, s.number + colOffset);

          // Update label based on pattern matching
          let newLabel = s.label;
          const isWheelchair = s.label.includes("♿");
          const oldExpected = `${s.row}-${s.number}`;
          const oldExpectedWheelchair = `♿-${s.row}-${s.number}`;

          if (s.label === oldExpected) {
            newLabel = `${newRow}-${newCol}`;
          } else if (
            s.label === oldExpectedWheelchair ||
            (isWheelchair && s.label.includes(oldExpected))
          ) {
            newLabel = `♿-${newRow}-${newCol}`;
          } else {
            const standardPattern = new RegExp(
              `^♿?\\-?${s.row}\\-${s.number}$`,
            );
            if (standardPattern.test(s.label)) {
              newLabel = isWheelchair
                ? `♿-${newRow}-${newCol}`
                : `${newRow}-${newCol}`;
            }
          }

          return {
            ...s,
            row: newRow,
            number: newCol,
            label: newLabel,
          };
        }
        return s;
      }),
    );

    setDraggedSeatId(null);
    setDragOverCell(null);
  };

  const handleDropOnSeat = (e: React.DragEvent, targetSeatId: string) => {
    e.preventDefault();
    const targetSeat = designerSeats.find((s) => s.id === targetSeatId);
    if (!targetSeat) return;
    handleDropOnEmptySlot(e, targetSeat.row, targetSeat.number);
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
      (s) => s.label.toLowerCase() === seatLabel.toLowerCase(),
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
    setSuccessMsg(
      `Added seat ${seatLabel} locally to Row ${quickAddRow}. Drag it to place it!`,
    );
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
      const finalSeatUpdates: Array<{
        id: string;
        row: string;
        number: number;
        label: string;
      }> = [];

      const existingDesignerSeats = designerSeats.filter(
        (s) => !s.id.startsWith("temp-"),
      );
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

    const maxColAcrossAll =
      activeSeats.length > 0
        ? Math.max(...activeSeats.map((s) => s.number), 0)
        : 0;
    const colCount = isDesignerMode
      ? Math.max(12, maxColAcrossAll + 2)
      : maxColAcrossAll;

    const isCellOccupiedByWheelchairSpan = (
      rowLabel: string,
      colIndex: number,
    ) => {
      const rowIndex = uniqueRows.indexOf(rowLabel);

      // 1. Same row, previous column: check if seat at colIndex - 1 is a wheelchair
      const seatLeft = rows[rowLabel]?.find((s) => s.number === colIndex - 1);
      if (
        seatLeft &&
        (seatLeft.label.includes("♿") ||
          seatLeft.label.toLowerCase().startsWith("w"))
      ) {
        return true;
      }

      // 2. Row above: check if seat above or diagonally above-left is a wheelchair
      if (rowIndex > 0) {
        const rowAbove = uniqueRows[rowIndex - 1];

        // Directly above
        const seatAbove = rows[rowAbove]?.find((s) => s.number === colIndex);
        if (
          seatAbove &&
          (seatAbove.label.includes("♿") ||
            seatAbove.label.toLowerCase().startsWith("w"))
        ) {
          return true;
        }

        // Diagonally top-left
        const seatAboveLeft = rows[rowAbove]?.find(
          (s) => s.number === colIndex - 1,
        );
        if (
          seatAboveLeft &&
          (seatAboveLeft.label.includes("♿") ||
            seatAboveLeft.label.toLowerCase().startsWith("w"))
        ) {
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
      const seatNumbers = rowSeats.map((s) => s.number);
      const firstSeatCol =
        seatNumbers.length > 0 ? Math.min(...seatNumbers) : 1;
      const lastSeatCol =
        seatNumbers.length > 0 ? Math.max(...seatNumbers) : colCount;
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
            zIndex: 10,
          }}
        >
          {rowLabel}
        </div>,
      );

      // 2. Render Cells
      cols.forEach((colIndex) => {
        // Check if this cell is covered by a wheelchair seat's 2x2 span
        if (isCellOccupiedByWheelchairSpan(rowLabel, colIndex)) {
          return;
        }

        const seat = rowSeats.find((s) => s.number === colIndex);

        if (!seat) {
          // Render empty spacer / + slot
          if (isDesignerMode) {
            const isOverThisCell =
              dragOverCell?.row === rowLabel && dragOverCell?.col === colIndex;
            cells.push(
              <div
                key={`gap-${rowLabel}-${colIndex}`}
                onDragOver={(e) => handleDragOverCell(e, rowLabel, colIndex)}
                onDragLeave={handleDragLeaveCell}
                onDrop={(e) => handleDropOnEmptySlot(e, rowLabel, colIndex)}
                className={`
                  flex-shrink-0 rounded-lg flex items-center justify-center transition-all duration-200 border-2
                  ${
                    isOverThisCell
                      ? "border-emerald-500 bg-emerald-500/20 shadow-lg shadow-emerald-500/20 scale-105"
                      : "border-dashed border-gray-700/60 hover:border-gray-500 hover:bg-gray-700/20 bg-gray-800/10"
                  }
                `}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  gridRow: `${rowIndex + 1}`,
                  gridColumn: `${colIndex + 1}`,
                  ...getCurveStyle(colIndex, rowIndex),
                  zIndex: 10,
                }}
              >
                <PlusIcon
                  className="text-gray-600 hover:text-gray-400"
                  style={{
                    width: `${plusIconSize}px`,
                    height: `${plusIconSize}px`,
                  }}
                />
              </div>,
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
                  ...getCurveStyle(colIndex, rowIndex),
                }}
              />,
            );
          }
          return;
        }

        // Render Seat Button
        const isAvailable = seat.status === "AVAILABLE";
        const isSelected = selectedSeatIds.includes(seat.id);
        const isDesignerSelected = selectedDesignerSeatIds.includes(seat.id);
        const isLocked = seat.status === "LOCKED";
        const isSold = seat.status === "SOLD";
        const isHeld = seat.status === "HELD";
        const isWheelchair =
          seat.label.includes("♿") || seat.label.toLowerCase().startsWith("w");

        let tooltip = `${seat.label} - ${eventDetails?.currency || "$"}${parseFloat(seat.price).toFixed(2)}`;
        if (isWheelchair)
          tooltip = `♿ Accessible Seat (Takes 2 Rows, 2 Columns): ${tooltip}`;
        if (isHeld) tooltip = `🔒 VIP / Held: ${tooltip}`;
        if (isAdmin) {
          if (isLocked) tooltip += " | STATUS: Locked (Pending Payment)";
          if (isSold) tooltip += " | STATUS: Sold (Payment Confirmed)";
          if (isHeld) tooltip += " | STATUS: Held (VIP) — Click to release";
          if (isAvailable)
            tooltip += " | STATUS: Available — Click to hold for VIP";
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
            disabled={isDesignerMode ? false : !isAdmin && !isAvailable}
            onClick={() =>
              isDesignerMode
                ? handleDesignerSeatClick(seat as Seat)
                : isAdmin
                  ? handleAdminSeatClick(seat as Seat)
                  : toggleSeat(seat as Seat)
            }
            className={`
              rounded-t-lg rounded-b-sm font-semibold transition-all flex flex-col items-center justify-center flex-shrink-0 relative
              ${isBeingDragged ? "opacity-30 scale-90" : ""}
              ${
                isSelected
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 border-emerald-700 transform -translate-y-1"
                  : isHeld
                    ? "bg-violet-500/25 text-violet-300 border-violet-500/40 shadow-md shadow-violet-500/10"
                    : isAvailable
                      ? isWheelchair
                        ? "bg-sky-600/90 text-white hover:bg-sky-500 border-sky-850 hover:border-sky-700 shadow-md shadow-sky-500/10"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-805 hover:border-gray-700"
                      : isLocked
                        ? "bg-amber-500/20 text-amber-500 border-amber-500/30"
                        : "bg-red-500/20 text-red-500 border-red-500/30"
              }
              ${
                isDesignerMode
                  ? `border-2 border-emerald-600/50 hover:bg-gray-650 cursor-grab active:cursor-grabbing ${
                      isDesignerSelected
                        ? "ring-4 ring-amber-400 border-amber-500 scale-95 shadow-lg bg-amber-950/45 text-amber-300 font-black"
                        : "ring-2 ring-emerald-500/30 hover:ring-emerald-500"
                    }`
                  : isAdmin
                    ? "cursor-pointer hover:brightness-125"
                    : ""
              }
            `}
            style={{
              width: isWheelchair ? "100%" : `${size}px`,
              height: isWheelchair ? "100%" : `${size}px`,
              fontSize: `${seatFontSize}px`,
              borderBottomWidth: `${Math.max(1, Math.round(4 * activeZoom))}px`,
              gridRow: isWheelchair
                ? `${rowIndex + 1} / span 2`
                : `${rowIndex + 1}`,
              gridColumn: isWheelchair
                ? `${colIndex + 1} / span 2`
                : `${colIndex + 1}`,
              alignSelf: isWheelchair ? "stretch" : "center",
              justifySelf: isWheelchair ? "stretch" : "center",
              ...getCurveStyle(colIndex, rowIndex),
              zIndex: 20,
            }}
            title={tooltip}
          >
            {isWheelchair ? (
              <div className="flex flex-col items-center justify-center gap-1">
                <svg
                  className="text-sky-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  style={{
                    width: `${wheelchairIconSize}px`,
                    height: `${wheelchairIconSize}px`,
                  }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 14a2 2 0 11-4 0 2 2 0 014 0zM8 21a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1M8 11h6M8 15h3"
                  />
                </svg>
                <span
                  className="font-bold truncate max-w-full px-0.5"
                  style={{ fontSize: `${seatFontSize + 1}px` }}
                >
                  {seat.label}
                </span>
              </div>
            ) : (
              <span
                className="font-bold truncate max-w-full px-0.5"
                style={{ fontSize: `${seatFontSize + 1}px` }}
              >
                {seat.label}
              </span>
            )}
            <span
              className="opacity-75 mt-0.5"
              style={{ fontSize: `${seatFontSize - 1}px` }}
            >
              {eventDetails?.currency || "$"}
              {Math.round(parseFloat(seat.price))}
            </span>
          </button>,
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
            {t.eventDetails.stageArea}
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
              paddingBottom: `${80 * activeZoom}px`,
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
              ${
                dragOverTrash
                  ? "border-red-500 bg-red-500/20 text-red-200 scale-102 shadow-lg shadow-red-500/10"
                  : "border-red-500/30 bg-red-950/10 text-red-400 hover:border-red-500/50 hover:bg-red-950/20"
              }
            `}
          >
            <TrashIcon
              className={`h-8 w-8 transition-transform duration-300 ${dragOverTrash ? "scale-125 rotate-6 text-red-400" : "text-red-500/70"}`}
            />
            <div className="text-center">
              <p className="text-sm font-bold">{t.admin.trashDropZone}</p>
              <p className="text-xs opacity-75">{t.admin.dragDropToDelete}</p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-10 flex justify-center gap-6 border-t border-gray-700 pt-6 flex-wrap w-full">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t bg-gray-700 border-b-2 border-gray-800"></div>
            <span className="text-sm text-gray-400">
              {t.eventDetails.legendAvailable}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t bg-sky-600 border-b-2 border-sky-800 flex items-center justify-center">
              <svg
                className="h-4 w-4 text-sky-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 14a2 2 0 11-4 0 2 2 0 014 0zM8 21a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1M8 11h6M8 15h3"
                />
              </svg>
            </div>
            <span className="text-sm text-gray-400">
              {t.eventDetails.legendWheelchair}
            </span>
          </div>
          {!isAdmin && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-t bg-emerald-500 border-b-2 border-emerald-700"></div>
              <span className="text-sm text-gray-400">
                {t.eventDetails.legendSelected}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t bg-violet-500/25 border-b-2 border-violet-500/40"></div>
            <span className="text-sm text-gray-400">
              {t.eventDetails.legendHeld}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t bg-amber-500/20 border-b-2 border-amber-500/30"></div>
            <span className="text-sm text-gray-400">
              {t.eventDetails.legendLocked}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t bg-red-500/20 border-b-2 border-red-500/30"></div>
            <span className="text-sm text-gray-400">
              {t.eventDetails.legendSold}
            </span>
          </div>
        </div>
      </>
    );
  };

  if (isFocusMode) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col overflow-y-auto text-white selection:bg-emerald-500/30 min-h-screen">
        {/* Gorgeous Premium Header Bar */}
        <header className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 px-4 py-4 sm:px-6 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shadow-xl">
          <div className="flex items-center gap-3 pr-12 md:pr-0">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <SparklesIcon className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-wide text-white">
                  Seating Layout Designer
                </h1>
                <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-bold tracking-widest uppercase animate-pulse">
                  Focus Mode
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium">
                Designing for:{" "}
                <span className="text-gray-200 font-semibold">
                  {eventDetails?.title || "Event Layout"}
                </span>
              </p>
            </div>
          </div>

          {/* Action buttons in header */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
            {/* Grid Sizing Slider Control */}
            <div className="flex items-center gap-2.5 bg-gray-900/90 px-3 py-1.5 rounded-xl border border-gray-800 text-xs shadow-inner w-full sm:w-auto">
              <span className="text-gray-400 font-bold select-none uppercase tracking-wider text-[9px]">
                Seat Size:
              </span>
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
              <span className="text-emerald-400 font-mono font-bold w-10 text-right text-[10px]">
                {Math.round(zoom * 100)}%
              </span>

              {/* Vertical Separator */}
              <div className="h-4 w-[1px] bg-gray-800"></div>

              {/* Auto Fit Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  setIsAutoFit((prev) => {
                    const next = !prev;
                    if (next) {
                      // Trigger adjustZoomToFit immediately
                      setTimeout(() => {
                        if (containerRef.current) {
                          const containerWidth =
                            containerRef.current.clientWidth;
                          const maxCol = Math.max(
                            ...activeSeats.map((s) => s.number),
                            0,
                          );
                          const colCount = isDesignerMode
                            ? Math.max(12, maxCol + 2)
                            : maxCol;
                          if (containerWidth && colCount > 0) {
                            const rawRowWidth = 32 + colCount * 58;
                            const availableWidth = containerWidth - 80;
                            const optimalZoom = Math.min(
                              1.2,
                              Math.max(0.35, availableWidth / rawRowWidth),
                            );
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
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20"
                  : "bg-gray-850 hover:bg-gray-800 border-gray-750 text-gray-300"
              }`}
            >
              <PlusIcon
                className={`h-4 w-4 transition-transform duration-300 ${showFloatingAdd ? "rotate-45 text-emerald-400" : "text-gray-400"}`}
              />
              <span>{t.admin.quickCreateDrawer}</span>
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
                  <span>{t.admin.savingLayoutChanges}</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                  <span>{t.admin.saveLayoutChanges}</span>
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
              {t.admin.exitFocus}
            </button>
          </div>
        </header>

        {/* Designer Workspace Container */}
        <main className="flex-1 p-4 sm:p-6 md:p-12 flex flex-col items-center justify-start w-full relative">
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
            className="w-full max-w-[95vw] bg-gray-900/60 border border-gray-800 p-4 sm:p-8 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.04)] backdrop-blur-md flex flex-col items-center border-t-emerald-500/10"
          >
            {renderSeatMap()}
          </div>

          {/* Glassmorphic Floating Quick Create Seat Drawer */}
          {showFloatingAdd && (
            <div className="fixed top-24 inset-x-4 sm:left-auto sm:right-6 sm:w-80 bg-gray-900/95 border border-gray-800 p-5 sm:p-6 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-right duration-300 backdrop-blur-md">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
                <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                  <PlusIcon className="h-5 w-5 text-emerald-400" />
                  {t.admin.quickCreateAndPlace}
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
                {t.admin.quickCreatePlaceSeatTip}
              </p>

              <form onSubmit={handleQuickAddLocalSeat} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      {t.admin.row}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. A"
                      value={quickAddRow}
                      onChange={(e) =>
                        setQuickAddRow(e.target.value.toUpperCase())
                      }
                      className="w-full px-2.5 py-2 rounded-lg bg-gray-950 text-white border border-gray-800 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      {t.admin.seatLabelText}
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
                      {t.admin.price} ({eventDetails?.currency || "$"})
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={quickAddPrice}
                      onChange={(e) =>
                        setQuickAddPrice(parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2.5 py-2 rounded-lg bg-gray-950 text-white border border-gray-800 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quickAddIsWheelchair}
                        onChange={(e) =>
                          setQuickAddIsWheelchair(e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="relative w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                      <span className="ms-2 text-[11px] font-semibold text-gray-300">
                        {t.admin.wheelchair}
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-gray-900 transition-all font-extrabold shadow-md hover:shadow-emerald-500/25"
                >
                  {t.admin.addSeatToGrid}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5 lg:gap-8">
      {/* Left: Seat Map */}
      <div className="lg:w-2/3 bg-gray-900/60 p-4 sm:p-6 lg:p-8 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.04)] border border-gray-800/80 border-t-emerald-500/10 flex flex-col">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            {isDesignerMode ? (
              <>
                <SparklesIcon className="h-5 w-5 text-emerald-400" />
                <span>{t.admin.visualLayoutDesigner}</span>
              </>
            ) : isAdmin ? (
              t.eventDetails.seatMapReadOnly
            ) : (
              t.eventDetails.selectYourSeats
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {isDesignerMode && (
              <button
                type="button"
                onClick={() => setIsFocusMode(true)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-650 border border-gray-650 text-gray-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow"
              >
                <svg
                  className="h-4 w-4 text-emerald-400 animate-pulse"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                  />
                </svg>
                {t.admin.focusSeatingMap}
              </button>
            )}
            {isAdmin && !isDesignerMode && (
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold">
                {t.eventDetails.adminView}
              </span>
            )}
            {!isAdmin && !isDesignerMode && (
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-full text-xs font-bold">
                {t.eventDetails.seatsLeftCountText
                  .replace("{available}", availableSeatCount.toString())
                  .replace("{total}", totalSeatCount.toString())}
              </span>
            )}
          </div>
        </div>

        {renderSeatMap()}
      </div>

      {/* Right side: standard User Checkout vs comprehensive Admin Control Panel */}
      <div className="lg:w-1/3">
        {isAdmin ? (
          <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden lg:sticky lg:top-6">
            {/* Tabs Header */}
            <div className="flex border-b border-gray-700 bg-gray-900/40 overflow-x-auto scrollbar-thin">
              <button
                onClick={() => {
                  setActiveTab("bookings");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-shrink-0 flex-1 py-3 px-2 text-center text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap
                  ${
                    activeTab === "bookings"
                      ? "border-emerald-500 text-emerald-400 bg-gray-850"
                      : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
                  }`}
              >
                <TicketIcon className="h-4 w-4" />
                {t.admin.tabBookings}
              </button>
              <button
                onClick={() => {
                  setActiveTab("settings");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-shrink-0 flex-1 py-3 px-2 text-center text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap
                  ${
                    activeTab === "settings"
                      ? "border-emerald-500 text-emerald-400 bg-gray-850"
                      : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
                  }`}
              >
                <PencilSquareIcon className="h-4 w-4" />
                {t.admin.tabSettings}
              </button>
              <button
                onClick={() => {
                  setActiveTab("seats");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-shrink-0 flex-1 py-3 px-2 text-center text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap
                  ${
                    activeTab === "seats"
                      ? "border-emerald-500 text-emerald-400 bg-gray-850"
                      : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
                  }`}
              >
                <Cog6ToothIcon className="h-4 w-4" />
                {t.admin.tabSeats}
              </button>
              <button
                onClick={() => {
                  setActiveTab("coupons");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-shrink-0 flex-1 py-3 px-2 text-center text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap
                  ${
                    activeTab === "coupons"
                      ? "border-emerald-500 text-emerald-400 bg-gray-850"
                      : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
                  }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.44 1.44 0 0 0 2.037 0l4.318-4.318a1.44 1.44 0 0 0 0-2.037l-9.58-9.581A2.25 2.25 0 0 0 9.568 3Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 6h.008v.008H6V6Z"
                  />
                </svg>
                {t.admin.tabCoupons}
              </button>
              <button
                onClick={() => {
                  setActiveTab("sponsors");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-shrink-0 flex-1 py-3 px-2 text-center text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap
                  ${
                    activeTab === "sponsors"
                      ? "border-emerald-500 text-emerald-400 bg-gray-850"
                      : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
                  }`}
              >
                <SparklesIcon className="h-4 w-4" />
                {t.admin.tabSponsors || "Sponsors"}
              </button>
            </div>

            <div className="p-4 sm:p-6">
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
                    {t.admin.eventReservationList}
                    <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300 font-normal">
                      {filteredReservations.length} / {reservations.length}{" "}
                      {t.admin.total}
                    </span>
                  </h3>

                  <div className="relative">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                    <input
                      value={bookingSearchQuery}
                      onChange={(event) =>
                        setBookingSearchQuery(event.target.value)
                      }
                      placeholder={t.admin.searchBookings}
                      className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 pl-10 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {bookingStatusFilters.map((filter) => {
                      const isActive = bookingStatusFilter === filter.value;
                      const count = bookingStatusCounts[filter.value] || 0;

                      return (
                        <button
                          key={filter.value}
                          type="button"
                          onClick={() => setBookingStatusFilter(filter.value)}
                          className={`admin-booking-filter-chip shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                            isActive ? "is-active" : ""
                          }`}
                        >
                          {filter.label}
                          <span className="admin-booking-filter-count ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {reservations.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-10">
                      {t.admin.noBookingsYet}
                    </p>
                  ) : filteredReservations.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-10">
                      {t.admin.noBookingsForFilter}
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredReservations.map((res: any) => {
                        const isPending = res.status === "PENDING_PAYMENT";
                        const isSuccess = res.status === "SUCCESS";
                        const isRefundRequested =
                          res.status === "REFUND_REQUESTED";
                        const isRefunded = res.status === "REFUNDED";

                        return (
                          <div
                            key={res.id}
                            className="bg-gray-700/40 p-4 rounded-xl border border-gray-700 flex flex-col justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-mono text-xs font-semibold bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                                  {res.bankRef
                                    ? formatBankRefForTransfer(res.bankRef)
                                    : t.admin.noRef}
                                </span>
                                <span
                                  className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded
                                  ${
                                    isPending
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                      : isSuccess
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : isRefundRequested
                                          ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                          : isRefunded
                                            ? "bg-gray-500/10 text-gray-300 border border-gray-500/20"
                                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                                  }`}
                                >
                                  {isPending
                                    ? t.dashboard.pendingPayment
                                    : isSuccess
                                      ? t.dashboard.activeTicket
                                      : isRefundRequested
                                        ? t.dashboard.refundRequested
                                        : isRefunded
                                          ? t.dashboard.refunded
                                          : t.dashboard.cancelled}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-white mt-1 flex items-center gap-1">
                                <UserIcon className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                                {res.user.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {res.user.email}
                              </p>
                              <p className="text-xs text-gray-300 font-medium">
                                {t.admin.seatsLabel}{" "}
                                <span className="font-mono font-semibold">
                                  {formatSeatLabelsForDisplay(
                                    res.seats.map((s: any) => s.label),
                                    {
                                      rowSeat: t.common.seatRowSeatFormat,
                                      wheelchairRowSeat:
                                        t.common.seatWheelchairRowSeatFormat,
                                    },
                                  )}
                                </span>
                              </p>
                              <p className="text-sm font-extrabold text-emerald-400 pt-1">
                                {eventDetails?.currency || "$"}
                                {Number(res.totalAmount).toFixed(2)}
                              </p>

                              {isRefundRequested && res.refundReason && (
                                <div className="mt-2 rounded-lg border border-sky-500/20 bg-sky-500/10 p-3">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                                    {t.admin.refundReason}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-300">
                                    {res.refundReason}
                                  </p>
                                </div>
                              )}

                              {res.refundReviewNote && (
                                <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                                    {t.admin.refundReviewNote}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-300">
                                    {res.refundReviewNote}
                                  </p>
                                </div>
                              )}

                              {res.paymentProofUrl && (
                                <div className="mt-2 bg-gray-900/60 p-2 rounded-lg border border-gray-700/80 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="relative overflow-hidden rounded-md border border-gray-600 bg-gray-950 flex items-center justify-center p-1 h-12 w-12 cursor-zoom-in group shrink-0"
                                      onClick={() =>
                                        setSelectedProofUrl(res.paymentProofUrl)
                                      }
                                    >
                                      <img
                                        src={res.paymentProofUrl}
                                        alt={t.admin.receiptThumbnailAlt}
                                        className="h-full w-auto object-contain rounded transition-transform group-hover:scale-105"
                                      />
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                                        {t.admin.receiptUploaded}
                                      </p>
                                      <p className="text-[9px] text-gray-400 leading-none">
                                        {t.admin.clickZoom}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedProofUrl(res.paymentProofUrl)
                                    }
                                    className="px-2.5 py-1 bg-gray-800 hover:bg-gray-750 border border-gray-700 text-gray-300 hover:text-white rounded-md text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                  >
                                    <svg
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                      />
                                    </svg>
                                    {t.admin.viewProof}
                                  </button>
                                </div>
                              )}

                              {isRefunded && (
                                <RefundProofUpload
                                  reservationId={res.id}
                                  initialProofUrl={res.refundProofUrl ?? null}
                                  labels={{
                                    refundProofUploaded:
                                      t.admin.refundProofUploaded,
                                    uploadRefundProof:
                                      t.admin.uploadRefundProof,
                                    replaceRefundProof:
                                      t.admin.replaceRefundProof,
                                    refundProofHelp: t.admin.refundProofHelp,
                                    invalidFormatError:
                                      t.reservationDetails.invalidFormatError,
                                    fileSizeError:
                                      t.reservationDetails.fileSizeError,
                                    refundProofUploadFailed:
                                      t.admin.refundProofUploadFailed,
                                    refundProofThumbnailAlt:
                                      t.admin.refundProofThumbnailAlt,
                                  }}
                                />
                              )}
                            </div>

                            {isPending && (
                              <button
                                onClick={() => handleApprovePayment(res.id)}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg bg-emerald-500 text-gray-900 hover:bg-emerald-400 transition-all disabled:opacity-50"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                                {t.admin.confirmBankTransfer}
                              </button>
                            )}

                            {isRefundRequested && (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleApproveRefund(res.id)}
                                  disabled={loading}
                                  className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg bg-emerald-500 text-gray-900 hover:bg-emerald-400 transition-all disabled:opacity-50"
                                >
                                  <CheckCircleIcon className="h-4 w-4" />
                                  {t.admin.approveRefund}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openRejectRefundModal(res.id)}
                                  disabled={loading}
                                  className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                                >
                                  <XCircleIcon className="h-4 w-4" />
                                  {t.admin.rejectRefund}
                                </button>
                              </div>
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
                <>
                  <form onSubmit={handleUpdateEvent} className="space-y-4">
                    <h3 className="font-bold text-white text-md border-b border-gray-700 pb-2">
                      {t.admin.editEventDetails}
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        {t.admin.eventTitle}
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
                        {t.admin.eventTitleZhTw}
                      </label>
                      <input
                        type="text"
                        value={formTitleZhTw}
                        onChange={(e) => setFormTitleZhTw(e.target.value)}
                        placeholder={t.admin.optionalChineseTitle}
                        className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-emerald-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        {t.admin.venueLocation}
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
                        {t.admin.venueLocationZhTw}
                      </label>
                      <input
                        type="text"
                        value={formVenueZhTw}
                        onChange={(e) => setFormVenueZhTw(e.target.value)}
                        placeholder={t.admin.optionalChineseVenue}
                        className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-emerald-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        {t.admin.currencySymbol}
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
                          {t.admin.dateTime}
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
                          <span
                            className={`ms-2 text-xs font-bold transition-colors duration-200 ${formIsActive ? "text-emerald-400" : "text-amber-400"}`}
                          >
                            {formIsActive
                              ? t.admin.activePublished
                              : t.admin.draftUnpublished}
                          </span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        {t.admin.coverImageUrl}
                      </label>
                      <input
                        type="text"
                        placeholder="https://example.com/cover.png"
                        value={formImageUrl}
                        onChange={(e) => setFormImageUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-emerald-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        {t.admin.description}
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-emerald-500 text-sm resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        {t.admin.descriptionZhTw}
                      </label>
                      <textarea
                        rows={4}
                        value={formDescriptionZhTw}
                        onChange={(e) => setFormDescriptionZhTw(e.target.value)}
                        placeholder={t.admin.optionalChineseDescription}
                        className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-emerald-500 text-sm resize-none"
                      />
                    </div>

                    <div className="border-t border-gray-700/50 pt-4 mt-4 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        {t.reservationDetails.transferInstructions}
                      </h4>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          {t.admin.bankNameEn}
                        </label>
                        <input
                          type="text"
                          required
                          value={formBankName}
                          onChange={(e) => setFormBankName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-emerald-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          {t.admin.bankNameZhTw}
                        </label>
                        <input
                          type="text"
                          value={formBankNameZhTw}
                          onChange={(e) => setFormBankNameZhTw(e.target.value)}
                          placeholder={t.admin.optionalChineseBankName}
                          className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-emerald-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          {t.admin.bankCode}
                        </label>
                        <input
                          type="text"
                          value={formBankCode}
                          onChange={(e) => setFormBankCode(e.target.value)}
                          placeholder="e.g. 004, SWIFT: CTCBTWTP"
                          className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-emerald-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          {t.admin.bankAccountHolder}
                        </label>
                        <input
                          type="text"
                          required
                          value={formBankAccountHolder}
                          onChange={(e) =>
                            setFormBankAccountHolder(e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-emerald-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          {t.admin.bankAccount}
                        </label>
                        <input
                          type="text"
                          required
                          value={formBankAccount}
                          onChange={(e) => setFormBankAccount(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-emerald-500 text-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 rounded-xl text-white font-bold bg-emerald-500 hover:bg-emerald-400 shadow-md hover:shadow-emerald-500/20 transition-all disabled:opacity-50"
                    >
                      {loading ? t.admin.savingChanges : t.admin.saveDetails}
                    </button>
                  </form>

                  {/* Danger Zone: Delete Event */}
                  <div className="border-t border-gray-750 pt-6 mt-6 space-y-4">
                    <h3 className="font-bold text-red-400 text-md flex items-center gap-1.5">
                      <TrashIcon className="h-5 w-5 text-red-500" />
                      {t.admin.deleteEvent}
                    </h3>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      {t.admin.deleteEventWarning}
                    </p>

                    {confirmDelete ? (
                      <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl space-y-3">
                        <p className="text-xs text-red-300 font-semibold leading-relaxed">
                          {t.admin.confirmDeleteEvent}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleDeleteEvent}
                            disabled={loading}
                            className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-red-650 hover:bg-red-600 text-white transition-all disabled:opacity-50"
                          >
                            {loading ? t.admin.deleting : t.admin.yesReset}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            disabled={loading}
                            className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-gray-750 hover:bg-gray-700 text-gray-200 transition-all disabled:opacity-50"
                          >
                            {t.admin.cancel}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="w-full py-2.5 px-4 rounded-xl text-red-400 font-bold bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:text-red-300 transition-all text-xs uppercase tracking-wider"
                      >
                        {t.admin.deleteEvent}
                      </button>
                    )}
                  </div>
                </>
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
                          {t.admin.visualLayoutDesigner}
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {t.admin.dragSeatsTip}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleDesignerMode}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                          isDesignerMode
                            ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                            : "bg-emerald-500 text-gray-900 border-transparent hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
                        }`}
                      >
                        {isDesignerMode
                          ? t.admin.cancelDesigner
                          : t.admin.startDesigner}
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
                              {t.admin.savingLayoutChanges}
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="h-4 w-4" />
                              {t.admin.saveLayoutChanges}
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {isDesignerMode && (
                    <div className="bg-emerald-950/10 border border-emerald-500/10 p-3 rounded-xl">
                      <p className="text-[11px] text-emerald-400 font-semibold leading-relaxed flex items-center gap-1.5">
                        <SparklesIcon className="h-3.5 w-3.5" />
                        <span>{t.admin.tipClickMultipleSeats}</span>
                      </p>
                    </div>
                  )}

                  {isDesignerMode && selectedDesignerSeatIds.length > 0 && (
                    <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl space-y-3.5">
                      <div className="flex justify-between items-center border-b border-amber-500/10 pb-2">
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                          {t.admin.selectedSeatsCount.replace(
                            "{count}",
                            selectedDesignerSeatIds.length.toString(),
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedDesignerSeatIds([])}
                          className="text-[10px] text-gray-400 hover:text-white underline font-semibold cursor-pointer"
                        >
                          {t.admin.clearSelection}
                        </button>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {t.admin.bulkActions}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDesignerSeats((prev) =>
                                prev.map((s) => {
                                  if (selectedDesignerSeatIds.includes(s.id)) {
                                    let newLabel = s.label;
                                    if (!newLabel.includes("♿")) {
                                      newLabel = `♿-${newLabel}`;
                                    }
                                    return { ...s, label: newLabel };
                                  }
                                  return s;
                                }),
                              );
                              setSuccessMsg(
                                t.admin.markedAccessibleMsg.replace(
                                  "{count}",
                                  selectedDesignerSeatIds.length.toString(),
                                ),
                              );
                              setError(null);
                            }}
                            className="py-1.5 px-2 bg-sky-600/25 border border-sky-500/30 hover:bg-sky-600/40 text-sky-300 rounded text-[11px] font-bold transition-all cursor-pointer text-center"
                          >
                            {t.admin.setAccessible}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDesignerSeats((prev) =>
                                prev.map((s) => {
                                  if (selectedDesignerSeatIds.includes(s.id)) {
                                    let newLabel = s.label
                                      .replace("♿-", "")
                                      .replace("♿", "");
                                    return { ...s, label: newLabel };
                                  }
                                  return s;
                                }),
                              );
                              setSuccessMsg(
                                t.admin.markedStandardMsg.replace(
                                  "{count}",
                                  selectedDesignerSeatIds.length.toString(),
                                ),
                              );
                              setError(null);
                            }}
                            className="py-1.5 px-2 bg-gray-700 border border-gray-600 hover:bg-gray-650 text-gray-300 rounded text-[11px] font-bold transition-all cursor-pointer text-center"
                          >
                            {t.admin.setStandard}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const seatsToDelete = designerSeats.filter((s) =>
                              selectedDesignerSeatIds.includes(s.id),
                            );
                            const hasSold = seatsToDelete.some(
                              (s) => s.status === "SOLD",
                            );
                            if (hasSold) {
                              setError(t.admin.cannotDeletePurchasedSeats);
                              return;
                            }

                            const realIds = seatsToDelete
                              .filter((s) => !s.id.startsWith("temp-"))
                              .map((s) => s.id);
                            setDeletedSeatIds((prev) => [...prev, ...realIds]);
                            setDesignerSeats((prev) =>
                              prev.filter(
                                (s) => !selectedDesignerSeatIds.includes(s.id),
                              ),
                            );
                            setSelectedDesignerSeatIds([]);
                            setSuccessMsg(
                              t.admin.deletedSeatsMsg.replace(
                                "{count}",
                                seatsToDelete.length.toString(),
                              ),
                            );
                            setError(null);
                          }}
                          className="w-full py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          {t.admin.deleteSelectedSeats}
                        </button>
                      </div>
                    </div>
                  )}

                  {isDesignerMode ? (
                    /* Visual Designer Side Panel: Quick Add Form */
                    <form
                      onSubmit={handleQuickAddLocalSeat}
                      className="space-y-4 bg-gray-750/30 p-4 rounded-xl border border-gray-700"
                    >
                      <h4 className="font-bold text-white text-sm flex items-center gap-1.5 border-b border-gray-700 pb-2">
                        <PlusIcon className="h-5 w-5 text-emerald-400" />
                        {t.admin.quickCreatePlaceSeat}
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        {t.admin.quickCreatePlaceSeatTip}
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            {t.admin.row}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. A"
                            value={quickAddRow}
                            onChange={(e) =>
                              setQuickAddRow(e.target.value.toUpperCase())
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-gray-900 text-white border border-gray-750 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            {t.admin.seatLabelText}
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
                            {t.admin.price} ({eventDetails?.currency || "$"})
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={quickAddPrice}
                            onChange={(e) =>
                              setQuickAddPrice(parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-gray-900 text-white border border-gray-750 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                          />
                        </div>
                        <div className="flex items-center pt-5">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={quickAddIsWheelchair}
                              onChange={(e) =>
                                setQuickAddIsWheelchair(e.target.checked)
                              }
                              className="sr-only peer"
                            />
                            <div className="relative w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                            <span className="ms-2 text-[11px] font-semibold text-gray-300">
                              {t.admin.wheelchair}
                            </span>
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 px-3 text-xs font-bold rounded bg-emerald-500 text-gray-900 hover:bg-emerald-400 transition-all"
                      >
                        {t.admin.addSeatToGrid}
                      </button>
                    </form>
                  ) : (
                    <>
                      {/* Seating Blueprint Generator Form */}
                      <form
                        onSubmit={handleGenerateBlueprint}
                        className="space-y-4 bg-gray-750/30 p-4 rounded-xl border border-gray-700"
                      >
                        <h4 className="font-bold text-white text-sm flex items-center gap-1.5 border-b border-gray-700 pb-2">
                          <CodeBracketIcon className="h-5 w-5 text-emerald-400" />
                          {t.admin.seatingBlueprintBuilder}
                        </h4>

                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          {t.admin.seatingBlueprintTip}
                        </p>

                        {/* Pre-set template buttons */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setBlueprintText(PRESETS.theater)}
                            className="flex-1 py-1.5 px-2 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-400 rounded text-xs font-semibold transition-all"
                          >
                            {t.admin.curvedTheater}
                          </button>
                          <button
                            type="button"
                            onClick={() => setBlueprintText(PRESETS.standard)}
                            className="flex-1 py-1.5 px-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs font-semibold transition-all"
                          >
                            {t.admin.grid12x5}
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
                          {loading ? t.admin.generating : t.admin.buildLayout}
                        </button>
                      </form>

                      {/* Seat pricing configurator */}
                      <form
                        onSubmit={handleUpdatePricing}
                        className="space-y-4 border-t border-gray-750 pt-5"
                      >
                        <h3 className="font-bold text-white text-md flex items-center gap-1.5">
                          <CurrencyDollarIcon className="h-5 w-5 text-emerald-400" />
                          {t.admin.configureRowPricing}
                        </h3>

                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                          {uniqueRows.map((row) => (
                            <div
                              key={row}
                              className="flex items-center justify-between bg-gray-700/30 p-2.5 rounded-lg border border-gray-700"
                            >
                              <span className="font-bold text-xs text-white">
                                {t.admin.rowLabel.replace("{row}", row)}
                              </span>
                              <div className="flex items-center gap-1 max-w-[100px]">
                                <span className="text-gray-400 text-xs font-semibold">
                                  {eventDetails?.currency || "$"}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  required
                                  value={rowPricing[row] ?? 0}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setRowPricing((prev) => ({
                                      ...prev,
                                      [row]: val,
                                    }));
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
                          {loading
                            ? t.admin.updatingPrices
                            : t.admin.updatePricingGrid}
                        </button>
                      </form>

                      {/* Seat map reset */}
                      <div className="border-t border-gray-750 pt-5 space-y-3">
                        <h3 className="font-bold text-red-400 text-md flex items-center gap-1.5">
                          <ArrowPathIcon className="h-5 w-5 text-red-500" />
                          {t.admin.resetSeatMapBookings}
                        </h3>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          {t.admin.resetSeatMapBookingsTip}
                        </p>

                        {confirmReset ? (
                          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg space-y-3">
                            <p className="text-xs text-red-300 font-semibold leading-relaxed">
                              {t.admin.resetWarningText}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={handleResetSeats}
                                disabled={loading}
                                className="flex-1 py-2 px-3 rounded text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-50"
                              >
                                {t.admin.yesReset}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmReset(false)}
                                className="flex-1 py-2 px-3 rounded text-xs font-bold bg-gray-700 hover:bg-gray-650 text-gray-200 transition-all"
                              >
                                {t.admin.cancel}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmReset(true)}
                            className="w-full py-2.5 px-4 rounded-lg text-red-400 font-bold bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:text-red-300 transition-all text-sm"
                          >
                            {t.admin.resetSeatMapButton}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tab 4: Coupons Management */}
              {activeTab === "coupons" && (
                <div className="space-y-6">
                  {/* Header info */}
                  <div className="border-b border-gray-700 pb-3">
                    <h3 className="font-bold text-white text-md flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-5 w-5 text-emerald-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.44 1.44 0 0 0 2.037 0l4.318-4.318a1.44 1.44 0 0 0 0-2.037l-9.58-9.581A2.25 2.25 0 0 0 9.568 3Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 6h.008v.008H6V6Z"
                        />
                      </svg>
                      {t.admin.couponListTitle}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      {t.admin.couponListTip}
                    </p>
                  </div>

                  {/* Add New Coupon Form */}
                  <form onSubmit={handleCreateCoupon} className="space-y-4 bg-gray-755/30 p-4 rounded-xl border border-gray-700 shadow-inner">
                    <h4 className="font-bold text-white text-sm flex items-center gap-1.5 border-b border-gray-700 pb-2">
                      <PlusIcon className="h-4 w-4 text-emerald-400" />
                      {t.admin.addCouponTitle}
                    </h4>

                    {couponError && (
                      <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded-lg text-xs flex items-center gap-2">
                        <XCircleIcon className="h-4.5 w-4.5 shrink-0" />
                        <span>{couponError}</span>
                      </div>
                    )}
                    {couponSuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-2.5 rounded-lg text-xs flex items-center gap-2">
                        <CheckCircleIcon className="h-4.5 w-4.5 shrink-0" />
                        <span>{couponSuccess}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          {t.admin.couponCode}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={t.admin.couponCodePlaceholder || "e.g. EARLY20"}
                          value={couponCodeInput}
                          onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                          className="w-full px-2.5 py-2 rounded-lg bg-gray-900 text-white border border-gray-750 focus:outline-none focus:border-emerald-500 text-xs font-semibold uppercase font-mono"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          {t.admin.couponDiscountPercent}
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="100"
                          placeholder="20"
                          value={couponDiscountPercentInput}
                          onChange={(e) => setCouponDiscountPercentInput(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg bg-gray-900 text-white border border-gray-750 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          {t.admin.maxUsesLabel}
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={couponMaxUsesInput}
                          onChange={(e) => setCouponMaxUsesInput(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg bg-gray-900 text-white border border-gray-750 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          {t.admin.couponExpiresAt}
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={couponExpiresAtInput}
                          onChange={(e) => setCouponExpiresAtInput(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg bg-gray-900 text-white border border-gray-750 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={couponLoading}
                      className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-emerald-500 text-gray-900 hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 font-extrabold shadow-md hover:shadow-emerald-500/20"
                    >
                      {couponLoading ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          <span>{t.admin.creatingCoupon}</span>
                        </>
                      ) : (
                        <>
                          <PlusIcon className="h-4 w-4" />
                          <span>{t.admin.createCouponButton}</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* List of existing coupons */}
                  <div className="space-y-3 pt-3 border-t border-gray-750">
                    <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                      <TicketIcon className="h-4 w-4 text-emerald-400" />
                      <span>{t.admin.tabCoupons} ({couponsList.length})</span>
                    </h4>

                    {couponsList.length === 0 ? (
                      <p className="text-gray-400 text-xs text-center py-8 bg-gray-750/10 border border-gray-700/50 rounded-xl">
                        {t.admin.noCouponsYet}
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        {couponsList.map((coupon) => {
                          const activeUses = reservations.filter(
                            (res: any) =>
                              res.couponId === coupon.id &&
                              res.status !== "EXPIRED" &&
                              res.status !== "CANCELLED"
                          ).length;

                          const isExpired = new Date(coupon.expiresAt).getTime() < Date.now();
                          const isExhausted = activeUses >= coupon.maxUses;
                          
                          let statusLabel = locale === "zh-TW" ? "有效" : "Active";
                          let statusColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
                          
                          if (isExpired) {
                            statusLabel = locale === "zh-TW" ? "已過期" : "Expired";
                            statusColor = "bg-red-500/10 border-red-500/20 text-red-400";
                          } else if (isExhausted) {
                            statusLabel = locale === "zh-TW" ? "已達限額" : "Limit Reached";
                            statusColor = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                          }

                          return (
                            <div
                              key={coupon.id}
                              className="bg-gray-700/30 p-3 rounded-xl border border-gray-700 flex flex-col justify-between gap-3 text-xs"
                            >
                              {/* Row 1: Code and delete action */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-sm bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase">
                                    {coupon.code}
                                  </span>
                                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${statusColor}`}>
                                    {statusLabel}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCoupon(coupon.id)}
                                  disabled={couponLoading}
                                  className="text-gray-400 hover:text-red-400 transition-all p-1 hover:bg-gray-700/50 rounded-lg"
                                  title={locale === "zh-TW" ? "刪除優惠碼" : "Delete Coupon"}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>

                              {/* Row 2: Discount & Expiration info */}
                              <div className="grid grid-cols-2 gap-3 text-[11px] text-gray-300">
                                <div>
                                  <span className="text-gray-400 block">{t.admin.couponDiscountPercent}</span>
                                  <span className="font-semibold text-emerald-400">
                                    −{coupon.discountPercent}% OFF
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block">{t.admin.couponExpiresAt}</span>
                                  <span className="font-medium text-gray-200">
                                    {new Date(coupon.expiresAt).toLocaleDateString(
                                      locale === "zh-TW" ? "zh-TW" : "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Row 3: Progress limit indicator */}
                              <div className="pt-2 border-t border-gray-700/50">
                                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                  <span>{t.admin.couponTableUsage || "Usage Limit"}</span>
                                  <span className="font-semibold text-gray-200">
                                    {activeUses} / {coupon.maxUses} {locale === "zh-TW" ? "已使用" : "used"}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-350 ${
                                      isExhausted ? "bg-amber-500" : "bg-emerald-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(100, (activeUses / coupon.maxUses) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 5: Sponsors Management */}
              {activeTab === "sponsors" && (
                <div className="space-y-6">
                  {/* Header info */}
                  <div className="border-b border-gray-700 pb-3">
                    <h3 className="font-bold text-white text-md flex items-center gap-2">
                      <SparklesIcon className="h-5 w-5 text-emerald-400" />
                      {t.admin.sponsorListTitle || "Manage Event Sponsors"}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      {t.admin.sponsorListTip || "Add event sponsors to showcase them on the main dashboard, event details page, and attendee admission tickets. Logos are styled proportionally according to their tier."}
                    </p>
                  </div>

                  {/* Add New Sponsor Form */}
                  <form onSubmit={handleCreateSponsor} className="space-y-4 bg-gray-755/30 p-4 rounded-xl border border-gray-700 shadow-inner">
                    <h4 className="font-bold text-white text-sm flex items-center gap-1.5 border-b border-gray-700 pb-2">
                      <PlusIcon className="h-4 w-4 text-emerald-400" />
                      {t.admin.addSponsorTitle || "Add New Sponsor"}
                    </h4>

                    {sponsorError && (
                      <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded-lg text-xs flex items-center gap-2">
                        <XCircleIcon className="h-4.5 w-4.5 shrink-0" />
                        <span>{sponsorError}</span>
                      </div>
                    )}
                    {sponsorSuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-2.5 rounded-lg text-xs flex items-center gap-2">
                        <CheckCircleIcon className="h-4.5 w-4.5 shrink-0" />
                        <span>{sponsorSuccess}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          {t.admin.sponsorName || "Sponsor Name"}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={locale === "zh-TW" ? "例如：環球科技" : "e.g. Global Tech"}
                          value={sponsorNameInput}
                          onChange={(e) => setSponsorNameInput(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg bg-gray-900 text-white border border-gray-750 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          {t.admin.sponsorTier || "Sponsor Tier"}
                        </label>
                        <select
                          value={sponsorTierInput}
                          onChange={(e: any) => setSponsorTierInput(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg bg-gray-900 text-white border border-gray-750 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                        >
                          <option value="PLATINUM">PLATINUM</option>
                          <option value="GOLD">GOLD</option>
                          <option value="SILVER">SILVER</option>
                          <option value="BRONZE">BRONZE</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {t.admin.sponsorLogoUrl || "Logo Image URL"}
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={sponsorLogoUrlInput}
                        onChange={(e) => setSponsorLogoUrlInput(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-gray-900 text-white border border-gray-750 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sponsorLoading}
                      className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-emerald-500 text-gray-900 hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 font-extrabold shadow-md hover:shadow-emerald-500/20"
                    >
                      {sponsorLoading ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          <span>{t.admin.creatingSponsor || "Adding Sponsor..."}</span>
                        </>
                      ) : (
                        <>
                          <PlusIcon className="h-4 w-4" />
                          <span>{t.admin.createSponsorButton || "Add Sponsor"}</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* List of existing sponsors */}
                  <div className="space-y-3 pt-3 border-t border-gray-750">
                    <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                      <SparklesIcon className="h-4 w-4 text-emerald-400" />
                      <span>{t.admin.tabSponsors || "Sponsors"} ({sponsorsList.length})</span>
                    </h4>

                    {sponsorsList.length === 0 ? (
                      <p className="text-gray-400 text-xs text-center py-8 bg-gray-750/10 border border-gray-700/50 rounded-xl">
                        {t.admin.noSponsorsYet || "No sponsors added for this event yet."}
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        {[...sponsorsList]
                          .sort((a, b) => {
                            const TIER_ORDER = { PLATINUM: 0, GOLD: 1, SILVER: 2, BRONZE: 3 };
                            return TIER_ORDER[a.tier as keyof typeof TIER_ORDER] - TIER_ORDER[b.tier as keyof typeof TIER_ORDER];
                          })
                          .map((sponsor) => {
                            let tierColor = "bg-purple-500/10 border-purple-500/20 text-purple-400";
                            if (sponsor.tier === "GOLD") {
                              tierColor = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                            } else if (sponsor.tier === "SILVER") {
                              tierColor = "bg-slate-400/10 border-slate-400/20 text-slate-300";
                            } else if (sponsor.tier === "BRONZE") {
                              tierColor = "bg-orange-700/10 border-orange-700/20 text-orange-400";
                            }

                            return (
                              <div
                                key={sponsor.id}
                                className="bg-gray-700/30 p-3 rounded-xl border border-gray-700 flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center gap-3">
                                  {sponsor.logoUrl ? (
                                    <div className="h-10 w-16 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                                      <img
                                        src={sponsor.logoUrl}
                                        alt={sponsor.name}
                                        className="max-h-full max-w-full object-contain filter brightness-90 hover:brightness-100 transition-all duration-300"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          const parent = (e.target as HTMLElement).parentElement;
                                          if (parent) {
                                            const span = document.createElement('span');
                                            span.className = 'text-[9px] font-bold text-gray-400 text-center uppercase truncate w-full px-1';
                                            span.innerText = sponsor.name.slice(0, 3);
                                            parent.appendChild(span);
                                          }
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="h-10 w-16 bg-gray-900/60 backdrop-blur-md border border-gray-700/50 rounded-lg flex items-center justify-center shrink-0">
                                      <span className="text-[10px] font-black text-gray-400 text-center uppercase tracking-wide truncate w-full px-1">
                                        {sponsor.name.slice(0, 3)}
                                      </span>
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-bold text-white text-sm">{sponsor.name}</div>
                                    <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded border mt-1 inline-block ${tierColor}`}>
                                      {sponsor.tier}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteSponsor(sponsor.id)}
                                  disabled={sponsorLoading}
                                  className="text-gray-400 hover:text-red-400 transition-all p-2 hover:bg-gray-700/50 rounded-lg shrink-0"
                                  title={locale === "zh-TW" ? "刪除贊助商" : "Delete Sponsor"}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-700 lg:sticky lg:top-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              {t.eventDetails.bookingSummary}
            </h2>

            {selectedSeatIds.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <InformationCircleIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>{t.eventDetails.selectSeatsToContinue}</p>
                <p className="mt-2 text-xs text-emerald-400 font-semibold">
                  {locale === "en"
                    ? `${availableSeatCount} of ${totalSeatCount} ${t.eventDetails.seatsAvailableNotice}`
                    : `總共 ${totalSeatCount} 個座位中，${availableSeatCount} ${t.eventDetails.seatsAvailableNotice}`}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {selectedSeats.map((seat) => (
                    <div
                      key={seat.id}
                      className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-emerald-400 mr-2" />
                        <span className="text-gray-200 font-medium">
                          {t.eventDetails.seatLabel} {seat.label}
                        </span>
                      </div>
                      <span className="text-gray-300 text-right">
                        {discountPercent > 0 ? (
                          <>
                            <span className="block text-xs text-gray-500 line-through">
                              {currency}
                              {parseFloat(seat.price).toFixed(2)}
                            </span>
                            <span className="font-semibold text-emerald-300">
                              {currency}
                              {getSeatDisplayPrice(parseFloat(seat.price)).toFixed(
                                2,
                              )}
                            </span>
                          </>
                        ) : (
                          <>
                            {currency}
                            {parseFloat(seat.price).toFixed(2)}
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {hasEventCoupon && (
                  <div className="mb-4 rounded-xl p-3 space-y-2 coupon-highlight-box">
                    <label className="block text-xs font-bold uppercase tracking-wider coupon-highlight-label">
                      {t.eventDetails.couponCodeLabel}
                    </label>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-emerald-300 font-mono font-semibold">
                          {appliedCoupon.code} (−{appliedCoupon.discountPercent}%)
                        </p>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-xs text-gray-400 hover:text-white underline"
                        >
                          {t.eventDetails.couponRemove}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          placeholder={t.eventDetails.couponPlaceholder}
                          className="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white font-mono uppercase focus:border-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={couponValidating}
                          className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 transition-colors coupon-apply-btn"
                        >
                          {couponValidating
                            ? t.eventDetails.couponApplying
                            : t.eventDetails.couponApply}
                        </button>
                      </div>
                    )}
                    {couponFeedback && (
                      <p
                        className={`text-xs ${
                          couponFeedback.type === "success"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {couponFeedback.message}
                      </p>
                    )}
                  </div>
                )}

                <div className="border-t border-gray-700 pt-4 mb-6 space-y-1">
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{t.eventDetails.subtotalPrice}</span>
                      <span className="line-through">
                        {currency}
                        {subtotalPrice.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-sm coupon-discount-text font-medium">
                      <span>
                        {t.eventDetails.couponDiscountLine.replace(
                          "{percent}",
                          String(discountPercent),
                        )}
                      </span>
                      <span>
                        −{currency}
                        {(subtotalPrice - totalPrice).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-end">
                    <span className="text-gray-400 font-medium">
                      {t.eventDetails.totalPrice}
                    </span>
                    <span className="text-3xl font-bold text-emerald-400">
                      {currency}
                      {totalPrice.toFixed(2)}
                    </span>
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
                  {loading
                    ? t.eventDetails.lockingSeats
                    : isAuthenticated
                      ? t.eventDetails.reviewTicketDetails
                      : t.eventDetails.logInToReserve}
                </button>

                <p className="mt-4 text-xs text-gray-500 text-center">
                  {t.eventDetails.lockDurationNotice}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Reservation confirmation before payment */}
      {showReservationConfirm &&
        (() => {
          const localizedEventTitle = eventDetails
            ? locale === "zh-TW"
              ? eventDetails.titleZhTw || eventDetails.title
              : eventDetails.title
            : t.eventDetails.selectedEvent;

          const localizedEventVenue = eventDetails
            ? (locale === "zh-TW"
                ? eventDetails.venueZhTw || eventDetails.venue
                : eventDetails.venue) || t.eventDetails.venueToAnnounce
            : t.eventDetails.venueToAnnounce;

          return (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in">
              <div className="bg-gray-800 border border-gray-700 rounded-t-3xl sm:rounded-2xl w-full max-w-xl max-h-[92vh] overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-gray-700 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                      {t.eventDetails.confirmYourTickets}
                    </p>
                    <h3 className="text-xl font-extrabold text-white mt-1">
                      {t.eventDetails.reviewBeforePayment}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {t.eventDetails.reviewDescription}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReservationConfirm(false)}
                    disabled={loading}
                    className="shrink-0 rounded-full p-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
                    aria-label="Close confirmation"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(92vh-190px)]">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <h4 className="text-lg font-bold text-white">
                      {localizedEventTitle}
                    </h4>
                    <div className="mt-3 space-y-2 text-sm text-gray-300">
                      <div className="flex gap-2">
                        <ClockIcon className="h-5 w-5 shrink-0 text-emerald-400" />
                        <span>{eventDateLabel}</span>
                      </div>
                      <div className="flex gap-2">
                        <InformationCircleIcon className="h-5 w-5 shrink-0 text-emerald-400" />
                        <span>{localizedEventVenue}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                        {t.eventDetails.seatsTitle} ({selectedSeats.length})
                      </h4>
                      <span className="text-xs text-gray-500">
                        {t.eventDetails.lockedFor2Hours}
                      </span>
                    </div>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                      {selectedSeats.map((seat) => (
                        <div
                          key={seat.id}
                          className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-900/50 px-4 py-3"
                        >
                          <span className="font-semibold text-white">
                            {t.eventDetails.seatLabel} {seat.label}
                          </span>
                          <span className="font-mono text-sm text-emerald-300 text-right">
                            {discountPercent > 0 ? (
                              <>
                                <span className="block text-xs text-gray-500 line-through">
                                  {currency}
                                  {parseFloat(seat.price).toFixed(2)}
                                </span>
                                <span>
                                  {currency}
                                  {getSeatDisplayPrice(
                                    parseFloat(seat.price),
                                  ).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <>
                                {currency}
                                {parseFloat(seat.price).toFixed(2)}
                              </>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {appliedCoupon && (
                    <div className="rounded-xl px-4 py-3 text-sm coupon-highlight-box coupon-discount-text font-medium">
                      {t.eventDetails.couponAppliedSummary.replace(
                        "{code}",
                        appliedCoupon.code,
                      ).replace("{percent}", String(appliedCoupon.discountPercent))}
                    </div>
                  )}

                  <div className="checkout-total-card rounded-2xl p-4">
                    <div className="checkout-total-muted flex items-center justify-between text-sm">
                      <span>{t.eventDetails.totalPrice}</span>
                      <span>
                        {selectedSeats.length} {t.eventDetails.ticketCount}
                      </span>
                    </div>
                    {discountPercent > 0 && (
                      <div className="checkout-total-muted mt-2 flex justify-between text-sm">
                        <span>{t.eventDetails.subtotalPrice}</span>
                        <span className="line-through">
                          {currency}
                          {subtotalPrice.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="mt-2 flex items-end justify-between gap-4">
                      <span className="checkout-total-muted text-xs">
                        {t.eventDetails.paymentInstructionsNotice}
                      </span>
                      <span className="checkout-total-price text-3xl font-extrabold">
                        {currency}
                        {totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}
                </div>

                <div className="p-5 border-t border-gray-700 bg-gray-850 flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReservationConfirm(false)}
                    disabled={loading}
                    className="w-full sm:w-1/3 py-3 px-4 rounded-xl text-gray-300 font-bold bg-gray-700 hover:bg-gray-650 transition-all disabled:opacity-50"
                  >
                    {t.eventDetails.editSeats}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReservation}
                    disabled={loading}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl text-white font-bold bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? t.eventDetails.lockingSeats
                      : t.eventDetails.confirmAndContinue}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {refundRejectReservationId && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-gray-800 border border-gray-700 rounded-t-3xl sm:rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gray-700 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
                  {t.admin.rejectRefund}
                </p>
                <h3 className="text-xl font-extrabold text-white mt-1">
                  {t.admin.refundRejectModalTitle}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {t.admin.refundRejectModalDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={closeRejectRefundModal}
                disabled={loading}
                className="shrink-0 rounded-full p-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
                aria-label={t.admin.close}
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <label
                htmlFor="refund-reject-note"
                className="block text-sm font-bold text-gray-200"
              >
                {t.admin.refundReviewNote}
              </label>
              <textarea
                id="refund-reject-note"
                value={refundRejectNote}
                onChange={(event) => {
                  setRefundRejectNote(event.target.value);
                  setRefundRejectError(null);
                }}
                rows={5}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-red-400"
                placeholder={t.admin.refundRejectNotePlaceholder}
                autoFocus
              />

              {refundRejectError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {refundRejectError}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-700 bg-gray-850 flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={closeRejectRefundModal}
                disabled={loading}
                className="w-full sm:w-1/3 py-3 px-4 rounded-xl text-gray-300 font-bold bg-gray-700 hover:bg-gray-650 transition-all disabled:opacity-50"
              >
                {t.admin.cancel}
              </button>
              <button
                type="button"
                onClick={handleRejectRefund}
                disabled={loading}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-300 font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                ) : (
                  <XCircleIcon className="h-5 w-5" />
                )}
                {loading ? t.admin.savingChanges : t.admin.rejectRefund}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof of Payment Verification Modal for Seating Designer Bookings view */}
      {selectedProofUrl && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {t.admin.paymentReceiptVerification}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {t.admin.confirmTransferDetails}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProofUrl(null)}
                className="text-gray-400 hover:text-white p-1.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-all cursor-pointer"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Content - Scrollable Receipt Image */}
            <div className="p-6 bg-gray-900/50 overflow-y-auto flex justify-center items-center flex-1 max-h-[60vh]">
              <img
                src={selectedProofUrl}
                alt={t.admin.receiptProofDetailAlt}
                className="max-w-full max-h-[50vh] w-auto h-auto object-contain rounded-lg border border-gray-705 shadow-lg"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-gray-700 flex items-center justify-end space-x-3 bg-gray-800/80">
              <button
                type="button"
                onClick={() => setSelectedProofUrl(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer"
              >
                {t.admin.close}
              </button>
              {(() => {
                const associatedReservation = reservations.find(
                  (r: any) => r.paymentProofUrl === selectedProofUrl,
                );
                if (
                  associatedReservation &&
                  associatedReservation.status === "PENDING_PAYMENT"
                ) {
                  return (
                    <button
                      type="button"
                      onClick={async () => {
                        const resId = associatedReservation.id;
                        setSelectedProofUrl(null);
                        await handleApprovePayment(resId);
                      }}
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-emerald-500 disabled:opacity-50 transition-colors cursor-pointer shadow-lg hover:shadow-emerald-600/10"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      {t.admin.approvePayment}
                    </button>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
