import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { 
  CalendarIcon, 
  MapPinIcon, 
  UserCircleIcon, 
  ShieldCheckIcon,
  TicketIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  BanknotesIcon
} from "@heroicons/react/24/outline";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await auth();

  // Middleware guarantees we have a session, but TS needs a check
  if (!session) {
    redirect("/login");
  }

  const [events, reservations] = await Promise.all([
    prisma.event.findMany({
      where: { isActive: true },
      orderBy: { date: "asc" },
    }),
    prisma.reservation.findMany({
      where: { userId: session.user.id },
      include: {
        event: true,
        seats: true,
      },
      orderBy: { createdAt: "desc" },
    })
  ]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-emerald-500 mr-3" />
              <span className="text-xl font-bold text-white tracking-tight">Events Al-Hadi</span>
            </div>
            <div className="flex items-center space-x-4">
              {session.user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="px-4 py-2 rounded-md text-sm font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                >
                  Admin Dashboard
                </Link>
              )}
              <div className="flex items-center text-sm font-medium text-gray-300">
                <UserCircleIcon className="h-6 w-6 mr-2 text-gray-400" />
                {session.user.name}
              </div>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button
                  type="submit"
                  className="ml-4 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* My Reservations Section */}
        {reservations.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <TicketIcon className="h-6 w-6 text-emerald-400 mr-2" />
              My Reservations
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reservations.map((res) => {
                const isPending = res.status === "PENDING_PAYMENT";
                const isSuccess = res.status === "SUCCESS";
                const isExpired = res.status === "EXPIRED" || res.status === "CANCELLED";
                
                return (
                  <div 
                    key={res.id} 
                    className={`bg-gray-800 rounded-2xl border p-6 flex flex-col justify-between transition-all duration-300
                      ${isPending ? 'border-amber-500/30 hover:border-amber-500/50 shadow-lg shadow-amber-500/5' : 
                        isSuccess ? 'border-emerald-500/30 hover:border-emerald-500/50 shadow-lg shadow-emerald-500/5' : 
                        'border-gray-700 hover:border-gray-600'}`}
                  >
                    <div>
                      {/* Event Header & Status */}
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <h3 className="font-bold text-lg text-white line-clamp-1">{res.event.title}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0
                          ${isPending ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                            isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                            'bg-red-500/10 text-red-400 border border-red-500/20'}`}
                        >
                          {isPending && <ClockIcon className="h-3.5 w-3.5 mr-1" />}
                          {isSuccess && <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />}
                          {isExpired && <XCircleIcon className="h-3.5 w-3.5 mr-1" />}
                          
                          {res.status === "PENDING_PAYMENT" && "Pending Payment"}
                          {res.status === "SUCCESS" && "Active Ticket"}
                          {res.status === "EXPIRED" && "Expired"}
                          {res.status === "CANCELLED" && "Cancelled"}
                        </span>
                      </div>

                      {/* Event details summary */}
                      <div className="space-y-1.5 mb-4 text-sm text-gray-400">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{new Date(res.event.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="truncate">{res.event.venue}</span>
                        </div>
                      </div>

                      {/* Seats & Cost info */}
                      <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50 mb-6 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">Seats ({res.seatCount})</span>
                          <span className="font-semibold text-white font-mono">{res.seats.map(s => s.label).join(", ")}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-t border-gray-800 pt-2">
                          <span className="text-gray-400">Total Price</span>
                          <span className="font-bold text-emerald-400">{res.event.currency}{Number(res.totalAmount).toFixed(2)}</span>
                        </div>
                        {isPending && res.bankRef && (
                          <div className="flex justify-between items-center text-sm border-t border-gray-800 pt-2">
                            <span className="text-gray-400">Bank Ref</span>
                            <span className="font-bold text-amber-400 font-mono tracking-wider">{res.bankRef}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      {/* Action buttons */}
                      {isPending ? (
                        <div className="space-y-2">
                          <div className="flex items-center text-xs text-amber-400 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-2 shrink-0" />
                            <span>Expires: {new Date(res.expiresAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ({new Date(res.expiresAt).toLocaleDateString()})</span>
                          </div>
                          <Link
                            href={`/reservations/${res.id}`}
                            className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-lg text-gray-900 bg-amber-500 hover:bg-amber-400 shadow-md hover:shadow-amber-500/20 transition-all"
                          >
                            <BanknotesIcon className="h-4 w-4 mr-2" />
                            Complete Payment
                          </Link>
                        </div>
                      ) : (
                        <Link
                          href={`/reservations/${res.id}`}
                          className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-lg text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 transition-all"
                        >
                          View Details
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Upcoming Events
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Select an event to view seating availability and reserve your spots.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-10 text-center border border-gray-700">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-500" />
            <h3 className="mt-4 text-lg font-medium text-white">No active events</h3>
            <p className="mt-1 text-sm text-gray-400">Check back later for upcoming events.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-gray-800 overflow-hidden rounded-2xl shadow-xl border border-gray-700 hover:border-emerald-500/50 transition-all duration-300 group flex flex-col"
              >
                {event.imageUrl ? (
                  <div className="h-48 w-full bg-gray-700 overflow-hidden relative">
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-80" />
                  </div>
                ) : (
                  <div className="h-48 w-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative overflow-hidden">
                    <CalendarIcon className="h-16 w-16 text-gray-600" />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-60" />
                  </div>
                )}
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-emerald-400">
                      <CalendarIcon className="flex-shrink-0 mr-2 h-4 w-4" />
                      {new Date(event.date).toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center text-sm text-gray-400">
                      <MapPinIcon className="flex-shrink-0 mr-2 h-4 w-4" />
                      {event.venue}
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm line-clamp-3 mb-6 flex-1">
                    {event.description}
                  </p>
                  
                  <Link
                    href={`/events/${event.id}`}
                    className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-semibold rounded-lg text-gray-900 bg-emerald-500 hover:bg-emerald-400 shadow-md hover:shadow-emerald-500/20 transition-all"
                  >
                    Select Seats
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
