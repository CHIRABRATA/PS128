"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartDataPoint } from "@/lib/authority/metrics";
import {
  PieChart as PieChartIcon,
  TrendingUp,
  MapPin,
  Stethoscope,
  ShieldCheck,
  PawPrint,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

interface AuthorityVisualChartsProps {
  charts: {
    casesByStatus: ChartDataPoint[];
    casesByRisk: ChartDataPoint[];
    casesOverTime: ChartDataPoint[];
    casesByVillage: ChartDataPoint[];
    vetWorkload: ChartDataPoint[];
    agentWorkload: ChartDataPoint[];
    speciesDistribution: ChartDataPoint[];
    alertsBySeverity: ChartDataPoint[];
    assistanceRequestStatus: ChartDataPoint[];
  };
}

// Clean Empty State Component
function ChartEmptyState({ message }: { message?: string }) {
  const t = useTranslations("authority");
  const msg = message || t("noActivityPeriod");
  return (
    <div className="h-48 w-full flex flex-col items-center justify-center text-center p-4 bg-[#FAF8F3]/50 rounded-2xl border border-dashed border-[#E5E0D8] space-y-1">
      <p className="text-xs font-semibold text-stone-600">{msg}</p>
      <p className="text-[11px] text-stone-400">{t("recordsWillAppear")}</p>
    </div>
  );
}

// 1. Donut / Progress Distribution Visualizer
function DonutVisualizer({ data }: { data: ChartDataPoint[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <ChartEmptyState message="No activity recorded during this period." />;

  return (
    <div className="space-y-3">
      {/* Top stacked progress bar */}
      <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden flex">
        {data.map((item, idx) => {
          if (item.value === 0) return null;
          const pct = (item.value / total) * 100;
          return (
            <div
              key={idx}
              style={{ width: `${pct}%`, backgroundColor: item.color || "#059669" }}
              className="h-full transition-all duration-300"
              title={`${item.label}: ${item.value} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      {/* Item legend grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {data.map((item, idx) => (
          <div key={idx} className="p-2 rounded-xl bg-[#FAF8F3] border border-[#E5E0D8] flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate mr-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color || "#059669" }} />
              <span className="text-stone-700 font-medium truncate">{item.label}</span>
            </div>
            <span className="font-mono font-bold text-stone-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. Horizontal Ranked Bar Visualizer
function HorizontalRankedBarVisualizer({ data, emptyMsg = "No activity recorded during this period." }: { data: ChartDataPoint[]; emptyMsg?: string }) {
  const maxValue = Math.max(...data.map((d) => d.value), 0);
  if (maxValue === 0 || data.length === 0) return <ChartEmptyState message={emptyMsg} />;

  return (
    <div className="space-y-2.5">
      {data.map((item, idx) => {
        const pct = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-700 font-medium truncate max-w-[70%]">{item.label}</span>
              <span className="font-mono font-bold text-stone-900">{item.value}</span>
            </div>
            <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${pct}%`, backgroundColor: item.color || "#059669" }}
                className="h-full rounded-full transition-all duration-300"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 3. Pure Responsive SVG Line/Area Temporal Chart
function TemporalLineVisualizer({ data }: { data: ChartDataPoint[] }) {
  const t = useTranslations("authority");
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0 || data.length === 0) {
    return <ChartEmptyState message={t("noActivityPeriod")} />;
  }

  // Single-day snapshot view (e.g. for "Today")
  if (data.length === 1) {
    const singlePoint = data[0];
    return (
      <div className="h-36 w-full flex flex-col items-center justify-center bg-[#FAF8F3]/60 rounded-2xl border border-[#E5E0D8] p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-600 animate-pulse" />
          <span className="text-xs font-bold text-stone-700">{singlePoint.label}</span>
        </div>
        <div className="text-3xl font-extrabold text-emerald-800 font-mono">
          {singlePoint.value} {singlePoint.value === 1 ? t("caseSingular") : t("casesPlural")}
        </div>
        <span className="text-[11px] text-stone-500 font-mono">
          {t("actualToday")}
        </span>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const width = 500;
  const height = 140;
  const padding = 20;

  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - 2 * padding);
    const y = height - padding - (d.value / maxVal) * (height - 2 * padding);
    return { x, y, label: d.label, value: d.value };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="space-y-2">
      <div className="w-full h-36 relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Subtle grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#E5E0D8" strokeDasharray="3 3" />
          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="#E5E0D8"
            strokeDasharray="3 3"
          />
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#E5E0D8"
          />

          {/* Gradient area */}
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#areaGrad)" />
          <path d={pathD} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />

          {/* Dots */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#059669" stroke="#FFFFFF" strokeWidth="1.5" />
          ))}
        </svg>
      </div>

      {/* Axis date markers */}
      <div className="flex justify-between text-[10px] text-stone-400 font-mono px-2">
        <span>{data[0]?.label}</span>
        {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.label}</span>}
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

// 4. Comparison Workload Bar Visualizer
function WorkloadComparisonVisualizer({ data, emptyMsg }: { data: ChartDataPoint[]; emptyMsg?: string }) {
  const t = useTranslations("authority");
  if (data.length === 0) return <ChartEmptyState message={emptyMsg || t("noPersonnelFound")} />;

  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <div key={idx} className="p-2.5 rounded-xl bg-[#FAF8F3] border border-[#E5E0D8] space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-stone-800">{item.label}</span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-amber-800 font-semibold font-mono">{t("activeLabel")} {item.value}</span>
              {item.secondaryValue !== undefined && (
                <span className="text-stone-500 font-mono">{t("totalLabel")} {item.secondaryValue}</span>
              )}
            </div>
          </div>
          <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
            <div
              style={{
                width: `${Math.min(100, Math.max(5, item.value * 12))}%`,
                backgroundColor: item.color || "#8B5CF6",
              }}
              className="h-full rounded-full"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuthorityVisualCharts({ charts }: AuthorityVisualChartsProps) {
  const t = useTranslations("authority");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
        <div>
          <h2 className="text-lg font-bold text-[#191F1C] tracking-tight">{t("surveillanceAnalytics")}</h2>
          <p className="text-xs text-stone-500">
            {t("surveillanceAnalyticsDesc")}
          </p>
        </div>
      </div>

      {/* Grid: 9 Graphical Surveillance Views */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* CHART 1: Cases by Status */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#191F1C] flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-emerald-700" />
              <span>{t("casesByClinicalStatus")}</span>
            </CardTitle>
            <CardDescription className="text-[11px] text-stone-500">{t("casesByClinicalStatusDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <DonutVisualizer data={charts.casesByStatus} />
          </CardContent>
        </Card>

        {/* CHART 2: Cases by Severity / Risk */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#191F1C] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span>{t("casesBySeverityRisk")}</span>
            </CardTitle>
            <CardDescription className="text-[11px] text-stone-500">{t("casesBySeverityRiskDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <DonutVisualizer data={charts.casesByRisk} />
          </CardContent>
        </Card>

        {/* CHART 3: Cases Over Time (Temporal Trend) */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#191F1C] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-700" />
              <span>{t("casesOverTime")}</span>
            </CardTitle>
            <CardDescription className="text-[11px] text-stone-500">{t("casesOverTimeDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <TemporalLineVisualizer data={charts.casesOverTime} />
          </CardContent>
        </Card>

        {/* CHART 4: Cases by Village / Locality */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#191F1C] flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-700" />
              <span>{t("topVillageHotspots")}</span>
            </CardTitle>
            <CardDescription className="text-[11px] text-stone-500">{t("topVillageHotspotsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <HorizontalRankedBarVisualizer
              data={charts.casesByVillage}
              emptyMsg={t("noHotspotsPeriod")}
            />
          </CardContent>
        </Card>

        {/* CHART 5: Veterinarian Workload */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#191F1C] flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-purple-700" />
              <span>{t("vetCaseloadWorkload")}</span>
            </CardTitle>
            <CardDescription className="text-[11px] text-stone-500">{t("vetCaseloadWorkloadDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <WorkloadComparisonVisualizer
              data={charts.vetWorkload}
              emptyMsg={t("noVetsAssigned")}
            />
          </CardContent>
        </Card>

        {/* CHART 6: Field-Agent Workload */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#191F1C] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-700" />
              <span>{t("fieldAgentRequestVolume")}</span>
            </CardTitle>
            <CardDescription className="text-[11px] text-stone-500">{t("fieldAgentRequestVolumeDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <WorkloadComparisonVisualizer
              data={charts.agentWorkload}
              emptyMsg={t("noAgentsAssigned")}
            />
          </CardContent>
        </Card>

        {/* CHART 7: Species Distribution */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#191F1C] flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-amber-700" />
              <span>{t("animalSpeciesDistribution")}</span>
            </CardTitle>
            <CardDescription className="text-[11px] text-stone-500">{t("animalSpeciesDistributionDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <DonutVisualizer data={charts.speciesDistribution} />
          </CardContent>
        </Card>

        {/* CHART 8: Alerts by Severity */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#191F1C] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span>{t("outbreakAlertsByDisease")}</span>
            </CardTitle>
            <CardDescription className="text-[11px] text-stone-500">{t("outbreakAlertsByDiseaseDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <HorizontalRankedBarVisualizer
              data={charts.alertsBySeverity}
              emptyMsg={t("noAlertsHistorical")}
            />
          </CardContent>
        </Card>

        {/* CHART 9: Assistance Request Status */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#191F1C] flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-teal-700" />
              <span>{t("assistanceRequestStatus")}</span>
            </CardTitle>
            <CardDescription className="text-[11px] text-stone-500">{t("assistanceRequestStatusDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <DonutVisualizer data={charts.assistanceRequestStatus} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
