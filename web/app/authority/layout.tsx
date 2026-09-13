import Link from "next/link";
import Image from "next/image";
import { requireDistrictAuthority } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Activity, BellRing, ShieldCheck, UserCheck, FileSpreadsheet } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

export default async function AuthorityLayout({ children }: { children: React.ReactNode }) {
  const authority = await requireDistrictAuthority();
  const districtName = authority.district?.name || "Authorized District";

  return (
    <div className="min-h-screen bg-[#F3EFE5] text-[#20271F] flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="border-b border-[#CFC6AF] bg-[#FBF9F3]/95 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-sm bg-[#E1E6D6] border border-[#AEBB9D] overflow-hidden flex items-center justify-center">
              <Image src="/images/maitri-livestock-logo.png" alt="Maitri" width={36} height={36} className="h-full w-full object-contain scale-125" priority />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-editorial font-semibold text-lg tracking-tight text-[#20271F]">{districtName} · Control centre</span>
                <Badge className="text-[10px] border-emerald-200 text-emerald-800 px-2 py-0.5 bg-emerald-50">
                  Active Scope
                </Badge>
              </div>
              <p className="text-[11px] text-stone-500 hidden sm:block">
                District Epidemiological Surveillance Cockpit & Field Governance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge className="text-xs bg-stone-100 text-stone-700 border-stone-200 hidden md:flex items-center gap-1.5 py-1 px-2.5 rounded-full">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              <span>Officer: {authority.name}</span>
            </Badge>
            <UserButton />
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#E5E0D8] flex items-center gap-1 overflow-x-auto py-1 bg-[#FAF8F3]">
          <Link href="/authority">
            <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 transition-colors cursor-pointer">
              <Activity className="h-3.5 w-3.5 text-emerald-700" />
              <span>Control dashboard</span>
            </button>
          </Link>

          <Link href="/authority/alerts">
            <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-red-50 text-stone-700 hover:text-red-700 transition-colors cursor-pointer">
              <BellRing className="h-3.5 w-3.5 text-red-600" />
              <span>Outbreak alerts</span>
            </button>
          </Link>

          <Link href="/authority/approvals">
            <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-amber-50 text-stone-700 hover:text-amber-800 transition-colors cursor-pointer">
              <UserCheck className="h-3.5 w-3.5 text-amber-700" />
              <span>Pending approvals</span>
            </button>
          </Link>

          <Link href="/authority/reports">
            <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-purple-50 text-stone-700 hover:text-purple-800 transition-colors cursor-pointer">
              <FileSpreadsheet className="h-3.5 w-3.5 text-purple-700" />
              <span>Reports & exports</span>
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {children}
      </main>
    </div>
  );
}
