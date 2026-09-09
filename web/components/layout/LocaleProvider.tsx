"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { defaultLocale, getDictionary, Locale } from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  dictionary: ReturnType<typeof getDictionary>;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem("maitri-locale", nextLocale);
    document.cookie = `maitri-locale=${nextLocale};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.lang = nextLocale;
    window.dispatchEvent(new CustomEvent("maitri-locale-change", { detail: nextLocale }));
    router.refresh();
  };

  return (
    <LocaleContext.Provider value={{ locale, dictionary: getDictionary(locale), setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}
