"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DistrictPipelineStage } from "@/lib/authority/metrics";
import { Clock, Eye, TestTube, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";

interface DistrictCasePipelineProps {
  pipeline: DistrictPipelineStage[];
}

export function DistrictCasePipeline({ pipeline }: DistrictCasePipelineProps) {
  const totalCases = pipeline.reduce((sum, p) => sum + p.count, 0);

  const getStageIcon = (status: string) => {
    switch (status) {
      case "PENDING_REVIEW":
        return <Clock className="h-4 w-4 text-amber-600" />;
      case "UNDER_EXAMINATION":
        return <Eye className="h-4 w-4 text-orange-600" />;
      case "LAB_REFERRAL":
        return <TestTube className="h-4 w-4 text-purple-600" />;
      case "CONFIRMED":
        return <CheckCircle2 className="h-4 w-4 text-red-600" />;
      case "CLOSED_HARMLESS":
        return <ShieldCheck className="h-4 w-4 text-emerald-600" />;
      default:
        return <Clock className="h-4 w-4 text-stone-500" />;
    }
  };

  return (
    <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-[#E5E0D8]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold text-[#191F1C] flex items-center gap-2">
              <span>District Clinical Case Pipeline</span>
            </CardTitle>
            <CardDescription className="text-xs text-stone-500">
              Live case triage stages across the authorized jurisdiction • {totalCases} total cases tracked
            </CardDescription>
          </div>
          <Badge className="bg-stone-100 text-stone-700 border-stone-200 text-xs w-fit">
            5 Prisma Case Stages
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* Progress Bar Ribbon */}
        <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden flex">
          {pipeline.map((stage) => {
            if (stage.percentage <= 0 && stage.count === 0) return null;
            return (
              <div
                key={stage.status}
                style={{
                  width: totalCases > 0 ? `${(stage.count / totalCases) * 100}%` : "20%",
                  backgroundColor: stage.color,
                }}
                className="h-full transition-all duration-500"
                title={`${stage.label}: ${stage.count} cases (${stage.percentage}%)`}
              />
            );
          })}
        </div>

        {/* Stage Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {pipeline.map((stage, idx) => (
            <div
              key={stage.status}
              className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] flex flex-col justify-between space-y-2 relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {getStageIcon(stage.status)}
                  <span className="text-xs font-bold text-stone-800">{stage.label}</span>
                </div>
                {idx < pipeline.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-stone-300 hidden lg:block absolute -right-2 top-4 z-10" />
                )}
              </div>

              <div>
                <div className="text-2xl font-bold font-mono" style={{ color: stage.color }}>
                  {stage.count}
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-500 mt-0.5">
                  <span>Share of total</span>
                  <span className="font-semibold text-stone-700 font-mono">{stage.percentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
