"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { CloudRain, Droplets, Bug } from "lucide-react";

interface WeatherRiskCardProps {
  weatherSignals?: Record<string, unknown> | null;
}

export function WeatherRiskCard({ weatherSignals }: WeatherRiskCardProps) {
  if (!weatherSignals) {
    return (
      <div className="p-3.5 rounded-2xl border border-[#E5E0D8] bg-[#FAF8F3] text-xs text-stone-600 flex flex-col justify-between">
        <div className="flex items-center gap-1.5 text-stone-700 font-semibold mb-2">
          <CloudRain className="h-3.5 w-3.5 text-stone-400" />
          <span>हवामान व कीटक धोका</span>
        </div>
        <p className="text-[11px] text-stone-500">हवामान अंदाज उपलब्ध नाही.</p>
      </div>
    );
  }

  const vectorMultiplier = Number(weatherSignals.vector_risk_multiplier || 1.0);
  const conditions = (weatherSignals.conditions_summary as string) || "हवामान सामान्य";

  return (
    <div className="p-3.5 rounded-2xl border border-[#E5E0D8] bg-white text-xs space-y-2.5 text-[#191F1C] shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-2">
        <span className="font-semibold text-[#191F1C] flex items-center gap-1.5">
          <CloudRain className="h-3.5 w-3.5 text-amber-600" />
          <span>हवामान व कीटक प्रसार धोका</span>
        </span>
        <Badge
          variant="outline"
          className={`text-[9px] ${
            vectorMultiplier > 1.2
              ? "border-amber-300 text-amber-900 bg-amber-50"
              : "border-[#D9D3C7] text-stone-700 bg-[#FAF8F3]"
          }`}
        >
          {vectorMultiplier > 1.2 ? "डास / गोचीड धोका" : "हवामान अनुकूल"}
        </Badge>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between items-center">
          <span className="text-stone-500 flex items-center gap-1">
            <Droplets className="h-3 w-3 text-sky-600" /> स्थानिक स्थिती:
          </span>
          <span className="text-stone-700 font-medium">{conditions}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-stone-500 flex items-center gap-1">
            <Bug className="h-3 w-3 text-amber-600" /> कीटक प्रसार गुणांक:
          </span>
          <span className="font-mono text-[#191F1C] font-semibold">{vectorMultiplier.toFixed(2)}x</span>
        </div>
      </div>
    </div>
  );
}
