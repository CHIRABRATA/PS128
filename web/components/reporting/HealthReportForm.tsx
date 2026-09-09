"use client";

import React, { useState } from "react";

import { PrintableAnimalOption } from "@/lib/actions/reporting_data";
import { FarmerAnimalSelector } from "./FarmerAnimalSelector";
import { AgentAnimalSelector } from "./AgentAnimalSelector";
import { SymptomSelector } from "./SymptomSelector";
import { PhotoCapture } from "./PhotoCapture";
import { LocationCapture } from "./LocationCapture";
import { IoTInput } from "./IoTInput";
import { createCaseReportAction, CaseReportResult } from "@/lib/actions/cases";
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
}

export function HealthReportForm({ mode }: HealthReportFormProps) {
  const { locale } = useLocale();
  const copy = getReportCopy(locale);
  const [step, setStep] = useState(1);

  // Form State
  const [submissionId] = useState(() => `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  const [selectedAnimal, setSelectedAnimal] = useState<PrintableAnimalOption | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState<number>(1);
  const [affectedCount, setAffectedCount] = useState<number>(1);
  const [herdSize, setHerdSize] = useState<number>(1);
  const [mortalityCount, setMortalityCount] = useState<number>(0);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);

  // IoT State
  const [temperature, setTemperature] = useState<number | null>(null);
  const [activity, setActivity] = useState<number | null>(null);

  // Submission & AI Analysis Status
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
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

  const handleNextStep = () => {
    setFormError("");
    if (step === 1 && !selectedAnimal) {
      setFormError("कृपया पुढे जाण्यापूर्वी जनावराचा कान-टॅग निवडा.");
      return;
    }
    if (step === 2 && symptoms.length === 0) {
      setFormError("कृपया किमान एक दिसणारे लक्षण निवडा.");
      return;
    }
    if (step === 3) {
      if (affectedCount > herdSize) {
        setFormError(`बाधित जनावरांची संख्या (${affectedCount}) एकूण कळपापेक्षा (${herdSize}) जास्त असू शकत नाही.`);
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
      setFormError("जनावर निवडणे आवश्यक आहे.");
      return;
    }
    if (symptoms.length === 0) {
      setFormError("किमान एक लक्षण निवडणे आवश्यक आहे.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    const reportPayload = {
      submissionId,
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
          id: submissionId,
          submissionId,
          clerkUserId: "local_user",
          animalId: selectedAnimal.id,
          symptoms,
          durationDays,
          affectedCount,
          herdSize,
          mortalityCount,
          heartRate: heartRate || null,
          photoBlob: null,
          photoUrl: photoUrl || null,
          gpsLat: gpsLat || null,
          gpsLng: gpsLng || null,
          iotData: {
            temperature: temperature || null,
            activity: activity || null,
          },
          status: "QUEUED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        setSubmitResult({
          success: true,
          offlineQueued: true,
          submissionId,
        });
        setSubmitting(false);
        return;
      }

      const res = await createCaseReportAction(reportPayload);
      if (res.success) {
        setSubmitResult(res);
      } else {
        setFormError(res.error || "अहवाल सादर करण्यात त्रुटी आली. कृपया पुन्हा प्रयत्न करा.");
      }
    } catch (err: unknown) {
      const isNetworkError =
        typeof navigator !== "undefined" && !navigator.onLine;

      if (isNetworkError) {
        try {
          await enqueueReport({
            id: submissionId,
            submissionId,
            clerkUserId: "local_user",
            animalId: selectedAnimal.id,
            symptoms,
            durationDays,
            affectedCount,
            herdSize,
            mortalityCount,
            heartRate: heartRate || null,
            photoBlob: null,
            photoUrl: photoUrl || null,
            gpsLat: gpsLat || null,
            gpsLng: gpsLng || null,
            iotData: {
              temperature: temperature || null,
              activity: activity || null,
            },
            status: "QUEUED",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          setSubmitResult({
            success: true,
            offlineQueued: true,
            submissionId,
          });
          return;
        } catch {
          // IndexedDB fallback
        }
      }

      setFormError(err instanceof Error ? err.message : "सर्व्हरशी संपर्क होऊ शकला नाही.");
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
            ऑफलाइन जतन केले (Queued Locally)
          </Badge>

          <CardTitle className="text-xl font-bold text-[#191F1C]">
            अहवाल स्थानिक साठ्यात सुरक्षित आहे
          </CardTitle>

          <CardDescription className="text-xs text-stone-600 max-w-sm">
            आपला अहवाल <strong className="text-stone-900">{selectedAnimal?.tag}</strong> साठी सुरक्षितपणे फोनमध्ये नोंदवला गेला आहे. नेटवर्क उपलब्ध होताच तो स्वयंचलितपणे सिंक होईल.
          </CardDescription>
        </div>

        <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#E5E0D8] text-xs text-left space-y-2 text-stone-700">
          <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
            <span className="text-stone-500">जनावर टॅग:</span>
            <span className="font-bold text-stone-900">{selectedAnimal?.tag} ({selectedAnimal?.species})</span>
          </div>
          <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
            <span className="text-stone-500">नोंदवलेली लक्षणे:</span>
            <span className="font-medium text-amber-800">{symptoms.join(", ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">नोंदणी क्रमांक:</span>
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
          आणखी एक अहवाल नोंदवा
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
        <div className="flex items-center justify-between">
          <Badge className="border-emerald-200 text-emerald-800 bg-emerald-50 text-[10px] uppercase font-mono">
            टप्पा {step} / ७ — {mode === "farmer" ? "पशुपालक नोंदणी" : "पशुसखी क्षेत्रीय तपासणी"}
          </Badge>
          <div className="flex items-center gap-1.5">
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
          {step === 1 && "१. आजारी जनावर निवडा (Animal Tag)"}
          {step === 2 && "२. दिसणारी लक्षणे (Observed Symptoms)"}
          {step === 3 && "३. कालावधी व बाधित जनावरांची संख्या"}
          {step === 4 && "४. व्रण / गाठी छायाचित्र (Lesion Photo)"}
          {step === 5 && "५. क्षेत्रीय GPS स्थान (Coordinates)"}
          {step === 6 && "६. शारीरिक तापमान व IoT Vitals"}
          {step === 7 && "७. अहवाल पुनरावलोकन व सादर करा"}
        </CardTitle>

        <CardDescription className="text-xs text-stone-500">
          {step === 1 && "ज्या जनावरामध्ये आजारपणाची लक्षणे दिसत आहेत ते निवडा."}
          {step === 2 && "जनावरामध्ये दिसणाऱ्या सर्व लक्षणांची निवड करा."}
          {step === 3 && "आजार किती दिवसांपासून आहे व एकूण बाधित जनावरांची नोंद करा."}
          {step === 4 && "त्वचेवरील गाठी, तोंड, डोळे किंवा लाळेचा स्पष्ट फोटो जोडा."}
          {step === 5 && "रोग नकाशामध्ये योग्य नोंद होण्यासाठी GPS स्थान जोडा."}
          {step === 6 && "थर्मामीटरने मोजलेले तापमान किंवा सेन्सर माहिती नोंदवा."}
          {step === 7 && "सर्व माहिती तपासून अहवाल मध्यवर्ती प्रणालीत सादर करा."}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {formError && (
          <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-center gap-3 animate-fade-in">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div key={step} className="animate-fade-in space-y-4">
          {/* STEP 1: Animal Selector */}
          {step === 1 && (
            mode === "farmer" ? (
              <FarmerAnimalSelector
                selectedAnimal={selectedAnimal}
                onSelectAnimal={handleAnimalSelected}
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
                <Label htmlFor="duration" className="text-xs text-stone-700 font-bold">लक्षणे किती दिवसांपासून आहेत? *</Label>
                <select
                  id="duration"
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
                  className="w-full bg-white border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-3 focus:border-emerald-600 focus:outline-none min-h-[44px] shadow-xs"
                >
                  <option value={1}>आजपासून (१ दिवस)</option>
                  <option value={2}>२ दिवसांपासून</option>
                  <option value={3}>३ दिवसांपासून</option>
                  <option value={5}>४-५ दिवसांपासून</option>
                  <option value={7}>आठवड्यापेक्षा जास्त कालावधी</option>
                </select>
              </div>

              {/* Affected Count */}
              <div className="space-y-2">
                <Label htmlFor="affected" className="text-xs text-stone-700 font-bold">बाधित जनावरांची संख्या *</Label>
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
                <Label htmlFor="herd" className="text-xs text-stone-700 font-bold">कळपातील एकूण जनावरे *</Label>
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
                <Label htmlFor="mortality" className="text-xs text-stone-700 font-bold">मृत्यू संख्या (Mortality Deaths)</Label>
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
              नोंदवलेल्या अहवालाचा सारांश | Report Summary
            </h4>

            <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#E5E0D8] text-xs space-y-2.5 text-stone-700">
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">निवडलेले जनावर:</span>
                <span className="font-bold text-stone-900">{selectedAnimal?.tag} ({selectedAnimal?.species})</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">शेत / गाव:</span>
                <span className="font-medium text-stone-900">{selectedAnimal?.farmName} ({selectedAnimal?.villageName})</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">निवडलेली लक्षणे:</span>
                <span className="font-medium text-amber-800">{symptoms.join(", ")}</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">कालावधी व संख्या:</span>
                <span>{durationDays} दिवस • {affectedCount} पैकी {herdSize} बाधित</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">मृत्यू:</span>
                <span className={mortalityCount > 0 ? "font-bold text-red-700" : "text-stone-600"}>
                  {mortalityCount} मृत्यू
                </span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">छायाचित्र:</span>
                <span>{photoUrl ? "जोडले आहे (तपासणीसाठी तयार)" : "छायाचित्र जोडलेले नाही"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">GPS स्थान:</span>
                <span>{gpsLat && gpsLng ? `${gpsLat.toFixed(4)}, ${gpsLng.toFixed(4)}` : "गावाचे डीफॉल्ट स्थान"}</span>
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
            <span>मागे (Back)</span>
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
            <span>पुढील टप्पा</span>
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
                <span>अहवाल सादर होत आहे...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>अहवाल सादर करा</span>
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
