"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  ArrowRightStartOnRectangleIcon,
  ShieldCheckIcon,
  TicketIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { localeLabels, locales, type Locale } from "@/lib/i18n.shared";

type AccountMenuProps = {
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  profileImageUrl?: string | null;
  currentLocale: Locale;
  labels: {
    openAccountMenu: string;
    myProfile: string;
    myReservations: string;
    adminDashboard: string;
    logOut: string;
    language: string;
  };
};

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

export default function AccountMenu({
  name,
  email,
  role,
  profileImageUrl,
  currentLocale,
  labels,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl border border-gray-700/50 bg-gray-800/40 px-3 py-2 text-sm font-semibold text-gray-300 transition hover:bg-gray-700/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={labels.openAccountMenu}
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500/10 text-xs font-black text-emerald-400">
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initials(name)
          )}
        </div>
        <span className="hidden sm:inline truncate max-w-[100px]">{name}</span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-2xl animate-fade-in"
        >
          <div className="border-b border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500/10 text-sm font-black text-emerald-400">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(name)
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{name}</p>
                <p className="truncate text-xs text-gray-400">{email}</p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <Link
              href="/profile"
              role="menuitem"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-300 transition hover:bg-gray-700/50 hover:text-white"
              onClick={() => setOpen(false)}
            >
              <UserCircleIcon className="h-5 w-5 text-emerald-400" />
              {labels.myProfile}
            </Link>

            <Link
              href="/profile/reservations"
              role="menuitem"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-300 transition hover:bg-gray-700/50 hover:text-white"
              onClick={() => setOpen(false)}
            >
              <TicketIcon className="h-5 w-5 text-emerald-400" />
              {labels.myReservations}
            </Link>

            {role === "ADMIN" && (
              <Link
                href="/admin"
                role="menuitem"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-300 transition hover:bg-gray-700/50 hover:text-white"
                onClick={() => setOpen(false)}
              >
                <ShieldCheckIcon className="h-5 w-5 text-emerald-400" />
                {labels.adminDashboard}
              </Link>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
            >
              <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
              {labels.logOut}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
