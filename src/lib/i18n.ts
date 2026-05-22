import "server-only";

import { cookies, headers } from "next/headers";
import {
  dictionaries,
  getDictionary,
  isLocale,
  localeCookieName,
  localeLabels,
  locales,
  type Dictionary,
  type Locale,
} from "@/lib/i18n.shared";

export {
  dictionaries,
  getDictionary,
  isLocale,
  localeCookieName,
  localeLabels,
  locales,
  type Dictionary,
  type Locale,
};

export async function getLocale() {
  const cookieLocale = (await cookies()).get(localeCookieName)?.value;
  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  // Fallback to client device locale using Accept-Language header
  try {
    const acceptLanguage = (await headers()).get("accept-language");
    if (acceptLanguage) {
      if (/zh-(?:TW|HK|MO|Hant)/i.test(acceptLanguage)) {
        return "zh-TW";
      }
      if (/zh/i.test(acceptLanguage)) {
        return "zh-TW";
      }
    }
  } catch (err) {
    console.error("Failed to read accept-language header:", err);
  }

  return "en";
}

export async function getI18n() {
  const locale = await getLocale();
  return {
    locale,
    t: getDictionary(locale),
  };
}
