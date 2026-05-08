import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en", "pt", "fr", "it", "de", "ru", "ja", "zh", "hi", "ar"],
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];

export const localeLabels: Record<(typeof routing.locales)[number], string> = {
  es: "Español",
  en: "English",
  pt: "Português",
  fr: "Français",
  it: "Italiano",
  de: "Deutsch",
  ru: "Русский",
  ja: "日本語",
  zh: "中文",
  hi: "हिन्दी",
  ar: "العربية",
};

export const rtlLocales = new Set<string>(["ar"]);
