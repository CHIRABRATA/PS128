"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Cpu, Thermometer, Activity, AlertCircle } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { getReportCopy } from "@/lib/i18n/report";

interface IoTAnalysisCardProps {
  telemetrySignals?: Record<string, unknown> | null;
}

export function IoTAnalysisCard({ telemetrySignals }: IoTAnalysisCardProps) {
  const { locale } = useLocale();
  const copy = getReportCopy(locale);
  if (!telemetrySignals) {
    return (
      <div className="p-3.5 rounded-2xl border border-[#E5E0D8] bg-[#FAF8F3] text-xs text-stone-600 flex flex-col justify-between">
        <div className="flex items-center gap-1.5 text-stone-700 font-semibold mb-2">
          <Cpu className="h-3.5 w-3.5 text-stone-400" />
          <span>{copy.sensorTitle}</span>
        </div>
        <p className="text-[11px] text-stone-500">{copy.noSensor}</p>
      </div>
    );
  }

  const temperature = Number(telemetrySignals.temperature ?? 0);
  const activityIndex = Number(telemetrySignals.activity_index ?? 0);
  const anomalies = (telemetrySignals.anomalies as string[] | undefined) || [];
  const tempAnomalous = temperature > 39.5 || anomalies.some((item) => item.toLowerCase().includes("hyperthermia"));
  const activityDrop = activityIndex > 0 && activityIndex < 30;
  const feverDetected = tempAnomalous;
  const heartRateElevated = Boolean(telemetrySignals.heart_rate_elevated);

  return (
    <div className="p-3.5 rounded-2xl border border-[#E5E0D8] bg-white text-xs space-y-2.5 text-[#191F1C] shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-2">
        <span className="font-semibold text-[#191F1C] flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-emerald-700" />
          <span>{copy.sensorTitle}</span>
        </span>
        <Badge
          variant="outline"
          className={`text-[9px] ${
            feverDetected || activityDrop
              ? "border-red-200 text-red-800 bg-red-50"
              : "border-emerald-200 text-emerald-800 bg-emerald-50"
          }`}
        >
          {feverDetected ? copy.anomalies : "Normal"}
        </Badge>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between items-center">
          <span className="text-stone-500 flex items-center gap-1">
            <Thermometer className="h-3 w-3 text-rose-600" /> {copy.temperature}:
          </span>
          <span className={tempAnomalous ? "text-red-700 font-bold" : "text-stone-700"}>
            {temperature ? `${temperature.toFixed(1)} °C` : "-"}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-stone-500 flex items-center gap-1">
            <Activity className="h-3 w-3 text-amber-600" /> {copy.activity}:
          </span>
          <span className={activityDrop ? "text-amber-800 font-bold" : "text-stone-700"}>
            {activityIndex || "-"}
          </span>
        </div>

        {heartRateElevated && (
          <div className="flex justify-between items-center text-red-700">
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Heart rate:
            </span>
            <span className="font-bold">Elevated BPM</span>
          </div>
        )}
      </div>
    </div>
  );
}
