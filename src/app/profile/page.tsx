import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import ProfileForm from "./ProfileForm";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "My Profile",
};

export default async function ProfilePage() {
  const session = await auth();
  const { t } = await getI18n();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      profileImageUrl: true,
      phone: true,
      city: true,
      country: true,
      gender: true,
      birthYear: true,
      bio: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8 text-gray-100 sm:px-6 lg:px-8 lg:py-12">
      <main className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          {t.profile.backToDashboard}
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight text-white">{t.profile.title}</h1>
          <p className="mt-2 text-sm text-gray-400">
            {t.profile.description}
          </p>
        </div>

        <ProfileForm user={user} labels={t.profile} />
      </main>
    </div>
  );
}
