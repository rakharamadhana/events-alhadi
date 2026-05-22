"use client";

import { useState } from "react";
import { ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";

type CopyClipboardButtonProps = {
  value: string;
  copyLabel: string;
  copiedLabel: string;
  className?: string;
};

export default function CopyClipboardButton({
  value,
  copyLabel,
  copiedLabel,
  className = "transfer-copy-btn mt-2",
}: CopyClipboardButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`${className} inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors`}
      aria-label={copied ? copiedLabel : copyLabel}
      title={copied ? copiedLabel : copyLabel}
    >
      {copied ? (
        <CheckIcon className="h-4 w-4" aria-hidden />
      ) : (
        <ClipboardDocumentIcon className="h-4 w-4" aria-hidden />
      )}
      <span>{copied ? copiedLabel : copyLabel}</span>
    </button>
  );
}
