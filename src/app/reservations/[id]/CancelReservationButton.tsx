"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelPendingReservation } from "@/app/actions/reservations";
import { XCircleIcon } from "@heroicons/react/24/outline";

type CancelReservationButtonProps = {
  reservationId: string;
  labels: {
    cancelReservation: string;
    confirmCancelReservation: string;
    cancellingReservation: string;
    cancelReservationHelp: string;
  };
};

export default function CancelReservationButton({
  reservationId,
  labels,
}: CancelReservationButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    const confirmed = window.confirm(labels.confirmCancelReservation);
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await cancelPendingReservation(reservationId);
      if (!result.success) {
        setError(result.error || "Unable to cancel reservation.");
        return;
      }

      router.push("/");
      router.refresh();
    });
  };

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 no-print">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-400">{labels.cancelReservationHelp}</p>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <XCircleIcon className="h-5 w-5" />
          {isPending ? labels.cancellingReservation : labels.cancelReservation}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
