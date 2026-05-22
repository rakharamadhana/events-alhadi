"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { uploadRefundProof } from "@/app/actions/reservations";

type RefundProofUploadProps = {
  reservationId: string;
  initialProofUrl: string | null;
  labels: {
    refundProofUploaded: string;
    uploadRefundProof: string;
    replaceRefundProof: string;
    refundProofHelp: string;
    invalidFormatError: string;
    fileSizeError: string;
    refundProofUploadFailed: string;
    refundProofThumbnailAlt: string;
  };
};

export default function RefundProofUpload({
  reservationId,
  initialProofUrl,
  labels,
}: RefundProofUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [proofUrl, setProofUrl] = useState(initialProofUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFile = (file: File | undefined) => {
    setError(null);
    if (!file) return;

    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type)) {
      setError(labels.invalidFormatError);
      return;
    }

    const maxSize = 1 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(labels.fileSizeError);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const res = await uploadRefundProof(reservationId, formData);
      if (res.success && res.refundProofUrl) {
        setProofUrl(res.refundProofUrl);
        router.refresh();
        return;
      }

      setError(res.error || labels.refundProofUploadFailed);
    });
  };

  return (
    <div className="mt-2 rounded-lg border border-gray-700/80 bg-gray-900/60 p-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            {proofUrl && <CheckCircleIcon className="h-3.5 w-3.5" />}
            {proofUrl ? labels.refundProofUploaded : labels.uploadRefundProof}
          </p>
          <p className="mt-1 text-[10px] text-gray-400">
            {labels.refundProofHelp}
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold text-emerald-300 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
        >
          <ArrowPathIcon className="h-3.5 w-3.5" />
          {proofUrl ? labels.replaceRefundProof : labels.uploadRefundProof}
        </button>
      </div>

      {proofUrl && (
        <div className="mt-3 overflow-hidden rounded-md border border-gray-700 bg-gray-950/60 p-2">
          <img
            src={proofUrl}
            alt={labels.refundProofThumbnailAlt}
            className="max-h-28 w-auto rounded object-contain"
          />
        </div>
      )}

      {error && <p className="mt-2 text-[10px] text-red-300">{error}</p>}
    </div>
  );
}
