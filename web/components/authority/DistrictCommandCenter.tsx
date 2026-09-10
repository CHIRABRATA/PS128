"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { DistrictCommandCenterData } from "@/lib/authority/metrics";
import { getDistrictAuthorityCommandDataAction } from "@/lib/actions/authority";
import { AuthorityMetricsCards } from "./AuthorityMetricsCards";
import { DistrictCasePipeline } from "./DistrictCasePipeline";
import { SurveillanceHeatmap } from "./SurveillanceHeatmap";
import { AuthorityVisualCharts } from "./AuthorityVisualCharts";
import { PersonnelCoverageSection } from "./PersonnelCoverageSection";
import { VillageAnalysisTable } from "./VillageAnalysisTable";
import { RecentActivityFeed } from "./RecentActivityFeed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Filter,
  RotateCcw,
  BellRing,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
} from "lucide-react";

interface DistrictCommandCenterProps {
  initialData: DistrictCommandCenterData;
  pendingApprovalsCount: number;
}

export function DistrictCommandCenter({
  initialData,
  pendingApprovalsCount,
}: DistrictCommandCenterProps) {
  const [data, setData] = useState<DistrictCommandCenterData>(initialData);
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d" | "90d" | "custom" | "all">(
    (initialData.activeFilters.timeRange as "today" | "7d" | "30d" | "90d" | "custom" | "all") || "30d"
  );
  const [blockId, setBlockId] = useState<string>(initialData.activeFilters.blockId || "");
  const [villageId, setVillageId] = useState<string>(initialData.activeFilters.villageId || "");
  const [customStart, setCustomStart] = useState<string>(initialData.activeFilters.startDate || "");
  const [customEnd, setCustomEnd] = useState<string>(initialData.activeFilters.endDate || "");

  const [isPending, startTransition] = useTransition();

  // Filter villages by selected block
  const availableVillages = blockId
    ? data.filterOptions.villages.filter((v) => v.blockId === blockId)
    : data.filterOptions.villages;

  // Execute database-driven filter update via server action
  const handleApplyFilters = (
    newTimeRange = timeRange,
    newBlockId = blockId,
    newVillageId = villageId,
    newStart = customStart,
    newEnd = customEnd
  ) => {
    startTransition(async () => {
      const refreshedData = await getDistrictAuthorityCommandDataAction({
        timeRange: newTimeRange,
        blockId: newBlockId ? newBlockId : null,
        villageId: newVillageId ? newVillageId : null,
        customStartDate: newTimeRange === "custom" ? newStart : null,
        customEndDate: newTimeRange === "custom" ? newEnd : null,
      });
      setData(refreshedData);
    });
  };

  const handleResetFilters = () => {
    setTimeRange("30d");
    setBlockId("");
    setVillageId("");
    setCustomStart("");
    setCustomEnd("");
    handleApplyFilters("30d", "", "", "", "");
  };

  const activeAlertsCount = data.kpis.activeAlerts;

  return (
    <div className="space-y-8 text-[#191F1C]">
      {/* 1. TOP HEADER & COMMAND CENTER BANNER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#191F1C] tracking-tight">
              {data.districtName} • District Command Center
            </h1>
            <Badge className="bg-purple-100 text-purple-950 border-purple-300 text-xs font-semibold px-2.5 py-0.5">
              Epidemiological Cockpit
            </Badge>
          </div>
          <p className="text-stone-600 text-xs sm:text-sm mt-1">
            Data-driven livestock health surveillance, clinical triage verification, and field personnel coverage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/authority/alerts">
            <Button
              size="sm"
              className="gap-1.5 text-xs bg-red-700 hover:bg-red-800 text-white min-h-[36px] rounded-xl shadow-xs"
            >
              <BellRing className={`h-4 w-4 ${activeAlertsCount > 0 ? "animate-pulse text-amber-300" : ""}`} />
              <span>Active Alerts ({activeAlertsCount})</span>
            </Button>
          </Link>
          <Link href="/authority/approvals">
            <Badge className="text-xs bg-amber-50 text-amber-900 border-amber-300 px-3 py-2 gap-1.5 cursor-pointer rounded-xl hover:bg-amber-100 transition-all font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-700" />
              <span>Pending Approvals: {pendingApprovalsCount}</span>
            </Badge>
          </Link>
        </div>
      </div>

      {/* 2. LIVE QUERY FILTER CONTROLS (Affects Database Queries Server-Side) */}
      <div className="p-4 rounded-3xl bg-white border border-[#E5E0D8] shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E0D8] pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
            <Filter className="h-4 w-4 text-emerald-700" />
            <span>Database Query Filters (Server-Side Filtered)</span>
            {isPending && (
              <span className="flex items-center gap-1.5 text-[11px] font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse border border-emerald-200">
                <RotateCcw className="h-3 w-3 animate-spin" />
                Querying database...
              </span>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetFilters}
            disabled={isPending}
            className="h-7 px-2.5 text-xs text-stone-600 hover:text-stone-900 rounded-xl gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Filters</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Time Range Filter Buttons */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-2">
            <label className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Time Window:</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF8F3] p-1 rounded-2xl border border-[#E5E0D8]">
              {(
                [
                  { id: "today", label: "Today" },
                  { id: "7d", label: "7 Days" },
                  { id: "30d", label: "30 Days" },
                  { id: "90d", label: "90 Days" },
                  { id: "all", label: "All Time" },
                  { id: "custom", label: "Custom" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTimeRange(t.id);
                    if (t.id !== "custom") {
                      handleApplyFilters(t.id, blockId, villageId);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    timeRange === t.id
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Block / Taluka Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>Block / Taluka:</span>
            </label>
            <select
              value={blockId}
              onChange={(e) => {
                const newBlock = e.target.value;
                setBlockId(newBlock);
                setVillageId(""); // Reset village when block changes
                handleApplyFilters(timeRange, newBlock, "");
              }}
              className="w-full h-9 px-3 text-xs bg-[#FAF8F3] border border-[#D9D3C7] rounded-xl focus:border-emerald-700 focus:outline-none"
            >
              <option value="">All Blocks ({data.filterOptions.blocks.length})</option>
              {data.filterOptions.blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.villageCount} villages)
                </option>
              ))}
            </select>
          </div>

          {/* Village Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              <span>Village:</span>
            </label>
            <select
              value={villageId}
              onChange={(e) => {
                const newVillage = e.target.value;
                setVillageId(newVillage);
                handleApplyFilters(timeRange, blockId, newVillage);
              }}
              className="w-full h-9 px-3 text-xs bg-[#FAF8F3] border border-[#D9D3C7] rounded-xl focus:border-emerald-700 focus:outline-none"
            >
              <option value="">All Villages ({availableVillages.length})</option>
              {availableVillages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range Selector (Shown when "Custom" is selected) */}
        {timeRange === "custom" && (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-stone-600">Start Date:</span>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 text-xs bg-white rounded-xl max-w-[150px]"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-stone-600">End Date:</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 text-xs bg-white rounded-xl max-w-[150px]"
              />
            </div>
            <Button
              size="sm"
              onClick={() => handleApplyFilters("custom", blockId, villageId, customStart, customEnd)}
              className="h-8 px-4 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl"
            >
              Apply Custom Range
            </Button>
          </div>
        )}
      </div>

      {/* 3. SUMMARY KPI METRICS CARDS (15 Key Metrics) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#191F1C] flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-700" />
            <span>District Operational & Clinical Indicators</span>
          </h2>
          <span className="text-xs text-stone-500 font-mono">15 Live DB Counters</span>
        </div>
        <AuthorityMetricsCards metrics={data.kpis} />
      </section>

      {/* 4. DISTRICT CASE PIPELINE PROGRESSION */}
      <section>
        <DistrictCasePipeline pipeline={data.pipeline} />
      </section>

      {/* 5. GEOGRAPHIC SURVEILLANCE & GIS HEATMAP */}
      <section>
        <SurveillanceHeatmap
          mapLayers={data.mapLayers}
          districtName={data.districtName}
          onRefreshMap={() => handleApplyFilters(timeRange, blockId, villageId)}
        />
      </section>

      {/* 6. PUBLIC HEALTH SURVEILLANCE CHARTS (9 Real-Data Views) */}
      <section>
        <AuthorityVisualCharts charts={data.charts} />
      </section>

      {/* 7. PERSONNEL RESPONSIBILITY & COVERAGE */}
      <section>
        <PersonnelCoverageSection
          veterinarians={data.veterinarians}
          fieldAgents={data.fieldAgents}
        />
      </section>

      {/* 8. VILLAGE / SUB-DISTRICT BREAKDOWN */}
      <section>
        <VillageAnalysisTable villages={data.villageAnalysis} />
      </section>

      {/* 9. RECENT ACTIVITY FEED */}
      <section>
        <RecentActivityFeed activities={data.recentActivity} />
      </section>
    </div>
  );
}
