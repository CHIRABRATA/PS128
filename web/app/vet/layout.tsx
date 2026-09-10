import React from "react";
import Link from "next/link";
import { requireVeterinarian } from "@/lib/auth/permissions";
import { UserButton } from "@clerk/nextjs";
import { Stethoscope, Activity, ClipboardList, FlaskConical, Calendar, User } from "lucide-react";

export default async function VetLayout({ children }: { children: React.ReactNode }) {
  const vetUser = await requireVeterinarian();

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#191F1C] flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-[#E5E0D8] bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shadow-xs">
              <Stethoscope className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-[#191F1C] flex items-center gap-2">
                MAITRI CLINICAL <span className="text-emerald-800 font-semibold text-xs uppercase px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">Veterinary Clinic</span>
              </span>
              <p className="text-[11px] text-stone-500 hidden sm:block">
                Clinical Health Triage & Outbreak Surveillance Desk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-xs font-semibold text-[#191F1C]">{vetUser.name}</p>
              <p className="text-[10px] text-emerald-800 font-mono">
                {vetUser.districtId ? `District Scope: ${vetUser.districtId}` : "District Veterinary Scope"}
              </p>
            </div>
            <UserButton />
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="border-t border-[#E5E0D8] bg-[#FAF8F3] px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
            <Link
              href="/vet"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors whitespace-nowrap"
            >
              <Activity className="h-4 w-4 text-emerald-700" />
              <span>Triage Queue</span>
            </Link>

            <Link
              href="/vet/cases"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors whitespace-nowrap"
            >
              <ClipboardList className="h-4 w-4 text-stone-500" />
              <span>All Cases</span>
            </Link>

            <Link
              href="/vet/samples"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors whitespace-nowrap"
            >
              <FlaskConical className="h-4 w-4 text-amber-600" />
              <span>Lab Samples</span>
            </Link>

            <Link
              href="/vet/schedule"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors whitespace-nowrap"
            >
              <Calendar className="h-4 w-4 text-purple-600" />
              <span>Visits & Schedule</span>
            </Link>

            <Link
              href="/vet/profile"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors whitespace-nowrap"
            >
              <User className="h-4 w-4 text-emerald-700" />
              <span>Profile</span>
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
