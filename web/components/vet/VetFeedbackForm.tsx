"use client";

import React, { useState } from "react";
import { VetAction, CaseStatus } from "@prisma/client";
import {
  saveVetFeedbackAction,
  confirmCaseAction,
  closeCaseAction,
  referCaseToLabAction,
} from "@/lib/actions/vet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope,
  Save,
  CheckCircle2,
  FlaskConical,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

interface VetFeedbackFormProps {
  caseId: string;
  currentStatus: CaseStatus;
  initialDiagnosis?: string | null;
  initialAction?: VetAction | null;
  initialFollowUpDate?: string | null;
  initialNotes?: string | null;
  updatedAtIso: string;
  suggestedAction?: VetAction | null;
}

export function VetFeedbackForm({
  caseId,
  currentStatus,
  initialDiagnosis = "",
  initialAction = "MONITOR",
  initialFollowUpDate = "",
  initialNotes = "",
  updatedAtIso,
  suggestedAction,
}: VetFeedbackFormProps) {
  const [diagnosis, setDiagnosis] = useState<string>(initialDiagnosis || "");
  const [action, setAction] = useState<VetAction>(initialAction || suggestedAction || "MONITOR");
  const [followUpDate, setFollowUpDate] = useState<string>(
    initialFollowUpDate ? new Date(initialFollowUpDate).toISOString().split("T")[0] : ""
  );
  const [notes, setNotes] = useState<string>(initialNotes || "");
  const [labName, setLabName] = useState<string>("जिल्हा पशुवैद्यकीय रोग अन्वेषण प्रयोगशाळा (DIS Lab)");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isTerminal = currentStatus === "CLOSED_HARMLESS" || currentStatus === "CONFIRMED";

  const handleSaveDraft = async () => {
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await saveVetFeedbackAction({
        caseId,
        expectedUpdatedAt: updatedAtIso,
        vetDiagnosis: diagnosis,
        vetRecommendedAction: action,
        vetFollowUpDate: followUpDate || null,
        vetNotes: notes || null,
      });

      if (!res.success) {
        setError(res.error || "पशुवैद्यकीय अहवाल जतन करण्यात त्रुटी आली.");
      } else {
        setSuccessMsg("पशुवैद्यकीय निदान व अभिप्राय यशस्वीरीत्या जतन झाला.");
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCase = async () => {
    if (!diagnosis.trim()) {
      setError("कृपया रोग पुष्टी करण्यापूर्वी अधिकृत वैद्यकीय निदान (Diagnosis) नोंदवा.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await confirmCaseAction({
        caseId,
        expectedUpdatedAt: updatedAtIso,
        vetDiagnosis: diagnosis,
        vetNotes: notes || null,
      });

      if (!res.success) {
        setError(res.error || "प्रकरण पुष्टी करण्यात त्रुटी आली.");
      } else {
        setSuccessMsg("रोग प्रकरण यशस्वीरीत्या पुष्ट (CONFIRMED) केले गेले.");
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Confirmation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReferToLab = async () => {
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await referCaseToLabAction({
        caseId,
        expectedUpdatedAt: updatedAtIso,
        labName,
        vetDiagnosis: diagnosis || null,
        vetNotes: notes || null,
      });

      if (!res.success) {
        setError(res.error || "लॅबकडे वर्ग करण्यात त्रुटी आली.");
      } else {
        setSuccessMsg("प्रकरण निदान प्रयोगशाळेकडे वर्ग केले. नमुना नोंद तयार झाली.");
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lab referral failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseHarmless = async () => {
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await closeCaseAction({
        caseId,
        expectedUpdatedAt: updatedAtIso,
        vetNotes: notes || null,
      });

      if (!res.success) {
        setError(res.error || "प्रकरण बंद करण्यात त्रुटी आली.");
      } else {
        setSuccessMsg("प्रकरण सुरक्षित / पूर्ण बरे (CLOSED) म्हणून निकाली काढले.");
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Closure failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 rounded-3xl border-2 border-emerald-300 bg-emerald-50/70 space-y-5 shadow-xs text-emerald-950">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-emerald-700" />
          <div>
            <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">
              पशुवैद्यकीय निदान व उपचार निर्णय
            </h3>
            <p className="text-[11px] text-emerald-800">
              अधिकृत परवानाधारक पशुवैद्यकीय डॉक्टरांचे वैद्यकीय मूल्यांकन.
            </p>
          </div>
        </div>
        <Badge className="border-emerald-300 text-emerald-900 bg-emerald-100 text-[10px] font-bold">
          डॉक्टर नोंद
        </Badge>
      </div>

      {/* Safety Notice */}
      <div className="bg-white p-3 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5 shadow-2xs">
        <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          <strong>वैद्यकीय अधिकार:</strong> AI मधील निष्कर्ष हे केवळ प्राथमिक सहाय्यासाठी आहेत. खालील नोंद ही जनावरावरील अंतिम अधिकृत वैद्यकीय निदान मानली जाईल.
        </p>
      </div>

      {/* Error / Success Messages */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        {/* 1. Diagnosis Summary */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-emerald-950">
            १. अधिकृत वैद्यकीय निदान (Clinical Diagnosis) *
          </Label>
          <Input
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            disabled={isTerminal || submitting}
            placeholder="उदा. लंपी त्वचा रोग संशयित (Suspected Lumpy Skin Disease) / घटसर्प / साधे फोड"
            className="bg-white border-[#D9D3C7] text-xs text-stone-900 rounded-xl placeholder:text-stone-400"
          />
        </div>

        {/* 2. Recommended Action */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-bold text-emerald-950">
              २. अनुशंसित कारवाई (Recommended Action) *
            </Label>
            {suggestedAction && (
              <span className="text-[10px] text-amber-800 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                AI सूचना: {suggestedAction}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {(["ISOLATE", "TREAT", "MONITOR", "REFER_LAB", "NONE"] as VetAction[]).map((act) => (
              <button
                key={act}
                type="button"
                disabled={isTerminal || submitting}
                onClick={() => setAction(act)}
                className={`p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                  action === act
                    ? "bg-emerald-700 border-emerald-800 text-white shadow-xs"
                    : "bg-white border-[#D9D3C7] text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                }`}
              >
                {act === "ISOLATE" && "वेगळे करा"}
                {act === "TREAT" && "उपचार"}
                {act === "MONITOR" && "निरीक्षण"}
                {act === "REFER_LAB" && "लॅब तपासणी"}
                {act === "NONE" && "काही नाही"}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Follow-Up Date & Lab Target */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-700" />
              <span>३. पुनर्तपासणी तारीख (Follow-up Date)</span>
            </Label>
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              disabled={isTerminal || submitting}
              className="bg-white border-[#D9D3C7] text-xs text-stone-900 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-amber-700" />
              <span>प्रयोगशाळा नाव (Diagnostic Lab Name)</span>
            </Label>
            <Input
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              disabled={isTerminal || submitting}
              placeholder="उदा. जिल्हा पशुवैद्यकीय रोग अन्वेषण लॅब"
              className="bg-white border-[#D9D3C7] text-xs text-stone-900 rounded-xl placeholder:text-stone-400"
            />
          </div>
        </div>

        {/* 4. Veterinary Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-emerald-950">
            ४. तपासणी नोंदी व सूचना (Clinical Notes & Quarantine Guidelines)
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isTerminal || submitting}
            placeholder="जनावरासाठी दिलेल्या औषधांची नावे, विलगीकरण सूचना किंवा लॅब नमुना माहिती नोंदवा..."
            rows={3}
            className="bg-white border-[#D9D3C7] text-xs text-stone-900 rounded-xl placeholder:text-stone-400 shadow-2xs"
          />
        </div>
      </div>

      {/* Action Buttons */}
      {!isTerminal && (
        <div className="pt-3 border-t border-emerald-200 flex flex-wrap gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={submitting}
            className="text-xs gap-1.5 border-[#D9D3C7] bg-white text-stone-800 hover:bg-stone-50 min-h-[36px] rounded-xl"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>अभिप्राय जतन करा</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReferToLab}
            disabled={submitting}
            className="text-xs gap-1.5 border-amber-300 text-amber-900 bg-amber-100 hover:bg-amber-200 min-h-[36px] rounded-xl"
          >
            <FlaskConical className="h-3.5 w-3.5 text-amber-700" />
            <span>लॅबकडे पाठवा</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCloseHarmless}
            disabled={submitting}
            className="text-xs gap-1.5 border-[#D9D3C7] bg-white text-stone-700 hover:bg-stone-50 min-h-[36px] rounded-xl"
          >
            <XCircle className="h-3.5 w-3.5 text-stone-500" />
            <span>सुरक्षित / बंद करा</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleConfirmCase}
            disabled={submitting}
            className="text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-xs min-h-[36px] rounded-xl"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            <span>रोग पुष्टी करा (Confirm)</span>
          </Button>
        </div>
      )}
    </div>
  );
}
