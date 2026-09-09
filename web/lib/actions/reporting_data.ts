"use server";

import prisma from "@/lib/db/prisma";
import { requireFarmer, requireFieldAgent } from "@/lib/auth/permissions";
import { z } from "zod";

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

const farmerAnimalSchema = z.object({
  tag: z.string().trim().min(1, "कान-टॅग आवश्यक आहे.").max(40),
  species: z.enum(["COW", "BUFFALO", "SHEEP", "GOAT", "PET", "OTHER"]),
  breed: z.string().trim().max(80).optional().nullable(),
  villageId: z.string().optional().nullable(),
});

export async function getFarmerRegistrationVillages() {
  return await prisma.village.findMany({
    include: { block: { include: { district: true } } },
    orderBy: { name: "asc" },
  });
}

export async function registerFarmerAnimal(input: {
  tag: string;
  species: "COW" | "BUFFALO" | "SHEEP" | "GOAT" | "PET" | "OTHER";
  breed?: string | null;
  villageId?: string | null;
}): Promise<{ success: boolean; error?: string; animal?: PrintableAnimalOption }> {
  const farmer = await requireFarmer();
  const validation = farmerAnimalSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message || "अवैध जनावर माहिती." };
  }

  const data = validation.data;
  const villageId = farmer.villageId || data.villageId;
  if (!villageId) {
    return { success: false, error: "जनावर नोंदवण्यापूर्वी गाव निवडा." };
  }

  const village = await prisma.village.findUnique({ where: { id: villageId } });
  if (!village) return { success: false, error: "निवडलेले गाव उपलब्ध नाही." };

  if (!farmer.villageId) {
    await prisma.user.update({
      where: { id: farmer.id },
      data: { villageId, blockId: village.blockId },
    });
  }

  const existingFarm = await prisma.farm.findFirst({
    where: { farmerUserId: farmer.id, villageId },
  });

  const farm = existingFarm || await prisma.farm.create({
    data: {
      name: `${farmer.name} Farm`,
      villageId,
      farmerUserId: farmer.id,
      latitude: 18.5793,
      longitude: 73.9806,
    },
  });

  const herd = await prisma.herd.upsert({
    where: { id: `${farm.id}_${data.species.toLowerCase()}` },
    update: {},
    create: {
      id: `${farm.id}_${data.species.toLowerCase()}`,
      farmId: farm.id,
      species: data.species,
      name: `${data.species} Herd`,
    },
  });

  try {
    const animal = await prisma.animal.create({
      data: {
        herdId: herd.id,
        tag: data.tag,
        species: data.species,
        breed: data.breed || null,
      },
    });

    return {
      success: true,
      animal: {
        id: animal.id,
        tag: animal.tag,
        species: animal.species,
        breed: animal.breed,
        farmId: farm.id,
        farmName: farm.name,
        villageName: village.name,
        iotDeviceId: animal.iotDeviceId,
        herdSize: await prisma.animal.count({ where: { herdId: herd.id } }),
      },
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { success: false, error: "हा कान-टॅग या कळपात आधीपासून नोंदणीकृत आहे." };
    }
    throw error;
  }
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
