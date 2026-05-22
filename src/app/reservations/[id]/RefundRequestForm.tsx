"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestRefund } from "@/app/actions/reservations";
import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";

type RefundRequestFormProps = {
  reservationId: string;
  labels: {
    requestRefundTitle: string;
    requestRefundDesc: string;
    refundReasonLabel: string;
    refundReasonPlaceholder: string;
    submitRefundRequest: string;
    submittingRefundRequest: string;
  };
};

export default function RefundRequestForm({
  reservationId,
  labels,
}: RefundRequestFormProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await requestRefund(reservationId, reason);
      if (!result.success) {
        setError(result.error || "Unable to request refund.");
        return;
      }

      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="no-print rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 space-y-4"
    >
      <div>
        <h4 className="flex items-center gap-2 text-base font-bold text-white">
          <ArrowUturnLeftIcon className="h-5 w-5 text-amber-400" />
          {labels.requestRefundTitle}
        </h4>
        <p className="mt-1 text-sm text-gray-400">{labels.requestRefundDesc}</p>
      </div>

      <div>
        <label
          htmlFor="refund-reason"
          className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2"
        >
          {labels.refundReasonLabel}
        </label>
        <textarea
          id="refund-reason"
          required
          minLength={10}
          rows={4}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={labels.refundReasonPlaceholder}
          className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-400 resize-none"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-bold text-gray-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending
          ? labels.submittingRefundRequest
          : labels.submitRefundRequest}
      </button>
    </form>
  );
}
