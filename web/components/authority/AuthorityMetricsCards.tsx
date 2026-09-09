"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuthorityDashboardMetrics } from "@/lib/authority/metrics";
import { MotionCountUp } from "@/components/motion/MotionCountUp";
import { Activity, AlertTriangle, CheckCircle2, Clock, ShieldAlert } from "lucide-react";

interface AuthorityMetricsCardsProps {
  metrics: AuthorityDashboardMetrics;
}

export function AuthorityMetricsCards({ metrics }: AuthorityMetricsCardsProps) {
  return (
    <div className="space-y-4 text-[#191F1C]">
      {/* Primary KPI Metrics Grid with Soft Pastel Surfaces */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <Card className="p-4 bg-white border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500 font-medium">एकूण देखरेख जनावरे</span>
            <Activity className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
              <MotionCountUp value={metrics.animalsMonitored} duration={1200} />
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">जिल्हा पशुधन संख्या</div>
          </div>
        </Card>

        <Card className="p-4 bg-white border-[#E5E0D8] rounded-2xl shadow-xs hover-lift flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500 font-medium">या आठवड्यातील अहवाल</span>
            <Clock className="h-4 w-4 text-amber-700" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[#191F1C] tracking-tight font-mono">
              <MotionCountUp value={metrics.reportsThisWeek} duration={1000} />
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">मागील ७ दिवसांचा कालावधी</div>
          </div>
        </Card>

        <Card className="p-4 bg-red-50/80 border-red-200 rounded-2xl shadow-2xs hover-lift flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-800 font-bold">तीव्र संशयित प्रकरणे</span>
            <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-red-900 tracking-tight font-mono">
              <MotionCountUp value={metrics.highRiskCases} duration={800} />
            </div>
            <div className="text-[11px] text-red-700 mt-0.5">Critical / High AI Signals</div>
          </div>
        </Card>

        <Card className="p-4 bg-emerald-50/80 border-emerald-200 rounded-2xl shadow-2xs hover-lift flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-bold">पुष्ट रोग प्रकरणे</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-900 tracking-tight font-mono">
              <MotionCountUp value={metrics.confirmedCases} duration={900} />
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">डॉक्टरांनी पुष्टी दिलेली</div>
          </div>
        </Card>

        <Card className="p-4 bg-amber-50/80 border-amber-200 rounded-2xl shadow-2xs hover-lift flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-900 font-bold">सक्रिय प्रादुर्भाव अलर्ट</span>
            <ShieldAlert className="h-4 w-4 text-amber-700" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-amber-950 tracking-tight font-mono">
              <MotionCountUp value={metrics.activeAlerts} duration={700} />
            </div>
            <div className="text-[11px] text-amber-800 mt-0.5">गाव क्लस्टर अलर्ट</div>
          </div>
        </Card>
      </div>

      {/* Operational Turnaround Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4 bg-white border-[#E5E0D8] rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-500 font-medium">तपासणी प्रतिसाद वेळ (Review Lag)</div>
            <div className="text-lg font-bold text-[#191F1C] mt-1">
              {metrics.avgTimeToReviewHours !== null ? `${metrics.avgTimeToReviewHours} तास` : "नोंद नाही"}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">तक्रार नोंदणीपासून डॉक्टर तपासणीपर्यंत</div>
          </div>
          <Badge className="text-[10px] bg-stone-100 text-stone-700 border-stone-200">
            तपासणी गती
          </Badge>
        </Card>

        <Card className="p-4 bg-white border-[#E5E0D8] rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-500 font-medium">सरासरी निदान वेळ (Confirmation Lag)</div>
            <div className="text-lg font-bold text-[#191F1C] mt-1">
              {metrics.avgTimeToConfirmationHours !== null ? `${metrics.avgTimeToConfirmationHours} तास` : "नोंद नाही"}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">अधिकृत प्रयोगशाळा व डॉक्टर निष्कर्ष</div>
          </div>
          <Badge className="text-[10px] bg-stone-100 text-stone-700 border-stone-200">
            निदान वेग
          </Badge>
        </Card>

        <Card className="p-4 bg-white border-[#E5E0D8] rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-500 font-medium">सक्रिय अलर्ट संख्या (Active Outbreaks)</div>
            <div className="text-lg font-bold text-[#191F1C] mt-1">
              {metrics.activeAlerts > 0 ? `${metrics.activeAlerts} गावे` : "निरंक"}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">रोग संशय व क्लस्टर अलर्ट प्रेषण</div>
          </div>
          <Badge className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
            सुरक्षा तत्परता
          </Badge>
        </Card>
      </div>
    </div>
  );
}
