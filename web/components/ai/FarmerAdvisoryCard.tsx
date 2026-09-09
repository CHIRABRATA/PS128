"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle } from "lucide-react";

interface FarmerAdvisoryCardProps {
  advisory?: {
    immediate_actions: string[];
    isolation_recommendation: boolean;
    quarantine_days: number;
    home_remedies_safe: string[];
    vet_consultation_urgency: string;
  } | null;
}

export function FarmerAdvisoryCard({ advisory }: FarmerAdvisoryCardProps) {
  if (!advisory) return null;

  return (
    <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3.5 text-[#191F1C]">
      <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-700" />
          <span className="text-xs font-bold text-[#191F1C] uppercase tracking-wider">
            पशुपालक तातडीचा सल्ला (Livestock Owner Advisory)
          </span>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] uppercase font-bold border-amber-300 text-amber-900 bg-amber-50"
        >
          {advisory.vet_consultation_urgency} URGENCY
        </Badge>
      </div>

      {/* Immediate Actions */}
      {advisory.immediate_actions && advisory.immediate_actions.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-stone-700 uppercase tracking-wider">
            तातडीने करावयाची कृती (Immediate Steps):
          </span>
          <ul className="space-y-1 pl-1">
            {advisory.immediate_actions.map((act, idx) => (
              <li key={idx} className="text-xs text-stone-800 flex items-start gap-2">
                <span className="text-emerald-700 font-bold">•</span>
                <span>{act}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quarantine Details */}
      {advisory.isolation_recommendation && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-950">
              जनावरास तात्काळ इतर जनावरांपासून वेगळे करा (Isolate Animal)
            </p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              शिफारस केलेला विलगीकरण कालावधी: <strong>{advisory.quarantine_days || 14} दिवस</strong>. चारा-पाण्याचे भांडे स्वतंत्र ठेवा.
            </p>
          </div>
        </div>
      )}

      {/* Safe Supportive Measures */}
      {advisory.home_remedies_safe && advisory.home_remedies_safe.length > 0 && (
        <div className="space-y-1 pt-1">
          <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider">
            सुरक्षित पूरक काळजी (Supportive Care):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {advisory.home_remedies_safe.map((rem, idx) => (
              <Badge key={idx} variant="secondary" className="text-[10px] bg-white text-stone-700 border border-[#E5E0D8]">
                {rem}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
