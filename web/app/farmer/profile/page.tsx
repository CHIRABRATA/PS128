import Link from "next/link";
import { requireFarmer } from "@/lib/auth/permissions";
import { getFarmerProfileAction } from "@/lib/actions/farmer";
import { getDistricts } from "@/lib/actions/geo";
import { FarmerProfileView } from "@/components/farmer/FarmerProfileView";
import { TelegramConnectCard } from "@/components/telegram/TelegramConnectCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "My Profile — Farmer Portal | Maitri",
  description: "View and edit your farmer profile, registered location, contact information, and farm infrastructure.",
};

export default async function FarmerProfilePage() {
  const t = await getTranslations("farmer");
  await requireFarmer();

  const [profile, districts] = await Promise.all([
    getFarmerProfileAction(),
    getDistricts(),
  ]);

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full gap-6 text-[#191F1C]">
      {/* Top Breadcrumb & Page Header */}
      <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wide">
            <User className="h-3.5 w-3.5" />
            <span>{t("farmerAccountTerritory")}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#191F1C] tracking-tight mt-1">
            {t("myFarmerProfile")}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {t("farmerProfileLead")}
          </p>
        </div>

        <Link href="/farmer">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-[#D9D3C7] text-stone-700 hover:bg-white rounded-xl min-h-[38px] shadow-2xs hover-lift-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("farmerPortal")}</span>
          </Button>
        </Link>
      </div>

      <FarmerProfileView
        initialProfile={profile}
        districts={districts.map((d) => ({ id: d.id, name: d.name }))}
      />

      <TelegramConnectCard />
    </div>
  );
}
