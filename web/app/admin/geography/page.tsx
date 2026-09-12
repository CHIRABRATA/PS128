import React from "react";
import { requireAdmin } from "@/lib/auth/permissions";
import { getGeographyTreeAction } from "@/lib/actions/admin";
import { GeographyManager } from "@/components/admin/GeographyManager";

export default async function AdminGeographyPage() {
  await requireAdmin();
  const tree = await getGeographyTreeAction();

  return (
    <div className="space-y-6 text-[#191F1C]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-4">
        <div>
          <span className="text-xs font-bold text-purple-800 uppercase tracking-wide font-mono">
            ADMINISTRATIVE MASTER DATA • GEOGRAPHY HIERARCHY
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#191F1C] tracking-tight mt-1">
            Geography Management
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            Configure canonical administrative boundaries (Districts $\to$ Blocks $\to$ Villages). All additions and edits are audited.
          </p>
        </div>
      </div>

      <GeographyManager initialDistricts={tree} />
    </div>
  );
}
