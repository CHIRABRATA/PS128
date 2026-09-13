import React from "react";
import Link from "next/link";
import Image from "next/image";
import { requireVeterinarian } from "@/lib/auth/permissions";
import { UserButton } from "@clerk/nextjs";
import { Activity, ClipboardList, FlaskConical, Calendar, User } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function VetLayout({ children }: { children: React.ReactNode }) {
  const vetUser = await requireVeterinarian();
  const t = await getTranslations("vet");

  return (
    <div className="min-h-screen bg-[#F3EFE5] text-[#20271F] flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-[#CFC6AF] bg-[#FBF9F3]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-sm bg-[#E1E6D6] border border-[#AEBB9D] overflow-hidden flex items-center justify-center">
              <Image src="/images/maitri-livestock-logo.png" alt="Maitri" width={36} height={36} className="h-full w-full object-contain scale-125" priority />
            </div>
            <div>
              <span className="font-editorial font-semibold text-lg tracking-tight text-[#20271F] flex items-center gap-2">
                Maitri {t("clinical")} <span className="text-[#274C36] font-mono font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#E1E6D6] border border-[#AEBB9D]">{t("clinic")}</span>
              </span>
              <p className="text-[11px] text-stone-500 hidden sm:block">
                {t("clinicalDeskSubtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-xs font-semibold text-[#191F1C]">{vetUser.name}</p>
              <p className="text-[10px] text-emerald-800 font-mono">
                {vetUser.districtId ? `${t("scope")}: ${vetUser.districtId}` : t("scope")}
              </p>
            </div>
            <UserButton />
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="border-t border-[#CFC6AF] bg-[#F3EFE5] px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
            <Link
              href="/vet"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold text-stone-700 hover:text-[#274C36] hover:bg-[#E1E6D6] transition-colors whitespace-nowrap"
            >
              <Activity className="h-4 w-4 text-emerald-700" />
              <span>{t("triageQueue")}</span>
            </Link>

            <Link
              href="/vet/cases"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors whitespace-nowrap"
            >
              <ClipboardList className="h-4 w-4 text-stone-500" />
              <span>{t("allCases")}</span>
            </Link>

            <Link
              href="/vet/samples"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors whitespace-nowrap"
            >
              <FlaskConical className="h-4 w-4 text-amber-600" />
              <span>{t("labSamples")}</span>
            </Link>

            <Link
              href="/vet/follow-ups"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors whitespace-nowrap"
            >
              <Calendar className="h-4 w-4 text-purple-600" />
              <span>{t("visitsSchedule")}</span>
            </Link>

            <Link
              href="/vet/profile"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors whitespace-nowrap"
            >
              <User className="h-4 w-4 text-emerald-700" />
              <span>{t("vetProfile")}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
