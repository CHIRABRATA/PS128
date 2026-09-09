"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { CloudRain, Droplets, Bug } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { getReportCopy } from "@/lib/i18n/report";

interface WeatherRiskCardProps {
  weatherSignals?: Record<string, unknown> | null;
}

export function WeatherRiskCard({ weatherSignals }: WeatherRiskCardProps) {
  const { locale } = useLocale();
  const copy = getReportCopy(locale);
  if (!weatherSignals) {
    return (
      <div className="p-3.5 rounded-2xl border border-[#E5E0D8] bg-[#FAF8F3] text-xs text-stone-600 flex flex-col justify-between">
        <div className="flex items-center gap-1.5 text-stone-700 font-semibold mb-2">
          <CloudRain className="h-3.5 w-3.5 text-stone-400" />
          <span>{copy.weatherTitle}</span>
        </div>
        <p className="text-[11px] text-stone-500">{copy.noWeather}</p>
      </div>
    );
  }

  const vectorRisk = String(weatherSignals.vector_breeding_risk || "UNKNOWN");
  const temperature = typeof weatherSignals.temperature === "number" ? weatherSignals.temperature : null;
  const humidity = typeof weatherSignals.humidity === "number" ? weatherSignals.humidity : null;
  const precipitation = typeof weatherSignals.precipitation === "number" ? weatherSignals.precipitation : null;

  return (
    <div className="p-3.5 rounded-2xl border border-[#E5E0D8] bg-white text-xs space-y-2.5 text-[#191F1C] shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-2">
        <span className="font-semibold text-[#191F1C] flex items-center gap-1.5">
          <CloudRain className="h-3.5 w-3.5 text-amber-600" />
          <span>{copy.weatherTitle}</span>
        </span>
        <Badge
          variant="outline"
          className={`text-[9px] ${
            vectorRisk === "HIGH"
              ? "border-amber-300 text-amber-900 bg-amber-50"
              : "border-[#D9D3C7] text-stone-700 bg-[#FAF8F3]"
          }`}
        >
          {vectorRisk}
        </Badge>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between items-center">
          <span className="text-stone-500 flex items-center gap-1">
            <Droplets className="h-3 w-3 text-sky-600" /> {copy.temperature}:
          </span>
          <span className="text-stone-700 font-medium">{temperature ?? "-"} °C</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-stone-500 flex items-center gap-1">
            <Bug className="h-3 w-3 text-amber-600" /> {copy.humidity}:
          </span>
          <span className="font-mono text-[#191F1C] font-semibold">{humidity ?? "-"}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-stone-500">{copy.precipitation}</span>
          <span className="font-mono text-[#191F1C] font-semibold">{precipitation ?? "-"} mm</span>
        </div>
      </div>
    </div>
  );
}
