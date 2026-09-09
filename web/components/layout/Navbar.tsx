"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ShieldCheck, Stethoscope, Building2, User, Home, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDictionary, Locale } from "@/lib/i18n";

const languageOptions: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "bn", label: "বাংলা" },
  { value: "hi", label: "हिन्दी" },
  { value: "mr", label: "मराठी" },
];

export function Navbar() {
  const pathname = usePathname();
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") return "en";
    const savedLocale = window.localStorage.getItem("maitri-locale") as Locale | null;
    return savedLocale && languageOptions.some((option) => option.value === savedLocale) ? savedLocale : "en";
  });

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const dictionary = getDictionary(locale);

  const handleLocaleChange = (nextLocale: Locale) => {
    setLocale(nextLocale);
    window.localStorage.setItem("maitri-locale", nextLocale);
    document.documentElement.lang = nextLocale;
    window.dispatchEvent(new CustomEvent("maitri-locale-change", { detail: nextLocale }));
  };

  const navLinks = [
    { href: "/farmer", label: dictionary.nav.farmer, icon: User },
    { href: "/agent", label: dictionary.nav.agent, icon: ShieldCheck },
    { href: "/vet", label: dictionary.nav.vet, icon: Stethoscope },
    { href: "/authority", label: dictionary.nav.authority, icon: Building2 },
  ];

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#E5E0D8] bg-[#FAF8F3]/90 px-4 md:px-8 backdrop-blur-md">
      {/* Brand Logo & Identity */}
      <Link href="/" className="flex items-center gap-3 group">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-white font-extrabold shadow-sm group-hover:bg-emerald-700 transition-colors">
          <span className="text-base tracking-tight font-serif">पशु</span>
        </div>
        <div className="flex flex-col text-left">
          <span className="text-sm md:text-base font-bold text-[#191F1C] flex items-center gap-2">
            MAITRI • Livestock Health
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              पशु आरोग्य सेवा
            </span>
          </span>
          <span className="text-[11px] text-stone-500 hidden sm:inline leading-tight">
            Veterinary Field Care & District Surveillance Platform
          </span>
        </div>
      </Link>

      {/* Desktop Navigation Links */}
      <nav className="hidden xl:flex items-center gap-1.5 bg-white border border-[#E5E0D8] px-2 py-1 rounded-xl shadow-xs">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-50 hover:-translate-y-0.5"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 transition-transform duration-200 ${isActive ? "text-emerald-700 scale-110" : "text-stone-500"}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 rounded-lg border border-[#D9D3C7] bg-white px-2 py-1.5 text-xs text-stone-700 shadow-xs">
          <Languages className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          <span className="sr-only">Choose language</span>
          <select
            aria-label="Choose language"
            value={locale}
            onChange={(event) => handleLocaleChange(event.target.value as Locale)}
            className="max-w-[92px] cursor-pointer bg-transparent font-semibold outline-none"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button variant="outline" size="sm" className="text-xs border-[#D9D3C7] text-stone-800 hover:bg-stone-50">
              {dictionary.nav.signIn}
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button size="sm" className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm">
              {dictionary.nav.signUp}
            </Button>
          </SignUpButton>
        </Show>

        <Show when="signed-in">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button size="sm" variant="outline" className="text-xs border-[#D9D3C7] bg-white text-stone-800 hover:bg-stone-50 flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5 text-emerald-700" />
                <span>Dashboard</span>
              </Button>
            </Link>
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-9 w-9 border-2 border-emerald-700/60 hover:border-emerald-700 transition-all rounded-full",
                },
              }}
            />
          </div>
        </Show>
      </div>
    </header>
  );
}
