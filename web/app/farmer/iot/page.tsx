import React from "react";
import Link from "next/link";
import { requireFarmer } from "@/lib/auth/permissions";
import {
  getFarmerAnimalsWithIoTAction,
  getAnimalIoTMonitoringDataAction,
} from "@/lib/actions/iot";
import { IoTMonitoringView } from "@/components/iot/IoTMonitoringView";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft, Cpu } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function FarmerIoTMonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ animalId?: string }>;
}) {
  await requireFarmer();
  const t = await getTranslations("farmer");
  const { animalId } = await searchParams;

  const animals = await getFarmerAnimalsWithIoTAction();

  if (!animals || animals.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="h-16 w-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
          <Cpu className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-[#191F1C]">{t("noLivestockRegistered")}</h1>
        <p className="text-xs text-stone-600">
          {t("noLivestockIotDesc")}
        </p>
        <div className="pt-2 flex items-center gap-3">
          <Link href="/farmer">
            <Button variant="outline" size="sm" className="rounded-xl border-[#D9D3C7]">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span>{t("backToDashboard")}</span>
            </Button>
          </Link>
          <Link href="/farmer/report">
            <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl">
              <PlusCircle className="h-4 w-4 mr-1.5" />
              <span>{t("registerAnimalBtn")}</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Select target animal: requested or first
  const targetAnimalId =
    animalId && animals.some((a) => a.id === animalId)
      ? animalId
      : animals[0].id;

  const monitoringData = await getAnimalIoTMonitoringDataAction(targetAnimalId);

  return (
    <IoTMonitoringView
      animals={animals}
      selectedAnimalId={targetAnimalId}
      initialData={monitoringData}
    />
  );
}
