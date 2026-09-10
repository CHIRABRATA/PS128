import { requireDistrictAuthority } from "@/lib/auth/permissions";
import { getGeographicHierarchyAction } from "@/lib/actions/authority";
import { GeographicDrilldown, GeoDistrict } from "@/components/authority/GeographicDrilldown";

export default async function AuthorityLocationsPage() {
  await requireDistrictAuthority();
  const hierarchy = await getGeographicHierarchyAction();

  return (
    <div className="space-y-6 text-[#191F1C]">
      <div>
        <h1 className="text-2xl font-bold text-[#191F1C] tracking-tight">Geographic Structure & Jurisdiction | Hierarchy Overview</h1>
        <p className="text-stone-500 text-xs mt-1">
          District, sub-district blocks, villages, and registered farms administrative hierarchy.
        </p>
      </div>

      <GeographicDrilldown districts={hierarchy as unknown as GeoDistrict[]} />
    </div>
  );
}
