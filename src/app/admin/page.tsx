import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  CheckBadgeIcon,
  SparklesIcon,
  ArrowPathIcon,
  CalendarIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
import AdminClientActions from "./AdminClientActions";
import AdminEventCreator from "./AdminEventCreator";
import type { Metadata } from "next";
import { formatBankRefForTransfer } from "@/lib/bankRef";
import { formatSeatLabelsForDisplay } from "@/lib/seatLabel";
import { getI18n } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

export default async function AdminDashboard() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const { t } = await getI18n();

  // Prepare translations/labels for client actions
  const clientActionsLabels = {
    approveRefund: t.admin.approveRefund || "Approve Refund",
    rejectRefund: t.admin.rejectRefund || "Reject Refund",
    refundRejectModalTitle: t.admin.refundRejectModalTitle || "Reject Refund Request",
    refundRejectModalDesc: t.admin.refundRejectModalDesc || "Write a short review note for the user before rejecting this refund request.",
    refundRejectNotePlaceholder: t.admin.refundRejectNotePlaceholder || "Example: Refund cannot be approved because the request is outside the allowed refund window.",
    refundRejectNotePrompt: t.admin.refundRejectNotePrompt || "Why is this refund request being rejected?",
    refundRejectNoteRequired: t.admin.refundRejectNoteRequired || "Please provide a rejection note with at least 5 characters.",
    refundReason: t.admin.refundReason || "Review Note (Min 5 chars)",
    close: t.admin.close || "Close",
    cancel: t.admin.cancel || "Cancel",
  };

  const seatLabelFormat = {
    rowSeat: t.common.seatRowSeatFormat,
    wheelchairRowSeat: t.common.seatWheelchairRowSeatFormat,
  };

  // --- QUEUES ---

  // 1. Pending Payments Queue (Highest Urgency: locks seat inventory)
  const pendingReservations = await prisma.reservation.findMany({
    where: { status: "PENDING_PAYMENT" },
    include: {
      user: true,
      event: true,
      seats: true
    },
    orderBy: { createdAt: "asc" }
  });

  // 2. Refund Requests Queue (High Urgency: active dispute/cancellation request)
  const refundRequests = await prisma.reservation.findMany({
    where: { status: "REFUND_REQUESTED" },
    include: {
      user: true,
      event: true,
      seats: true
    },
    orderBy: { refundRequestedAt: "asc" }
  });

  // 3. Pending User Approvals Queue (Medium Urgency: account creation requests)
  const pendingUsers = await prisma.user.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" }
  });

  // --- METRICS ---

  // Total Verified Revenue
  const successReservations = await prisma.reservation.findMany({
    where: { status: "SUCCESS" },
    select: { totalAmount: true }
  });
  const totalRevenue = successReservations.reduce((sum, res) => sum + Number(res.totalAmount), 0);

  // Pending Revenue (Awaiting manual verification)
  const pendingRevenue = pendingReservations.reduce((sum, res) => sum + Number(res.totalAmount), 0);

  // Live Sold & Check-in rates
  const totalSoldSeats = await prisma.seat.count({
    where: { status: "SOLD" }
  });
  const checkedInSeats = await prisma.seat.count({
    where: { status: "SOLD", isCheckedIn: true }
  });
  const globalCheckInRate = totalSoldSeats > 0 ? Math.round((checkedInSeats / totalSoldSeats) * 100) : 0;

  // Active Events Seating oversight
  const events = await prisma.event.findMany({
    orderBy: { date: "desc" },
    include: {
      seats: {
        select: {
          id: true,
          status: true,
          isCheckedIn: true,
        }
      },
      reservations: {
        where: { status: "SUCCESS" },
        select: {
          totalAmount: true
        }
      }
    }
  });

  const activeEventsCount = events.filter(e => e.isActive).length;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans py-8 px-4 sm:px-6 lg:px-8 lg:py-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col gap-4 pr-12 sm:flex-row sm:items-center sm:justify-between sm:pr-0 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Admin Control Center</h1>
            <p className="mt-2 text-sm text-gray-400">Real-time revenue monitoring, ticket checking, refund handling, and approvals.</p>
          </div>
          <div className="flex items-center">
            <Link href="/" className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all border border-emerald-500/10 cursor-pointer shadow-sm">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to App
            </Link>
          </div>
        </div>

        {/* Operational Statistics Dashboard (Stats Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Verified Revenue */}
          <div className="bg-gray-800 p-5 rounded-2xl shadow-md border border-gray-700/50 flex flex-col justify-between hover:border-emerald-500/25 transition-all">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Revenue</span>
              <span className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <CurrencyDollarIcon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <p className="text-[10px] text-gray-400 mt-1 font-medium">Successfully verified payments</p>
            </div>
          </div>

          {/* Card 2: Pending Revenue */}
          <div className="bg-gray-800 p-5 rounded-2xl shadow-md border border-gray-700/50 flex flex-col justify-between hover:border-amber-500/25 transition-all">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Revenue</span>
              <span className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                <CreditCardIcon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                ${pendingRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <p className="text-[10px] text-gray-400 mt-1 font-medium">{pendingReservations.length} transactions waiting</p>
            </div>
          </div>

          {/* Card 3: Check-in Progress */}
          <div className="bg-gray-800 p-5 rounded-2xl shadow-md border border-gray-700/50 flex flex-col justify-between hover:border-indigo-500/25 transition-all">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Check-in Rate</span>
              <span className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                <CheckBadgeIcon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {globalCheckInRate}%
              </span>
              <p className="text-[10px] text-gray-400 mt-1 font-medium">{checkedInSeats} of {totalSoldSeats} checked in</p>
            </div>
          </div>

          {/* Card 4: Active Events */}
          <div className="bg-gray-800 p-5 rounded-2xl shadow-md border border-gray-700/50 flex flex-col justify-between hover:border-sky-500/25 transition-all">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Agendas</span>
              <span className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
                <SparklesIcon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {activeEventsCount}
              </span>
              <p className="text-[10px] text-gray-400 mt-1 font-medium">{events.length} events built total</p>
            </div>
          </div>

          {/* Card 5: Refund Requests Queue */}
          <div className="bg-gray-800 p-5 rounded-2xl shadow-md border border-gray-700/50 flex flex-col justify-between hover:border-rose-500/25 transition-all">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Refund Queue</span>
              <span className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                <ArrowPathIcon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {refundRequests.length}
              </span>
              <p className="text-[10px] text-gray-400 mt-1 font-medium">Claims awaiting response</p>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-md">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Command Actions Center</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Action 1: Check-in Desk */}
            <Link href="/admin/checkin" className="group bg-gray-700/30 p-5 rounded-xl border border-gray-650 hover:bg-indigo-500/5 hover:border-indigo-500/30 transition-all flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-all">
                  <CheckBadgeIcon className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors"> Usher Check-in Desk</h3>
                  <p className="text-xs text-gray-400 mt-1">Live gate scanning, seat guidance & attendance logs.</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                  {globalCheckInRate}% Check-in
                </span>
              </div>
            </Link>

            {/* Quick Action 2: Create Event */}
            <div className="group bg-gray-700/30 p-5 rounded-xl border border-gray-650 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-all">
                  <CalendarIcon className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">Build Seating Event</h3>
                  <p className="text-xs text-gray-400 mt-1">Configure layout blueprint, price matrix, coupons, and sponsors.</p>
                </div>
              </div>
              <div>
                <AdminEventCreator />
              </div>
            </div>
          </div>
        </div>

        {/* Priority Action Queues Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Pending Payments (Urgent Priority) */}
          <div className="bg-gray-800 rounded-2xl shadow-md border border-gray-700/50 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-700/50 flex items-center justify-between bg-amber-500/5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                Pending Payments
              </h2>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                {pendingReservations.length} Urgently Waiting
              </span>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar space-y-4">
              {pendingReservations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">No payment confirmations pending.</p>
                  <p className="text-xs text-gray-500 mt-1">Seat inventory is currently clean.</p>
                </div>
              ) : (
                pendingReservations.map(res => (
                  <div key={res.id} className="bg-gray-750/30 p-4 rounded-xl border border-gray-700/60 flex flex-col justify-between gap-4 hover:border-amber-500/20 transition-all">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-mono text-emerald-400 font-bold bg-emerald-950/30 px-2 py-0.5 rounded text-xs border border-emerald-500/30">
                          {formatBankRefForTransfer(res.bankRef)}
                        </span>
                        {res.paymentProofUrl ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Receipt Uploaded
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-700/50 text-gray-400 border border-gray-650">
                            No Receipt
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-white">{res.user.name}</p>
                      <p className="text-xs text-gray-400 font-medium">{res.user.email}</p>
                      <p className="text-xs font-semibold text-indigo-400 mt-2">{res.event.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {res.seatCount} seats:{" "}
                        {formatSeatLabelsForDisplay(
                          res.seats.map((s) => s.label),
                          seatLabelFormat,
                        )}
                      </p>
                      <p className="text-sm font-extrabold text-white mt-3">
                        {res.event.currency}{Number(res.totalAmount).toFixed(2)}
                      </p>
                    </div>
                    <div className="border-t border-gray-700/60 pt-3 flex justify-end">
                      <AdminClientActions type="payment" id={res.id} paymentProofUrl={res.paymentProofUrl || undefined} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Refund Requests (High Priority) */}
          <div className="bg-gray-800 rounded-2xl shadow-md border border-gray-700/50 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-700/50 flex items-center justify-between bg-rose-500/5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Refund Claims
              </h2>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/20">
                {refundRequests.length} Claims
              </span>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar space-y-4">
              {refundRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">No pending refund requests.</p>
                  <p className="text-xs text-gray-500 mt-1">Users are satisfied with bookings!</p>
                </div>
              ) : (
                refundRequests.map(res => (
                  <div key={res.id} className="bg-gray-750/30 p-4 rounded-xl border border-gray-700/60 flex flex-col justify-between gap-4 hover:border-rose-500/20 transition-all">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-rose-400 font-bold bg-rose-950/30 px-2 py-0.5 rounded text-xs border border-rose-500/30">
                          REFUND REQUEST
                        </span>
                        {res.refundRequestedAt && (
                          <span className="text-[10px] text-gray-500 font-semibold">
                            {new Date(res.refundRequestedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm font-bold text-white">{res.user.name}</p>
                      <p className="text-xs text-gray-400 font-medium">{res.user.email}</p>
                      <p className="text-xs font-semibold text-indigo-400 mt-2">{res.event.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {res.seatCount} seats:{" "}
                        {formatSeatLabelsForDisplay(
                          res.seats.map((s) => s.label),
                          seatLabelFormat,
                        )}
                      </p>
                      <p className="text-sm font-extrabold text-white mt-2">
                        {res.event.currency}{Number(res.totalAmount).toFixed(2)}
                      </p>

                      {/* Refund Reason Display */}
                      <div className="mt-3 p-3 bg-gray-900/60 rounded-lg border border-gray-700/80">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-rose-400 mb-1">User's Reason:</p>
                        <p className="text-xs text-gray-300 italic font-medium leading-relaxed">
                          "{res.refundReason || "No explanation provided"}"
                        </p>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-700/60 pt-3 flex justify-end">
                      <AdminClientActions type="refund" id={res.id} labels={clientActionsLabels} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 3: Pending Users (Medium Priority) */}
          <div className="bg-gray-800 rounded-2xl shadow-md border border-gray-700/50 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-700/50 flex items-center justify-between bg-emerald-500/5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                User Registrations
              </h2>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                {pendingUsers.length} Pending
              </span>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar space-y-4">
              {pendingUsers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">No registrations to approve.</p>
                  <p className="text-xs text-gray-500 mt-1">All user accounts verified.</p>
                </div>
              ) : (
                pendingUsers.map(user => (
                  <div key={user.id} className="bg-gray-750/30 p-4 rounded-xl border border-gray-700/60 flex flex-col justify-between gap-4 hover:border-emerald-500/20 transition-all">
                    <div>
                      <p className="font-bold text-white text-sm">{user.name}</p>
                      <p className="text-xs text-gray-400 font-medium">{user.email}</p>
                      <p className="text-[10px] text-gray-500 mt-2 font-medium">
                        Registered {new Date(user.createdAt).toLocaleDateString()} at {new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="border-t border-gray-700/60 pt-3 flex justify-end">
                      <AdminClientActions type="user" id={user.id} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Live Active Events Oversight List */}
        <div className="bg-gray-800 rounded-2xl shadow-md border border-gray-700/50 overflow-hidden">
          <div className="p-6 border-b border-gray-700/50 bg-indigo-500/5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-indigo-400" />
              Event Seating & Check-in Oversight
            </h2>
            <p className="text-xs text-gray-400 mt-1">Real-time status of capacity limits, sold tickets, and attendee arrivals.</p>
          </div>

          <div className="p-6">
            {events.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">No events created yet. Click "Build Seating Event" above to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Event details</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Sales Seating Ratio</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Arrival Attendance</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Revenue</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-750">
                    {events.map((event) => {
                      const totalSeats = event.seats.length;
                      const soldSeatsCount = event.seats.filter(s => s.status === "SOLD").length;
                      const checkedInCount = event.seats.filter(s => s.status === "SOLD" && s.isCheckedIn).length;
                      
                      const seatPercentage = totalSeats > 0 ? Math.round((soldSeatsCount / totalSeats) * 100) : 0;
                      const checkinPercentage = soldSeatsCount > 0 ? Math.round((checkedInCount / soldSeatsCount) * 100) : 0;

                      const eventRevenue = event.reservations.reduce((sum, res) => sum + Number(res.totalAmount), 0);

                      return (
                        <tr key={event.id} className="hover:bg-gray-750/20 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-white">{event.title}</div>
                            <div className="text-xs text-gray-400 font-medium mt-0.5">{event.venue}</div>
                            <div className="text-[10px] text-gray-500 font-semibold mt-1">
                              {new Date(event.date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {event.isActive ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700/50 text-gray-400 border border-gray-650">
                                Draft / Closed
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-white min-w-[70px]">
                                {soldSeatsCount} / {totalSeats} ({seatPercentage}%)
                              </span>
                              <div className="w-24 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-1.5 rounded-full" 
                                  style={{ width: `${seatPercentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-white min-w-[70px]">
                                {checkedInCount} / {soldSeatsCount} ({checkinPercentage}%)
                              </span>
                              <div className="w-24 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-indigo-500 h-1.5 rounded-full" 
                                  style={{ width: `${checkinPercentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-extrabold text-white">
                            {event.currency}{eventRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-xs font-medium">
                            <Link 
                              href={`/events/${event.id}`} 
                              className="inline-flex items-center px-3 py-1.5 rounded text-xs font-bold bg-gray-700 hover:bg-gray-650 text-emerald-400 hover:text-emerald-300 transition-colors border border-gray-650 cursor-pointer"
                            >
                              Manage Event
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
