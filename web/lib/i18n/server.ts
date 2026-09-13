import "server-only";

import { cookies } from "next/headers";
import { defaultLocale, getDictionary, type Dictionary, type Locale, isLocale } from "@/lib/i18n";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const val = cookieStore.get("NEXT_LOCALE")?.value || cookieStore.get("maitri-locale")?.value;
  return isLocale(val) ? val : defaultLocale;
}

export async function getServerDictionary(): Promise<Dictionary> {
  const locale = await getServerLocale();
  return getDictionary(locale);
}