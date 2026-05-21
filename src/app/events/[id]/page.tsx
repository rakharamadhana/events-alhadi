import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SeatSelectionClient from "./SeatSelectionClient";
import { CalendarIcon, MapPinIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { auth } from "@/auth";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      seats: {
        orderBy: [
          { row: 'asc' },
          { number: 'asc' }
        ]
      }
    }
  });

  if (!event) {
    notFound();
  }

  // Fetch reservations only if admin
  let reservations: any[] = [];
  if (isAdmin) {
    reservations = await prisma.reservation.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        seats: {
          select: {
            id: true,
            label: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  // Convert Decimal prices to string for safe client serialization
  const serializedSeats = event.seats.map(seat => ({
    ...seat,
    price: seat.price.toString(),
  }));

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Events
          </Link>
        </div>

        {/* Event Header */}
        <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden mb-8">
          <div className="md:flex">
            {event.imageUrl ? (
              <div className="md:w-1/3 h-64 md:h-auto relative">
                <img src={event.imageUrl} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
              </div>
            ) : (
              <div className="md:w-1/3 h-64 md:h-auto bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                <CalendarIcon className="h-16 w-16 text-gray-600" />
              </div>
            )}
            
            <div className="p-8 md:w-2/3 flex flex-col justify-center">
              <h1 className="text-3xl font-extrabold text-white mb-4">{event.title}</h1>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-emerald-400">
                  <CalendarIcon className="flex-shrink-0 mr-3 h-5 w-5" />
                  <span className="text-gray-200">
                    {new Date(event.date).toLocaleDateString(undefined, {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center text-emerald-400">
                  <MapPinIcon className="flex-shrink-0 mr-3 h-5 w-5" />
                  <span className="text-gray-200">{event.venue}</span>
                </div>
              </div>
              
              <p className="text-gray-400 leading-relaxed">
                {event.description}
              </p>
            </div>
          </div>
        </div>

        {/* Interactive / Read-Only Seat Selection & Controls */}
        <SeatSelectionClient 
          eventId={event.id} 
          seats={serializedSeats} 
          isAdmin={isAdmin}
          reservations={JSON.parse(JSON.stringify(reservations))}
          eventDetails={{
            title: event.title,
            description: event.description,
            venue: event.venue,
            date: event.date.toISOString(),
            imageUrl: event.imageUrl,
            isActive: event.isActive,
            currency: event.currency
          }}
        />

      </div>
    </div>
  );
}
