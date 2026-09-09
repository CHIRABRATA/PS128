import Link from "next/link";
import { requireFieldAgent } from "@/lib/auth/permissions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MotionFadeIn } from "@/components/motion/MotionFadeIn";
import {
  FilePlus2,
  ShieldCheck,
  WifiOff,
  Clock,
  ChevronRight,
} from "lucide-react";

export default async function FieldAgentPage() {
  const agent = await requireFieldAgent();
  const jurisdictionName = agent.block?.name || agent.district?.name || "Haveli / Pune";

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-6xl mx-auto w-full gap-6 text-[#191F1C]">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#191F1C] tracking-tight">Field Agent Notebook</h1>
            <Badge className="text-[10px] bg-amber-50 text-amber-900 border-amber-200">
              Field Jurisdiction: {jurisdictionName}
            </Badge>
          </div>
          <p className="text-stone-600 text-xs mt-1">
            Village shed visits, physical livestock inspections, clinical photo collection, and offline report management.
          </p>
        </div>

        <Link href="/agent/report">
          <Button size="sm" className="gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm min-h-[40px] rounded-xl cursor-pointer">
            <FilePlus2 className="h-4 w-4" />
            <span>Record Field Inspection</span>
          </Button>
        </Link>
      </div>

      {/* Subtle Lavender Offline Sync Status Banner */}
      <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-purple-950 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-100 text-purple-800">
            <WifiOff className="h-4 w-4 text-purple-700" />
          </div>
          <div>
            <span className="font-bold text-purple-900">OFFLINE FIELD SYNC READY:</span>
            <span className="ml-1.5 text-purple-900">
              Record health inspections even without network. All records will securely sync once back online.
            </span>
          </div>
        </div>
        <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[11px] font-semibold whitespace-nowrap">
          IndexedDB Active • Auto-Sync
        </Badge>
      </div>

      {/* ========================================================================= */}
      {/* 1. TODAY'S VISITS (Digital Field Notebook Queue)                         */}
      {/* ========================================================================= */}
      <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#E5E0D8]">
          <div>
            <CardTitle className="text-base font-bold text-[#191F1C] flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-700" />
              <span>TODAY&apos;S SCHEDULED VISITS</span>
            </CardTitle>
            <CardDescription className="text-xs text-stone-500">
              Village-wise livestock physical inspection and vaccination verification schedule
            </CardDescription>
          </div>
          <Link href="/agent/report">
            <Button variant="ghost" size="sm" className="text-xs text-emerald-800 hover:text-emerald-900 hover:bg-emerald-50">
              Open Field Visit &rarr;
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <div className="space-y-3">
            {/* Visit Item 1 */}
            <MotionFadeIn delay={0} direction="up">
              <div className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover-lift hover:border-emerald-600 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#191F1C] text-sm">Wagholi • 09:30 AM</span>
                    <Badge className="bg-amber-50 text-amber-900 border-amber-200 text-[10px]">
                      Skin Lesions & Fever
                    </Badge>
                  </div>
                  <p className="text-xs text-stone-600">
                    Farmer: <strong className="text-stone-800">Tukaram Shinde</strong> • Cow (Tag: MH-12-8492) • Photo & GPS Required
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Link href="/agent/report">
                    <Button size="sm" variant="outline" className="h-8 text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-xl cursor-pointer">
                      <span>Open Visit</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </MotionFadeIn>

            {/* Visit Item 2 */}
            <MotionFadeIn delay={80} direction="up">
              <div className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover-lift hover:border-emerald-600 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#191F1C] text-sm">Kesnand • 11:15 AM</span>
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                      Routine Vaccination Inspection
                    </Badge>
                  </div>
                  <p className="text-xs text-stone-600">
                    Farmer: <strong className="text-stone-800">Balu Jagtap</strong> • Buffalo (Tag: MH-12-3341) • FMD Booster Due
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Link href="/agent/report">
                    <Button size="sm" variant="outline" className="h-8 text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-xl cursor-pointer">
                      <span>Open Visit</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </MotionFadeIn>
          </div>
        </CardContent>
      </Card>

      {/* Field Inspection Protocols Advisory */}
      <div className="p-4 rounded-2xl bg-white border border-[#E5E0D8] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h4 className="font-bold text-[#191F1C] text-sm">Field Examination Protocol</h4>
            <p className="text-stone-500 text-xs">
              If any animal exhibits high fever or cutaneous nodules, immediately advise the farmer to isolate it from the rest of the herd.
            </p>
          </div>
        </div>
        <Link href="/agent/report">
          <Button size="sm" className="bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs whitespace-nowrap rounded-xl min-h-[36px]">
            Record Inspection
          </Button>
        </Link>
      </div>
    </div>
  );
}
