"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DistrictSnapshotMetrics, SelectedPeriodMetrics, KpiSummaryMetrics } from "@/lib/authority/metrics";
import { MotionCountUp } from "@/components/motion/MotionCountUp";
import {
  Users,
  Home,
  Activity,
  ClipboardList,
  Clock,
  Eye,
  TestTube,
  CheckCircle2,
  ShieldCheck,
  LifeBuoy,
  Footprints,
  Stethoscope,
  ShieldAlert,
  BellRing,
  Calendar,
  Syringe,
  Pill,
  Sparkles,
  CalendarDays,
  Timer,
} from "lucide-react";

interface AuthorityMetricsCardsProps {
  snapshot?: DistrictSnapshotMetrics;
  periodMetrics?: SelectedPeriodMetrics;
  metrics?: KpiSummaryMetrics; // For backwards compatibility
}

export function AuthorityMetricsCards({
  snapshot,
  periodMetrics,
  metrics,
}: AuthorityMetricsCardsProps) {
  // Resolve snapshot values safely
  const snap: DistrictSnapshotMetrics = snapshot || {
    totalFarmers: metrics?.totalFarmers || 0,
    totalFarms: metrics?.totalFarms || 0,
    totalAnimals: metrics?.totalAnimals || 0,
    currentActiveCases: metrics?.activeCases || 0,
    currentPendingReviews: metrics?.pendingReviews || 0,
    currentUnderExam: metrics?.underExamination || 0,
    currentLabReferrals: metrics?.labReferrals || 0,
    currentConfirmedCases: metrics?.confirmedCases || 0,
    currentClosedHarmless: metrics?.closedHarmlessCases || 0,
    currentActiveVisits: metrics?.activeFieldVisits || 0,
    currentActiveRequests: metrics?.activeAssistanceRequests || 0,
    totalVeterinarians: metrics?.totalVeterinarians || 0,
    totalFieldAgents: metrics?.totalFieldAgents || 0,
    currentActiveAlerts: metrics?.activeAlerts || 0,
    currentFollowUpsDue: metrics?.followUpsDue || 0,
  };

  // Resolve period metrics safely
  const period: SelectedPeriodMetrics = periodMetrics || {
    periodLabel: "Selected Period",
    periodSubLabel: "Active filter window",
    timeRange: "30d",
    startDate: null,
    endDate: null,
    casesReported: metrics?.activeCases || 0,
    assistanceRequests: metrics?.activeAssistanceRequests || 0,
    fieldVisits: metrics?.activeFieldVisits || 0,
    veterinaryReports: 0,
    alertsCreated: metrics?.activeAlerts || 0,
    vaccinationsRecorded: 0,
    treatmentsRecorded: 0,
    casesConfirmed: metrics?.confirmedCases || 0,
    casesReviewed: 0,
    avgTimeToReviewHours: metrics?.avgTimeToReviewHours ?? null,
    avgTimeToConfirmationHours: metrics?.avgTimeToConfirmationHours ?? null,
  };

  return (
    <div className="space-y-8 text-[#191F1C]">
      {/* ========================================================================= */}
      {/* SECTION 1: CURRENT DISTRICT STATUS (LIVE SNAPSHOT)                       */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#E5E0D8] pb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-[#191F1C] tracking-tight uppercase">
              Current District Status
            </h3>
            <Badge className="bg-emerald-50 text-emerald-900 border-emerald-300 text-[10px] font-semibold px-2 py-0.5">
              Live District Snapshot
            </Badge>
          </div>
          <span className="text-[11px] text-stone-500 font-mono">
            Ongoing District Capacity & Caseload
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {/* 1. Total Farmers */}
          <Card className="p-3.5 bg-white border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-500 font-medium">Total Farmers</span>
              <Users className="h-4 w-4 text-emerald-700" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={snap.totalFarmers} duration={800} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Registered Farmers</div>
            </div>
          </Card>

          {/* 2. Total Farms */}
          <Card className="p-3.5 bg-white border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-500 font-medium">Total Farms</span>
              <Home className="h-4 w-4 text-emerald-700" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={snap.totalFarms} duration={800} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Sheds & Locations</div>
            </div>
          </Card>

          {/* 3. Total Animals */}
          <Card className="p-3.5 bg-white border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-500 font-medium">Total Animals</span>
              <Activity className="h-4 w-4 text-emerald-700" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={snap.totalAnimals} duration={900} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Monitored Livestock</div>
            </div>
          </Card>

          {/* 4. Active Health Cases */}
          <Card className="p-3.5 bg-amber-50/80 border-amber-200 rounded-2xl shadow-2xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-amber-900 font-bold">Active Cases</span>
              <ClipboardList className="h-4 w-4 text-amber-700" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-amber-950 tracking-tight font-mono">
                <MotionCountUp value={snap.currentActiveCases} duration={800} />
              </div>
              <div className="text-[10px] text-amber-800 mt-0.5">Pending + Exam + Lab</div>
            </div>
          </Card>

          {/* 5. Pending Vet Reviews */}
          <Card className="p-3.5 bg-white border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-500 font-medium">Pending Reviews</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={snap.currentPendingReviews} duration={700} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Awaiting Triage</div>
            </div>
          </Card>

          {/* 6. Cases Under Examination */}
          <Card className="p-3.5 bg-white border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-500 font-medium">Under Exam</span>
              <Eye className="h-4 w-4 text-orange-600" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={snap.currentUnderExam} duration={700} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Clinical Examination</div>
            </div>
          </Card>

          {/* 7. Lab Referrals */}
          <Card className="p-3.5 bg-purple-50/80 border-purple-200 rounded-2xl shadow-2xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-purple-900 font-bold">Lab Referrals</span>
              <TestTube className="h-4 w-4 text-purple-700" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-purple-950 tracking-tight font-mono">
                <MotionCountUp value={snap.currentLabReferrals} duration={700} />
              </div>
              <div className="text-[10px] text-purple-800 mt-0.5">Diagnostics Pending</div>
            </div>
          </Card>

          {/* 8. Cumulative Confirmed Cases */}
          <Card className="p-3.5 bg-red-50/80 border-red-200 rounded-2xl shadow-2xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-red-900 font-bold">Confirmed Cases</span>
              <CheckCircle2 className="h-4 w-4 text-red-700" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-red-950 tracking-tight font-mono">
                <MotionCountUp value={snap.currentConfirmedCases} duration={800} />
              </div>
              <div className="text-[10px] text-red-800 mt-0.5">Clinically Verified</div>
            </div>
          </Card>

          {/* 9. Cumulative Closed / Harmless */}
          <Card className="p-3.5 bg-emerald-50/80 border-emerald-200 rounded-2xl shadow-2xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-emerald-900 font-bold">Closed / Harmless</span>
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-emerald-950 tracking-tight font-mono">
                <MotionCountUp value={snap.currentClosedHarmless} duration={800} />
              </div>
              <div className="text-[10px] text-emerald-800 mt-0.5">Resolved Cases</div>
            </div>
          </Card>

          {/* 10. Active Assistance Requests */}
          <Card className="p-3.5 bg-white border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-500 font-medium">Active Requests</span>
              <LifeBuoy className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={snap.currentActiveRequests} duration={700} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Open Farmer Requests</div>
            </div>
          </Card>

          {/* 11. Active Field Visits */}
          <Card className="p-3.5 bg-white border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-500 font-medium">Active Visits</span>
              <Footprints className="h-4 w-4 text-teal-600" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={snap.currentActiveVisits} duration={700} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">In Progress / Pending</div>
            </div>
          </Card>

          {/* 12. Total Veterinarians */}
          <Card className="p-3.5 bg-white border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-500 font-medium">Total Vets</span>
              <Stethoscope className="h-4 w-4 text-purple-700" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={snap.totalVeterinarians} duration={600} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Clinical Officers</div>
            </div>
          </Card>

          {/* 13. Total Field Agents */}
          <Card className="p-3.5 bg-white border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-500 font-medium">Field Agents</span>
              <ShieldAlert className="h-4 w-4 text-blue-700" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={snap.totalFieldAgents} duration={600} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Pashu Sakhis & Agents</div>
            </div>
          </Card>

          {/* 14. Active Alerts */}
          <Card className="p-3.5 bg-rose-50/90 border-rose-200 rounded-2xl shadow-2xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-rose-950 font-bold">Active Alerts</span>
              <BellRing className="h-4 w-4 text-rose-600 animate-pulse" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-rose-950 tracking-tight font-mono">
                <MotionCountUp value={snap.currentActiveAlerts} duration={600} />
              </div>
              <div className="text-[10px] text-rose-800 mt-0.5">Active Outbreaks</div>
            </div>
          </Card>

          {/* 15. Follow-ups Due */}
          <Card className="p-3.5 bg-amber-50/80 border-amber-200 rounded-2xl shadow-2xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-amber-950 font-bold">Follow-ups Due</span>
              <Calendar className="h-4 w-4 text-amber-700" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-amber-950 tracking-tight font-mono">
                <MotionCountUp value={snap.currentFollowUpsDue} duration={600} />
              </div>
              <div className="text-[10px] text-amber-800 mt-0.5">Clinical Reviews Due</div>
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: SELECTED PERIOD ACTIVITY (TIME-FILTERED)                     */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#E5E0D8] pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold text-[#191F1C] tracking-tight uppercase flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-emerald-700" />
              <span>Selected Period Activity — {period.periodLabel}</span>
            </h3>
            <Badge className="bg-purple-100 text-purple-950 border-purple-300 text-xs font-semibold px-2.5 py-0.5">
              {period.periodSubLabel}
            </Badge>
          </div>
          <span className="text-[11px] text-stone-500 font-mono">
            Filtered exclusively to {period.periodLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* P1. Cases Reported */}
          <Card className="p-3.5 bg-[#FAF8F3] border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-700 font-bold">Cases Reported</span>
              <ClipboardList className="h-4 w-4 text-emerald-700" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={period.casesReported} duration={700} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Intakes in period</div>
            </div>
          </Card>

          {/* P2. Assistance Requests */}
          <Card className="p-3.5 bg-[#FAF8F3] border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-700 font-bold">Assistance Requests</span>
              <LifeBuoy className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={period.assistanceRequests} duration={700} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Requests logged</div>
            </div>
          </Card>

          {/* P3. Field Visits */}
          <Card className="p-3.5 bg-[#FAF8F3] border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-700 font-bold">Field Visits</span>
              <Footprints className="h-4 w-4 text-teal-600" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={period.fieldVisits} duration={700} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Visits conducted</div>
            </div>
          </Card>

          {/* P4. Veterinary Reports */}
          <Card className="p-3.5 bg-[#FAF8F3] border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-700 font-bold">Vet Reports</span>
              <Stethoscope className="h-4 w-4 text-purple-700" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={period.veterinaryReports} duration={700} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Reports submitted</div>
            </div>
          </Card>

          {/* P5. Alerts Created */}
          <Card className="p-3.5 bg-[#FAF8F3] border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-700 font-bold">Alerts Created</span>
              <BellRing className="h-4 w-4 text-rose-600" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={period.alertsCreated} duration={700} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Cluster alerts triggered</div>
            </div>
          </Card>

          {/* P6. Vaccinations Recorded */}
          <Card className="p-3.5 bg-[#FAF8F3] border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-700 font-bold">Vaccinations</span>
              <Syringe className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={period.vaccinationsRecorded} duration={700} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Doses administered</div>
            </div>
          </Card>

          {/* P7. Treatments Recorded */}
          <Card className="p-3.5 bg-[#FAF8F3] border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-700 font-bold">Treatments</span>
              <Pill className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={period.treatmentsRecorded} duration={700} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Medications given</div>
            </div>
          </Card>

          {/* P8. Cases Confirmed */}
          <Card className="p-3.5 bg-[#FAF8F3] border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-700 font-bold">Confirmed in Period</span>
              <CheckCircle2 className="h-4 w-4 text-red-600" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={period.casesConfirmed} duration={700} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Diagnoses finalized</div>
            </div>
          </Card>

          {/* P9. Cases Reviewed */}
          <Card className="p-3.5 bg-[#FAF8F3] border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-700 font-bold">Cases Reviewed</span>
              <Sparkles className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
                <MotionCountUp value={period.casesReviewed} duration={700} />
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Clinical triages completed</div>
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: CLINICAL PERFORMANCE & TURNAROUND (Selected Period)          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-4 bg-white border-[#E5E0D8] rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-stone-600 font-semibold">
              <Timer className="h-4 w-4 text-amber-600" />
              <span>Average Time to Review (Intake Lag)</span>
            </div>
            <div className="text-xl font-bold text-[#191F1C] font-mono">
              {period.avgTimeToReviewHours !== null
                ? `${period.avgTimeToReviewHours} hrs`
                : "No reviews in period"}
            </div>
            <div className="text-[11px] text-stone-500">From case intake to veterinarian clinical triage</div>
          </div>
          <Badge className="text-[10px] bg-amber-50 text-amber-900 border-amber-300">
            Speed Metric
          </Badge>
        </Card>

        <Card className="p-4 bg-white border-[#E5E0D8] rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-stone-600 font-semibold">
              <Clock className="h-4 w-4 text-emerald-700" />
              <span>Average Time to Confirmation (Diagnosis Lag)</span>
            </div>
            <div className="text-xl font-bold text-[#191F1C] font-mono">
              {period.avgTimeToConfirmationHours !== null
                ? `${period.avgTimeToConfirmationHours} hrs`
                : "No confirmations in period"}
            </div>
            <div className="text-[11px] text-stone-500">From case intake to official clinical confirmation</div>
          </div>
          <Badge className="text-[10px] bg-emerald-50 text-emerald-900 border-emerald-300">
            Diagnostic Speed
          </Badge>
        </Card>
      </div>
    </div>
  );
}
