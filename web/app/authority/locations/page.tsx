import { requireDistrictAuthority } from "@/lib/auth/permissions";
import { getGeographicHierarchyAction } from "@/lib/actions/authority";
import { GeographicDrilldown, GeoDistrict } from "@/components/authority/GeographicDrilldown";
import { getTranslations } from "next-intl/server";

export default async function AuthorityLocationsPage() {
  await requireDistrictAuthority();
  const hierarchy = await getGeographicHierarchyAction();
  const t = await getTranslations("authority");

  return (
    <div className="space-y-6 text-[#191F1C]">
      <div>
        <h1 className="text-2xl font-bold text-[#191F1C] tracking-tight">{t("geoStructureHeader")}</h1>
        <p className="text-stone-500 text-xs mt-1">
          {t("geoHierarchyTitle")}
        </p>
      </div>

      <GeographicDrilldown districts={hierarchy as unknown as GeoDistrict[]} />
    </div>
  );
}
