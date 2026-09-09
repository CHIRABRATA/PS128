"use client";

import React, { useState } from "react";
import { runCaseAnalysisAction } from "@/lib/actions/analysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, AlertTriangle, Eye } from "lucide-react";

interface VisionPredictionCardProps {
  caseId: string;
  visionResult?: Record<string, unknown> | null;
  onVisionUpdated?: (newVision: Record<string, unknown>) => void;
}

export function VisionPredictionCard({
  caseId,
  visionResult: initialVision,
  onVisionUpdated,
}: VisionPredictionCardProps) {
  const [vision, setVision] = useState<Record<string, unknown> | null>(initialVision || null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const handleRunVision = async () => {
    setRunning(true);
    setError("");
    try {
      const res = await runCaseAnalysisAction(caseId);
      if (res.success && res.visionResult) {
        const casted = res.visionResult as Record<string, unknown>;
        setVision(casted);
        onVisionUpdated?.(casted);
      } else {
        setError(res.error || "छायाचित्र तपासणी करण्यात त्रुटी आली.");
      }
    } catch {
      setError("प्रतिमा विश्लेषणासाठी सर्व्हरशी संपर्क होऊ शकला नाही.");
    } finally {
      setRunning(false);
    }
  };

  const detectedDiseases = (vision?.detected_diseases as Array<{
    disease_name: string;
    confidence: number;
    visual_features_observed: string[];
  }>) || [];

  const lesionSeverity = (vision?.lesion_severity as string) || "UNKNOWN";
  const confidenceScore = Number(vision?.confidence_score || 0);
  const diagnosticConfidence = (vision?.diagnostic_confidence as string) || "MODERATE";

  return (
    <div className="p-4 rounded-2xl border border-[#E5E0D8] bg-white space-y-4 text-[#191F1C] shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E0D8] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
            <Camera className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#191F1C] uppercase tracking-wider">
              छायाचित्र व्रण विश्लेषण (Computer Vision Lesion Scan)
            </span>
            <p className="text-[11px] text-stone-500">
              त्वचेवरील गाठी, व्रण किंवा डोळे-तोंड लक्षणांची प्रतिमा तपासणी.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={running}
          onClick={handleRunVision}
          className="h-7 text-xs border-[#D9D3C7] bg-[#FAF8F3] text-stone-700 hover:bg-white min-h-[32px] cursor-pointer self-end sm:self-auto"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${running ? "animate-spin" : ""}`} />
          <span>{vision ? "पुन्हा स्कॅन करा" : "प्रतिमा स्कॅन करा"}</span>
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!vision && !running && (
        <div className="text-center py-4 text-xs text-stone-500 space-y-2">
          <Eye className="h-6 w-6 text-stone-400 mx-auto" />
          <p>छायाचित्र जोडले आहे. वरील बटणावर क्लिक करून व्रण तपासणी सुरू करा.</p>
        </div>
      )}

      {running && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-emerald-800 animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin text-emerald-700" />
          <span>त्वचा व्रण व लक्षणांचे संगणकीय विश्लेषण सुरू आहे...</span>
        </div>
      )}

      {vision && (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-3 gap-2 bg-[#FAF8F3] p-2.5 rounded-xl border border-[#E5E0D8] text-center">
            <div>
              <span className="text-[10px] text-stone-500 block">व्रण तीव्रता</span>
              <span className="font-bold text-amber-900 font-mono">{lesionSeverity}</span>
            </div>
            <div>
              <span className="text-[10px] text-stone-500 block">विश्वासार्हता स्कोअर</span>
              <span className="font-bold text-emerald-800 font-mono">
                {Math.round(confidenceScore * 100)}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-500 block">निदान स्तर</span>
              <span className="font-bold text-[#191F1C]">{diagnosticConfidence}</span>
            </div>
          </div>

          {detectedDiseases.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider">
                प्रतिमेमध्ये संशयित रोग लक्षणे:
              </span>
              <div className="space-y-1.5">
                {detectedDiseases.map((d, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-[#FAF8F3] border border-[#E5E0D8] flex justify-between items-start"
                  >
                    <div>
                      <span className="font-bold text-[#191F1C] text-xs">{d.disease_name}</span>
                      {d.visual_features_observed && d.visual_features_observed.length > 0 && (
                        <p className="text-[11px] text-stone-600 mt-0.5">
                          {d.visual_features_observed.join(", ")}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono border-[#D9D3C7] text-stone-700 bg-white">
                      {Math.round(d.confidence * 100)}% Match
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
