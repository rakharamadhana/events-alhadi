"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, localeCookieName, type Locale } from "@/lib/i18n.shared";

export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) {
    return { success: false };
  }

  (await cookies()).set(localeCookieName, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  return { success: true };
}
