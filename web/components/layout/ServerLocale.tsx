import { getServerDictionary, getServerLocale } from "@/lib/i18n/server";

export { getServerDictionary, getServerLocale };

export async function getServerLocaleData() {
  const locale = await getServerLocale();
  return { locale, dictionary: await getServerDictionary() };
}