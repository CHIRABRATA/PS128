import Link from "next/link";
import { requireFarmer } from "@/lib/auth/permissions";
import prisma from "@/lib/db/prisma";
import { AssistanceRequestForm } from "@/components/farmer/AssistanceRequestForm";
import { ensureFarmerPrimaryFarmAction } from "@/lib/actions/farmer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function FarmerRequestHelpPage({

  searchParams,
}: {
  searchParams?: Promise<{ animalId?: string }>;
}) {
  const farmer = await requireFarmer();
  const t = await getTranslations("farmer");
  const params = searchParams ? await searchParams : {};
  const preSelectedAnimalId = params.animalId || null;

  // 1. Query all registered farms belonging to the authenticated farmer
  let farms = await prisma.farm.findMany({
    where: { farmerUserId: farmer.id },
    include: {
      village: true,
      herds: {
        include: {
          animals: {
            select: {
              id: true,
              tag: true,
              species: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // 2. If zero farms exist, check whether the farmer has a registered village location to auto-provision strictly idempotently
  if (farms.length === 0 && farmer.villageId) {
    const provisionResult = await ensureFarmerPrimaryFarmAction(farmer.id);
    if (provisionResult.farm) {
      const freshFarm = await prisma.farm.findUnique({
        where: { id: provisionResult.farm.id },
        include: {
          village: true,
          herds: {
            include: {
              animals: {
                select: {
                  id: true,
                  tag: true,
                  species: true,
                },
              },
            },
          },
        },
      });
      if (freshFarm) {
        farms = [freshFarm];
      }
    }
  }

  const farmOptions = farms.map((f) => ({
    id: f.id,
    name: f.name,
    villageName: f.village ? f.village.name : "Registered Location",
    animals: f.herds.flatMap((h) => h.animals),
  }));

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full gap-6 text-[#191F1C]">
      <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-4">
        <div>
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
            {t("doorstepFieldSupport")}
          </span>
          <h1 className="text-2xl font-bold text-[#191F1C] tracking-tight mt-1">
            {t("requestFieldAgentVisit")}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {t("requestFieldAgentLead")}
          </p>
        </div>

        <Link href="/farmer">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs border-[#D9D3C7] text-stone-700 hover:bg-white rounded-xl">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("farmerPortal")}</span>
          </Button>
        </Link>
      </div>

      <AssistanceRequestForm
        farms={farmOptions}
        preSelectedAnimalId={preSelectedAnimalId}
      />
    </div>
  );
}
