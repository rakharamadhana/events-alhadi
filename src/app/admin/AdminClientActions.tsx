"use client";

import { useState } from "react";
import { approveUser, rejectUser } from "@/app/actions/admin";
import { approvePayment, approveRefund, rejectRefund } from "@/app/actions/reservations";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { EyeIcon } from "@heroicons/react/24/outline";

interface AdminClientActionsProps {
  type: "user" | "payment" | "refund";
  id: string;
  paymentProofUrl?: string;
  labels?: {
    approveRefund?: string;
    rejectRefund?: string;
    refundRejectModalTitle?: string;
    refundRejectModalDesc?: string;
    refundRejectNotePlaceholder?: string;
    refundRejectNotePrompt?: string;
    refundRejectNoteRequired?: string;
    refundReason?: string;
    close?: string;
    cancel?: string;
  };
}

export default function AdminClientActions({ type, id, paymentProofUrl, labels }: AdminClientActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    
    let res;
    if (type === "user") {
      res = await approveUser(id);
    } else if (type === "payment") {
      res = await approvePayment(id);
    } else {
      res = await approveRefund(id);
    }

    if (!res.success) {
      setError(res.error || "Action failed");
      setLoading(false);
    } else {
      setShowProofModal(false);
    }
  };

  const handleReject = async () => {
    if (type === "user") {
      setLoading(true);
      setError(null);
      const res = await rejectUser(id);
      if (!res.success) {
        setError(res.error || "Action failed");
        setLoading(false);
      }
    } else if (type === "refund") {
      setShowRejectModal(true);
    }
  };

  const handleRejectSubmit = async () => {
    if (type !== "refund") return;
    if (rejectNote.trim().length < 5) {
      setError(labels?.refundRejectNoteRequired || "Please provide a rejection note with at least 5 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await rejectRefund(id, rejectNote);

    if (!res.success) {
      setError(res.error || "Action failed");
      setLoading(false);
    } else {
      setShowRejectModal(false);
      setRejectNote("");
    }
  };

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        {error && <span className="text-xs text-red-400">{error}</span>}
        <div className="flex gap-2">
          {(type === "user" || type === "refund") && (
            <button
              onClick={handleReject}
              disabled={loading}
              className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-rose-500 disabled:opacity-50 transition-colors cursor-pointer"
              title={type === "user" ? "Reject User" : (labels?.rejectRefund || "Reject Refund")}
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          )}

          {type === "payment" && paymentProofUrl && (
            <button
              onClick={() => setShowProofModal(true)}
              disabled={loading}
              className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
              title="View Receipt Proof"
            >
              <EyeIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          )}

          <button
            onClick={handleApprove}
            disabled={loading}
            className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
            title={
              type === "user"
                ? "Approve User"
                : type === "payment"
                ? "Approve Payment"
                : (labels?.approveRefund || "Approve Refund")
            }
          >
            <CheckIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Proof of Payment Verification Modal */}
      {showProofModal && paymentProofUrl && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Payment Receipt Verification</h3>
                <p className="text-xs text-gray-400 mt-1">Please confirm the transfer transaction details before approval.</p>
              </div>
              <button
                onClick={() => {
                  setShowProofModal(false);
                  setError(null);
                }}
                className="text-gray-400 hover:text-white p-1 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-all cursor-pointer"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable Receipt Image */}
            <div className="p-6 bg-gray-900/50 overflow-y-auto flex justify-center items-center flex-1 max-h-[60vh]">
              <img
                src={paymentProofUrl}
                alt="Receipt proof detail"
                className="max-w-full max-h-[50vh] w-auto h-auto object-contain rounded-lg border border-gray-700 shadow-lg"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-gray-700 flex items-center justify-end space-x-3 bg-gray-800/80">
              <button
                onClick={() => {
                  setShowProofModal(false);
                  setError(null);
                }}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-emerald-500 disabled:opacity-50 transition-colors cursor-pointer shadow-lg hover:shadow-emerald-600/10"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Approve Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Refund Modal */}
      {showRejectModal && type === "refund" && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl max-w-md w-full flex flex-col overflow-hidden relative shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{labels?.refundRejectModalTitle || "Reject Refund Request"}</h3>
                <p className="text-xs text-gray-400 mt-1">{labels?.refundRejectModalDesc || "Write a short review note for the user before rejecting this refund request."}</p>
              </div>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setError(null);
                }}
                className="text-gray-400 hover:text-white p-1 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-all cursor-pointer"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 bg-gray-900/50">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {labels?.refundReason || "Review Note (Min 5 chars)"}
              </label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder={labels?.refundRejectNotePlaceholder || "Example: Refund cannot be approved because the request is outside the allowed refund window."}
                rows={4}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors resize-none"
              />
              {error && <p className="mt-2 text-xs text-rose-400 font-medium">{error}</p>}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-gray-700 flex items-center justify-end space-x-3 bg-gray-800/80">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setError(null);
                }}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer"
              >
                {labels?.cancel || "Cancel"}
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={loading || rejectNote.trim().length < 5}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-rose-500 disabled:opacity-50 transition-colors cursor-pointer shadow-lg hover:shadow-rose-600/10"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  labels?.rejectRefund || "Reject Refund"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
