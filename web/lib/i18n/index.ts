import en from "./dictionaries/en.json";
import hi from "./dictionaries/hi.json";
import mr from "./dictionaries/mr.json";
import bn from "./dictionaries/bn.json";

export type Locale = "en" | "bn" | "hi" | "mr";

export const defaultLocale: Locale = "en";

export const dictionaries = {
  en,
  bn,
  hi,
  mr,
};

export type Dictionary = typeof en;

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale] || dictionaries.en;
}
