"use client";

import React, { useState } from "react";
import { VetAction, CaseStatus } from "@prisma/client";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("vet");
  const [diagnosis, setDiagnosis] = useState<string>(initialDiagnosis || "");
  const [action, setAction] = useState<VetAction>(initialAction || suggestedAction || "MONITOR");
  const [followUpDate, setFollowUpDate] = useState<string>(
    initialFollowUpDate ? new Date(initialFollowUpDate).toISOString().split("T")[0] : ""
  );
  const [notes, setNotes] = useState<string>(initialNotes || "");
  const [labName, setLabName] = useState<string>("District Veterinary Disease Investigation Laboratory (DIS Lab)");

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
        setError(res.error || "Failed to save veterinary report.");
      } else {
        setSuccessMsg("Veterinary report and clinical feedback saved successfully.");
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
      setError("Please enter an official clinical diagnosis before confirming the case.");
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
        setError(res.error || "Failed to confirm case.");
      } else {
        setSuccessMsg("Case successfully confirmed (CONFIRMED).");
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
        setError(res.error || "Failed to refer case to lab.");
      } else {
        setSuccessMsg("Case referred to diagnostic laboratory. Sample record created.");
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
        setError(res.error || "Failed to close case.");
      } else {
        setSuccessMsg("Case marked as resolved/harmless (CLOSED).");
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Closure failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const actionsList: { key: VetAction; label: string; desc: string }[] = [
    { key: "ISOLATE", label: "ISOLATE", desc: "Quarantine immediately" },
    { key: "TREAT", label: "TREAT", desc: "Administer treatment" },
    { key: "MONITOR", label: "MONITOR", desc: "Active observation" },
    { key: "REFER_LAB", label: "REFER TO LAB", desc: "Collect diagnostic sample" },
    { key: "NONE", label: "NONE", desc: "No intervention needed" },
  ];

  return (
    <div className="p-6 rounded-3xl border border-emerald-200/90 bg-emerald-50/40 space-y-5 shadow-xs text-stone-900">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-emerald-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-700 text-white shadow-xs">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">
              {t("assessmentHeader")}
            </h3>
            <p className="text-xs text-emerald-800">
              {t("officialLicensedEval")}
            </p>
          </div>
        </div>
        <Badge className="px-3 py-1 text-xs font-semibold rounded-full border border-emerald-300 bg-emerald-100 text-emerald-900 shadow-none">
          {t("doctorsEntry")}
        </Badge>
      </div>

      {/* Safety Notice */}
      <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-2.5 shadow-2xs">
        <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          <strong className="font-semibold text-emerald-900">Clinical Authority:</strong> {t("aiLegalDisclaimer")}
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
          <Label className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
            1. Clinical Diagnosis *
          </Label>
          <Input
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            disabled={isTerminal || submitting}
            placeholder="e.g. Suspected Lumpy Skin Disease / Hemorrhagic Septicemia / Foot & Mouth Disease"
            className="bg-white border-stone-200 focus-visible:border-emerald-600 focus-visible:ring-emerald-600 text-xs text-stone-900 rounded-xl placeholder:text-stone-400 h-10 px-3.5 shadow-2xs"
          />
        </div>

        {/* 2. Recommended Action */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
              2. Recommended Action *
            </Label>
            {suggestedAction && (
              <span className="text-[11px] text-amber-800 font-semibold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                AI Suggestion: {suggestedAction}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {actionsList.map((act) => {
              const isSelected = action === act.key;
              return (
                <button
                  key={act.key}
                  type="button"
                  disabled={isTerminal || submitting}
                  onClick={() => setAction(act.key)}
                  className={`py-2.5 px-2 rounded-xl border font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[46px] leading-tight ${
                    isSelected
                      ? "bg-emerald-700 border-emerald-800 text-white shadow-sm ring-2 ring-emerald-600/20"
                      : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50 hover:text-stone-900 hover:border-stone-300 shadow-2xs"
                  }`}
                >
                  <span className="text-xs font-bold tracking-tight">{act.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Follow-Up Date & Lab Target */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-700" />
              <span>{t("followUpDateStep")}</span>
            </Label>
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              disabled={isTerminal || submitting}
              className="bg-white border-stone-200 focus-visible:border-emerald-600 focus-visible:ring-emerald-600 text-xs text-stone-900 rounded-xl h-10 px-3.5 shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-amber-700" />
              <span>{t("diagnosticLabNameStep")}</span>
            </Label>
            <Input
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              disabled={isTerminal || submitting}
              placeholder="e.g. District Veterinary Disease Investigation Laboratory"
              className="bg-white border-stone-200 focus-visible:border-emerald-600 focus-visible:ring-emerald-600 text-xs text-stone-900 rounded-xl placeholder:text-stone-400 h-10 px-3.5 shadow-2xs"
            />
          </div>
        </div>

        {/* 4. Veterinary Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
            {t("clinicalNotesStep")}
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isTerminal || submitting}
            placeholder="Enter prescribed medications, quarantine guidelines, dosage instructions, or sample collection notes..."
            rows={3}
            className="bg-white border-stone-200 focus-visible:border-emerald-600 focus-visible:ring-emerald-600 text-xs text-stone-900 rounded-xl placeholder:text-stone-400 shadow-2xs resize-y"
          />
        </div>
      </div>

      {/* Action Buttons */}
      {!isTerminal && (
        <div className="pt-3 border-t border-emerald-200/80 flex flex-wrap gap-2.5 justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={submitting}
            className="text-xs gap-1.5 border-stone-200 bg-white text-stone-800 hover:bg-stone-50 min-h-[38px] rounded-xl px-4 font-semibold shadow-2xs cursor-pointer"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>{t("saveFeedbackBtn")}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReferToLab}
            disabled={submitting}
            className="text-xs gap-1.5 border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 min-h-[38px] rounded-xl px-4 font-semibold shadow-2xs cursor-pointer"
          >
            <FlaskConical className="h-3.5 w-3.5 text-amber-700" />
            <span>{t("referToLabBtn")}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCloseHarmless}
            disabled={submitting}
            className="text-xs gap-1.5 border-stone-200 bg-white text-stone-700 hover:bg-stone-50 min-h-[38px] rounded-xl px-4 font-semibold shadow-2xs cursor-pointer"
          >
            <XCircle className="h-3.5 w-3.5 text-stone-500" />
            <span>{t("closeHarmlessBtn")}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleConfirmCase}
            disabled={submitting}
            className="text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-xs min-h-[38px] rounded-xl px-4 cursor-pointer"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            <span>{t("confirmDiseaseBtn")}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
