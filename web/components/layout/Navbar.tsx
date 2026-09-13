"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Show, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { ShieldCheck, Stethoscope, Building2, User, Home, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/layout/LocaleProvider";

export function Navbar() {
  const pathname = usePathname();
  const { locale, dictionary, setLocale } = useLocale();
  const { user } = useUser();

  const userRole = (user?.publicMetadata?.role as string | undefined);
  const activeRoleKey = userRole || (
    pathname.startsWith("/admin")
      ? "ADMIN"
      : pathname.startsWith("/authority")
      ? "DISTRICT_AUTHORITY"
      : pathname.startsWith("/vet")
      ? "VETERINARIAN"
      : pathname.startsWith("/agent")
      ? "FIELD_AGENT"
      : "FARMER"
  );
  const roleLabel = dictionary.roles[activeRoleKey as keyof typeof dictionary.roles] || dictionary.roles.FARMER;

  const navLinks = [
    { href: "/farmer", label: dictionary.nav.farmer, icon: User },
    { href: "/agent", label: dictionary.nav.agent, icon: ShieldCheck },
    { href: "/vet", label: dictionary.nav.vet, icon: Stethoscope },
    { href: "/authority", label: dictionary.nav.authority, icon: Building2 },
    { href: "/admin", label: dictionary.nav.admin || "Admin Panel", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 flex h-[4.25rem] w-full items-center justify-between border-b border-[#C9BFA0] bg-[#F3EFE5]/95 px-4 md:px-8 backdrop-blur-md">
      {/* Brand Logo & Identity */}
      <Link href="/" className="flex items-center gap-3 group">
        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#E1E6D6] border border-[#AEBB9D] overflow-hidden transition-colors group-hover:bg-[#D4DDC3]">
          <Image
            src="/images/maitri-livestock-logo.png"
            alt="Maitri livestock care logo"
            width={40}
            height={40}
            className="h-full w-full object-contain scale-125"
            priority
          />
        </div>
        <div className="flex flex-col text-left">
          <span className="font-editorial text-lg md:text-xl font-semibold text-[#20271F] flex items-center gap-2">
            {dictionary.app.title}
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#DCE3CF] text-[#274C36] border border-[#AEBB9D]">
              {roleLabel}
            </span>
          </span>
          <span className="text-[11px] text-[#5C5645] hidden sm:inline leading-tight">
            {dictionary.app.subtitle}
          </span>
        </div>
      </Link>

      {/* Desktop Navigation Links */}
      <nav className="hidden xl:flex items-center gap-1 bg-[#FBF9F3] border border-[#C9BFA0] px-1.5 py-1 rounded-sm">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[#274C36] text-[#F3EFE5]"
                  : "text-[#5C5645] hover:text-[#22291F] hover:bg-[#EDE7D3]"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 transition-transform duration-200 ${isActive ? "text-[#EDE7D3] scale-110" : "text-[#5C5645]"}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Language Switcher Toggle */}
        <div className="flex items-center rounded-sm border border-[#C9BFA0] bg-[#FBF9F3] p-0.5 text-xs font-semibold" role="group" aria-label="Language switcher">
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={`px-2 py-1 rounded-xs transition-colors cursor-pointer ${
              locale === "en"
                ? "bg-[#274C36] text-[#F3EFE5]"
                : "text-[#5C5645] hover:text-[#20271F] hover:bg-[#EDE7D3]"
            }`}
            aria-label="English"
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLocale("mr")}
            className={`px-2 py-1 rounded-xs transition-colors cursor-pointer ${
              locale === "mr"
                ? "bg-[#274C36] text-[#F3EFE5]"
                : "text-[#5C5645] hover:text-[#20271F] hover:bg-[#EDE7D3]"
            }`}
            aria-label="मराठी"
          >
            मराठी
          </button>
        </div>

        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button variant="outline" size="sm" className="text-xs">
              {dictionary.nav.signIn}
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button size="sm" className="text-xs">
              {dictionary.nav.signUp}
            </Button>
          </SignUpButton>
        </Show>

        <Show when="signed-in">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button size="sm" variant="outline" className="text-xs flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5 text-[#2F5233]" />
                <span>{dictionary.nav.dashboard}</span>
              </Button>
            </Link>
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-9 w-9 border-2 border-[#2F5233]/60 hover:border-[#2F5233] transition-all rounded-full",
                },
              }}
            />
          </div>
        </Show>
      </div>
    </header>
  );
}
