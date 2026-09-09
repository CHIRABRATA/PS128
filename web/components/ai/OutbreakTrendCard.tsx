"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, TrendingUp, Users } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { getReportCopy } from "@/lib/i18n/report";

interface OutbreakTrendCardProps {
  outbreakSignals?: Record<string, unknown> | null;
}

export function OutbreakTrendCard({ outbreakSignals }: OutbreakTrendCardProps) {
  const { locale } = useLocale();
  const copy = getReportCopy(locale);
  if (!outbreakSignals) {
    return (
      <div className="p-3.5 rounded-2xl border border-[#E5E0D8] bg-[#FAF8F3] text-xs text-stone-600 flex flex-col justify-between">
        <div className="flex items-center gap-1.5 text-stone-700 font-semibold mb-2">
          <ShieldAlert className="h-3.5 w-3.5 text-stone-400" />
          <span>{copy.outbreakTitle}</span>
        </div>
        <p className="text-[11px] text-stone-500">{copy.noCluster}</p>
      </div>
    );
  }

  const clusterDetected = Boolean(outbreakSignals.is_outbreak_spike);
  const nearbyCases = Number(outbreakSignals.latest_cases || 0);
  const historicalMean = Number(outbreakSignals.historical_mean || 0);

  return (
    <div className="p-3.5 rounded-2xl border border-[#E5E0D8] bg-white text-xs space-y-2.5 text-[#191F1C] shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-2">
        <span className="font-semibold text-[#191F1C] flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
          <span>{copy.outbreakTitle}</span>
        </span>
        <Badge
          variant="outline"
          className={`text-[9px] ${
            clusterDetected
              ? "border-red-200 text-red-800 bg-red-50 font-bold"
              : "border-emerald-200 text-emerald-800 bg-emerald-50"
          }`}
        >
            {clusterDetected ? copy.outbreakSpike : "Stable"}
        </Badge>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between items-center">
          <span className="text-stone-500 flex items-center gap-1">
            <Users className="h-3 w-3 text-stone-400" /> {copy.latestCases}:
          </span>
          <span className={nearbyCases > 2 ? "text-amber-800 font-bold" : "text-stone-700"}>
            {nearbyCases}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-stone-500 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-stone-400" /> {copy.historicalMean}:
          </span>
          <span className="font-mono text-[#191F1C] font-semibold">{historicalMean.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
