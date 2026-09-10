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

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "bn" || value === "hi" || value === "mr";
}

function mergeDictionary<T>(fallback: T, value: Partial<T>): T {
  if (typeof fallback !== "object" || fallback === null) {
    return (value === undefined ? fallback : value) as T;
  }

  const merged = { ...(fallback as Record<string, unknown>) };
  for (const [key, fallbackValue] of Object.entries(fallback as Record<string, unknown>)) {
    const valueAtKey = (value as Record<string, unknown> | undefined)?.[key];
    if (valueAtKey && typeof valueAtKey === "object" && !Array.isArray(valueAtKey)) {
      merged[key] = mergeDictionary(fallbackValue, valueAtKey as Partial<typeof fallbackValue>);
    }
  }

  return { ...merged, ...(value as Record<string, unknown>) } as T;
}

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return mergeDictionary(dictionaries.en, dictionaries[locale] || dictionaries.en);
}

