"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Thermometer,
  Activity as ActivityIcon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export interface IoTReadingData {
  id: string;
  source: "REAL" | "SIMULATED";
  temperature: number;
  activityIndex: number;
  hasAnomaly: boolean;
  anomalies: string[];
  recordedAt: string | Date;
}

export interface IoTSensorDashboardProps {
  latestReading: IoTReadingData | null;
  readings: IoTReadingData[];
  connectionState?: "REAL_ONLINE" | "REAL_OFFLINE" | "SIMULATION_ACTIVE" | "NO_DEVICE";
}

export function IoTSensorDashboard({
  latestReading,
  readings,
}: IoTSensorDashboardProps) {
  const [hoveredTempIdx, setHoveredTempIdx] = useState<number | null>(null);
  const [hoveredActIdx, setHoveredActIdx] = useState<number | null>(null);

  // Derive temperature status
  const getTempStatus = (temp: number) => {
    if (temp > 39.5) {
      return {
        label: "Above Configured Threshold (> 39.5°C)",
        badge: "Hyperthermia Risk",
        color: "text-rose-700 bg-rose-50 border-rose-200",
        icon: AlertTriangle,
      };
    }
    if (temp < 37.5) {
      return {
        label: "Below Configured Threshold (< 37.5°C)",
        badge: "Hypothermia Risk",
        color: "text-blue-700 bg-blue-50 border-blue-200",
        icon: AlertTriangle,
      };
    }
    return {
      label: "Normal Physiological Range (37.5 - 39.5°C)",
      badge: "Normal",
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      icon: CheckCircle2,
    };
  };

  // Derive activity status
  const getActivityStatus = (act: number) => {
    if (act < 30) {
      return {
        label: "Low Activity / Lethargy (< 30 Index)",
        badge: "Low Activity",
        color: "text-amber-700 bg-amber-50 border-amber-200",
        icon: AlertTriangle,
      };
    }
    return {
      label: "Normal Movement & Ruminating",
      badge: "Normal",
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      icon: CheckCircle2,
    };
  };

  const tempStatus = latestReading ? getTempStatus(latestReading.temperature) : null;
  const actStatus = latestReading ? getActivityStatus(latestReading.activityIndex) : null;

  // Prepare chronological data for charts (sorted oldest to newest)
  const chronologicalReadings = [...readings].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  return (
    <div className="space-y-6">
      {/* 1. Live Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Temperature */}
        <div
          data-testid="temperature-metric-card"
          className="bg-white border border-[#E5E0D8] rounded-3xl p-5 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Core Temperature
            </span>
            <div className="h-8 w-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Thermometer className="h-4 w-4" />
            </div>
          </div>

          <div className="my-3">
            {latestReading ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono tracking-tight text-stone-900">
                  {latestReading.temperature.toFixed(1)}
                </span>
                <span className="text-sm font-semibold text-stone-500">°C</span>
              </div>
            ) : (
              <span className="text-sm text-stone-400 font-medium">No data</span>
            )}
          </div>

          <div>
            {tempStatus ? (
              <Badge className={`text-[11px] font-medium border ${tempStatus.color} py-0.5 px-2`}>
                <tempStatus.icon className="h-3 w-3 mr-1 inline" />
                <span>{tempStatus.badge}</span>
              </Badge>
            ) : (
              <span className="text-[11px] text-stone-400">Awaiting telemetry</span>
            )}
          </div>
        </div>

        {/* Metric 2: Activity Index */}
        <div
          data-testid="activity-metric-card"
          className="bg-white border border-[#E5E0D8] rounded-3xl p-5 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Activity Index
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <ActivityIcon className="h-4 w-4" />
            </div>
          </div>

          <div className="my-3">
            {latestReading ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono tracking-tight text-stone-900">
                  {latestReading.activityIndex}
                </span>
                <span className="text-sm font-semibold text-stone-500">/ 100</span>
              </div>
            ) : (
              <span className="text-sm text-stone-400 font-medium">No data</span>
            )}
          </div>

          <div>
            {actStatus ? (
              <Badge className={`text-[11px] font-medium border ${actStatus.color} py-0.5 px-2`}>
                <actStatus.icon className="h-3 w-3 mr-1 inline" />
                <span>{actStatus.badge}</span>
              </Badge>
            ) : (
              <span className="text-[11px] text-stone-400">Awaiting telemetry</span>
            )}
          </div>
        </div>

        {/* Metric 3: Observation & Risk */}
        <div
          data-testid="observation-metric-card"
          className="bg-white border border-[#E5E0D8] rounded-3xl p-5 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Sensor Observation
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>

          <div className="my-2">
            {latestReading ? (
              latestReading.hasAnomaly && latestReading.anomalies.length > 0 ? (
                <div className="space-y-1">
                  {latestReading.anomalies.map((anom, i) => (
                    <span
                      key={i}
                      className="inline-block text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md mr-1 mb-1"
                    >
                      {anom === "hyperthermia"
                        ? "Elevated Temperature"
                        : anom === "hypothermia"
                        ? "Low Temperature"
                        : anom === "low_activity"
                        ? "Low Activity"
                        : anom}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Normal Range
                </span>
              )
            ) : (
              <span className="text-sm text-stone-400 font-medium">No anomalies recorded</span>
            )}
          </div>

          <p className="text-[10px] text-stone-500 italic mt-1">
            Veterinary examination recommended
          </p>
        </div>

        {/* Metric 4: Source & Last Seen */}
        <div
          data-testid="source-metric-card"
          className="bg-white border border-[#E5E0D8] rounded-3xl p-5 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Data Source
            </span>
            <div className="h-8 w-8 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600">
              <Radio className="h-4 w-4" />
            </div>
          </div>

          <div className="my-3">
            {latestReading ? (
              latestReading.source === "SIMULATED" ? (
                <Badge
                  data-testid="latest-reading-simulated-badge"
                  className="bg-amber-100 text-amber-900 border border-amber-300 font-mono text-xs px-2.5 py-1 tracking-wider uppercase"
                >
                  SIMULATED ESP32
                </Badge>
              ) : (
                <Badge
                  data-testid="latest-reading-real-badge"
                  className="bg-blue-100 text-blue-900 border border-blue-300 font-mono text-xs px-2.5 py-1 tracking-wider uppercase"
                >
                  REAL ESP32
                </Badge>
              )
            ) : (
              <span className="text-xs text-stone-400">No source active</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
            <Clock className="h-3 w-3 text-stone-400" />
            <span>Updated:</span>
            <span className="font-mono font-medium text-stone-800">
              {latestReading ? formatDateTime(latestReading.recordedAt) : "Never"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Biometric Sensor Trends (SVG Line Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: Temperature Trend */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs overflow-hidden">
          <CardHeader className="p-5 border-b border-[#F0EBE1] pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-[#191F1C] flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-rose-600" />
                  <span>Core Temperature Trend (°C)</span>
                </CardTitle>
                <CardDescription className="text-xs text-stone-500 mt-0.5">
                  Hyperthermia threshold at 39.5°C | Hypothermia threshold at 37.5°C
                </CardDescription>
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                {chronologicalReadings.length} readings
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            {chronologicalReadings.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center bg-[#FAF8F3]/50 rounded-2xl border border-dashed border-[#E5E0D8] p-4">
                <Thermometer className="h-6 w-6 text-stone-300 mb-1" />
                <p className="text-xs font-semibold text-stone-600">No IoT Telemetry Recorded Yet</p>
                <p className="text-[11px] text-stone-400">
                  Transmit a reading from the simulator or physical ESP32 to populate trend.
                </p>
              </div>
            ) : (
              <div className="relative">
                <svg
                  viewBox="0 0 500 200"
                  className="w-full h-48 overflow-visible"
                  preserveAspectRatio="none"
                >
                  {/* Grid Lines & Labels */}
                  {/* Min temp 36.0 -> y=180, Max temp 42.0 -> y=20 */}
                  {/* Threshold: 39.5°C -> y = 20 + (42.0 - 39.5)/(42.0 - 36.0) * 160 = 20 + (2.5/6.0)*160 = 86.6 */}
                  {/* Threshold: 37.5°C -> y = 20 + (42.0 - 37.5)/6.0 * 160 = 20 + (4.5/6.0)*160 = 140 */}
                  <line x1="40" y1="20" x2="490" y2="20" stroke="#F0EBE1" strokeWidth="1" />
                  <text x="32" y="24" fontSize="10" fill="#A8A29E" textAnchor="end">42°</text>

                  {/* 39.5°C Hyperthermia Line */}
                  <line
                    x1="40"
                    y1="86.6"
                    x2="490"
                    y2="86.6"
                    stroke="#FDA4AF"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text x="490" y="82" fontSize="9" fill="#E11D48" textAnchor="end" fontWeight="bold">
                    39.5°C Alert Threshold
                  </text>

                  {/* 37.5°C Hypothermia Line */}
                  <line
                    x1="40"
                    y1="140"
                    x2="490"
                    y2="140"
                    stroke="#93C5FD"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text x="490" y="136" fontSize="9" fill="#2563EB" textAnchor="end" fontWeight="bold">
                    37.5°C Hypothermia Threshold
                  </text>

                  <line x1="40" y1="180" x2="490" y2="180" stroke="#F0EBE1" strokeWidth="1" />
                  <text x="32" y="184" fontSize="10" fill="#A8A29E" textAnchor="end">36°</text>

                  {/* Plot temperature line */}
                  {(() => {
                    const minT = 36.0;
                    const maxT = 42.0;
                    const count = chronologicalReadings.length;
                    const stepX = count > 1 ? (450) / (count - 1) : 225;

                    const points = chronologicalReadings.map((r, i) => {
                      const clamped = Math.max(minT, Math.min(maxT, r.temperature));
                      const y = 20 + ((maxT - clamped) / (maxT - minT)) * 160;
                      const x = count > 1 ? 40 + i * stepX : 245;
                      return { x, y, temp: r.temperature, time: r.recordedAt, source: r.source };
                    });

                    const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");

                    return (
                      <>
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#E11D48"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {points.map((p, idx) => (
                          <g key={idx}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={hoveredTempIdx === idx ? 6 : 4}
                              fill={p.source === "SIMULATED" ? "#F59E0B" : "#2563EB"}
                              stroke="#FFFFFF"
                              strokeWidth="2"
                              className="cursor-pointer transition-all"
                              onMouseEnter={() => setHoveredTempIdx(idx)}
                              onMouseLeave={() => setHoveredTempIdx(null)}
                            />
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>

                {/* Tooltip */}
                {hoveredTempIdx !== null && chronologicalReadings[hoveredTempIdx] && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-lg pointer-events-none font-mono flex items-center gap-2">
                    <span className="text-rose-400 font-bold">
                      {chronologicalReadings[hoveredTempIdx].temperature}°C
                    </span>
                    <span className="text-stone-400">|</span>
                    <span className="text-amber-300">
                      [{chronologicalReadings[hoveredTempIdx].source === "SIMULATED" ? "SIMULATED ESP32" : "REAL ESP32"}]
                    </span>
                    <span className="text-stone-400">|</span>
                    <span className="text-stone-300">
                      {formatDateTime(chronologicalReadings[hoveredTempIdx].recordedAt)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart B: Activity Trend */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs overflow-hidden">
          <CardHeader className="p-5 border-b border-[#F0EBE1] pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-[#191F1C] flex items-center gap-2">
                  <ActivityIcon className="h-4 w-4 text-emerald-600" />
                  <span>Activity Index Trend (0 - 100)</span>
                </CardTitle>
                <CardDescription className="text-xs text-stone-500 mt-0.5">
                  Lethargy alert threshold at &lt; 30 movement score
                </CardDescription>
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                {chronologicalReadings.length} readings
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            {chronologicalReadings.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center bg-[#FAF8F3]/50 rounded-2xl border border-dashed border-[#E5E0D8] p-4">
                <ActivityIcon className="h-6 w-6 text-stone-300 mb-1" />
                <p className="text-xs font-semibold text-stone-600">No IoT Telemetry Recorded Yet</p>
                <p className="text-[11px] text-stone-400">
                  Transmit a reading from the simulator or physical ESP32 to populate trend.
                </p>
              </div>
            ) : (
              <div className="relative">
                <svg
                  viewBox="0 0 500 200"
                  className="w-full h-48 overflow-visible"
                  preserveAspectRatio="none"
                >
                  {/* Grid Lines & Labels */}
                  {/* Min Act 0 -> y=180, Max Act 100 -> y=20 */}
                  {/* Threshold: 30 -> y = 20 + ((100 - 30)/100)*160 = 20 + 112 = 132 */}
                  <line x1="40" y1="20" x2="490" y2="20" stroke="#F0EBE1" strokeWidth="1" />
                  <text x="32" y="24" fontSize="10" fill="#A8A29E" textAnchor="end">100</text>

                  {/* 30 Lethargy Line */}
                  <line
                    x1="40"
                    y1="132"
                    x2="490"
                    y2="132"
                    stroke="#FCD34D"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text x="490" y="128" fontSize="9" fill="#D97706" textAnchor="end" fontWeight="bold">
                    30 Lethargy Threshold
                  </text>

                  <line x1="40" y1="180" x2="490" y2="180" stroke="#F0EBE1" strokeWidth="1" />
                  <text x="32" y="184" fontSize="10" fill="#A8A29E" textAnchor="end">0</text>

                  {/* Plot activity line */}
                  {(() => {
                    const minA = 0;
                    const maxA = 100;
                    const count = chronologicalReadings.length;
                    const stepX = count > 1 ? (450) / (count - 1) : 225;

                    const points = chronologicalReadings.map((r, i) => {
                      const clamped = Math.max(minA, Math.min(maxA, r.activityIndex));
                      const y = 20 + ((maxA - clamped) / (maxA - minA)) * 160;
                      const x = count > 1 ? 40 + i * stepX : 245;
                      return { x, y, act: r.activityIndex, time: r.recordedAt, source: r.source };
                    });

                    const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");

                    return (
                      <>
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#059669"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {points.map((p, idx) => (
                          <g key={idx}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={hoveredActIdx === idx ? 6 : 4}
                              fill={p.source === "SIMULATED" ? "#F59E0B" : "#059669"}
                              stroke="#FFFFFF"
                              strokeWidth="2"
                              className="cursor-pointer transition-all"
                              onMouseEnter={() => setHoveredActIdx(idx)}
                              onMouseLeave={() => setHoveredActIdx(null)}
                            />
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>

                {/* Tooltip */}
                {hoveredActIdx !== null && chronologicalReadings[hoveredActIdx] && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-lg pointer-events-none font-mono flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">
                      Activity: {chronologicalReadings[hoveredActIdx].activityIndex}
                    </span>
                    <span className="text-stone-400">|</span>
                    <span className="text-amber-300">
                      [{chronologicalReadings[hoveredActIdx].source === "SIMULATED" ? "SIMULATED ESP32" : "REAL ESP32"}]
                    </span>
                    <span className="text-stone-400">|</span>
                    <span className="text-stone-300">
                      {formatDateTime(chronologicalReadings[hoveredActIdx].recordedAt)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
