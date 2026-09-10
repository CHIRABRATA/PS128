import React from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getVetQueueAction, getVetDashboardMetricsAction } from "@/lib/actions/vet";
import { RiskBadge } from "@/components/ai/RiskBadge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Camera,
  Cpu,
  ArrowRight,
  Clock,
  AlertTriangle,
  ShieldCheck,
  CalendarCheck,
  RotateCcw,
} from "lucide-react";

export default async function VetDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; risk?: string; villageId?: string; species?: string; scope?: "assigned" | "service_area" }>;
}) {
  const params = searchParams ? await searchParams : {};
  const statusFilter = params.status;
  const riskFilter = params.risk;
  const speciesFilter = params.species;
  const scopeFilter = (params.scope as "assigned" | "service_area") || "assigned";

  const [metrics, queue] = await Promise.all([
    getVetDashboardMetricsAction(),
    getVetQueueAction({
      status: statusFilter,
      riskLevel: riskFilter,
      species: speciesFilter,
      scope: scopeFilter,
    }),
  ]);

  return (
    <div className="space-y-6 text-[#191F1C]">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-4">
        <div>
          <Badge className="border-emerald-200 text-emerald-800 bg-emerald-50 text-[10px] uppercase font-mono">
            Clinical Priority Workstation
          </Badge>
          <h1 className="text-2xl font-bold text-[#191F1C] tracking-tight mt-1">
            Veterinary Triage Queue
          </h1>
          <p className="text-xs text-stone-500">
            Prioritized by clinical severity (CRITICAL &gt; HIGH &gt; ELEVATED &gt; MEDIUM &gt; LOW) and reporting time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/vet/follow-ups">
            <Button variant="outline" size="sm" className="text-xs border-purple-200 bg-purple-50 text-purple-900 hover:bg-purple-100 rounded-xl min-h-[36px] gap-1.5">
              <CalendarCheck className="h-4 w-4 text-purple-700" />
              <span>Follow-ups ({metrics.followUpsDueCount})</span>
            </Button>
          </Link>
          <Link href="/vet/samples">
            <Button variant="outline" size="sm" className="text-xs border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100 rounded-xl min-h-[36px] gap-1.5">
              <ShieldCheck className="h-4 w-4 text-sky-700" />
              <span>Lab Samples ({metrics.labRefCount})</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* REAL DATABASE KPI METRICS (CLICKABLE FILTERS) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Link href="/vet?risk=CRITICAL" className="block">
          <div className={`p-4 rounded-2xl border flex flex-col justify-between shadow-2xs hover-lift h-full transition-all ${
            riskFilter === "CRITICAL" ? "ring-2 ring-red-600 bg-red-100/90 border-red-300" : "bg-red-50/80 border-red-200"
          }`}>
            <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider">Critical Cases</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-red-900">{metrics.criticalCount}</span>
              <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
            </div>
          </div>
        </Link>

        <Link href="/vet?status=PENDING_REVIEW" className="block">
          <div className={`p-4 rounded-2xl border flex flex-col justify-between shadow-2xs hover-lift h-full transition-all ${
            statusFilter === "PENDING_REVIEW" ? "ring-2 ring-amber-600 bg-amber-100/90 border-amber-300" : "bg-amber-50/80 border-amber-200"
          }`}>
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Pending Review</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-amber-950">{metrics.pendingCount}</span>
              <Clock className="h-5 w-5 text-amber-700" />
            </div>
          </div>
        </Link>

        <Link href="/vet?status=UNDER_EXAMINATION" className="block">
          <div className={`p-4 rounded-2xl border flex flex-col justify-between shadow-2xs hover-lift h-full transition-all ${
            statusFilter === "UNDER_EXAMINATION" ? "ring-2 ring-emerald-600 bg-emerald-100/90 border-emerald-300" : "bg-emerald-50/80 border-emerald-200"
          }`}>
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Under Exam</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-emerald-950">{metrics.underExamCount}</span>
              <Activity className="h-5 w-5 text-emerald-700" />
            </div>
          </div>
        </Link>

        <Link href="/vet?status=LAB_REFERRAL" className="block">
          <div className={`p-4 rounded-2xl border flex flex-col justify-between shadow-2xs hover-lift h-full transition-all ${
            statusFilter === "LAB_REFERRAL" ? "ring-2 ring-sky-600 bg-sky-100/90 border-sky-300" : "bg-sky-50/80 border-sky-200"
          }`}>
            <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider">Lab Referrals</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-sky-950">{metrics.labRefCount}</span>
              <ShieldCheck className="h-5 w-5 text-sky-700" />
            </div>
          </div>
        </Link>

        <Link href="/vet/follow-ups" className="block">
          <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/80 flex flex-col justify-between shadow-2xs hover-lift h-full">
            <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">Follow-ups Due</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-purple-950">{metrics.followUpsDueCount}</span>
              <CalendarCheck className="h-5 w-5 text-purple-700" />
            </div>
          </div>
        </Link>
      </div>

      {/* Queue Section */}
      <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
        <CardHeader className="border-b border-[#E5E0D8] pb-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* SCOPE TOGGLE: Assigned to Me vs Service Area */}
            <div className="flex items-center gap-1.5 p-1 bg-[#FAF8F3] rounded-2xl border border-[#E5E0D8] self-start">
              <Link
                href={`/vet?scope=assigned${statusFilter ? `&status=${statusFilter}` : ""}${riskFilter ? `&risk=${riskFilter}` : ""}${speciesFilter ? `&species=${speciesFilter}` : ""}`}
              >
                <Button
                  size="sm"
                  variant={scopeFilter === "assigned" ? "default" : "ghost"}
                  className={`text-xs rounded-xl h-8 px-3.5 font-semibold transition-all ${
                    scopeFilter === "assigned"
                      ? "bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900 hover:bg-white"
                  }`}
                >
                  <span>Assigned to me</span>
                  <Badge className="ml-1.5 bg-emerald-900/30 text-white border-0 text-[10px] px-1.5 py-0 h-4">
                    {metrics.myAssignedCount}
                  </Badge>
                </Button>
              </Link>

              <Link
                href={`/vet?scope=service_area${statusFilter ? `&status=${statusFilter}` : ""}${riskFilter ? `&risk=${riskFilter}` : ""}${speciesFilter ? `&species=${speciesFilter}` : ""}`}
              >
                <Button
                  size="sm"
                  variant={scopeFilter === "service_area" ? "default" : "ghost"}
                  className={`text-xs rounded-xl h-8 px-3.5 font-semibold transition-all ${
                    scopeFilter === "service_area"
                      ? "bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900 hover:bg-white"
                  }`}
                >
                  <span>In my service area</span>
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {(statusFilter || riskFilter || speciesFilter) && (
                <Link href={`/vet?scope=${scopeFilter}`}>
                  <Button size="sm" variant="ghost" className="text-xs text-stone-600 hover:text-stone-900 gap-1 h-8">
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Filters</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>
              {queue.length} cases currently visible in {scopeFilter === "assigned" ? "your personal queue" : "your district service area"}
            </span>
            {(statusFilter || riskFilter || speciesFilter) && (
              <Badge className="bg-stone-100 text-stone-800 border-stone-300 text-[10px]">
                Filtered: {statusFilter || riskFilter || speciesFilter}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {queue.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500 space-y-2">
              <ShieldCheck className="h-8 w-8 text-emerald-700 mx-auto" />
              <p className="font-bold text-stone-900">Triage Queue is Clear</p>
              <p>No health cases match the selected filter criteria.</p>
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="grid grid-cols-1 md:hidden gap-3">
                {queue.map((item) => {
                  const analysis = (item.analysisResult as Record<string, unknown> | null) || {};
                  const level = (analysis.overall_risk_level as string) || "UNKNOWN";
                  const score = Number(analysis.overall_risk_score || 0);

                  return (
                    <div key={item.id} className="p-4 rounded-2xl border border-[#E5E0D8] bg-[#FAF8F3] space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#191F1C]">#{item.caseNumber}</span>
                            {item.assignmentLevel && (
                              <Badge className="text-[9px] bg-emerald-50 text-emerald-800 border-emerald-200">
                                {item.assignmentLevel}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            Tag: <strong className="text-stone-800 font-mono">{item.animal.tag}</strong> ({item.animal.species})
                          </p>
                        </div>
                        <RiskBadge level={level} />
                      </div>

                      <div className="text-xs text-stone-600 space-y-1">
                        <div>Farm: <span className="text-stone-900 font-medium">{item.animal.herd.farm.name}</span></div>
                        <div>Village: <span className="text-stone-900 font-medium">{item.animal.herd.farm.village.name}</span></div>
                        <div>Reported: <span className="text-stone-500">{new Date(item.reportedAt).toLocaleString()}</span></div>
                        {item.assignedVeterinarianUser && (
                          <div className="text-emerald-900 text-[11px] pt-0.5">
                            Assigned to: <strong>Dr. {item.assignedVeterinarianUser.name}</strong>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        {item.photoUrl && (
                          <Badge className="text-[10px] border-emerald-200 text-emerald-800 bg-emerald-50 flex items-center gap-1">
                            <Camera className="h-3 w-3" /> Photo
                          </Badge>
                        )}
                        {item.iotTelemetry && (
                          <Badge className="text-[10px] border-emerald-200 text-emerald-800 bg-emerald-50 flex items-center gap-1">
                            <Cpu className="h-3 w-3" /> IoT Vitals
                          </Badge>
                        )}
                        {item.analysisResult && (
                          <Badge className="text-[10px] border-amber-200 text-amber-800 bg-amber-50 flex items-center gap-1">
                            <Activity className="h-3 w-3" /> AI Score ({score})
                          </Badge>
                        )}
                      </div>

                      <Link href={`/vet/cases/${item.id}`}>
                        <Button type="button" size="sm" className="w-full text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold mt-2 min-h-[40px] rounded-xl">
                          <span>Start Examination</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-600 border-collapse">
                  <thead className="bg-[#FAF8F3] border-b border-[#E5E0D8] text-[11px] font-bold text-stone-800 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Case #</th>
                      <th className="py-3 px-3">Risk</th>
                      <th className="py-3 px-3">Animal</th>
                      <th className="py-3 px-3">Location</th>
                      <th className="py-3 px-3">Assignment</th>
                      <th className="py-3 px-3">Reported</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E0D8]">
                    {queue.map((item) => {
                      const analysis = (item.analysisResult as Record<string, unknown> | null) || {};
                      const level = (analysis.overall_risk_level as string) || "UNKNOWN";

                      return (
                        <tr key={item.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-stone-900">
                            #{item.caseNumber}
                          </td>
                          <td className="py-3 px-3">
                            <RiskBadge level={level} />
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-stone-900">{item.animal.tag}</div>
                            <span className="text-[11px] text-stone-500">{item.animal.species}</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-stone-800">{item.animal.herd.farm.village.name}</div>
                            <span className="text-[11px] text-stone-500">{item.animal.herd.farm.name}</span>
                          </td>
                          <td className="py-3 px-3">
                            {item.assignedVeterinarianUser ? (
                              <div>
                                <span className="font-semibold text-emerald-950 block">
                                  Dr. {item.assignedVeterinarianUser.name}
                                </span>
                                {item.assignmentLevel && (
                                  <Badge className="text-[9px] bg-emerald-50 text-emerald-800 border-emerald-200 mt-0.5">
                                    {item.assignmentLevel} Level
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-stone-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-stone-500">
                            {new Date(item.reportedAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-3">
                            <Badge className="bg-stone-100 text-stone-700 border-stone-200 text-[10px]">
                              {item.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Link href={`/vet/cases/${item.id}`}>
                              <Button type="button" size="sm" variant="outline" className="h-8 text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-50 gap-1 rounded-xl">
                                <span>Review</span>
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
