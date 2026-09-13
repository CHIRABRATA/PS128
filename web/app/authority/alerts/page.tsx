import { requireDistrictAuthority } from "@/lib/auth/permissions";
import { getDistrictAlertsAction } from "@/lib/actions/authority";
import { AlertsList } from "@/components/authority/AlertsList";
import { AlertWithLocation } from "@/components/authority/AlertsList";
import { getTranslations } from "next-intl/server";

export default async function AuthorityAlertsPage() {
  await requireDistrictAuthority();
  const alerts = await getDistrictAlertsAction();
  const t = await getTranslations("authority");

  return (
    <div className="space-y-6 text-[#191F1C]">
      <div>
        <h1 className="text-2xl font-bold text-[#191F1C] tracking-tight">{t("districtAlertsHeader")}</h1>
        <p className="text-stone-500 text-xs mt-1">
          {t("surveillanceAnalytics")}
        </p>
      </div>

      <AlertsList alerts={alerts as unknown as AlertWithLocation[]} />
    </div>
  );
}
