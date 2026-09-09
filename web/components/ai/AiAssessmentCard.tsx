"use client";

import React, { useState } from "react";
import { runCaseAnalysisAction } from "@/lib/actions/analysis";
import { VisionPredictionCard } from "./VisionPredictionCard";
import { IoTAnalysisCard } from "./IoTAnalysisCard";
import { WeatherRiskCard } from "./WeatherRiskCard";
import { OutbreakTrendCard } from "./OutbreakTrendCard";
import { RiskGauge } from "./RiskGauge";
import { RiskBadge } from "./RiskBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  RefreshCw,
  AlertTriangle,
  FileText,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { getReportCopy } from "@/lib/i18n/report";

interface AiAssessmentCardProps {
  caseId: string;
  analysisResult?: Record<string, unknown> | null;
  visionResult?: Record<string, unknown> | null;
  hasPhoto?: boolean;
}

export function AiAssessmentCard({
  caseId,
  analysisResult: initialAnalysis,
  visionResult: initialVision,
  hasPhoto = false,
}: AiAssessmentCardProps) {
  const { locale } = useLocale();
  const copy = getReportCopy(locale);
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(
    initialAnalysis || null
  );
  const [visionResult, setVisionResult] = useState<Record<string, unknown> | null>(
    initialVision || null
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setError("");
    try {
      const res = await runCaseAnalysisAction(caseId);
      if (res.success) {
        setAnalysisResult((res.analysisResult as Record<string, unknown>) || null);
        setVisionResult((res.visionResult as Record<string, unknown>) || null);
      } else {
        setError(res.error || "AI analysis failed.");
      }
    } catch {
      setError("Unable to contact the analysis server.");
    } finally {
      setAnalyzing(false);
    }
  };

  const riskScore = Number(analysisResult?.overall_risk_score || 0);
  const riskLevel = (analysisResult?.overall_risk_level as string) || "UNKNOWN";
  const diseasePrediction = analysisResult?.disease_prediction as Record<string, unknown> | null;
  const clinicalSummary = diseasePrediction
    ? `${String(diseasePrediction.suspected_condition || "Unknown condition")} (${Math.round(Number(diseasePrediction.confidence || 0) * 100)}%)`
    : "";
  const differentials = (analysisResult?.differential_diagnoses as Array<{
    disease_name: string;
    probability: number;
    hallmark_symptoms_matched: string[];
    quarantine_protocol_summary: string;
  }>) || [];

  const iotSignals = analysisResult?.iot_telemetry_analysis as Record<string, unknown> | null;
  const weatherSignals = analysisResult?.weather_analysis as Record<string, unknown> | null;
  const outbreakSignals = analysisResult?.outbreak_surge_analysis as Record<string, unknown> | null;
  const farmerAdvisory = analysisResult?.farmer_advisory as { advisory?: string } | null;

  return (
    <Card className="border-blue-200 bg-blue-50/40 rounded-3xl shadow-xs overflow-hidden text-[#191F1C]">
      {/* Header with Clinical Decision Support Tag */}
      <CardHeader className="border-b border-blue-200/80 pb-3 bg-blue-50/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-800 border border-blue-200">
              <Sparkles className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-blue-950 tracking-tight">
                  {copy.decisionTitle}
                </CardTitle>
              </div>
              <p className="text-xs text-blue-900/80">
                {copy.decisionDescription}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {analysisResult && <RiskBadge level={riskLevel} />}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={analyzing}
              onClick={handleRunAnalysis}
              className="h-8 gap-1.5 text-xs border-blue-300 bg-white text-blue-900 hover:bg-blue-50 min-h-[32px] rounded-xl cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 text-blue-700 ${analyzing ? "animate-spin" : ""}`} />
              <span>{analysisResult ? copy.retry : copy.startAnalysis}</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        {error && (
          <div className="p-3.5 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!analysisResult && !analyzing && (
          <div className="p-6 rounded-2xl border border-blue-200 bg-white text-center space-y-3 shadow-2xs">
            <Activity className="h-8 w-8 text-blue-400 mx-auto" />
            <div>
              <p className="text-xs font-bold text-blue-950">Multimodal analysis is pending for this case.</p>
              <p className="text-[11px] text-stone-500 max-w-sm mx-auto mt-0.5">
                Select &quot;Start analysis&quot; to combine symptoms, weather, sensor, and outbreak data.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleRunAnalysis}
              className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl"
            >
              {copy.startAnalysis}
            </Button>
          </div>
        )}

        {analyzing && (
          <div className="p-8 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-blue-200">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-700" />
            <span className="text-xs text-blue-950 font-medium">
              Clinical analysis of symptoms, images, and outbreak data is in progress...
            </span>
          </div>
        )}

        {analysisResult && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* 1. Primary Risk Gauge & Clinical Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs">
              <div className="flex flex-col items-center justify-center p-2 border-b md:border-b-0 md:border-r border-blue-100">
                <RiskGauge score={riskScore} level={riskLevel} />
              </div>

              <div className="md:col-span-2 space-y-2 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950 uppercase tracking-wider">
                  <FileText className="h-3.5 w-3.5 text-blue-700" />
                  <span>{copy.clinicalSummary}</span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed bg-[#FAF8F3] p-3 rounded-xl border border-[#E5E0D8]">
                  {clinicalSummary || copy.noSummary}
                </p>
              </div>
            </div>

            {/* 2. Differential Diagnoses Matrix */}
            {differentials.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#191F1C] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-amber-600" />
                    <span>Differential diagnoses</span>
                  </span>
                  <span className="text-[11px] text-stone-500 font-mono">{differentials.length} possible conditions</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {differentials.map((diff, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-[#E5E0D8] bg-white space-y-2 shadow-2xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#191F1C]">{diff.disease_name}</span>
                        <Badge
                          className={`text-[10px] font-mono font-bold ${
                            diff.probability >= 0.7
                              ? "bg-red-50 text-red-700 border-red-200"
                              : diff.probability >= 0.4
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-stone-100 text-stone-700 border-stone-200"
                          }`}
                        >
                          {Math.round(diff.probability * 100)}% likelihood
                        </Badge>
                      </div>

                      {diff.hallmark_symptoms_matched && diff.hallmark_symptoms_matched.length > 0 && (
                        <div className="text-[11px] text-stone-600">
                          <span className="text-stone-500">Matching symptoms: </span>
                          <span className="text-stone-800 font-medium">{diff.hallmark_symptoms_matched.join(", ")}</span>
                        </div>
                      )}

                      {diff.quarantine_protocol_summary && (
                        <p className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200">
                          <strong>Isolation:</strong> {diff.quarantine_protocol_summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Vision Analysis Card */}
            {hasPhoto && (
              <VisionPredictionCard
                caseId={caseId}
                visionResult={visionResult}
                onVisionUpdated={(newVision) => setVisionResult(newVision)}
              />
            )}

            {/* 4. Multi-Modal Auxiliary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <IoTAnalysisCard telemetrySignals={iotSignals} />
              <WeatherRiskCard weatherSignals={weatherSignals} />
              <OutbreakTrendCard outbreakSignals={outbreakSignals} />
            </div>

            {/* 5. Farmer Advisory Guidelines */}
            {farmerAdvisory && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm leading-relaxed text-emerald-950">
                          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider">{copy.advisoryTitle}</h3>
                          <p className="whitespace-pre-wrap">{farmerAdvisory.advisory || copy.noAdvisory}</p>
                        </div>
                      )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
