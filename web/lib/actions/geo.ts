"use server";

import prisma from "@/lib/db/prisma";

export async function getDistricts() {
  return await prisma.district.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getBlocks(districtId: string) {
  if (!districtId) return [];
  return await prisma.block.findMany({
    where: { districtId },
    orderBy: { name: "asc" },
  });
}

export async function getVillages(blockId: string) {
  if (!blockId) return [];
  return await prisma.village.findMany({
    where: { blockId },
    orderBy: { name: "asc" },
  });
}
