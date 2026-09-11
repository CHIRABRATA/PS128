import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getVetCaseDetailAction, markCaseReviewedAction } from "@/lib/actions/vet";
import { CasePhotoViewer } from "@/components/media/CasePhotoViewer";
import { AiAssessmentCard } from "@/components/ai/AiAssessmentCard";
import { VetFeedbackForm } from "@/components/vet/VetFeedbackForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Stethoscope,
  ArrowLeft,
  MapPin,
  History,
  Syringe,
  Pill,
  UserCheck,
} from "lucide-react";
import { VetAction } from "@prisma/client";
import { formatDateTime, formatDate } from "@/lib/utils";

export default async function VetCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;

  // 1. Mark reviewedAt/reviewedByUserId atomically on load if not already set
  try {
    await markCaseReviewedAction(caseId);
  } catch {
    // Notice: case review timestamp initialization
  }

  // 2. Fetch full clinical dossier
  let healthCase;
  try {
    healthCase = await getVetCaseDetailAction(caseId);
  } catch {
    notFound();
  }

  const farm = healthCase.animal.herd.farm;
  const village = farm.village;
  const block = village.block;
  const district = block.district;

  const analysisResult = (healthCase.analysisResult as Record<string, unknown> | null) || null;
  const visionResult = (healthCase.visionResult as Record<string, unknown> | null) || null;

  // AI suggested action for feedback form pre-selection
  let aiSuggestedAction: VetAction | null = null;
  if (analysisResult) {
    const riskLevel = (analysisResult.overall_risk_level as string) || "LOW";
    if (riskLevel === "CRITICAL") aiSuggestedAction = "ISOLATE";
    else if (riskLevel === "HIGH" || riskLevel === "ELEVATED") aiSuggestedAction = "TREAT";
    else aiSuggestedAction = "MONITOR";
  }

  return (
    <div className="space-y-6 text-[#191F1C]">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/vet">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs border-[#D9D3C7] bg-white text-stone-800 hover:bg-stone-50 gap-1.5 min-h-[36px] rounded-xl">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Queue</span>
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#191F1C]">
                Case #{healthCase.caseNumber}
              </h1>
              <Badge className="text-[10px] border-emerald-200 text-emerald-800 bg-emerald-50">
                {healthCase.status}
              </Badge>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Animal Tag: <strong className="text-stone-900 font-mono">{healthCase.animal.tag}</strong> ({healthCase.animal.species}) • Farm: <strong className="text-stone-900">{farm.name}</strong> ({village.name}, {district.name})
            </p>
          </div>
        </div>

        <div className="text-right text-xs text-stone-500 space-y-0.5">
          <div>Reported: <span className="text-stone-800 font-medium">{formatDateTime(healthCase.reportedAt)}</span></div>
          {healthCase.reviewedAt && (
            <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-medium justify-end">
              <UserCheck className="h-3.5 w-3.5 text-emerald-700" />
              <span>Reviewed: {formatDateTime(healthCase.reviewedAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Case Dossier & Clinical Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dossier Information (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1: Animal & Farm Dossier */}
          <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
            <CardHeader className="border-b border-[#E5E0D8] pb-3">
              <CardTitle className="text-sm font-bold text-[#191F1C] uppercase tracking-wider flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-emerald-700" />
                <span>1. Primary Animal & Field Intake Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-[#FAF8F3] p-3.5 rounded-2xl border border-[#E5E0D8]">
                <div>
                  <span className="text-[10px] text-stone-500 font-medium block">Species</span>
                  <span className="font-bold text-[#191F1C]">{healthCase.animal.species}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 font-medium block">Tag ID</span>
                  <span className="font-bold text-emerald-800 font-mono">{healthCase.animal.tag}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 font-medium block">IoT Sensor ID</span>
                  <span className="font-mono text-stone-700">{healthCase.animal.iotDeviceId || "None"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 font-medium block">Reported By</span>
                  <span className="text-stone-800 font-medium">{healthCase.createdByUser.name} ({healthCase.reportSource})</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 font-medium block">Symptom Duration</span>
                  <span className="text-stone-800 font-medium">{healthCase.durationDays} days</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 font-medium block">Herd Impact</span>
                  <span className="text-stone-800 font-medium">{healthCase.affectedCount} affected / {healthCase.mortalityCount} dead</span>
                </div>
              </div>

              {/* Reported Symptoms */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-stone-700">Reported Symptoms:</span>
                <div className="flex flex-wrap gap-1.5">
                  {healthCase.symptoms.map((sym, idx) => (
                    <Badge key={idx} className="bg-amber-50 text-amber-900 border-amber-200 text-xs px-2.5 py-0.5">
                      {sym}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* GPS Location */}
              <div className="flex items-center gap-2 text-xs text-stone-600 bg-[#FAF8F3] p-2.5 rounded-xl border border-[#E5E0D8]">
                <MapPin className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>
                  Location: {healthCase.gpsLat && healthCase.gpsLng ? `${healthCase.gpsLat.toFixed(4)}, ${healthCase.gpsLng.toFixed(4)}` : `${village.name}, ${block.name}, ${district.name}`}
                </span>
              </div>

              {/* Private Case Photo Viewer */}
              {healthCase.photoUrl && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-stone-700">Lesion / Clinical Photo:</span>
                  <CasePhotoViewer caseId={healthCase.id} photoUrl={healthCase.photoUrl} alt={`Case ${healthCase.caseNumber} photo`} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECTION 2: AI Decision Support Output */}
          <AiAssessmentCard
            caseId={healthCase.id}
            analysisResult={analysisResult}
            visionResult={visionResult}
            hasPhoto={Boolean(healthCase.photoUrl)}
          />

          {/* SECTION 3: Animal Medical History (Vaccinations & Past Treatments) */}
          <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
            <CardHeader className="border-b border-[#E5E0D8] pb-3">
              <CardTitle className="text-sm font-bold text-[#191F1C] uppercase tracking-wider flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-700" />
                <span>3. Longitudinal Health History & Past Records</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              {/* Previous Cases / Health Sessions */}
              <div className="space-y-2">
                <h5 className="font-semibold text-stone-800 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Previous Health Sessions</span>
                </h5>
                {healthCase.animal.cases.length === 0 ? (
                  <p className="text-stone-500 italic pl-5">No previous health sessions recorded for this animal.</p>
                ) : (
                  <div className="space-y-1.5 pl-5">
                    {healthCase.animal.cases.map((pc) => (
                      <div key={pc.id} className="p-2.5 bg-[#FAF8F3] rounded-xl border border-[#E5E0D8] space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-stone-900">#{pc.caseNumber}</span>
                          <span className="text-stone-500 text-[10px]">{formatDate(pc.reportedAt)}</span>
                        </div>
                        <p className="text-stone-600 text-[11px]">
                          Symptoms: {pc.symptoms.join(", ")}
                          {pc.vetDiagnosis ? ` • Diagnosis: ${pc.vetDiagnosis}` : ` • Status: ${pc.status}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Previous Veterinary Reports */}
              <div className="space-y-2 pt-2 border-t border-[#E5E0D8]">
                <h5 className="font-semibold text-stone-800 flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Past Clinical Reports</span>
                </h5>
                {healthCase.animal.veterinaryReports.length === 0 ? (
                  <p className="text-stone-500 italic pl-5">No prior veterinary clinical reports available.</p>
                ) : (
                  <div className="space-y-1.5 pl-5">
                    {healthCase.animal.veterinaryReports.map((vr) => (
                      <div key={vr.id} className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-emerald-950">{vr.diagnosis}</span>
                          <span className="text-emerald-800 text-[10px]">{formatDate(vr.createdAt)}</span>
                        </div>
                        <p className="text-emerald-900 text-[11px]">
                          Veterinarian: Dr. {vr.vetUser.name} • Action: {vr.action}
                          {vr.notes ? ` • ${vr.notes}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vaccinations */}
              <div className="space-y-2 pt-2 border-t border-[#E5E0D8]">
                <h5 className="font-semibold text-stone-800 flex items-center gap-1.5">
                  <Syringe className="h-3.5 w-3.5 text-amber-700" />
                  <span>Vaccination Records</span>
                </h5>
                {healthCase.animal.vaccinations.length === 0 ? (
                  <p className="text-stone-500 italic pl-5">No vaccination records found for this animal.</p>
                ) : (
                  <div className="space-y-1 pl-5">
                    {healthCase.animal.vaccinations.map((vac) => (
                      <div key={vac.id} className="flex justify-between text-stone-600 bg-[#FAF8F3] p-2 rounded-xl border border-[#E5E0D8]">
                        <span className="text-stone-900 font-medium">{vac.vaccineName}</span>
                        <span>{formatDate(vac.dateGiven)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Treatments */}
              <div className="space-y-2 pt-2 border-t border-[#E5E0D8]">
                <h5 className="font-semibold text-stone-800 flex items-center gap-1.5">
                  <Pill className="h-3.5 w-3.5 text-purple-700" />
                  <span>Past Treatments</span>
                </h5>
                {healthCase.animal.treatments.length === 0 ? (
                  <p className="text-stone-500 italic pl-5">No previous treatment records found.</p>
                ) : (
                  <div className="space-y-1 pl-5">
                    {healthCase.animal.treatments.map((t) => (
                      <div key={t.id} className="flex justify-between text-stone-600 bg-[#FAF8F3] p-2 rounded-xl border border-[#E5E0D8]">
                        <span className="text-stone-900 font-medium">{t.medication}</span>
                        <span>{formatDate(t.dateGiven)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Structured Feedback & Actions (1 col) */}
        <div className="space-y-6">
          <VetFeedbackForm
            caseId={healthCase.id}
            currentStatus={healthCase.status}
            initialDiagnosis={healthCase.vetDiagnosis}
            initialAction={healthCase.vetRecommendedAction}
            initialFollowUpDate={healthCase.vetFollowUpDate ? healthCase.vetFollowUpDate.toISOString() : null}
            initialNotes={healthCase.vetNotes}
            updatedAtIso={healthCase.updatedAt.toISOString()}
            suggestedAction={aiSuggestedAction}
          />
        </div>
      </div>
    </div>
  );
}
