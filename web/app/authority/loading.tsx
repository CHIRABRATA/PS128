import React from "react";
import { Loader2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AuthorityLoading() {
  const t = await getTranslations("authority");

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full gap-6 animate-pulse text-[#191F1C]">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-5">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-stone-200 rounded-xl" />
          <div className="h-4 w-96 bg-stone-100 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-stone-200 rounded-xl" />
          <div className="h-10 w-28 bg-stone-200 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 bg-white border border-[#E5E0D8] rounded-2xl space-y-2 shadow-xs">
            <div className="h-3 w-20 bg-stone-200 rounded" />
            <div className="h-7 w-16 bg-stone-200 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Heatmap & Alerts Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-white border border-[#E5E0D8] rounded-3xl space-y-4 shadow-xs min-h-[480px] flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-700 animate-spin opacity-50 mb-2" />
          <span className="text-xs text-stone-500 font-medium">{t("initGis")}</span>
        </div>

        <div className="p-6 bg-white border border-[#E5E0D8] rounded-3xl space-y-4 shadow-xs">
          <div className="h-5 w-36 bg-stone-200 rounded-lg" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-[#FAF8F3] border border-[#E5E0D8] rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
