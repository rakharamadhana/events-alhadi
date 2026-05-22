"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LanguageIcon, CheckIcon } from "@heroicons/react/24/outline";
import { setLocale } from "@/app/actions/i18n";
import { localeLabels, locales, type Locale } from "@/lib/i18n.shared";

type LanguageSwitcherProps = {
  currentLocale: Locale;
  label: string;
};

export default function LanguageSwitcher({ currentLocale, label }: LanguageSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleSelect = (nextLocale: Locale) => {
    if (nextLocale === currentLocale) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    startTransition(async () => {
      await setLocale(nextLocale);
      router.refresh();
    });
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700/50 bg-gray-800/40 text-emerald-400 hover:text-emerald-300 transition-all hover:bg-gray-700/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={label}
        title={label}
        disabled={isPending}
      >
        <LanguageIcon className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-[100] w-44 overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-2xl animate-fade-in"
        >
          <div className="p-2 space-y-1">
            {locales.map((locale) => {
              const active = locale === currentLocale;
              return (
                <button
                  key={locale}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect(locale)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition cursor-pointer ${
                    active
                      ? "bg-emerald-500/10 text-emerald-400 font-bold"
                      : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
                  }`}
                >
                  <span>{localeLabels[locale]}</span>
                  {active && <CheckIcon className="h-4 w-4 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
