import en from "./dictionaries/en.json";
import hi from "./dictionaries/hi.json";
import mr from "./dictionaries/mr.json";

export type Locale = "en" | "hi" | "mr";

export const defaultLocale: Locale = "en";

export const dictionaries = {
  en,
  hi,
  mr,
};

export type Dictionary = typeof en;

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale] || dictionaries.en;
}
