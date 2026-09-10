"use client";

import React, { useState } from "react";

import { useUser } from "@clerk/nextjs";
import { PrintableAnimalOption } from "@/lib/actions/reporting_data";
import { FarmerAnimalSelector } from "./FarmerAnimalSelector";
import { AgentAnimalSelector } from "./AgentAnimalSelector";
import { SymptomSelector } from "./SymptomSelector";
import { PhotoCapture } from "./PhotoCapture";
import { LocationCapture } from "./LocationCapture";
import { IoTInput } from "./IoTInput";
import { createCaseReportAction, CaseReportResult } from "@/lib/actions/cases";
import { completeAssistanceWithReportAction } from "@/lib/actions/assistance";
import { runCaseAnalysisAction } from "@/lib/actions/analysis";
import { enqueueReport } from "@/lib/offline/db";
import { checkServerReachability } from "@/lib/offline/sync";
import { AiAssessmentCard } from "@/components/ai/AiAssessmentCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Stethoscope, WifiOff } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { getReportCopy } from "@/lib/i18n/report";

interface HealthReportFormProps {
  mode: "farmer" | "agent";
  initialRequestId?: string;
  initialFarmId?: string;
  initialAnimalId?: string;
  expectedUpdatedAt?: string;
}

export function HealthReportForm({
  mode,
  initialRequestId,
  expectedUpdatedAt,
}: HealthReportFormProps) {
  const { user } = useUser();
  const { locale } = useLocale();
  const copy = getReportCopy(locale);
  const [step, setStep] = useState(1);
  const [animalSelectorKey, setAnimalSelectorKey] = useState(0);

  // Form State
  const [submissionId, setSubmissionId] = useState("pending-submission");
  const [selectedAnimal, setSelectedAnimal] = useState<PrintableAnimalOption | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState<number>(1);
  const [affectedCount, setAffectedCount] = useState<number>(1);
  const [herdSize, setHerdSize] = useState<number>(1);
  const [mortalityCount, setMortalityCount] = useState<number>(0);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);

  // IoT State
  const [temperature, setTemperature] = useState<number | null>(null);
  const [activity, setActivity] = useState<number | null>(null);

  // Submission & AI Analysis Status
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [resetNotice, setResetNotice] = useState("");
  const [submitResult, setSubmitResult] = useState<(CaseReportResult & { offlineQueued?: boolean; submissionId?: string }) | null>(null);
  const [aiState, setAiState] = useState<{
    analysisResult?: Record<string, unknown> | null;
    visionResult?: Record<string, unknown> | null;
  } | null>(null);

  React.useEffect(() => {
    if (submitResult?.caseId && !aiState) {
      runCaseAnalysisAction(submitResult.caseId).then((res) => {
        if (res.success) {
          setAiState({
            analysisResult: res.analysisResult as Record<string, unknown>,
            visionResult: res.visionResult as Record<string, unknown>,
          });
        }
      });
    }
  }, [submitResult?.caseId, aiState]);

  const handleAnimalSelected = (animal: PrintableAnimalOption) => {
    setSelectedAnimal(animal);
    if (animal.herdSize) {
      setHerdSize(animal.herdSize);
    }
    setFormError("");
  };

  const resetReport = () => {
    setSubmissionId("pending-submission");
    setSelectedAnimal(null);
    setSymptoms([]);
    setDurationDays(1);
    setAffectedCount(1);
    setHerdSize(1);
    setMortalityCount(0);
    setHeartRate(null);
    setPhotoUrl(null);
    setPhotoBlob(null);
    setGpsLat(null);
    setGpsLng(null);
    setTemperature(null);
    setActivity(null);
    setSubmitResult(null);
    setAiState(null);
    setFormError("");
    setResetNotice("New report started. Select an animal to continue.");
    setAnimalSelectorKey((current) => current + 1);
    setStep(1);
  };

  const handleNextStep = () => {
    setFormError("");
    setResetNotice("");
    if (step === 1 && !selectedAnimal) {
      setFormError("Select an animal ear tag before continuing.");
      return;
    }
    if (step === 2 && symptoms.length === 0) {
      setFormError("Select at least one observed symptom.");
      return;
    }
    if (step === 3) {
      if (affectedCount > herdSize) {
        setFormError(`Affected animals (${affectedCount}) cannot exceed the herd size (${herdSize}).`);
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 7));
  };

  const handlePrevStep = () => {
    setFormError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmitReport = async () => {
    if (!selectedAnimal) {
      setFormError("Animal selection is required.");
      return;
    }
    if (symptoms.length === 0) {
      setFormError("At least one symptom is required.");
      return;
    }

    const reportSubmissionId = submissionId === "pending-submission"
      ? `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      : submissionId;
    setSubmissionId(reportSubmissionId);

    setSubmitting(true);
    setFormError("");

    const activeClerkUserId = user?.id || "anonymous_user";

    const reportPayload = {
      submissionId: reportSubmissionId,
      animalId: selectedAnimal.id,
      symptoms,
      durationDays,
      affectedCount,
      herdSize,
      mortalityCount,
      temperature: temperature || undefined,
      activity: activity || undefined,
      heartRate: heartRate || undefined,
      photoUrl: photoUrl || undefined,
      gpsLat: gpsLat || undefined,
      gpsLng: gpsLng || undefined,
      iotData:
        temperature || activity
          ? {
              temperature: temperature || null,
              activity: activity || null,
            }
          : undefined,
    };

    try {
      const isOnline = navigator.onLine && (await checkServerReachability());

      if (!isOnline) {
        await enqueueReport({
          id: reportSubmissionId,
          submissionId: reportSubmissionId,
          clerkUserId: activeClerkUserId,
          animalId: selectedAnimal.id,
          symptoms,
          durationDays,
          affectedCount,
          herdSize,
          mortalityCount,
          heartRate: heartRate || null,
          photoBlob: photoBlob || null,
          photoUrl: photoUrl || null,
          gpsLat: gpsLat || null,
          gpsLng: gpsLng || null,
          iotData: {
            temperature: temperature || null,
            activity: activity || null,
          },
          status: "QUEUED",
          retryCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        setSubmitResult({
          success: true,
          offlineQueued: true,
          submissionId: reportSubmissionId,
        });
        setSubmitting(false);
        return;
      }

      if (initialRequestId) {
        const res = await completeAssistanceWithReportAction({
          submissionId: reportSubmissionId,
          requestId: initialRequestId,
          animalId: selectedAnimal.id,
          symptoms,
          durationDays,
          affectedCount,
          herdSize,
          mortalityCount,
          heartRate: heartRate || null,
          gpsLat: gpsLat || null,
          gpsLng: gpsLng || null,
          photoUrl: photoUrl || null,
          iotData: {
            temperature: temperature || null,
            activity: activity || null,
          },
          expectedUpdatedAt,
        });

        if (res.success && res.caseId) {
          setSubmitResult({
            success: true,
            caseId: res.caseId,
            caseNumber: res.caseNumber,
            status: res.status,
          });
        } else {
          setFormError(res.error || "Report submission failed. Please try again.");
        }
      } else {
        const res = await createCaseReportAction(reportPayload);
        if (res.success) {
          setSubmitResult(res);
        } else {
          setFormError(res.error || "Report submission failed. Please try again.");
        }
      }
    } catch (err: unknown) {
      const isNetworkError =
        typeof navigator !== "undefined" && !navigator.onLine;

      if (isNetworkError) {
        try {
          await enqueueReport({
            id: reportSubmissionId,
            submissionId: reportSubmissionId,
            clerkUserId: activeClerkUserId,
            animalId: selectedAnimal.id,
            symptoms,
            durationDays,
            affectedCount,
            herdSize,
            mortalityCount,
            heartRate: heartRate || null,
            photoBlob: photoBlob || null,
            photoUrl: photoUrl || null,
            gpsLat: gpsLat || null,
            gpsLng: gpsLng || null,
            iotData: {
              temperature: temperature || null,
              activity: activity || null,
            },
            status: "QUEUED",
            retryCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          setSubmitResult({
            success: true,
            offlineQueued: true,
            submissionId: reportSubmissionId,
          });
          return;
        } catch {
          // IndexedDB fallback
        }
      }

      setFormError(err instanceof Error ? err.message : "Unable to contact the server.");
    } finally {
      setSubmitting(false);
    }
  };

  // Render Offline Enqueued Screen
  if (submitResult?.offlineQueued) {
    return (
      <Card className="max-w-xl mx-auto w-full border-amber-200 bg-white text-center shadow-sm p-6 space-y-5 rounded-3xl text-[#191F1C]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shadow-xs">
            <WifiOff className="h-8 w-8 text-amber-700" />
          </div>

          <Badge className="text-xs px-3 py-1 bg-amber-100 text-amber-900 border-amber-300 font-semibold">
            Saved on this device (QUEUED_OFFLINE)
          </Badge>

          <CardTitle className="text-xl font-bold text-[#191F1C]">
            Report saved locally
          </CardTitle>

          <CardDescription className="text-xs text-stone-600 max-w-sm">
            Your report for <strong className="text-stone-900">{selectedAnimal?.tag}</strong> is safely stored on this device and will sync automatically when the network is available.
          </CardDescription>
        </div>

        <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#E5E0D8] text-xs text-left space-y-2 text-stone-700">
          <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
            <span className="text-stone-500">Animal tag:</span>
            <span className="font-bold text-stone-900">{selectedAnimal?.tag} ({selectedAnimal?.species})</span>
          </div>
          <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
            <span className="text-stone-500">Recorded symptoms:</span>
            <span className="font-medium text-amber-800">{symptoms.join(", ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Submission ID:</span>
            <span className="font-mono text-stone-600">{submissionId}</span>
          </div>
        </div>

        <Button
          onClick={() => {
            setSubmitResult(null);
            setAiState(null);
            setSelectedAnimal(null);
            setSymptoms([]);
            setStep(1);
          }}
          className="w-full text-xs bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-xl min-h-[44px]"
        >
            Create another report
        </Button>
      </Card>
    );
  }

  // Render Success Screen after Case creation
  if (submitResult?.success) {
    return (
      <Card className="max-w-xl mx-auto w-full border-emerald-200 bg-white text-center shadow-sm p-6 space-y-5 rounded-3xl text-[#191F1C]">
        <CardHeader className="flex flex-col items-center gap-3 p-0">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="h-9 w-9 text-emerald-700" />
          </div>

          <Badge className="text-xs px-3 py-1 bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold">
            {copy.successBadge}
          </Badge>

          <CardTitle className="text-2xl font-bold text-[#191F1C]">
            {copy.caseFor} #{submitResult.caseNumber}
          </CardTitle>

          <CardDescription className="text-xs text-stone-600 max-w-sm">
            <strong className="text-stone-900">{selectedAnimal?.tag}</strong> {copy.submittedToVet}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-left p-0">
          <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#E5E0D8] text-xs space-y-2 text-stone-700">
            <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
              <span className="text-stone-500">{copy.status}:</span>
              <Badge className="text-[10px] bg-amber-100 text-amber-900 border-amber-300 font-bold">
                {submitResult.status || "PENDING_REVIEW"}
              </Badge>
            </div>
            <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
              <span className="text-stone-500">{copy.registrationType}:</span>
              <span className="font-semibold text-stone-800">{mode === "farmer" ? copy.farmerSelf : "Field inspection"}</span>
            </div>
            <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
              <span className="text-stone-500">{copy.animalTag}:</span>
              <span className="font-bold text-emerald-800">{selectedAnimal?.tag} ({selectedAnimal?.species})</span>
            </div>
            <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
              <span className="text-stone-500">{copy.symptoms}:</span>
              <span className="font-medium text-amber-800">{symptoms.join(", ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{copy.reportedAt}:</span>
              <span className="text-stone-600">{submitResult.reportedAt ? new Date(submitResult.reportedAt).toLocaleString() : new Date().toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
            <Stethoscope className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              {copy.centralNotice}
            </p>
          </div>

          <AiAssessmentCard
            caseId={submitResult.caseId!}
            analysisResult={aiState?.analysisResult}
            visionResult={aiState?.visionResult}
            hasPhoto={Boolean(photoUrl)}
          />
        </CardContent>

        <CardFooter className="flex justify-center pt-4 border-t border-[#E5E0D8] p-0">
          <Button
            onClick={() => {
              setSubmitResult(null);
              setAiState(null);
              setSelectedAnimal(null);
              setSymptoms([]);
              setStep(1);
            }}
            className="w-full text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold min-h-[44px] rounded-xl"
          >
            {copy.newReport}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto w-full border-[#E5E0D8] bg-white shadow-xs rounded-3xl text-[#191F1C] overflow-hidden">
      {/* Animated Step Progress Bar */}
      <div className="w-full bg-stone-100 h-1.5 overflow-hidden">
        <div
          className="bg-emerald-700 h-full transition-all duration-300 ease-out"
          style={{ width: `${(step / 7) * 100}%` }}
        />
      </div>

      <CardHeader className="border-b border-[#E5E0D8] pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Badge className="border-emerald-200 text-emerald-800 bg-emerald-50 text-[10px] uppercase font-mono shrink-0">
            Step {step} / 7 — {mode === "farmer" ? "Farmer report" : "Field inspection"}
          </Badge>
          <div className="flex items-center gap-1.5 shrink-0">
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
              <span
                key={s}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  s < step
                    ? "bg-emerald-700"
                    : s === step
                    ? "bg-emerald-500 ring-2 ring-emerald-200 scale-125"
                    : "bg-stone-200"
                }`}
              />
            ))}
          </div>
        </div>

        <CardTitle className="text-xl font-bold text-[#191F1C] tracking-tight mt-1">
          {step === 1 && "1. Select Sick Animal (Animal Tag)"}
          {step === 2 && "2. Observed Symptoms"}
          {step === 3 && "3. Duration and Affected Animals"}
          {step === 4 && "4. Lesion Photo"}
          {step === 5 && "5. GPS Location"}
          {step === 6 && "6. Temperature and IoT Vitals"}
          {step === 7 && "7. Review and Submit Report"}
        </CardTitle>

        <CardDescription className="text-xs text-stone-500">
          {step === 1 && "Select the animal showing signs of illness."}
          {step === 2 && "Select all symptoms observed in the animal."}
          {step === 3 && "Record how long the illness has lasted and how many animals are affected."}
          {step === 4 && "Add a clear photo of skin lesions, the mouth, eyes, or saliva."}
          {step === 5 && "Add GPS coordinates for accurate disease mapping."}
          {step === 6 && "Enter measured temperature or available sensor information."}
          {step === 7 && "Review all information and submit the report."}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {formError && (
          <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-center gap-3 animate-fade-in">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {resetNotice && !formError && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800" role="status">
            {resetNotice}
          </div>
        )}

        <div key={step} className="animate-fade-in space-y-4">
          {/* STEP 1: Animal Selector */}
          {step === 1 && (
            mode === "farmer" ? (
              <FarmerAnimalSelector
                key={animalSelectorKey}
                selectedAnimal={selectedAnimal}
                onSelectAnimal={handleAnimalSelected}
                onRemoveAnimal={() => {
                  setSelectedAnimal(null);
                  setFormError("");
                  setResetNotice("Animal selection cleared. Select an animal to continue.");
                }}
                onNewReport={resetReport}
              />
            ) : (
              <AgentAnimalSelector
                selectedAnimal={selectedAnimal}
                onSelectAnimal={handleAnimalSelected}
              />
            )
          )}

          {/* STEP 2: Symptoms */}
          {step === 2 && (
            <SymptomSelector
              selectedSymptoms={symptoms}
              onChangeSymptoms={(syms) => {
                setSymptoms(syms);
                setFormError("");
              }}
            />
          )}

        {/* STEP 3: Duration & Counts */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Duration Days */}
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-xs text-stone-700 font-bold">How long have symptoms been present? *</Label>
                <select
                  id="duration"
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
                  className="w-full bg-white border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-3 focus:border-emerald-600 focus:outline-none min-h-[44px] shadow-xs"
                >
                  <option value={1}>Today (1 day)</option>
                  <option value={2}>2 days</option>
                  <option value={3}>3 days</option>
                  <option value={5}>4-5 days</option>
                  <option value={7}>More than one week</option>
                </select>
              </div>

              {/* Affected Count */}
              <div className="space-y-2">
                <Label htmlFor="affected" className="text-xs text-stone-700 font-bold">Number of affected animals *</Label>
                <Input
                  id="affected"
                  type="number"
                  min={1}
                  value={affectedCount}
                  onChange={(e) => setAffectedCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] min-h-[44px] rounded-xl"
                />
              </div>

              {/* Herd Size */}
              <div className="space-y-2">
                <Label htmlFor="herd" className="text-xs text-stone-700 font-bold">Total animals in herd *</Label>
                <Input
                  id="herd"
                  type="number"
                  min={1}
                  value={herdSize}
                  onChange={(e) => setHerdSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] min-h-[44px] rounded-xl"
                />
              </div>

              {/* Mortality Count */}
              <div className="space-y-2">
                <Label htmlFor="mortality" className="text-xs text-stone-700 font-bold">Deaths (mortality)</Label>
                <Input
                  id="mortality"
                  type="number"
                  min={0}
                  value={mortalityCount}
                  onChange={(e) => setMortalityCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] min-h-[44px] rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Photo Capture */}
        {step === 4 && (
          <PhotoCapture
            photoUrl={photoUrl}
            onChangePhoto={(url, blob) => {
              setPhotoUrl(url);
              setPhotoBlob(blob);
            }}
            onChangePhotoUrl={setPhotoUrl}
            submissionId={submissionId}
          />
        )}

        {/* STEP 5: GPS Location */}
        {step === 5 && (
          <LocationCapture
            gpsLat={gpsLat}
            gpsLng={gpsLng}
            onChangeLocation={(lat, lng) => {
              setGpsLat(lat);
              setGpsLng(lng);
            }}
          />
        )}

        {/* STEP 6: IoT Telemetry */}
        {step === 6 && (
          <IoTInput
            linkedIotDeviceId={selectedAnimal?.iotDeviceId}
            temperature={temperature}
            activity={activity}
            heartRate={heartRate}
            onChangeTemperature={setTemperature}
            onChangeActivity={setActivity}
            onChangeHeartRate={setHeartRate}
          />
        )}

        {/* STEP 7: Review & Submit */}
        {step === 7 && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Report Summary
            </h4>

            <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#E5E0D8] text-xs space-y-2.5 text-stone-700">
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">Selected animal:</span>
                <span className="font-bold text-stone-900">{selectedAnimal?.tag} ({selectedAnimal?.species})</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">Farm / village:</span>
                <span className="font-medium text-stone-900">{selectedAnimal?.farmName} ({selectedAnimal?.villageName})</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">Selected symptoms:</span>
                <span className="font-medium text-amber-800">{symptoms.join(", ")}</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">Duration and count:</span>
                <span>{durationDays} days • {affectedCount} of {herdSize} affected</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">Deaths:</span>
                <span className={mortalityCount > 0 ? "font-bold text-red-700" : "text-stone-600"}>
                  {mortalityCount}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">Photo:</span>
                <span>{photoUrl ? "Attached (ready for review)" : "No photo attached"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">GPS location:</span>
                <span>{gpsLat && gpsLng ? `${gpsLat.toFixed(4)}, ${gpsLng.toFixed(4)}` : "Village default location"}</span>
              </div>
            </div>
          </div>
        )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center border-t border-[#E5E0D8] pt-4">
        {step > 1 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrevStep}
            disabled={submitting}
            className="gap-1 text-xs border-[#D9D3C7] bg-white text-stone-800 hover:bg-stone-50 min-h-[40px] rounded-xl cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </Button>
        ) : (
          <div />
        )}

        {step < 7 ? (
          <Button
            type="button"
            size="sm"
            onClick={handleNextStep}
            className="gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold min-h-[40px] rounded-xl cursor-pointer shadow-sm"
          >
            <span>Next step</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={submitting}
            onClick={handleSubmitReport}
            className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm min-h-[44px] rounded-xl cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Submitting report...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Submit report</span>
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
