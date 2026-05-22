"use client";

import { useState, useRef, useTransition } from "react";
import { uploadPaymentProof } from "@/app/actions/reservations";
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  TrashIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import ProofZoomClient from "./ProofZoomClient";

interface ProofUploadClientProps {
  reservationId: string;
  initialProofUrl: string | null;
  t: any;
}

export default function ProofUploadClient({
  reservationId,
  initialProofUrl,
  t,
}: ProofUploadClientProps) {
  const [proofUrl, setProofUrl] = useState<string | null>(initialProofUrl);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type)) {
      setError(t.invalidFormatError);
      return;
    }
    const MAX_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_SIZE) {
      setError(t.fileSizeError);
      return;
    }
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    startTransition(async () => {
      try {
        const res = await uploadPaymentProof(reservationId, formData);
        if (res.success && res.paymentProofUrl) {
          setProofUrl(res.paymentProofUrl);
          setIsEditing(false);
          handleClear();
        } else {
          setError(res.error || t.uploadFailedError);
        }
      } catch (err) {
        setError(t.serverLimitError);
      }
    });
  };

  // If a proof is already uploaded and the user is NOT actively updating it
  if (proofUrl && !isEditing) {
    return (
      <div className="bg-gray-800 p-6 rounded-xl border border-emerald-500/20 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center">
            <CheckCircleIcon className="h-6 w-6 text-emerald-400 mr-2" />
            {t.proofUploaded}
          </h3>
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all border border-emerald-500/30 cursor-pointer"
          >
            <ArrowPathIcon className="h-3.5 w-3.5 mr-1" />
            {t.replaceProof}
          </button>
        </div>

        <div className="payment-proof-notice rounded-lg p-4 flex items-start space-x-3">
          <div className="flex-1">
            <p className="payment-proof-notice-title text-sm font-medium">
              {t.pendingReview}
            </p>
            <p className="payment-proof-notice-body mt-1 text-xs leading-relaxed">
              {t.pendingReviewDesc}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-400 mb-2">
            {t.uploadedReceiptPreview}
          </p>
          <ProofZoomClient
            src={proofUrl}
            alt={t.verifiedReceiptAlt}
            clickToZoomLabel={t.clickToZoomProof}
            modalTitleLabel={t.verifiedReceipt}
            modalSubTitleLabel={t.reviewReceiptDetails}
            footerLabel={t.receiptVerification}
            closeLabel={t.closeView}
            containerClassName="relative group overflow-hidden rounded-xl border border-gray-700 bg-gray-900/50 flex justify-center items-center p-2 max-h-[300px] cursor-zoom-in"
            imageClassName="max-h-[280px] w-auto object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      </div>
    );
  }

  // Upload Uploader Form (Empty State or actively updating)
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center">
            <DocumentArrowUpIcon className="h-6 w-6 text-emerald-400 mr-2" />
            {t.uploadProofHeader}
          </h3>
          <p className="text-xs text-gray-400 mt-1">{t.uploadProofDesc}</p>
        </div>
        {proofUrl && (
          <button
            onClick={() => setIsEditing(false)}
            className="text-xs text-gray-400 hover:text-white underline transition-colors cursor-pointer"
          >
            {t.cancelEdit}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          id="file-upload"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
          disabled={isPending}
        />

        {!selectedFile ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={handleButtonClick}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-3
              ${
                dragActive
                  ? "border-emerald-400 bg-emerald-500/5 shadow-inner scale-99"
                  : "border-gray-600 bg-gray-900/30 hover:border-emerald-500/50 hover:bg-emerald-500/2"
              }`}
          >
            <div className="p-3 bg-gray-800/80 rounded-full border border-gray-700 shadow-md">
              <PhotoIcon className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {t.dragDropText}{" "}
                <span className="text-emerald-400 hover:underline">
                  {t.browse}
                </span>
              </p>
              <p className="text-xs text-gray-400 mt-1">{t.receiptDesc}</p>
            </div>
          </div>
        ) : (
          <div className="border border-gray-700 rounded-xl p-4 bg-gray-900/50 space-y-4">
            <div className="flex items-center justify-between bg-gray-800/80 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center space-x-3 truncate">
                <PhotoIcon className="h-6 w-6 text-emerald-400 flex-shrink-0" />
                <div className="truncate">
                  <p className="text-sm font-medium text-white truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClear}
                disabled={isPending}
                className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                title={t.removeSelection}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>

            {previewUrl && (
              <div className="relative rounded-lg overflow-hidden bg-gray-950 flex justify-center items-center p-2 border border-gray-800 max-h-[260px]">
                <img
                  src={previewUrl}
                  alt={t.selectedFilePreview}
                  className="max-h-[240px] w-auto object-contain rounded"
                />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {selectedFile && (
          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-emerald-500 disabled:opacity-50 transition-all shadow-lg hover:shadow-emerald-600/10 cursor-pointer animate-fade-in"
          >
            {isPending ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t.submittingProof}
              </>
            ) : (
              t.submitProof
            )}
          </button>
        )}
      </form>
    </div>
  );
}
