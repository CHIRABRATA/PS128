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

  const getActionLabel = (act: VetAction) => {
    switch (act) {
      case "ISOLATE":
        return "ISOLATE";
      case "TREAT":
        return "TREAT";
      case "MONITOR":
        return "MONITOR";
      case "REFER_LAB":
        return "REFER TO LAB";
      case "NONE":
        return "NONE";
      default:
        return act;
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
              Veterinary Clinical Assessment
            </h3>
            <p className="text-[11px] text-emerald-800">
              Official licensed veterinary medical evaluation.
            </p>
          </div>
        </div>
        <Badge className="border-emerald-300 text-emerald-900 bg-emerald-100 text-[10px] font-bold">
          Doctor&apos;s Notes
        </Badge>
      </div>

      {/* Safety Notice */}
      <div className="bg-white p-3 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5 shadow-2xs">
        <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          <strong>Clinical Authority:</strong> AI findings are for clinical decision support only. The entry below serves as the official final veterinary diagnosis.
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
            1. Clinical Diagnosis *
          </Label>
          <Input
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            disabled={isTerminal || submitting}
            placeholder="e.g. Suspected Lumpy Skin Disease / Hemorrhagic Septicemia / Non-specific Lesions"
            className="bg-white border-[#D9D3C7] text-xs text-stone-900 rounded-xl placeholder:text-stone-400"
          />
        </div>

        {/* 2. Recommended Action */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-bold text-emerald-950">
              2. Recommended Action *
            </Label>
            {suggestedAction && (
              <span className="text-[10px] text-amber-800 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                AI Suggestion: {suggestedAction}
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
                {getActionLabel(act)}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Follow-Up Date & Lab Target */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-700" />
              <span>3. Follow-up Date</span>
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
              <span>Diagnostic Lab Name</span>
            </Label>
            <Input
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              disabled={isTerminal || submitting}
              placeholder="e.g. District Veterinary Disease Investigation Laboratory"
              className="bg-white border-[#D9D3C7] text-xs text-stone-900 rounded-xl placeholder:text-stone-400"
            />
          </div>
        </div>

        {/* 4. Veterinary Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-emerald-950">
            4. Clinical Notes &amp; Quarantine Guidelines
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isTerminal || submitting}
            placeholder="Enter prescribed medications, quarantine guidelines, dosage instructions, or sample collection notes..."
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
            <span>Save Feedback</span>
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
            <span>Refer to Lab</span>
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
            <span>Close / Harmless</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleConfirmCase}
            disabled={submitting}
            className="text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-xs min-h-[36px] rounded-xl"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            <span>Confirm Disease (Confirm)</span>
          </Button>
        </div>
      )}
    </div>
  );
}
