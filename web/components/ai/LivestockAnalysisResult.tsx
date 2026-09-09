"use client";

import { AlertTriangle, HeartPulse, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedAnalysisResponse } from "@/lib/types/livestock";

interface LivestockAnalysisResultProps {
  result: UnifiedAnalysisResponse;
}

const riskStyles = {
  LOW: "bg-emerald-100 text-emerald-900 border-emerald-200",
  ELEVATED: "bg-amber-100 text-amber-900 border-amber-200",
  CRITICAL: "bg-red-100 text-red-900 border-red-200",
} as const;

export function LivestockAnalysisResult({ result }: LivestockAnalysisResultProps) {
  const riskLevel = result.overall_risk_level;
  const modelWarning =
    result.disease_prediction.confidence <= 0 ||
    result.disease_prediction.suspected_condition === "Model Pipeline Not Loaded";
  const anomalies = result.iot_telemetry_analysis?.anomalies ?? [];

  return (
    <div className="space-y-4" aria-live="polite">
      <Card className="border-[#E5E0D8] bg-white shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-[#191F1C]">
            <HeartPulse className="h-5 w-5 text-emerald-700" />
            Health Analysis
          </CardTitle>
          <Badge className={riskStyles[riskLevel]}>
            {riskLevel} · {Math.round(result.overall_risk_score)}/100
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-3 overflow-hidden rounded-full bg-stone-100" aria-label={`Risk score ${result.overall_risk_score} out of 100`}>
            <div
              className={`h-full rounded-full ${riskLevel === "LOW" ? "bg-emerald-600" : riskLevel === "ELEVATED" ? "bg-amber-500" : "bg-red-600"}`}
              style={{ width: `${Math.min(100, Math.max(0, result.overall_risk_score))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-stone-600">
            <span>Suspected condition</span>
            <strong className="text-stone-900">{result.disease_prediction.suspected_condition}</strong>
          </div>
        </CardContent>
      </Card>

      {modelWarning && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <span>Disease model results are currently unavailable. This is not a confirmed diagnosis.</span>
        </div>
      )}

      {anomalies.length > 0 && (
        <Card className="border-[#E5E0D8] bg-white shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-[#191F1C]">
              <ShieldAlert className="h-4 w-4 text-amber-700" />
              Sensor alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {anomalies.map((anomaly) => (
              <Badge key={anomaly} variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">
                {anomaly}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-emerald-200 bg-emerald-50/60 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-emerald-950">Farmer advisory</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm leading-relaxed text-emerald-950">
          {result.farmer_advisory.advisory}
        </CardContent>
      </Card>
    </div>
  );
}
