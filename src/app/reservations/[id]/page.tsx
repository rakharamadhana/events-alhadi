import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircleIcon, CurrencyDollarIcon, ClockIcon, BuildingLibraryIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import ProofUploadClient from "./ProofUploadClient";

export default async function ReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      seats: true,
      event: true
    }
  });

  if (!reservation) {
    notFound();
  }

  const isPending = reservation.status === "PENDING_PAYMENT";
  const isSuccess = reservation.status === "SUCCESS";
  const isExpired = reservation.status === "EXPIRED" || reservation.status === "CANCELLED";

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div>
          <Link href="/" className="inline-flex items-center text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
          {/* Header Status Bar */}
          <div className={`p-6 flex items-center justify-center space-x-3 
            ${isPending ? 'bg-amber-500/20 text-amber-400 border-b border-amber-500/30' : 
              isSuccess ? 'bg-emerald-500/20 text-emerald-400 border-b border-emerald-500/30' : 
              'bg-red-500/20 text-red-400 border-b border-red-500/30'}`}
          >
            {isPending && <ClockIcon className="h-8 w-8" />}
            {isSuccess && <CheckCircleIcon className="h-8 w-8" />}
            
            <h2 className="text-2xl font-bold tracking-tight">
              {isPending && "Payment Pending"}
              {isSuccess && "Payment Confirmed"}
              {isExpired && "Reservation Expired"}
            </h2>
          </div>

          <div className="p-8 md:p-10 space-y-10">
             {isPending && (
              <div className="space-y-6">
                <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <BuildingLibraryIcon className="h-6 w-6 text-emerald-400 mr-2" />
                    Transfer Instructions
                  </h3>
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    To secure your seats, please transfer the exact amount below to our bank account. 
                    You must include the Reference Code in your transfer notes. Your seats are locked until the expiration time.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                      <p className="text-sm text-gray-400 mb-1">Bank Name</p>
                      <p className="font-semibold text-white">Global Tech Bank</p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                      <p className="text-sm text-gray-400 mb-1">Account Number</p>
                      <p className="font-mono text-lg text-emerald-400">1029-4837-9912</p>
                    </div>
                  </div>

                  <div className="bg-emerald-900/30 border border-emerald-500/50 p-6 rounded-xl flex flex-col items-center justify-center text-center">
                    <p className="text-sm text-emerald-200 mb-1 uppercase tracking-wider font-semibold">Transfer Reference Code</p>
                    <p className="text-4xl font-extrabold font-mono text-emerald-400 tracking-widest">{reservation.bankRef}</p>
                    <p className="text-sm text-emerald-300 mt-2">IMPORTANT: Include this code in your transfer details!</p>
                  </div>
                </div>

                <ProofUploadClient
                  reservationId={reservation.id}
                  initialProofUrl={reservation.paymentProofUrl}
                />
              </div>
            )}

            {isSuccess && reservation.paymentProofUrl && (
              <div className="bg-gray-800/80 rounded-xl p-6 border border-emerald-500/20 space-y-3">
                <h4 className="text-sm font-semibold text-emerald-300 flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-400 mr-2" />
                  Verified Payment Receipt
                </h4>
                <div className="relative overflow-hidden rounded-lg border border-gray-700 bg-gray-900/50 flex items-center justify-center p-2 max-h-[220px] w-48">
                  <img
                    src={reservation.paymentProofUrl}
                    alt="Verified receipt"
                    className="max-h-[200px] w-auto object-contain rounded"
                  />
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-bold text-white mb-6 border-b border-gray-700 pb-2">
                Reservation Details
              </h3>
              
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-400">Event</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">{reservation.event.title}</dd>
                </div>
                
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-400">Seats Reserved</dt>
                  <dd className="mt-1 text-md text-white">
                    {reservation.seats.map(s => s.label).join(", ")} ({reservation.seatCount} total)
                  </dd>
                </div>
                
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-400">Total Amount</dt>
                  <dd className="mt-1 text-xl font-bold text-emerald-400 flex items-center">
                    <span className="mr-1.5 font-semibold text-emerald-500">{reservation.event.currency}</span>
                    {Number(reservation.totalAmount).toFixed(2)}
                  </dd>
                </div>

                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-400">Expires At</dt>
                  <dd className={`mt-1 text-md font-medium ${isExpired ? 'text-red-400' : 'text-amber-400'}`}>
                    {new Date(reservation.expiresAt).toLocaleString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </dd>
                </div>

                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-400">Reservation ID</dt>
                  <dd className="mt-1 text-sm font-mono text-gray-300 truncate">{reservation.id}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
