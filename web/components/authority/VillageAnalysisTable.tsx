"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { VillageAnalysisRow } from "@/lib/authority/metrics";
import { Building2, Search, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

interface VillageAnalysisTableProps {
  villages: VillageAnalysisRow[];
}

export function VillageAnalysisTable({ villages }: VillageAnalysisTableProps) {
  const t = useTranslations("authority");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = villages.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return v.villageName.toLowerCase().includes(q) || v.blockName.toLowerCase().includes(q);
  });

  return (
    <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-[#E5E0D8]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-[#191F1C] flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-700" />
              <span>{t("villageAnalysisTitle")}</span>
            </CardTitle>
            <CardDescription className="text-xs text-stone-500">
              {t("villageMatrixDesc")}
            </CardDescription>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <Input
              type="text"
              placeholder={t("filterVillageBlock")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-[#FAF8F3] border-[#D9D3C7] rounded-xl"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF8F3] border-b border-[#E5E0D8] text-stone-600 font-semibold">
                <th className="py-3 px-4">{t("villageName")}</th>
                <th className="py-3 px-3">{t("blockTaluka")}</th>
                <th className="py-3 px-3 text-center">{t("farmers")}</th>
                <th className="py-3 px-3 text-center">{t("farms")}</th>
                <th className="py-3 px-3 text-center">{t("monitoredLivestock")}</th>
                <th className="py-3 px-3 text-center">{t("totalCasesHeader")}</th>
                <th className="py-3 px-3 text-center text-amber-800">{t("activeCases")}</th>
                <th className="py-3 px-3 text-center">{t("alerts")}</th>
                <th className="py-3 px-4 text-center">{t("riskLevel")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D8]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-stone-500 bg-stone-50/50">
                    {t("noVillagesMatchQuery")}
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.villageId} className="hover:bg-emerald-50/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#191F1C]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                        <span>{v.villageName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-stone-600 font-medium">{v.blockName}</td>
                    <td className="py-3 px-3 text-center font-mono">{v.farmersCount}</td>
                    <td className="py-3 px-3 text-center font-mono">{v.farmsCount}</td>
                    <td className="py-3 px-3 text-center font-mono font-semibold">{v.animalsCount}</td>
                    <td className="py-3 px-3 text-center font-mono">{v.totalCases}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-amber-800 bg-amber-50/40">
                      {v.activeCases}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {v.activeAlerts > 0 ? (
                        <Badge className="bg-red-100 text-red-900 border-red-200 text-[10px] font-bold">
                          🚨 {v.activeAlerts} Active
                        </Badge>
                      ) : (
                        <span className="text-stone-400 font-mono text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        className={`text-[10px] font-bold ${
                          v.highestRisk === "CRITICAL"
                            ? "bg-red-100 text-red-900 border-red-200"
                            : v.highestRisk === "HIGH"
                            ? "bg-orange-100 text-orange-900 border-orange-200"
                            : v.highestRisk === "ELEVATED"
                            ? "bg-amber-100 text-amber-900 border-amber-200"
                            : v.highestRisk === "LOW"
                            ? "bg-emerald-100 text-emerald-900 border-emerald-200"
                            : "bg-stone-100 text-stone-600 border-stone-200"
                        }`}
                      >
                        {v.highestRisk}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
