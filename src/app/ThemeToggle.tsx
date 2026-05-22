"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;

  return "light";
}

export default function ThemeToggle({ inline = false }: { inline?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className={
        inline
          ? "nav-theme-toggle relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700/50 bg-gray-800/40 text-emerald-400 hover:text-emerald-300 transition-all hover:bg-gray-700/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          : "theme-toggle fixed right-3 top-3 z-[300] inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/25 bg-gray-800/85 text-emerald-400 shadow-lg backdrop-blur transition-all hover:bg-emerald-500/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:right-5 sm:top-5 cursor-pointer"
      }
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      title={isLight ? "Switch to dark theme" : "Switch to light theme"}
    >
      {isLight ? (
        <MoonIcon className="h-5 w-5" />
      ) : (
        <SunIcon className="h-5 w-5" />
      )}
    </button>
  );
}
