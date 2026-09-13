import React from "react";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { getGeographyTreeAction } from "@/lib/actions/admin";
import { GeographyManager } from "@/components/admin/GeographyManager";

export default async function AdminGeographyPage() {
  await requireAdmin();
  const t = await getTranslations("admin");
  const tree = await getGeographyTreeAction();

  return (
    <div className="space-y-6 text-[#191F1C]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-4">
        <div>
          <span className="text-xs font-bold text-purple-800 uppercase tracking-wide font-mono">
            {t("adminMasterData")}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#191F1C] tracking-tight mt-1">
            {t("geographyManagement")}
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            {t("geographyManagementDesc")}
          </p>
        </div>
      </div>

      <GeographyManager initialDistricts={tree} />
    </div>
  );
}
