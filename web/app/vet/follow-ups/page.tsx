import React from "react";
import Link from "next/link";
import { getVetFollowUpsAction } from "@/lib/actions/vet";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowRight, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export default async function VetFollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const category = (params.category as "all" | "due_today" | "upcoming" | "overdue" | "completed") || "all";
  const followUps = await getVetFollowUpsAction(category);
  const today = new Date();
  const t = await getTranslations("vet");

  const tabs = [
    { label: t("allFollowUps"), key: "all" },
    { label: t("dueToday"), key: "due_today" },
    { label: t("upcoming"), key: "upcoming" },
    { label: t("overdue"), key: "overdue" },
    { label: t("completed"), key: "completed" },
  ];

  return (
    <div className="space-y-6 text-[#191F1C]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5E0D8] pb-4">
        <div>
          <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 text-[10px] uppercase font-mono">
            {t("clinicalWorkstationTitle")}
          </Badge>
          <h1 className="text-2xl font-black text-[#191F1C] tracking-tight mt-1">
            {t("followUpTrackerTitle")}
          </h1>
          <p className="text-xs text-stone-500">
            {t("followUpLead")}
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {tabs.map((tab) => {
            const isActive = category === tab.key;
            return (
              <Link
                key={tab.key}
                href={tab.key === "all" ? "/vet/follow-ups" : `/vet/follow-ups?category=${tab.key}`}
              >
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                    isActive
                      ? "bg-emerald-800 text-white border-emerald-900 shadow-xs"
                      : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  {tab.label}
                </button>
              </Link>
            );
          })}
        </div>
      </div>

      <Card className="border border-[#E5E0D8] bg-white shadow-xs rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-[#E5E0D8] pb-3 bg-[#FAF8F3]">
          <CardTitle className="text-base font-bold text-[#191F1C] flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-600" />
            <span>{t("followUps")} ({followUps.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {followUps.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-500 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <p className="font-semibold text-sm text-[#191F1C]">{t("noFollowUpsFound")}</p>
              <p>{t("noFollowUpsDesc")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {followUps.map((item) => {
                const dueDate = new Date(item.followUpDate!);
                const isOverdue = dueDate < today && !item.followUpCompleted;
                const isCompleted = item.followUpCompleted;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-xs ${
                      isCompleted
                        ? "bg-stone-50/70 border-stone-200"
                        : isOverdue
                        ? "bg-red-50/50 border-red-200"
                        : "bg-white border-[#E5E0D8]"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#191F1C]">Case #{item.case.caseNumber}</span>
                        <Badge variant="outline" className="text-[10px] border-[#D9D3C7] text-stone-700">
                          {item.case.status}
                        </Badge>
                        {isCompleted ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-1 font-mono">
                            <CheckCircle2 className="h-3 w-3" /> {t("statusCompleted")}
                          </Badge>
                        ) : isOverdue ? (
                          <Badge variant="destructive" className="text-[10px] bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {t("statusOverdue")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200 flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3" /> {t("statusScheduled")}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-stone-600">
                        Animal: <strong className="text-[#191F1C] font-mono">{item.animal.tag} ({item.animal.species})</strong> • Farm: <strong className="text-[#191F1C]">{item.animal.herd.farm.name}</strong> ({item.animal.herd.farm.village.name})
                      </p>

                      <p className="text-xs text-emerald-800 font-medium pt-0.5">
                        Clinical Assessment: {item.diagnosis} (Action: {item.action})
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <span className="text-[10px] text-stone-500 uppercase font-semibold block">{t("scheduledDateLabel")}</span>
                        <span className={`text-xs font-bold font-mono ${isCompleted ? "text-stone-600" : isOverdue ? "text-red-700" : "text-amber-800"}`}>
                          {formatDate(dueDate)}
                        </span>
                      </div>

                      <Link href={`/vet/cases/${item.case.id}`}>
                        <Button type="button" size="sm" className="text-xs h-8 bg-[#047857] hover:bg-[#065f46] text-white font-semibold gap-1 min-h-[32px]">
                          <span>{isCompleted ? t("viewCase") : t("performReview")}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
