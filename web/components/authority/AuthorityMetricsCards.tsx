"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiSummaryMetrics } from "@/lib/authority/metrics";
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
} from "lucide-react";

interface AuthorityMetricsCardsProps {
  metrics: KpiSummaryMetrics;
}

export function AuthorityMetricsCards({ metrics }: AuthorityMetricsCardsProps) {
  return (
    <div className="space-y-4 text-[#191F1C]">
      {/* 15 Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {/* 1. Total Farmers */}
        <Card className="p-3.5 bg-white border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-stone-500 font-medium">Total Farmers</span>
            <Users className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
              <MotionCountUp value={metrics.totalFarmers} duration={800} />
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
              <MotionCountUp value={metrics.totalFarms} duration={800} />
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
              <MotionCountUp value={metrics.totalAnimals} duration={900} />
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">District Livestock</div>
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
              <MotionCountUp value={metrics.activeCases} duration={800} />
            </div>
            <div className="text-[10px] text-amber-800 mt-0.5">Under Active Care</div>
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
              <MotionCountUp value={metrics.pendingReviews} duration={700} />
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
              <MotionCountUp value={metrics.underExamination} duration={700} />
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
              <MotionCountUp value={metrics.labReferrals} duration={700} />
            </div>
            <div className="text-[10px] text-purple-800 mt-0.5">Diagnostics Pending</div>
          </div>
        </Card>

        {/* 8. Confirmed Cases */}
        <Card className="p-3.5 bg-red-50/80 border-red-200 rounded-2xl shadow-2xs hover-lift flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-red-900 font-bold">Confirmed Cases</span>
            <CheckCircle2 className="h-4 w-4 text-red-700" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-red-950 tracking-tight font-mono">
              <MotionCountUp value={metrics.confirmedCases} duration={800} />
            </div>
            <div className="text-[10px] text-red-800 mt-0.5">Clinically Verified</div>
          </div>
        </Card>

        {/* 9. Closed / Harmless Cases */}
        <Card className="p-3.5 bg-emerald-50/80 border-emerald-200 rounded-2xl shadow-2xs hover-lift flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-900 font-bold">Closed / Harmless</span>
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-emerald-950 tracking-tight font-mono">
              <MotionCountUp value={metrics.closedHarmlessCases} duration={800} />
            </div>
            <div className="text-[10px] text-emerald-800 mt-0.5">Resolved Cases</div>
          </div>
        </Card>

        {/* 10. Active Assistance Requests */}
        <Card className="p-3.5 bg-white border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-stone-500 font-medium">Assistance Req.</span>
            <LifeBuoy className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
              <MotionCountUp value={metrics.activeAssistanceRequests} duration={700} />
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">Farmer Requests</div>
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
              <MotionCountUp value={metrics.activeFieldVisits} duration={700} />
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">Ongoing Field Visits</div>
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
              <MotionCountUp value={metrics.totalVeterinarians} duration={600} />
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
              <MotionCountUp value={metrics.totalFieldAgents} duration={600} />
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
              <MotionCountUp value={metrics.activeAlerts} duration={600} />
            </div>
            <div className="text-[10px] text-rose-800 mt-0.5">Cluster Outbreaks</div>
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
              <MotionCountUp value={metrics.followUpsDue} duration={600} />
            </div>
            <div className="text-[10px] text-amber-800 mt-0.5">Clinical Reviews Due</div>
          </div>
        </Card>
      </div>

      {/* Operational Turnaround Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-3.5 bg-white border-[#E5E0D8] rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-500 font-medium">Average Time to Review (Intake Lag)</div>
            <div className="text-lg font-bold text-[#191F1C] mt-0.5">
              {metrics.avgTimeToReviewHours !== null ? `${metrics.avgTimeToReviewHours} hrs` : "0.0 hrs (No historical reviews)"}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">From case intake to veterinarian review</div>
          </div>
          <Badge className="text-[10px] bg-stone-100 text-stone-700 border-stone-200">
            Speed Metric
          </Badge>
        </Card>

        <Card className="p-3.5 bg-white border-[#E5E0D8] rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-500 font-medium">Average Time to Confirmation (Diagnosis Lag)</div>
            <div className="text-lg font-bold text-[#191F1C] mt-0.5">
              {metrics.avgTimeToConfirmationHours !== null ? `${metrics.avgTimeToConfirmationHours} hrs` : "0.0 hrs (No historical confirmations)"}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">From intake to official clinical confirmation</div>
          </div>
          <Badge className="text-[10px] bg-stone-100 text-stone-700 border-stone-200">
            Diagnostic Speed
          </Badge>
        </Card>
      </div>
    </div>
  );
}
