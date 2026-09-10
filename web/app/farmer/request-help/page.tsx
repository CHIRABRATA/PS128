import Link from "next/link";
import { requireFarmer } from "@/lib/auth/permissions";
import prisma from "@/lib/db/prisma";
import { AssistanceRequestForm } from "@/components/farmer/AssistanceRequestForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function FarmerRequestHelpPage({
  searchParams,
}: {
  searchParams?: Promise<{ animalId?: string }>;
}) {
  const farmer = await requireFarmer();
  const params = searchParams ? await searchParams : {};
  const preSelectedAnimalId = params.animalId || null;

  const farms = await prisma.farm.findMany({
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
  });

  const farmOptions = farms.map((f) => ({
    id: f.id,
    name: f.name,
    villageName: f.village.name,
    animals: f.herds.flatMap((h) => h.animals),
  }));

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full gap-6 text-[#191F1C]">
      <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-4">
        <div>
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
            DOORSTEP FIELD SUPPORT
          </span>
          <h1 className="text-2xl font-bold text-[#191F1C] tracking-tight mt-1">
            Request Field Agent Visit
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            If you need assistance with livestock examination, ear-tagging, or clinical reporting.
          </p>
        </div>

        <Link href="/farmer">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs border-[#D9D3C7] text-stone-700 hover:bg-white rounded-xl">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Farmer Portal</span>
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
