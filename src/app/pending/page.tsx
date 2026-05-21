import Link from "next/link";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/10 mb-6">
          <CheckCircleIcon className="h-10 w-10 text-emerald-400" aria-hidden="true" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-emerald-400">
          Registration Received!
        </h2>
        <p className="mt-2 text-sm text-gray-300">
          Your account is currently <span className="font-semibold text-white">PENDING</span> approval. 
        </p>
        <p className="mt-2 text-sm text-gray-400">
          An administrator must verify your account before you can log in and access the platform. You will be notified once your account is active.
        </p>
        
        <div className="mt-8">
          <Link
            href="/login"
            className="w-full flex justify-center py-3 px-4 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
