"use client";

import React from "react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { getReportCopy } from "@/lib/i18n/report";
import { Badge } from "@/components/ui/badge";

interface RiskGaugeProps {
  score: number;
  level: string;
}

export function RiskGauge({ score, level }: RiskGaugeProps) {
  const { locale } = useLocale();
  const copy = getReportCopy(locale);
  const percentage = Math.min(Math.max(score, 0), 100);

  const getLevelConfig = (lvl: string) => {
    switch (lvl.toUpperCase()) {
      case "CRITICAL":
        return {
          stroke: "#DC2626", // Red-600
          track: "#FEE2E2", // Red-100
          text: "text-red-700",
          badge: "bg-red-50 text-red-700 border-red-200",
          label: "CRITICAL",
        };
      case "HIGH":
        return {
          stroke: "#EA580C", // Orange-600
          track: "#FFEDD5", // Orange-100
          text: "text-orange-700",
          badge: "bg-orange-50 text-orange-700 border-orange-200",
          label: "HIGH",
        };
      case "ELEVATED":
        return {
          stroke: "#D97706", // Amber-600
          track: "#FEF3C7", // Amber-100
          text: "text-amber-700",
          badge: "bg-amber-50 text-amber-800 border-amber-200",
          label: "ELEVATED",
        };
      case "MEDIUM":
        return {
          stroke: "#CA8A04", // Yellow-600
          track: "#FEF9C3", // Yellow-100
          text: "text-yellow-800",
          badge: "bg-yellow-50 text-yellow-800 border-yellow-200",
          label: "MODERATE",
        };
      case "LOW":
      default:
        return {
          stroke: "#059669", // Emerald-600
          track: "#D1FAE5", // Emerald-100
          text: "text-emerald-700",
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
          label: "LOW",
        };
    }
  };

  const config = getLevelConfig(level);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-3 text-center">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Subtle background track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={config.track}
            strokeWidth="8"
            fill="transparent"
          />
          {/* Animated score arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={config.stroke}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Score Display - High Contrast and Legible */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black font-mono tracking-tight text-stone-900 leading-none">
            {score}
          </span>
          <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-stone-500 mt-0.5">
            / 100
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-col items-center gap-1">
        <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
          {copy.riskScore || "Overall Risk Score"}
        </span>
        <Badge className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${config.badge}`}>
          {config.label} RISK
        </Badge>
      </div>
    </div>
  );
}
