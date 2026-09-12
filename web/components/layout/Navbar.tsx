"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { ShieldCheck, Stethoscope, Building2, User, Home, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/layout/LocaleProvider";

export function Navbar() {
  const pathname = usePathname();
  const { dictionary } = useLocale();
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
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#C9BFA0] bg-[#EDE7D3]/95 px-4 md:px-8 backdrop-blur-md">
      {/* Brand Logo & Identity */}
      <Link href="/" className="flex items-center gap-3 group">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2F5233] text-[#EDE7D3] font-extrabold shadow-xs group-hover:bg-[#25401F] transition-colors">
          <span className="text-lg tracking-tight font-serif font-black">M</span>
        </div>
        <div className="flex flex-col text-left">
          <span className="text-sm md:text-base font-bold text-[#191F1C] flex items-center gap-2">
            {dictionary.app.title}
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#2F5233]/10 text-[#2F5233] border border-[#2F5233]/25">
              {roleLabel}
            </span>
          </span>
          <span className="text-[11px] text-[#5C5645] hidden sm:inline leading-tight">
            {dictionary.app.subtitle}
          </span>
        </div>
      </Link>

      {/* Desktop Navigation Links */}
      <nav className="hidden xl:flex items-center gap-1.5 bg-[#F7F3E6] border border-[#C9BFA0] px-2 py-1 rounded-xl shadow-2xs">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[#2F5233] text-[#EDE7D3] shadow-xs"
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
        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button variant="outline" size="sm" className="text-xs border-[#C9BFA0] bg-[#F7F3E6] text-[#22291F] hover:bg-[#EDE7D3] rounded-xl">
              {dictionary.nav.signIn}
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button size="sm" className="text-xs bg-[#2F5233] hover:bg-[#25401F] text-[#EDE7D3] font-semibold shadow-xs rounded-xl">
              {dictionary.nav.signUp}
            </Button>
          </SignUpButton>
        </Show>

        <Show when="signed-in">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button size="sm" variant="outline" className="text-xs border-[#C9BFA0] bg-[#F7F3E6] text-[#22291F] hover:bg-[#EDE7D3] flex items-center gap-1.5 rounded-xl shadow-2xs">
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
