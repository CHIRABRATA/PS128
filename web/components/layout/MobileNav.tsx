"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, ShieldCheck, Stethoscope, Building2, Settings } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";

export function MobileNav() {
  const pathname = usePathname();
  const { dictionary } = useLocale();

  const navItems = [
    { href: "/", label: dictionary.nav.home, icon: Home },
    { href: "/farmer", label: dictionary.nav.farmer, icon: User },
    { href: "/agent", label: dictionary.nav.agent, icon: ShieldCheck },
    { href: "/vet", label: dictionary.nav.vet, icon: Stethoscope },
    { href: "/authority", label: dictionary.nav.authority, icon: Building2 },
    { href: "/admin", label: dictionary.nav.admin || "Admin", icon: Settings },
  ];

  return (
    <nav className="xl:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t border-[#E5E0D8] bg-[#FAF8F3]/95 px-1 backdrop-blur-md pb-safe shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 text-[10px] font-semibold min-w-[56px] min-h-[44px] ${
              isActive
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200 scale-105 shadow-2xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Icon className={`h-4 w-4 mb-0.5 transition-transform duration-200 ${isActive ? "text-emerald-700 scale-110" : "text-stone-400"}`} />
            <span className="leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
