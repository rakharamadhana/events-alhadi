import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, UserGroupIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";
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

  const pendingUsers = await prisma.user.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" }
  });

  const { t } = await getI18n();
  const seatLabelFormat = {
    rowSeat: t.common.seatRowSeatFormat,
    wheelchairRowSeat: t.common.seatWheelchairRowSeatFormat,
  };

  const pendingReservations = await prisma.reservation.findMany({
    where: { status: "PENDING_PAYMENT" },
    include: {
      user: true,
      event: true,
      seats: true
    },
    orderBy: { createdAt: "asc" }
  });

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans py-8 px-4 sm:px-6 lg:px-8 lg:py-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col gap-4 pr-12 sm:flex-row sm:items-center sm:justify-between sm:pr-0 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-gray-400">Manage user approvals, verify payments, and publish events.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AdminEventCreator />
            <Link href="/" className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to App
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Pending Users Column */}
          <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center">
                <UserGroupIcon className="h-6 w-6 text-emerald-400 mr-2" />
                Pending Users
              </h2>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                {pendingUsers.length} waiting
              </span>
            </div>
            
            <div className="p-6">
              {pendingUsers.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No pending users to approve.</p>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {pendingUsers.map(user => (
                    <div key={user.id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{user.name}</p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Registered {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <AdminClientActions type="user" id={user.id} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pending Payments Column */}
          <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center">
                <CurrencyDollarIcon className="h-6 w-6 text-emerald-400 mr-2" />
                Pending Payments
              </h2>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                {pendingReservations.length} waiting
              </span>
            </div>
            
            <div className="p-6">
              {pendingReservations.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No pending payments to verify.</p>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {pendingReservations.map(res => (
                    <div key={res.id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-emerald-400 font-bold bg-emerald-900/30 px-2 py-0.5 rounded text-sm border border-emerald-500/30">
                            {formatBankRefForTransfer(res.bankRef)}
                          </span>
                          {res.paymentProofUrl ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Receipt Uploaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-400 border border-gray-600">
                              No Receipt
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white font-medium">{res.user.name} ({res.user.email})</p>
                        <p className="text-sm text-gray-400">{res.event.title}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {res.seatCount} seats:{" "}
                          {formatSeatLabelsForDisplay(
                            res.seats.map((s) => s.label),
                            seatLabelFormat,
                          )}
                        </p>
                        <p className="text-sm font-bold text-white mt-2">
                          {res.event.currency}{Number(res.totalAmount).toFixed(2)}
                        </p>
                      </div>
                      <AdminClientActions type="payment" id={res.id} paymentProofUrl={res.paymentProofUrl || undefined} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
