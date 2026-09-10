import "server-only";

import { cookies } from "next/headers";
import { defaultLocale, getDictionary, isLocale, type Dictionary, type Locale } from "@/lib/i18n";

export async function getServerLocale(): Promise<Locale> {
  const value = (await cookies()).get("maitri-locale")?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getServerDictionary(): Promise<Dictionary> {
  return getDictionary(await getServerLocale());
}