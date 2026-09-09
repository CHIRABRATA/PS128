"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, TrendingUp, Users } from "lucide-react";

interface OutbreakTrendCardProps {
  outbreakSignals?: Record<string, unknown> | null;
}

export function OutbreakTrendCard({ outbreakSignals }: OutbreakTrendCardProps) {
  if (!outbreakSignals) {
    return (
      <div className="p-3.5 rounded-2xl border border-[#E5E0D8] bg-[#FAF8F3] text-xs text-stone-600 flex flex-col justify-between">
        <div className="flex items-center gap-1.5 text-stone-700 font-semibold mb-2">
          <ShieldAlert className="h-3.5 w-3.5 text-stone-400" />
          <span>प्रादुर्भाव क्लस्टर विश्लेषण</span>
        </div>
        <p className="text-[11px] text-stone-500">स्थानिक क्लस्टर डेटा उपलब्ध नाही.</p>
      </div>
    );
  }

  const clusterDetected = Boolean(outbreakSignals.cluster_detected);
  const nearbyCases = Number(outbreakSignals.nearby_cases_7d || 0);
  const outbreakRiskMultiplier = Number(outbreakSignals.outbreak_risk_multiplier || 1.0);

  return (
    <div className="p-3.5 rounded-2xl border border-[#E5E0D8] bg-white text-xs space-y-2.5 text-[#191F1C] shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-2">
        <span className="font-semibold text-[#191F1C] flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
          <span>गाव रोग प्रादुर्भाव क्लस्टर</span>
        </span>
        <Badge
          variant="outline"
          className={`text-[9px] ${
            clusterDetected
              ? "border-red-200 text-red-800 bg-red-50 font-bold"
              : "border-emerald-200 text-emerald-800 bg-emerald-50"
          }`}
        >
          {clusterDetected ? "क्लस्टर सक्रिय" : "सध्या क्लस्टर नाही"}
        </Badge>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between items-center">
          <span className="text-stone-500 flex items-center gap-1">
            <Users className="h-3 w-3 text-stone-400" /> ७ दिवसांत नजीकची प्रकरणे:
          </span>
          <span className={nearbyCases > 2 ? "text-amber-800 font-bold" : "text-stone-700"}>
            {nearbyCases} प्रकरणे
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-stone-500 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-stone-400" /> प्रादुर्भाव गुणांक (Multiplier):
          </span>
          <span className="font-mono text-[#191F1C] font-semibold">{outbreakRiskMultiplier.toFixed(2)}x</span>
        </div>
      </div>
    </div>
  );
}
