"use server";

import prisma from "@/lib/db/prisma";
import { requireFarmer, requireFieldAgent } from "@/lib/auth/permissions";

export interface PrintableAnimalOption {
  id: string;
  tag: string;
  species: string;
  breed?: string | null;
  farmId: string;
  farmName: string;
  villageName: string;
  iotDeviceId?: string | null;
  herdSize?: number;
}

/**
 * Returns all animals belonging to the authenticated Farmer's registered farms.
 */
export async function getFarmerAnimals(): Promise<PrintableAnimalOption[]> {
  const farmer = await requireFarmer();

  const farms = await prisma.farm.findMany({
    where: { farmerUserId: farmer.id },
    include: {
      village: true,
      herds: {
        include: {
          animals: true,
        },
      },
    },
  });

  const options: PrintableAnimalOption[] = [];

  for (const farm of farms) {
    for (const herd of farm.herds) {
      for (const animal of herd.animals) {
        options.push({
          id: animal.id,
          tag: animal.tag,
          species: animal.species,
          breed: animal.breed,
          farmId: farm.id,
          farmName: farm.name,
          villageName: farm.village.name,
          iotDeviceId: animal.iotDeviceId,
          herdSize: herd.animals.length,
        });
      }
    }
  }

  return options;
}

/**
 * Returns authorized farms and animals for the authenticated Field Agent.
 */
import { Prisma } from "@prisma/client";

export async function getAgentScopeFarms() {
  const agent = await requireFieldAgent();

  const whereClause: Prisma.FarmWhereInput = {};


  if (agent.villageId) {
    whereClause.villageId = agent.villageId;
  } else if (agent.blockId) {
    whereClause.village = { blockId: agent.blockId };
  } else if (agent.districtId) {
    whereClause.village = { block: { districtId: agent.districtId } };
  }

  const farms = await prisma.farm.findMany({
    where: whereClause,
    include: {
      village: true,
      farmerUser: true,
      herds: {
        include: {
          animals: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return farms;
}
