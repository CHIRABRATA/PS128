"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createAssistanceRequestAction } from "@/lib/actions/assistance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Clock,
  MapPin,
  Calendar,
} from "lucide-react";

interface FarmOption {
  id: string;
  name: string;
  villageName: string;
  animals: Array<{ id: string; tag: string; species: string }>;
}

interface AssistanceRequestFormProps {
  farms: FarmOption[];
  preSelectedAnimalId?: string | null;
}

export function AssistanceRequestForm({
  farms,
  preSelectedAnimalId,
}: AssistanceRequestFormProps) {
  const router = useRouter();
  const [selectedFarmId, setSelectedFarmId] = useState<string>(
    farms.length > 0 ? farms[0].id : ""
  );
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>(
    preSelectedAnimalId || ""
  );
  const [reason, setReason] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedFarm = farms.find((f) => f.id === selectedFarmId);
  const farmAnimals = selectedFarm ? selectedFarm.animals : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmId) {
      setError("Please select a farm location.");
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setError("Please provide a detailed reason for requesting field assistance (at least 5 characters).");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await createAssistanceRequestAction({
        farmId: selectedFarmId,
        animalId: selectedAnimalId || null,
        reason: reason.trim(),
        scheduledAt: scheduledDate || null,
        notes: notes.trim() || null,
      });

      if (!res.success) {
        setError(res.error || "Failed to submit assistance request.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/farmer");
          router.refresh();
        }, 1500);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission error.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 rounded-3xl bg-white border border-emerald-200 text-center space-y-4 shadow-sm text-[#191F1C]">
        <div className="h-16 w-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-xs px-3 py-1">
          Request Submitted Successfully
        </Badge>
        <h2 className="text-xl font-bold text-[#191F1C]">Field Agent Assistance Dispatched</h2>
        <p className="text-xs text-stone-600 max-w-md mx-auto">
          Your request has been routed to the field agents in <strong>{selectedFarm?.villageName}</strong>. You will be notified as soon as an agent accepts your request.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-white border border-[#E5E0D8] space-y-6 shadow-xs text-[#191F1C]">
      <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#191F1C]">Field Agent Assistance Form</h3>
            <p className="text-xs text-stone-500">
              Request a Pashusakhi / Field Agent visit for on-site physical examination, ear-tagging, or vitals inspection.
            </p>
          </div>
        </div>
        <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
          Doorstep Service
        </Badge>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Farm Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-700" />
            <span>Select Farm / Shed Location *</span>
          </Label>
          <select
            value={selectedFarmId}
            onChange={(e) => {
              setSelectedFarmId(e.target.value);
              setSelectedAnimalId("");
            }}
            required
            className="w-full bg-white border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-3 focus:border-emerald-600 focus:outline-none min-h-[44px]"
          >
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.villageName})
              </option>
            ))}
          </select>
        </div>

        {/* Animal Selection (Optional) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-700" />
            <span>Specific Animal (Optional)</span>
          </Label>
          <select
            value={selectedAnimalId}
            onChange={(e) => setSelectedAnimalId(e.target.value)}
            className="w-full bg-white border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-3 focus:border-emerald-600 focus:outline-none min-h-[44px]"
          >
            <option value="">General Herd / Multiple Animals</option>
            {farmAnimals.map((a) => (
              <option key={a.id} value={a.id}>
                {a.tag} ({a.species})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reason for Request */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-stone-800">
          Reason for Assistance Request *
        </Label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          placeholder="e.g. Animal unable to stand, sudden fever and mouth blisters, need help taking lesion photos"
          className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl min-h-[44px]"
        />
      </div>

      {/* Preferred Time & Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-emerald-700" />
            <span>Preferred Date (Optional)</span>
          </Label>
          <Input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-stone-800">
            Additional Directions or Notes
          </Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Farm located 500m behind village primary school"
            className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl"
          />
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] text-xs text-stone-600 space-y-1">
        <div className="font-bold text-stone-800">Workflow Note:</div>
        <p>
          Submitting this form creates a <strong>Field Assistance Request</strong>. The assigned agent will visit your farm, record physical observations, and submit the official health report.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
          className="text-xs border-[#D9D3C7] text-stone-700 hover:bg-stone-50 rounded-xl min-h-[40px]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-1.5 rounded-xl min-h-[40px] px-5"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Submitting Request...</span>
            </>
          ) : (
            <>
              <span>Dispatch Field Agent</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
