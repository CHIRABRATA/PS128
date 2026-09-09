"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Cpu, HeartPulse, Thermometer, Activity } from "lucide-react";

interface IoTInputProps {
  linkedIotDeviceId?: string | null;
  temperature: number | null;
  activity: number | null;
  heartRate: number | null;
  onChangeTemperature: (val: number | null) => void;
  onChangeActivity: (val: number | null) => void;
  onChangeHeartRate: (val: number | null) => void;
}

export function IoTInput({
  linkedIotDeviceId,
  temperature,
  activity,
  heartRate,
  onChangeTemperature,
  onChangeActivity,
  onChangeHeartRate,
}: IoTInputProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
          <Cpu className="h-4 w-4 text-emerald-700" />
          <span>IoT Vitals (Optional)</span>
        </label>
        {linkedIotDeviceId ? (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] gap-1 px-2 py-0.5">
            <Cpu className="h-3 w-3" />
            <span>Device: {linkedIotDeviceId}</span>
          </Badge>
        ) : (
          <span className="text-[11px] text-stone-500">Optional</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl border border-[#E5E0D8] bg-[#FAF8F3] shadow-2xs">
        {/* Temperature */}
        <div className="space-y-1.5">
          <Label htmlFor="temp" className="text-xs text-stone-700 font-bold flex items-center gap-1">
            <Thermometer className="h-3.5 w-3.5 text-rose-600" />
            <span>Temperature (°C)</span>
          </Label>
          <Input
            id="temp"
            type="number"
            step="0.1"
            placeholder="e.g. 38.5 or 40.1"
            value={temperature !== null ? temperature : ""}
            onChange={(e) => onChangeTemperature(e.target.value ? parseFloat(e.target.value) : null)}
            className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl"
          />
        </div>

        {/* Activity Index */}
        <div className="space-y-1.5">
          <Label htmlFor="act" className="text-xs text-stone-700 font-bold flex items-center gap-1">
            <Activity className="h-3.5 w-3.5 text-emerald-700" />
            <span>Activity index</span>
          </Label>
          <Input
            id="act"
            type="number"
            placeholder="e.g. 22 (low) to 85"
            value={activity !== null ? activity : ""}
            onChange={(e) => onChangeActivity(e.target.value ? parseInt(e.target.value, 10) : null)}
            className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl"
          />
        </div>

        {/* Heart Rate */}
        <div className="space-y-1.5">
          <Label htmlFor="hr" className="text-xs text-stone-700 font-bold flex items-center gap-1">
            <HeartPulse className="h-3.5 w-3.5 text-amber-700" />
            <span>Heart rate (BPM)</span>
          </Label>
          <Input
            id="hr"
            type="number"
            placeholder="e.g. 60 - 95"
            value={heartRate !== null ? heartRate : ""}
            onChange={(e) => onChangeHeartRate(e.target.value ? parseInt(e.target.value, 10) : null)}
            className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
