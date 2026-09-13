import React from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { requireVeterinarian } from "@/lib/auth/permissions";
import prisma from "@/lib/db/prisma";
import { RiskBadge } from "@/components/ai/RiskBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, ArrowRight } from "lucide-react";
import { Prisma } from "@prisma/client";
import { formatDateTime } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export default async function VetCasesPage() {
  const vet = await requireVeterinarian();
  const t = await getTranslations("vet");

  const whereClause: Prisma.CaseWhereInput = {};
  if (vet.districtId) {
    whereClause.OR = [
      { assignedVeterinarianUserId: vet.id },
      {
        animal: {
          herd: {
            farm: {
              village: {
                block: {
                  districtId: vet.districtId,
                },
              },
            },
          },
        },
      },
    ];
  } else {
    whereClause.assignedVeterinarianUserId = vet.id;
  }

  const cases = await prisma.case.findMany({
    where: whereClause,
    include: {
      animal: {
        include: {
          herd: {
            include: {
              farm: {
                include: {
                  village: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { reportedAt: "desc" },
  });

  return (
    <div className="space-y-6 text-[#191F1C]">
      <div className="flex justify-between items-center border-b border-[#E5E0D8] pb-4">
        <div>
          <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 text-[10px] uppercase font-mono">
            {t("clinicalRepoTitle")}
          </Badge>
          <h1 className="text-2xl font-black text-[#191F1C] tracking-tight mt-1">
            {t("allLivestockCasesTitle")}
          </h1>
          <p className="text-xs text-stone-500">
            {t("allCasesLead")}
          </p>
        </div>
      </div>

      <Card className="border border-[#E5E0D8] bg-white shadow-xs rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-[#E5E0D8] pb-3 bg-[#FAF8F3]">
          <CardTitle className="text-base font-bold text-[#191F1C] flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-700" />
            <span>{t("districtClinicalRepo")} ({cases.length})</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4">
          {cases.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              {t("noCasesJurisdiction")}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#E5E0D8] bg-white">
              <table className="w-full text-xs text-left text-stone-700">
                <thead className="bg-[#FAF8F3] text-stone-600 font-semibold uppercase tracking-wider border-b border-[#E5E0D8]">
                  <tr>
                    <th className="p-3">{t("statusHeader")}</th>
                    <th className="p-3">{t("caseNumberCol")}</th>
                    <th className="p-3">{t("animalHeader")}</th>
                    <th className="p-3">{t("farmVillageHeader")}</th>
                    <th className="p-3">{t("riskHeader")}</th>
                    <th className="p-3">{t("reportedHeader")}</th>
                    <th className="p-3 text-right">{t("actionHeader")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D8]">
                  {cases.map((c) => {
                    const analysis = (c.analysisResult as Record<string, unknown> | null) || {};
                    const level = (analysis.overall_risk_level as string) || "UNKNOWN";

                    return (
                      <tr key={c.id} className="hover:bg-[#FAF8F3]/50">
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] border-[#D9D3C7] text-stone-700">
                            {c.status}
                          </Badge>
                        </td>
                        <td className="p-3 font-bold text-[#191F1C]">#{c.caseNumber}</td>
                        <td className="p-3">
                          {c.animal.tag} <span className="text-stone-500">({c.animal.species})</span>
                        </td>
                        <td className="p-3">
                          {c.animal.herd.farm.name} <span className="text-stone-500">({c.animal.herd.farm.village.name})</span>
                        </td>
                        <td className="p-3">
                          <RiskBadge level={level} />
                        </td>
                        <td className="p-3 text-stone-500">{formatDateTime(c.reportedAt)}</td>
                        <td className="p-3 text-right">
                          <Link href={`/vet/cases/${c.id}`}>
                            <Button type="button" size="sm" className="h-8 text-xs bg-[#047857] hover:bg-[#065f46] text-white font-semibold gap-1 min-h-[32px]">
                              <span>{t("reviewBtn")}</span>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
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
    </div>
  );
}
