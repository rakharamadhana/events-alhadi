"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "@/app/actions/admin";
import {
  PlusIcon,
  XMarkIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

export default function AdminEventCreator() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [titleZhTw, setTitleZhTw] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionZhTw, setDescriptionZhTw] = useState("");
  const [venue, setVenue] = useState("");
  const [venueZhTw, setVenueZhTw] = useState("");
  const [date, setDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [currency, setCurrency] = useState("$");
  const [isActive, setIsActive] = useState(false);
  const [bankName, setBankName] = useState("Global Tech Bank");
  const [bankNameZhTw, setBankNameZhTw] = useState("環球科技銀行");
  const [bankCode, setBankCode] = useState("");
  const [bankAccount, setBankAccount] = useState("1029-4837-9912");
  const [bankAccountHolder, setBankAccountHolder] = useState("Al-Hadi TIECC");

  const resetForm = () => {
    setTitle("");
    setTitleZhTw("");
    setDescription("");
    setDescriptionZhTw("");
    setVenue("");
    setVenueZhTw("");
    setDate("");
    setImageUrl("");
    setCurrency("$");
    setIsActive(false);
    setBankName("Global Tech Bank");
    setBankNameZhTw("環球科技銀行");
    setBankCode("");
    setBankAccount("1029-4837-9912");
    setBankAccountHolder("Al-Hadi TIECC");
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title || !description || !venue || !date) {
      setError("Please fill out all required fields.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createEvent({
          title,
          titleZhTw: titleZhTw || null,
          description,
          descriptionZhTw: descriptionZhTw || null,
          venue,
          venueZhTw: venueZhTw || null,
          date,
          imageUrl: imageUrl || null,
          isActive,
          currency,
          bankName,
          bankNameZhTw: bankNameZhTw || null,
          bankCode,
          bankAccount,
          bankAccountHolder,
        });

        if (res.success) {
          setSuccess(true);
          setTimeout(() => {
            setIsOpen(false);
            resetForm();
            router.refresh();
            if (res.eventId) {
              router.push(`/events/${res.eventId}`);
            }
          }, 1500);
        } else {
          setError(res.error || "Failed to create event.");
        }
      } catch (err) {
        setError("An unexpected error occurred.");
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-lg text-gray-900 bg-emerald-500 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25 transition-all cursor-pointer"
      >
        <PlusIcon className="mr-1.5 h-5 w-5 stroke-[2.5]" />
        Create Event
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CalendarDaysIcon className="h-6 w-6 text-emerald-400" />
                  Create New Event
                </h3>
                <p className="text-xs text-gray-400 mt-1">Configure event details and default seating arrangements.</p>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white p-1 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-all cursor-pointer"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto max-h-[65vh] custom-scrollbar">
                
                {/* Success & Error indicators */}
                {success && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Event created successfully! Redirecting to seating designer...</span>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm font-medium">
                    {error}
                  </div>
                )}

                {/* Section 1: English Details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-gray-700/50 pb-1">
                    General Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Event Title (English) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Al-Hadi Gala Night 2026"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-650 text-white focus:outline-none focus:border-emerald-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Event Date & Time <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-650 text-white focus:outline-none focus:border-emerald-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Venue (English) <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <MapPinIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Al-Hadi TIECC Main Hall"
                          value={venue}
                          onChange={(e) => setVenue(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-900 border border-gray-650 text-white focus:outline-none focus:border-emerald-500 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Currency
                      </label>
                      <div className="relative">
                        <CurrencyDollarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="e.g. $, NT$, RM"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-900 border border-gray-650 text-white focus:outline-none focus:border-emerald-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Event Description (English) <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Describe the event, highlights, and any important ticketing terms..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-650 text-white focus:outline-none focus:border-emerald-500 text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Cover Banner Image URL
                    </label>
                    <div className="relative">
                      <PhotoIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="url"
                        placeholder="e.g. https://images.unsplash.com/... or relative path"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-900 border border-gray-650 text-white focus:outline-none focus:border-emerald-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Localization Chinese (Optional) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-gray-700/50 pb-1">
                    Chinese Translations <span className="text-[10px] text-gray-400 font-normal capitalize">(Optional)</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Event Title (繁體中文)
                      </label>
                      <input
                        type="text"
                        placeholder="例如：Al-Hadi 2026 年度盛會"
                        value={titleZhTw}
                        onChange={(e) => setTitleZhTw(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-650 text-white focus:outline-none focus:border-emerald-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Venue (繁體中文)
                      </label>
                      <div className="relative">
                        <MapPinIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="例如：Al-Hadi TIECC 大禮堂"
                          value={venueZhTw}
                          onChange={(e) => setVenueZhTw(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-900 border border-gray-650 text-white focus:outline-none focus:border-emerald-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Event Description (繁體中文)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="用繁體中文描述活動的亮點與細節..."
                      value={descriptionZhTw}
                      onChange={(e) => setDescriptionZhTw(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-650 text-white focus:outline-none focus:border-emerald-500 text-sm resize-none"
                    />
                  </div>
                </div>

                {/* Section 3: Bank Transfer Customization */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-gray-700/50 pb-1">
                    Bank Transfer Information
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Bank Name (English) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-650 text-white focus:outline-none focus:border-emerald-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Bank Name (繁體中文)
                      </label>
                      <input
                        type="text"
                        placeholder="例如：環球科技銀行"
                        value={bankNameZhTw}
                        onChange={(e) => setBankNameZhTw(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-650 text-white focus:outline-none focus:border-emerald-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Bank Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 004, SWIFT: CTCBTWTP"
                      value={bankCode}
                      onChange={(e) => setBankCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-650 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Bank Account Holder&apos;s Name{" "}
                      <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-650 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Bank Account Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-650 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>

                {/* Seating Generation Notice */}
                <div className="bg-gray-900/50 border border-gray-700 p-4 rounded-xl">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <DocumentTextIcon className="h-4.5 w-4.5" />
                    Seat Design & Setup
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    This event will be initialized with a standard starter seating grid. You can design, edit, reconfigure, or hold VIP seats using the premium <strong>Visual Seating Designer</strong> on the event detail page after creation.
                  </p>
                </div>

                {/* Publish Immediately Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-700/60">
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wide">Publish Event Immediately?</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Toggle on to make the event instantly visible to public users.</p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

              </div>

              {/* Footer Actions */}
              <div className="p-5 border-t border-gray-700 flex items-center justify-end space-x-3 bg-gray-800/80">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-semibold rounded-lg text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || success}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-semibold text-gray-900 bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-emerald-500 disabled:opacity-50 transition-colors cursor-pointer shadow-lg hover:shadow-emerald-500/10"
                >
                  {isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-900" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="h-4 w-4 mr-1.5 stroke-[2.5]" />
                      {isActive ? "Publish & Create" : "Create as Draft"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
