import en from "./locales/en.json";
import zhTW from "./locales/zh-TW.json";

export const locales = ["en", "zh-TW"] as const;
export type Locale = (typeof locales)[number];

export const localeCookieName = "app_locale";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  "zh-TW": "繁體中文",
};

export const dictionaries = {
  en,
  "zh-TW": zhTW,
} as const;

export type Dictionary = (typeof dictionaries)[Locale];

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "zh-TW";
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

export type LocalizedEventFields = {
  title: string;
  titleZhTw?: string | null;
  description: string;
  descriptionZhTw?: string | null;
  venue: string;
  venueZhTw?: string | null;
};

function preferLocalized(
  localized: string | null | undefined,
  fallback: string,
) {
  const value = localized?.trim();
  return value ? value : fallback;
}

export function localizeEvent<T extends LocalizedEventFields>(
  event: T,
  locale: Locale,
) {
  if (locale !== "zh-TW") {
    return {
      title: event.title,
      description: event.description,
      venue: event.venue,
    };
  }

  return {
    title: preferLocalized(event.titleZhTw, event.title),
    description: preferLocalized(event.descriptionZhTw, event.description),
    venue: preferLocalized(event.venueZhTw, event.venue),
  };
}
