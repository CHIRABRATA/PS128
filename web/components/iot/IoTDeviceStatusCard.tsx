"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cpu, Wifi, WifiOff, PlayCircle, StopCircle, Radio, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export interface IoTDeviceStatusCardProps {
  device: {
    id: string;
    deviceIdentifier: string;
    source: "REAL" | "SIMULATED";
    status: "ONLINE" | "OFFLINE" | "SIMULATING";
    lastSeenAt: string | Date | null;
  } | null;
  connectionState: "REAL_ONLINE" | "REAL_OFFLINE" | "SIMULATION_ACTIVE" | "NO_DEVICE";
  animalTag: string;
  animalSpecies: string;
  isPending: boolean;
  onToggleSimulation: (enable: boolean) => Promise<void>;
}

export function IoTDeviceStatusCard({
  device,
  connectionState,
  animalTag,
  animalSpecies,
  isPending,
  onToggleSimulation,
}: IoTDeviceStatusCardProps) {
  const isSimulationActive = connectionState === "SIMULATION_ACTIVE";
  const isRealOnline = connectionState === "REAL_ONLINE";
  const isRealOffline = connectionState === "REAL_OFFLINE";

  return (
    <div className="bg-white border border-[#E5E0D8] rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EBE1]">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <Cpu className="h-5 w-5 text-emerald-800" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#191F1C]">
                {device?.deviceIdentifier || `ESP32-${animalTag}`}
              </h2>
              {isSimulationActive ? (
                <Badge
                  data-testid="simulated-esp32-badge"
                  className="bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[10px] px-2 py-0.5 tracking-wider uppercase"
                >
                  SIMULATED ESP32
                </Badge>
              ) : (
                <Badge
                  data-testid="real-esp32-badge"
                  className="bg-blue-100 text-blue-900 border border-blue-300 font-mono text-[10px] px-2 py-0.5 tracking-wider uppercase"
                >
                  REAL ESP32
                </Badge>
              )}
            </div>
            <p className="text-xs text-stone-500">
              Attached to: <span className="font-semibold text-stone-700">{animalSpecies} ({animalTag})</span>
            </p>
          </div>
        </div>

        {/* State Badge */}
        <div className="flex items-center gap-2">
          {isRealOnline && (
            <Badge
              data-testid="device-status-badge"
              className="bg-emerald-100 text-emerald-900 border-emerald-300 gap-1.5 py-1 px-3"
            >
              <Wifi className="h-3.5 w-3.5 text-emerald-700 animate-pulse" />
              <span className="font-semibold text-xs">REAL ESP32 ONLINE</span>
            </Badge>
          )}

          {isRealOffline && (
            <Badge
              data-testid="device-status-badge"
              className="bg-stone-100 text-stone-700 border-stone-300 gap-1.5 py-1 px-3"
            >
              <WifiOff className="h-3.5 w-3.5 text-stone-500" />
              <span className="font-semibold text-xs">ESP32 Offline</span>
            </Badge>
          )}

          {isSimulationActive && (
            <Badge
              data-testid="device-status-badge"
              className="bg-emerald-600 text-white border-emerald-700 gap-1.5 py-1 px-3 shadow-2xs"
            >
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              <span className="font-semibold text-xs">Simulation Active</span>
            </Badge>
          )}

          {connectionState === "NO_DEVICE" && (
            <Badge
              data-testid="device-status-badge"
              className="bg-stone-100 text-stone-600 border-stone-200 gap-1.5 py-1 px-3"
            >
              <WifiOff className="h-3.5 w-3.5 text-stone-400" />
              <span className="font-semibold text-xs">No Device Configured</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Metadata & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-stone-600">
          <Clock className="h-3.5 w-3.5 text-stone-400" />
          <span>Last Seen:</span>
          <span className="font-mono font-medium text-stone-900">
            {device?.lastSeenAt ? formatDateTime(device.lastSeenAt) : "Never"}
          </span>
        </div>

        {/* Action button */}
        <div>
          {isSimulationActive ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => onToggleSimulation(false)}
              className="h-8 text-xs border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 rounded-xl gap-1.5 shadow-2xs"
            >
              <StopCircle className="h-3.5 w-3.5 text-amber-700" />
              <span>Stop Simulation</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => onToggleSimulation(true)}
              className="h-8 text-xs border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 rounded-xl gap-1.5 shadow-2xs font-semibold"
            >
              <PlayCircle className="h-3.5 w-3.5 text-emerald-700" />
              <span>Simulate ESP32</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
