"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Cpu,
  Send,
  Play,
  Pause,
  Square,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Thermometer,
  Activity as ActivityIcon,
  RefreshCw,
  Sliders,
  Radio,
} from "lucide-react";
import { useTranslations } from "next-intl";

export type SimulationScenario = "NORMAL" | "WARNING" | "CRITICAL" | "CUSTOM";

export interface MockESP32SimulatorProps {
  animalId: string;
  animalTag: string;
  isSimulating: boolean;
  onSendTelemetry: (payload: {
    temperature: number;
    activity: number;
    source: "SIMULATED";
  }) => Promise<{ success: boolean; message?: string }>;
}

const PRESETS: Record<Exclude<SimulationScenario, "CUSTOM">, { temperature: number; activity: number; label: string; description: string }> = {
  NORMAL: {
    temperature: 38.4,
    activity: 72,
    label: "Normal",
    description: "Standard physiological baseline",
  },
  WARNING: {
    temperature: 39.2,
    activity: 35,
    label: "Warning",
    description: "Mild temperature elevation, declining mobility",
  },
  CRITICAL: {
    temperature: 40.2,
    activity: 18,
    label: "Critical",
    description: "Hyperthermia > 39.5°C & Severe lethargy < 30",
  },
};

export function MockESP32Simulator({
  animalId,
  animalTag,
  onSendTelemetry,
}: MockESP32SimulatorProps) {
  const t = useTranslations("iot");
  const [scenario, setScenario] = useState<SimulationScenario>("NORMAL");
  const [customTemp, setCustomTemp] = useState<string>("38.5");
  const [customActivity, setCustomActivity] = useState<string>("65");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Transmission state
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [transmissionStatus, setTransmissionStatus] = useState<"IDLE" | "SENDING" | "SUCCESS" | "ERROR">("IDLE");
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Automated Simulation Loop
  const [autoRunning, setAutoRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [intervalSec, setIntervalSec] = useState<number>(5);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopAutoSimulation = React.useCallback(() => {
    if (intervalTimerRef.current) {
      clearInterval(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }
    setAutoRunning(false);
    setIsPaused(false);
  }, []);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
        intervalTimerRef.current = null;
      }
    };
  }, []);

  const getActiveDisplayValues = (): { temperature: number; activity: number } => {
    if (scenario === "CUSTOM") {
      const tempNum = parseFloat(customTemp);
      const actNum = parseFloat(customActivity);
      return {
        temperature: isNaN(tempNum) ? 38.5 : Number(tempNum.toFixed(1)),
        activity: isNaN(actNum) ? 65 : Math.round(actNum),
      };
    }
    const preset = PRESETS[scenario];
    return { temperature: preset.temperature, activity: preset.activity };
  };

  const validateAndGetValues = (): { temperature: number; activity: number } | null => {
    if (scenario === "CUSTOM") {
      const tempNum = parseFloat(customTemp);
      const actNum = parseFloat(customActivity);

      if (isNaN(tempNum) || isNaN(actNum)) {
        setValidationError("Temperature and Activity must be valid numbers");
        return null;
      }

      if (tempNum < 25 || tempNum > 45) {
        setValidationError("Temperature must be between 25°C and 45°C");
        return null;
      }

      if (actNum < 0 || actNum > 150) {
        setValidationError("Activity index must be between 0 and 150");
        return null;
      }

      setValidationError(null);
      return { temperature: Number(tempNum.toFixed(1)), activity: Math.round(actNum) };
    }

    setValidationError(null);
    const preset = PRESETS[scenario];
    return { temperature: preset.temperature, activity: preset.activity };
  };

  const handleManualSend = async () => {
    const values = validateAndGetValues();
    if (!values) return;

    setIsTransmitting(true);
    setTransmissionStatus("SENDING");
    setStatusMessage("Sending sensor reading...");

    try {
      const result = await onSendTelemetry({
        temperature: values.temperature,
        activity: values.activity,
        source: "SIMULATED",
      });

      if (result.success) {
        setTransmissionStatus("SUCCESS");
        setStatusMessage("Reading transmitted");
      } else {
        setTransmissionStatus("ERROR");
        setStatusMessage(result.message || "Transmission failed");
      }
    } catch (err: unknown) {
      setTransmissionStatus("ERROR");
      setStatusMessage(err instanceof Error ? err.message : "Transmission failed");
    } finally {
      setIsTransmitting(false);
    }
  };

  const executeTick = async () => {
    const values = validateAndGetValues();
    if (!values) return;

    // In auto mode, apply subtle natural biometric jitter (+/- 0.1°C, +/- 1 activity)
    let jitteredTemp = values.temperature;
    let jitteredAct = values.activity;

    if (scenario !== "CUSTOM") {
      const tempJitter = (Math.random() * 0.2 - 0.1);
      const actJitter = Math.floor(Math.random() * 3 - 1);
      jitteredTemp = Number((values.temperature + tempJitter).toFixed(1));
      jitteredAct = Math.max(0, values.activity + actJitter);
    }

    setIsTransmitting(true);
    setTransmissionStatus("SENDING");
    setStatusMessage("Sending sensor reading...");

    try {
      const res = await onSendTelemetry({
        temperature: jitteredTemp,
        activity: jitteredAct,
        source: "SIMULATED",
      });

      if (res.success) {
        setTransmissionStatus("SUCCESS");
        setStatusMessage("Reading transmitted");
      } else {
        setTransmissionStatus("ERROR");
        setStatusMessage(res.message || "Transmission failed");
      }
    } catch {
      setTransmissionStatus("ERROR");
      setStatusMessage("Transmission failed");
    } finally {
      setIsTransmitting(false);
    }
  };

  const startAutoSimulation = () => {
    if (intervalTimerRef.current) {
      clearInterval(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }

    setAutoRunning(true);
    setIsPaused(false);

    // Run first tick immediately
    executeTick();

    // Start interval
    intervalTimerRef.current = setInterval(() => {
      executeTick();
    }, intervalSec * 1000);
  };

  const pauseAutoSimulation = () => {
    if (intervalTimerRef.current) {
      clearInterval(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }
    setIsPaused(true);
  };

  const resumeAutoSimulation = () => {
    if (intervalTimerRef.current) {
      clearInterval(intervalTimerRef.current);
    }
    setIsPaused(false);
    executeTick();
    intervalTimerRef.current = setInterval(() => {
      executeTick();
    }, intervalSec * 1000);
  };

  const activeValues = getActiveDisplayValues();

  return (
    <Card className="border-stone-800 bg-[#121614] text-stone-100 rounded-3xl overflow-hidden shadow-lg">
      {/* Header bar / Virtual ESP32 Enclosure Header */}
      <CardHeader className="bg-[#19201C] border-b border-stone-800 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm sm:text-base font-bold text-stone-100 tracking-wide">
                  Virtual ESP32 Simulator
                </CardTitle>
                <Badge className="bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] px-2 py-0.5">
                  TAG #{animalTag}
                </Badge>
              </div>
              <CardDescription className="text-stone-400 text-xs">
                Emulates telemetry payload ingested via authoritative <span className="font-mono text-emerald-400">POST /api/iot/data</span>
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-700 text-[11px] font-mono">
              <span className={`h-2 w-2 rounded-full ${autoRunning && !isPaused ? "bg-emerald-400 animate-ping" : isPaused ? "bg-amber-400" : "bg-stone-500"}`} />
              <span className="text-stone-300">
                {autoRunning ? (isPaused ? "LOOP PAUSED" : "LOOP ACTIVE") : "MANUAL TRIGGER"}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Scenario Presets */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
              1. Select Biometric Simulation Preset
            </Label>
            <span className="text-[11px] text-stone-400 italic">
              Simulation presets only • Not clinical diagnoses
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(["NORMAL", "WARNING", "CRITICAL", "CUSTOM"] as SimulationScenario[]).map((sc) => {
              const isSelected = scenario === sc;
              return (
                <button
                  key={sc}
                  type="button"
                  onClick={() => {
                    setScenario(sc);
                    setValidationError(null);
                  }}
                  className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? "bg-emerald-950/60 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500"
                      : "bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-800/80 hover:border-stone-700"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold tracking-wide">
                      {sc === "CUSTOM" ? "CUSTOM" : PRESETS[sc].label}
                    </span>
                    {sc === "CRITICAL" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    )}
                    {sc === "WARNING" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    )}
                    {sc === "NORMAL" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <span className="text-[11px] text-stone-400 font-mono">
                    {sc === "CUSTOM" ? "User values" : `${PRESETS[sc].temperature}°C | Act: ${PRESETS[sc].activity}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Input Fields (if CUSTOM) */}
        {scenario === "CUSTOM" && (
          <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-700/80 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <Sliders className="h-3.5 w-3.5" />
              <span>Custom Telemetry Parameters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="custom-temp" className="text-xs text-stone-300">
                  Core Temperature (°C)
                </Label>
                <div className="relative">
                  <Input
                    id="custom-temp"
                    data-testid="custom-temp-input"
                    type="number"
                    step="0.1"
                    min="25"
                    max="45"
                    value={customTemp}
                    onChange={(e) => setCustomTemp(e.target.value)}
                    className="bg-stone-950 border-stone-700 text-white font-mono text-sm h-9"
                    placeholder="38.5"
                  />
                  <span className="absolute right-3 top-2 text-xs text-stone-400 font-mono">°C</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custom-activity" className="text-xs text-stone-300">
                  Activity Index (0 - 150)
                </Label>
                <Input
                  id="custom-activity"
                  data-testid="custom-activity-input"
                  type="number"
                  step="1"
                  min="0"
                  max="150"
                  value={customActivity}
                  onChange={(e) => setCustomActivity(e.target.value)}
                  className="bg-stone-950 border-stone-700 text-white font-mono text-sm h-9"
                  placeholder="65"
                />
              </div>
            </div>

            {validationError && (
              <div className="text-xs text-rose-400 flex items-center gap-1.5 pt-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>
        )}

        {/* Real-time Staged Telemetry Readout */}
        <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <Thermometer className="h-4 w-4 text-rose-400" />
              <div>
                <span className="text-[10px] uppercase text-stone-400 tracking-wider block">Target Temp</span>
                <span className="text-base font-mono font-bold text-white">{activeValues.temperature}°C</span>
              </div>
            </div>

            <div className="h-8 w-px bg-stone-800" />

            <div className="flex items-center gap-2.5">
              <ActivityIcon className="h-4 w-4 text-emerald-400" />
              <div>
                <span className="text-[10px] uppercase text-stone-400 tracking-wider block">Target Activity</span>
                <span className="text-base font-mono font-bold text-white">{activeValues.activity}</span>
              </div>
            </div>
          </div>

          {/* Trigger button */}
          <Button
            type="button"
            data-testid="generate-reading-btn"
            disabled={isTransmitting || autoRunning}
            onClick={handleManualSend}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 h-9 rounded-xl gap-2 shadow-md transition-all"
          >
            {isTransmitting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Transmitting...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>{t("generateReading")}</span>
              </>
            )}
          </Button>
        </div>

        {/* Transmission Status Feedback Banner */}
        {transmissionStatus !== "IDLE" && (
          <div
            data-testid="transmission-status-banner"
            className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
              transmissionStatus === "SENDING"
                ? "bg-blue-950/60 border-blue-600/40 text-blue-200"
                : transmissionStatus === "SUCCESS"
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
                : "bg-rose-950/60 border-rose-600/40 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {transmissionStatus === "SENDING" && <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />}
              {transmissionStatus === "SUCCESS" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
              {transmissionStatus === "ERROR" && <XCircle className="h-3.5 w-3.5 text-rose-400" />}
              <span>{statusMessage}</span>
            </div>

            <span className="text-[10px] text-stone-400">
              Payload: {`{ animal_id: "${animalId}", temp: ${activeValues.temperature}, act: ${activeValues.activity} }`}
            </span>
          </div>
        )}

        {/* Automated Simulation Controls */}
        <div className="pt-2 border-t border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-stone-400" />
            <span className="text-xs text-stone-300 font-medium">Automatic Transmission Loop:</span>
            <select
              aria-label="Simulation interval"
              value={intervalSec}
              disabled={autoRunning}
              onChange={(e) => setIntervalSec(Number(e.target.value))}
              className="bg-stone-900 border border-stone-700 text-stone-200 rounded-lg text-xs px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value={5}>Every 5 seconds</option>
              <option value={10}>Every 10 seconds</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {!autoRunning ? (
              <Button
                type="button"
                data-testid="start-simulation-btn"
                variant="outline"
                size="sm"
                onClick={startAutoSimulation}
                className="h-8 text-xs border-emerald-600 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 rounded-xl gap-1.5"
              >
                <Play className="h-3 w-3 fill-emerald-400 text-emerald-400" />
                <span>Start Simulation</span>
              </Button>
            ) : (
              <>
                {isPaused ? (
                  <Button
                    type="button"
                    data-testid="resume-simulation-btn"
                    variant="outline"
                    size="sm"
                    onClick={resumeAutoSimulation}
                    className="h-8 text-xs border-amber-600 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 rounded-xl gap-1.5"
                  >
                    <Play className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span>{t("resume")}</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    data-testid="pause-simulation-btn"
                    variant="outline"
                    size="sm"
                    onClick={pauseAutoSimulation}
                    className="h-8 text-xs border-amber-600 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 rounded-xl gap-1.5"
                  >
                    <Pause className="h-3 w-3 text-amber-400" />
                    <span>Pause</span>
                  </Button>
                )}

                <Button
                  type="button"
                  data-testid="stop-simulation-btn"
                  variant="outline"
                  size="sm"
                  onClick={stopAutoSimulation}
                  className="h-8 text-xs border-rose-700 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 rounded-xl gap-1.5"
                >
                  <Square className="h-3 w-3 fill-rose-400 text-rose-400" />
                  <span>{t("stop")}</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
