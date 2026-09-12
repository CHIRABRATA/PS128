import React from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, LayoutDashboard, ScrollText, MapPin } from "lucide-react";
import { UserButton } from "@clerk/nextjs";


export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#191F1C] flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="border-b border-[#E5E0D8] bg-white/95 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-[#191F1C]">
                  Maitri Platform Administration & Governance
                </span>
                <Badge className="text-[10px] border-emerald-300 text-emerald-900 px-2 py-0.5 bg-emerald-50 font-mono">
                  ADMIN SCOPE
                </Badge>
              </div>
              <p className="text-[11px] text-stone-500 hidden sm:block">
                Master Authority, Immutable Audit Logs & Administrative Control Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge className="text-xs bg-stone-100 text-stone-700 border-stone-200 hidden md:flex items-center gap-1.5 py-1 px-2.5 rounded-full">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              <span>Admin: {admin.name}</span>
            </Badge>
            <UserButton />
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#E5E0D8] flex items-center gap-1 overflow-x-auto py-1 bg-[#FAF8F3]">
          <Link href="/admin">
            <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 transition-colors cursor-pointer">
              <LayoutDashboard className="h-3.5 w-3.5 text-emerald-700" />
              <span>System Dashboard</span>
            </button>
          </Link>

          <Link href="/admin/audit-log">
            <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-blue-50 text-stone-700 hover:text-blue-800 transition-colors cursor-pointer">
              <ScrollText className="h-3.5 w-3.5 text-blue-600" />
              <span>Audit Log Ledger</span>
            </button>
          </Link>

          <Link href="/admin/geography">
            <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-purple-50 text-stone-700 hover:text-purple-800 transition-colors cursor-pointer">
              <MapPin className="h-3.5 w-3.5 text-purple-700" />
              <span>Geography Master Data</span>
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
