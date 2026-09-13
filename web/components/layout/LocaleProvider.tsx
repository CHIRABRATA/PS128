"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, Locale, defaultLocale, isLocale } from "@/lib/i18n";

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
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Initialize from client cookie/storage if available
  useEffect(() => {
    if (typeof window === "undefined") return;

    let activeLocale: Locale = initialLocale;

    // Check cookie first
    const cookieMatch = document.cookie.match(/(?:^|;\s*)(?:NEXT_LOCALE|maitri-locale)=([^;]+)/);
    if (cookieMatch && isLocale(cookieMatch[1])) {
      activeLocale = cookieMatch[1];
    } else {
      const stored = window.localStorage.getItem("maitri-locale");
      if (isLocale(stored)) {
        activeLocale = stored;
      }
    }

    if (activeLocale !== locale) {
      setLocaleState(activeLocale);
    }
    document.documentElement.lang = activeLocale;
  }, [initialLocale, locale]);

  // Cross-tab synchronization via BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel("maitri-locale");
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent) => {
      const nextLocale = event.data?.locale;
      if (isLocale(nextLocale)) {
        setLocaleState(nextLocale);
        document.documentElement.lang = nextLocale;
        router.refresh();
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [router]);

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      if (!isLocale(nextLocale)) return;

      setLocaleState(nextLocale);
      document.documentElement.lang = nextLocale;

      if (typeof window !== "undefined") {
        window.localStorage.setItem("maitri-locale", nextLocale);
        document.cookie = `NEXT_LOCALE=${nextLocale};path=/;max-age=31536000;samesite=lax`;
        document.cookie = `maitri-locale=${nextLocale};path=/;max-age=31536000;samesite=lax`;

        if (channelRef.current) {
          channelRef.current.postMessage({ locale: nextLocale });
        }
      }

      router.refresh();
    },
    [router]
  );

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
