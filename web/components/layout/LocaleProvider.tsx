"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
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
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel("maitri-locale");
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (typeof event.data !== "string") return;
      if (event.data !== "en" && event.data !== "bn" && event.data !== "hi" && event.data !== "mr") return;
      setLocaleState(event.data);
      window.localStorage.setItem("maitri-locale", event.data);
      document.cookie = `maitri-locale=${event.data};path=/;max-age=31536000;samesite=lax`;
      document.documentElement.lang = event.data;
      router.refresh();
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [router]);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem("maitri-locale", nextLocale);
    document.cookie = `maitri-locale=${nextLocale};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.lang = nextLocale;
    channelRef.current?.postMessage(nextLocale);
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
