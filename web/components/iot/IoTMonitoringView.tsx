"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IoTDeviceStatusCard } from "./IoTDeviceStatusCard";
import { MockESP32Simulator } from "./MockESP32Simulator";
import { IoTSensorDashboard, IoTReadingData } from "./IoTSensorDashboard";
import { IoTReadingsHistoryTable } from "./IoTReadingsHistoryTable";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  toggleDeviceSimulationModeAction,
  ingestIoTTelemetryAction,
  getAnimalIoTMonitoringDataAction,
} from "@/lib/actions/iot";

export interface AnimalOption {
  id: string;
  tag: string;
  species: string;
  name?: string | null;
  breed?: string | null;
  device?: {
    id: string;
    deviceIdentifier: string;
    source: "REAL" | "SIMULATED";
    status: "ONLINE" | "OFFLINE" | "SIMULATING";
    lastSeenAt: string | Date | null;
  } | null;
}

export interface IoTMonitoringViewProps {
  animals: AnimalOption[];
  selectedAnimalId: string;
  initialData: {
    animal: {
      id: string;
      tag: string;
      species: string;
      name?: string | null;
      breed?: string | null;
    };
    device: {
      id: string;
      deviceIdentifier: string;
      source: "REAL" | "SIMULATED";
      status: "ONLINE" | "OFFLINE" | "SIMULATING";
      lastSeenAt: string | Date | null;
    } | null;
    readings: IoTReadingData[];
    latestReading: IoTReadingData | null;
    connectionState: "REAL_ONLINE" | "REAL_OFFLINE" | "SIMULATION_ACTIVE" | "NO_DEVICE";
    summary: {
      totalReadings: number;
      simulatedReadings: number;
      realReadings: number;
      anomaliesCount: number;
    };
  };
}

export function IoTMonitoringView({
  animals,
  selectedAnimalId,
  initialData,
}: IoTMonitoringViewProps) {
  const t = useTranslations("iot");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [currentAnimalId, setCurrentAnimalId] = useState<string>(selectedAnimalId);
  const [data, setData] = useState(initialData);
  const [actionError, setActionError] = useState<string | null>(null);

  // Switch animal handler
  const handleAnimalSelect = async (animalId: string) => {
    setCurrentAnimalId(animalId);
    setActionError(null);
    router.replace(`/farmer/iot?animalId=${animalId}`, { scroll: false });

    startTransition(async () => {
      try {
        const refreshed = await getAnimalIoTMonitoringDataAction(animalId);
        setData({
          ...refreshed,
          readings: refreshed.readings as unknown as IoTReadingData[],
          latestReading: refreshed.latestReading as unknown as IoTReadingData | null,
        });
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : "Failed to load animal IoT telemetry");
      }
    });
  };

  // Toggle simulation mode handler
  const handleToggleSimulation = async (enable: boolean) => {
    setActionError(null);
    try {
      const res = await toggleDeviceSimulationModeAction(currentAnimalId, enable);
      if (res.success && res.connectionState) {
        const nextState = res.connectionState;
        setData((prev) => ({
          ...prev,
          device: res.device
            ? {
                ...res.device,
                source: res.device.source as "REAL" | "SIMULATED",
                status: res.device.status as "ONLINE" | "OFFLINE" | "SIMULATING",
              }
            : prev.device,
          connectionState: nextState,
        }));
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to toggle simulation mode");
    }
  };

  // Telemetry transmission handler
  const handleSendTelemetry = async (payload: {
    temperature: number;
    activity: number;
    source: "SIMULATED";
  }): Promise<{ success: boolean; message?: string }> => {
    setActionError(null);
    try {
      const result = await ingestIoTTelemetryAction({
        animalId: currentAnimalId,
        temperature: payload.temperature,
        activity: payload.activity,
        source: "SIMULATED",
      });

      if (!result.success || !result.reading) {
        return {
          success: false,
          message: result.error || "Backend rejected IoT telemetry payload",
        };
      }

      const formattedReading: IoTReadingData = {
        id: result.reading.id,
        source: result.reading.source as "REAL" | "SIMULATED",
        temperature: result.reading.temperature,
        activityIndex: result.reading.activityIndex,
        hasAnomaly: result.reading.hasAnomaly,
        anomalies: result.reading.anomalies,
        recordedAt: result.reading.recordedAt,
      };

      setData((prev) => ({
        ...prev,
        device: result.device
          ? {
              ...result.device,
              source: result.device.source as "REAL" | "SIMULATED",
              status: result.device.status as "ONLINE" | "OFFLINE" | "SIMULATING",
            }
          : prev.device,
        connectionState: (result.connectionState || prev.connectionState) as "REAL_ONLINE" | "REAL_OFFLINE" | "SIMULATION_ACTIVE" | "NO_DEVICE",
        latestReading: formattedReading,
        readings: [formattedReading, ...prev.readings.filter((r) => r.id !== formattedReading.id)],
        summary: {
          ...prev.summary,
          totalReadings: prev.summary.totalReadings + 1,
          simulatedReadings: prev.summary.simulatedReadings + 1,
          anomaliesCount: formattedReading.hasAnomaly ? prev.summary.anomaliesCount + 1 : prev.summary.anomaliesCount,
        },
      }));

      return {
        success: true,
        message: "Reading transmitted successfully",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error during ingestion";
      return {
        success: false,
        message: msg,
      };
    }
  };

  const isSimulating = data.connectionState === "SIMULATION_ACTIVE";

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-6xl mx-auto w-full gap-8 text-[#191F1C]">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/farmer">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-[#D9D3C7] text-stone-700 hover:bg-stone-50 rounded-xl gap-1.5 min-h-[36px]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{t("dashboardTab")}</span>
              </Button>
            </Link>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
              Maitri IoT Telemetry & Biometrics
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#191F1C] tracking-tight">
            {t("title")}
          </h1>
          <p className="text-stone-600 text-xs sm:text-sm mt-1">
            {t("subtitle")}
          </p>
        </div>

        {/* Animal Selector Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="space-y-1">
            <label htmlFor="animal-selector" className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
              {t("selectAnimal")}
            </label>
            <div className="relative">
              <select
                id="animal-selector"
                data-testid="animal-select-dropdown"
                value={currentAnimalId}
                disabled={isPending}
                onChange={(e) => handleAnimalSelect(e.target.value)}
                className="w-full sm:w-64 bg-white border border-[#D9D3C7] text-stone-900 rounded-2xl px-3.5 py-2 text-xs font-semibold appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs"
              >
                {animals.map((an) => (
                  <option key={an.id} value={an.id}>
                    {an.species} — Tag: {an.tag} {an.name ? `(${an.name})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 text-stone-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Device Status Card */}
      <IoTDeviceStatusCard
        device={data.device}
        connectionState={data.connectionState}
        animalTag={data.animal.tag}
        animalSpecies={data.animal.species}
        isPending={isPending}
        onToggleSimulation={handleToggleSimulation}
      />

      {/* Virtual ESP32 Simulator Enclosure (Visible if simulation active or explicitly toggled) */}
      {isSimulating && (
        <MockESP32Simulator
          animalId={data.animal.id}
          animalTag={data.animal.tag}
          isSimulating={isSimulating}
          onSendTelemetry={handleSendTelemetry}
        />
      )}

      {/* Live Biometric Sensor Dashboard & Real-Time Trend Charts */}
      <IoTSensorDashboard
        latestReading={data.latestReading}
        readings={data.readings}
        connectionState={data.connectionState}
      />

      {/* Complete Historical Telemetry Ledger */}
      <IoTReadingsHistoryTable readings={data.readings} />
    </div>
  );
}
