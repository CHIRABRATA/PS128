"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createAssistanceRequestAction, CreateAssistanceRequestResult } from "@/lib/actions/assistance";
import { LocationSearch, SelectedLocationData } from "@/components/geo/LocationSearch";
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
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [customLocation, setCustomLocation] = useState<SelectedLocationData | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<CreateAssistanceRequestResult | null>(null);

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
        notes: customLocation
          ? `${notes ? notes + "\n" : ""}Location: ${customLocation.displayName || customLocation.placeName}`
          : notes.trim() || null,
      });

      if (!res.success) {
        setError(res.error || "Unable to submit the assistance request right now. Please try again.");
      } else {
        setSubmitResult(res);
      }
    } catch (err: unknown) {
      console.error("[AssistanceRequestForm Submit Error]:", err);
      setError("Unable to submit the assistance request right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setReason("");
    setNotes("");
    setScheduledDate("");
    setCustomLocation(null);
    setShowLocationSearch(false);
    setSelectedAnimalId(preSelectedAnimalId || "");
    setSubmitResult(null);
    setError(null);
  };

  if (submitResult?.success) {
    const agent = submitResult.assignedFieldAgent;
    const assignmentLevel = submitResult.assignmentLevel;
    const location = submitResult.location;

    return (
      <div className="max-w-xl mx-auto w-full p-6 rounded-3xl bg-white border border-emerald-200 text-center space-y-5 shadow-sm text-[#191F1C]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-xs px-3 py-1 font-semibold">
            Assistance Request Submitted
          </Badge>
          <h2 className="text-2xl font-bold text-[#191F1C]">Field Assistance Dispatched</h2>
          <p className="text-xs text-stone-600 max-w-sm">
            Your request for on-site livestock assistance has been received.
          </p>
        </div>

        {/* Location & Routing Summary */}
        <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#E5E0D8] text-xs text-left space-y-3 text-stone-700">
          {/* 1. Request ID */}
          <div className="flex justify-between items-center border-b border-[#E5E0D8] pb-2">
            <span className="text-stone-500 font-bold uppercase tracking-wider text-[10px]">Request Reference:</span>
            <span className="font-mono text-stone-800 font-semibold">{submitResult.requestId}</span>
          </div>

          {/* 2. Location */}
          <div className="space-y-1 border-b border-[#E5E0D8] pb-2.5">
            <span className="text-stone-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <MapPin className="h-3 w-3 text-emerald-700" />
              <span>Visit Location</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="bg-white px-2.5 py-1 rounded-lg border border-[#E5E0D8]">
                <span className="text-stone-500 block text-[10px]">Village:</span>
                <strong className="text-stone-900">{location?.villageName || selectedFarm?.villageName || "-"}</strong>
              </div>
              <div className="bg-white px-2.5 py-1 rounded-lg border border-[#E5E0D8]">
                <span className="text-stone-500 block text-[10px]">Block:</span>
                <strong className="text-stone-900">{location?.blockName || "-"}</strong>
              </div>
              <div className="bg-white px-2.5 py-1 rounded-lg border border-[#E5E0D8]">
                <span className="text-stone-500 block text-[10px]">District:</span>
                <strong className="text-stone-900">{location?.districtName || "-"}</strong>
              </div>
            </div>
          </div>

          {/* 3. Assigned Field Agent */}
          <div className="space-y-1.5 border-b border-[#E5E0D8] pb-2.5">
            <span className="text-stone-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-amber-700" />
              <span>Assigned Field Agent (Pashusakhi)</span>
            </span>
            {agent ? (
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-emerald-950 block">{agent.name}</span>
                  <span className="text-[11px] text-emerald-800">
                    Assigned at: <strong className="uppercase">{assignmentLevel || "District"}</strong> level
                  </span>
                  {agent.phone && (
                    <span className="block text-[10px] text-stone-500 mt-0.5">Contact: {agent.phone}</span>
                  )}
                </div>
                <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px]">
                  Assigned
                </Badge>
              </div>
            ) : (
              <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-950">Waiting for a field agent</span>
                  <Badge className="bg-amber-100 text-amber-950 border-amber-300 text-[10px]">
                    Queued
                  </Badge>
                </div>
                <p className="text-[11px] text-amber-900">
                  Your request is queued in the local field agent pool and will be accepted shortly.
                </p>
              </div>
            )}
          </div>

          {/* 4. Crucial Lifecycle Clarification */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-[11px] text-amber-950 space-y-1">
            <span className="font-bold block">Lifecycle Notice:</span>
            <p className="text-stone-700">
              No health case has been created yet. A formal Case will be generated after the field agent completes the on-site visit and submits the examination report.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetForm}
            className="flex-1 text-xs border-[#D9D3C7] text-stone-700 hover:bg-stone-50 rounded-xl min-h-[44px]"
          >
            Submit Another Request
          </Button>
          <Button
            type="button"
            onClick={() => {
              router.push("/farmer");
              router.refresh();
            }}
            className="flex-1 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl min-h-[44px] gap-1.5"
          >
            <span>View in Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
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

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Farm Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-stone-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                <span>Select Farm / Shed Location *</span>
              </span>
              <button
                type="button"
                onClick={() => setShowLocationSearch(!showLocationSearch)}
                className="text-[11px] font-medium text-emerald-700 hover:underline cursor-pointer"
              >
                {showLocationSearch ? "Use standard farm" : "Search / GPS"}
              </button>
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

        {/* Optional Location Search */}
        {showLocationSearch && (
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2 animate-fade-in">
            <LocationSearch
              value={customLocation}
              onLocationSelect={(loc) => setCustomLocation(loc)}
              onClear={() => setCustomLocation(null)}
              label="Specify visit location (if different from registered farm):"
              required={false}
              showMapPreview={true}
            />
          </div>
        )}
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
