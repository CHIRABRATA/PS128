"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, Locale } from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  dictionary: ReturnType<typeof getDictionary>;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    document.documentElement.lang = "en";
    // Clear any stale non-English locale cookies or localStorage
    if (typeof window !== "undefined") {
      window.localStorage.setItem("maitri-locale", "en");
      document.cookie = "maitri-locale=en;path=/;max-age=31536000;samesite=lax";
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel("maitri-locale");
    channelRef.current = channel;
    channel.onmessage = () => {
      // Force "en" across tabs
      document.documentElement.lang = "en";
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [router]);

  const setLocale = (_nextLocale?: Locale) => {
    // English-only lock: no-op to prevent changing away from English
    void _nextLocale;
    document.documentElement.lang = "en";
    window.localStorage.setItem("maitri-locale", "en");
    document.cookie = "maitri-locale=en;path=/;max-age=31536000;samesite=lax";
  };

  return (
    <LocaleContext.Provider value={{ locale: "en", dictionary: getDictionary("en"), setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}
