"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Cpu, Thermometer, Activity, AlertCircle } from "lucide-react";

interface IoTAnalysisCardProps {
  telemetrySignals?: Record<string, unknown> | null;
}

export function IoTAnalysisCard({ telemetrySignals }: IoTAnalysisCardProps) {
  if (!telemetrySignals) {
    return (
      <div className="p-3.5 rounded-2xl border border-[#E5E0D8] bg-[#FAF8F3] text-xs text-stone-600 flex flex-col justify-between">
        <div className="flex items-center gap-1.5 text-stone-700 font-semibold mb-2">
          <Cpu className="h-3.5 w-3.5 text-stone-400" />
          <span>IoT सेन्सर सिग्नल्स</span>
        </div>
        <p className="text-[11px] text-stone-500">कोणताही सेन्सर जोडलेला नाही.</p>
      </div>
    );
  }

  const tempAnomalous = Boolean(telemetrySignals.temperature_anomalous);
  const activityDrop = Boolean(telemetrySignals.activity_drop_detected);
  const feverDetected = Boolean(telemetrySignals.fever_detected);
  const heartRateElevated = Boolean(telemetrySignals.heart_rate_elevated);

  return (
    <div className="p-3.5 rounded-2xl border border-[#E5E0D8] bg-white text-xs space-y-2.5 text-[#191F1C] shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-2">
        <span className="font-semibold text-[#191F1C] flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-emerald-700" />
          <span>IoT शारीरिक सेन्सर विश्लेषण</span>
        </span>
        <Badge
          variant="outline"
          className={`text-[9px] ${
            feverDetected || activityDrop
              ? "border-red-200 text-red-800 bg-red-50"
              : "border-emerald-200 text-emerald-800 bg-emerald-50"
          }`}
        >
          {feverDetected ? "तापमान अनियंत्रित" : "सामान्य शारीरिक स्थिती"}
        </Badge>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between items-center">
          <span className="text-stone-500 flex items-center gap-1">
            <Thermometer className="h-3 w-3 text-rose-600" /> ताप व तापमान:
          </span>
          <span className={tempAnomalous ? "text-red-700 font-bold" : "text-stone-700"}>
            {feverDetected ? "तीव्र ताप (Fever Detected)" : "सामान्य (Normal)"}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-stone-500 flex items-center gap-1">
            <Activity className="h-3 w-3 text-amber-600" /> हालचाल निर्देशांक:
          </span>
          <span className={activityDrop ? "text-amber-800 font-bold" : "text-stone-700"}>
            {activityDrop ? "हालचालीत लक्षणीय घट (Lethargy)" : "सक्रिय (Active)"}
          </span>
        </div>

        {heartRateElevated && (
          <div className="flex justify-between items-center text-red-700">
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> हृदय गती:
            </span>
            <span className="font-bold">वाढलेली (Elevated BPM)</span>
          </div>
        )}
      </div>
    </div>
  );
}
