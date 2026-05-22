"use client";

import { PrinterIcon } from "@heroicons/react/24/outline";

interface PrintButtonProps {
  label: string;
}

export default function PrintButton({ label }: PrintButtonProps) {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-md hover:shadow-emerald-600/10 cursor-pointer no-print"
    >
      <PrinterIcon className="h-4 w-4 mr-2" />
      {label}
    </button>
  );
}

