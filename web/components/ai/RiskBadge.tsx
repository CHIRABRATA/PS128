"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

interface RiskBadgeProps {
  level?: string | null;
  className?: string;
}

export function RiskBadge({ level = "UNKNOWN", className = "" }: RiskBadgeProps) {
  const normalizedLevel = (level || "UNKNOWN").toUpperCase();

  const badgeConfig: Record<string, { label: string; variant: "destructive" | "warning" | "success" | "outline" | "secondary"; styles: string }> = {
    CRITICAL: { label: "CRITICAL RISK", variant: "destructive", styles: "bg-red-100 text-red-900 border-red-300 font-extrabold" },
    HIGH: { label: "HIGH RISK", variant: "destructive", styles: "bg-red-50 text-red-800 border-red-200 font-bold" },
    ELEVATED: { label: "ELEVATED RISK", variant: "warning", styles: "bg-amber-100 text-amber-950 border-amber-300 font-bold" },
    MEDIUM: { label: "MODERATE RISK", variant: "warning", styles: "bg-amber-50 text-amber-900 border-amber-200 font-medium" },
    LOW: { label: "LOW RISK", variant: "success", styles: "bg-emerald-50 text-emerald-800 border-emerald-200 font-medium" },
  };

  const config = badgeConfig[normalizedLevel] || {
    label: `RISK: ${normalizedLevel}`,
    variant: "outline",
    styles: "bg-[#FAF8F3] text-stone-600 border-[#D9D3C7] font-medium",
  };

  return (
    <Badge
      variant={config.variant}
      className={`text-[10px] tracking-wider px-2.5 py-0.5 border shadow-2xs ${config.styles} ${className}`}
    >
      {config.label}
    </Badge>
  );
}
