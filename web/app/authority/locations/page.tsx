import { requireDistrictAuthority } from "@/lib/auth/permissions";
import { getGeographicHierarchyAction } from "@/lib/actions/authority";
import { GeographicDrilldown, GeoDistrict } from "@/components/authority/GeographicDrilldown";

export default async function AuthorityLocationsPage() {
  await requireDistrictAuthority();
  const hierarchy = await getGeographicHierarchyAction();

  return (
    <div className="space-y-6 text-[#191F1C]">
      <div>
        <h1 className="text-2xl font-bold text-[#191F1C] tracking-tight">भौगोलिक रचना व कार्यकक्षा | Geographic Hierarchy</h1>
        <p className="text-stone-500 text-xs mt-1">
          जिल्हा, तालुके, गावे व नोंदणीकृत गोठ्यांची संपूर्ण प्रशासकीय रचना.
        </p>
      </div>

      <GeographicDrilldown districts={hierarchy as unknown as GeoDistrict[]} />
    </div>
  );
}
