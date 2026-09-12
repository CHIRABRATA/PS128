"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { IoTReadingData } from "./IoTSensorDashboard";

export interface IoTReadingsHistoryTableProps {
  readings: IoTReadingData[];
}

export function IoTReadingsHistoryTable({ readings }: IoTReadingsHistoryTableProps) {
  return (
    <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs overflow-hidden">
      <CardHeader className="p-5 border-b border-[#F0EBE1] pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600">
              <History className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-[#191F1C]">
                Telemetry Transmission Ledger
              </CardTitle>
              <CardDescription className="text-xs text-stone-500">
                Authoritative chronological record of physical & simulated readings
              </CardDescription>
            </div>
          </div>
          <span className="text-xs font-mono font-medium text-stone-600 bg-stone-100 px-2.5 py-1 rounded-lg">
            {readings.length} total entries
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {readings.length === 0 ? (
          <div
            data-testid="no-history-state"
            className="p-8 text-center flex flex-col items-center justify-center space-y-1 bg-[#FAF8F3]/40"
          >
            <History className="h-6 w-6 text-stone-300 mb-1" />
            <p className="text-xs font-semibold text-stone-600">No IoT data recorded yet</p>
            <p className="text-[11px] text-stone-400">
              Historical readings will appear here once ingested from physical or virtual ESP32.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse" data-testid="iot-history-table">
              <thead className="bg-[#FAF8F3] border-b border-[#E5E0D8] text-stone-600 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Recorded Time</th>
                  <th className="py-2.5 px-4 font-semibold">Temperature</th>
                  <th className="py-2.5 px-4 font-semibold">Activity Index</th>
                  <th className="py-2.5 px-4 font-semibold">Source</th>
                  <th className="py-2.5 px-4 font-semibold">Observation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE1]">
                {readings.map((reading) => {
                  const isSimulated = reading.source === "SIMULATED";
                  const isFever = reading.temperature > 39.5;
                  const isHypo = reading.temperature < 37.5;
                  const isLethargic = reading.activityIndex < 30;

                  return (
                    <tr
                      key={reading.id}
                      data-testid={`reading-row-${reading.id}`}
                      className="hover:bg-stone-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-stone-700 whitespace-nowrap">
                        {formatDateTime(reading.recordedAt)}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                        <span className={isFever ? "text-rose-600" : isHypo ? "text-blue-600" : "text-stone-900"}>
                          {reading.temperature.toFixed(1)}°C
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-stone-900 whitespace-nowrap">
                        <span className={isLethargic ? "text-amber-600" : "text-emerald-700"}>
                          {reading.activityIndex}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {isSimulated ? (
                          <Badge
                            data-testid="reading-source-simulated"
                            className="bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[10px] px-2 py-0.5 tracking-wider uppercase"
                          >
                            SIMULATED ESP32
                          </Badge>
                        ) : (
                          <Badge
                            data-testid="reading-source-real"
                            className="bg-blue-100 text-blue-900 border border-blue-300 font-mono text-[10px] px-2 py-0.5 tracking-wider uppercase"
                          >
                            REAL ESP32
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {reading.hasAnomaly && reading.anomalies.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {reading.anomalies.map((anom, idx) => (
                              <Badge
                                key={idx}
                                className="bg-rose-100 text-rose-900 border-rose-300 text-[10px] py-0.5 px-1.5 gap-1"
                              >
                                <AlertCircle className="h-2.5 w-2.5" />
                                <span>
                                  {anom === "hyperthermia"
                                    ? "Hyperthermia Risk"
                                    : anom === "hypothermia"
                                    ? "Hypothermia Risk"
                                    : anom === "low_activity"
                                    ? "Low Activity / Lethargy"
                                    : anom}
                                </span>
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] py-0.5 px-1.5 gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-700" />
                            <span>Normal Baseline</span>
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
