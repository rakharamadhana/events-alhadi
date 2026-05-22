import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getI18n } from "@/lib/i18n";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AccountMenu from "./AccountMenu";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Al-Hadi TIECC - Events",
    template: "Al-Hadi TIECC - Events | %s",
  },
  description:
    "Taiwan Islamic Education & Culture Center focus on dawah & education in Taiwan",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const { locale, t } = await getI18n();

  const profile = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          email: true,
          profileImageUrl: true,
        },
      })
    : null;

  const accountName = profile?.name ?? session?.user?.name ?? "";
  const accountEmail = profile?.email ?? session?.user?.email ?? "";

  const themeScript = `
    (() => {
      try {
        const stored = localStorage.getItem("theme");
        const theme = stored === "light" || stored === "dark"
          ? stored
          : "light";
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
      } catch {
        document.documentElement.dataset.theme = "light";
      }
    })();
  `;

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-gray-900 text-gray-100 font-sans"
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />

        {/* Global Navigation */}
        <nav className="bg-gray-800 border-b border-gray-700 w-full z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-0 sm:min-h-16">
              <Link
                href="/"
                className="flex items-center pr-12 sm:pr-0 cursor-pointer"
              >
                <ShieldCheckIcon className="h-8 w-8 text-emerald-500 mr-3" />
                <span className="text-xl font-bold text-white tracking-tight">
                  {t.common.appName}
                </span>
              </Link>
              {session ? (
                <div className="absolute right-0 top-3 flex items-center gap-2 sm:hidden">
                  <AccountMenu
                    name={accountName}
                    email={accountEmail}
                    role={session.user.role}
                    profileImageUrl={profile?.profileImageUrl}
                    currentLocale={locale}
                    labels={{
                      openAccountMenu: t.accountMenu.openAccountMenu,
                      myProfile: t.common.myProfile,
                      myReservations: t.common.myReservations,
                      adminDashboard: t.common.adminDashboard,
                      logOut: t.common.logOut,
                      language: t.common.language,
                    }}
                  />
                  <LanguageSwitcher
                    currentLocale={locale}
                    label={t.common.language}
                  />
                  <ThemeToggle inline />
                </div>
              ) : (
                <div className="absolute right-0 top-3 flex items-center gap-2 sm:hidden">
                  <Link
                    href="/login"
                    className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-gray-950"
                  >
                    Log In
                  </Link>
                  <LanguageSwitcher
                    currentLocale={locale}
                    label={t.common.language}
                  />
                  <ThemeToggle inline />
                </div>
              )}
              <div className="hidden flex-wrap items-center gap-2 sm:flex sm:gap-4">
                {session ? (
                  <AccountMenu
                    name={accountName}
                    email={accountEmail}
                    role={session.user.role}
                    profileImageUrl={profile?.profileImageUrl}
                    currentLocale={locale}
                    labels={{
                      openAccountMenu: t.accountMenu.openAccountMenu,
                      myProfile: t.common.myProfile,
                      myReservations: t.common.myReservations,
                      adminDashboard: t.common.adminDashboard,
                      logOut: t.common.logOut,
                      language: t.common.language,
                    }}
                  />
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/register"
                      className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                      Register
                    </Link>
                  </>
                )}
                <LanguageSwitcher
                  currentLocale={locale}
                  label={t.common.language}
                />
                <ThemeToggle inline />
              </div>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <div className="flex-1 w-full">{children}</div>
      </body>
    </html>
  );
}
