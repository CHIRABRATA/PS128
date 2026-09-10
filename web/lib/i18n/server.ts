import "server-only";

import { defaultLocale, getDictionary, type Dictionary, type Locale } from "@/lib/i18n";

export async function getServerLocale(): Promise<Locale> {
  return defaultLocale;
}

export async function getServerDictionary(): Promise<Dictionary> {
  return getDictionary(defaultLocale);
}