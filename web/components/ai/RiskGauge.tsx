"use client";

import React from "react";

interface RiskGaugeProps {
  score: number;
  level: string;
}

export function RiskGauge({ score, level }: RiskGaugeProps) {
  const percentage = Math.min(Math.max(score, 0), 100);

  const getColor = (lvl: string) => {
    switch (lvl.toUpperCase()) {
      case "CRITICAL":
        return "#dc2626"; // red
      case "HIGH":
        return "#ea580c"; // orange-red
      case "ELEVATED":
        return "#d97706"; // amber
      case "MEDIUM":
        return "#ca8a04"; // yellow-amber
      case "LOW":
      default:
        return "#059669"; // emerald
    }
  };

  const strokeColor = getColor(level);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="text-stone-800"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={strokeColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black tracking-tight text-white font-mono">
            {score}
          </span>
          <span className="text-[9px] uppercase tracking-widest text-stone-400 font-bold">
            / 100
          </span>
        </div>
      </div>

      <span className="text-[11px] font-bold text-stone-300 mt-1 uppercase tracking-wider">
        एकूण रोग धोका स्कोअर
      </span>
    </div>
  );
}
