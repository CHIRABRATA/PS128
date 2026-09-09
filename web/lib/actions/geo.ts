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

export async function detectDistrictFromCoordinates(latitude: number, longitude: number) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&zoom=10&addressdetails=1`,
    {
      headers: { "User-Agent": "Maitri-Livestock-Health/1.0" },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("GPS district lookup is currently unavailable.");
  }

  const result = await response.json() as {
    display_name?: string;
    address?: { state_district?: string; county?: string; village?: string; town?: string; city?: string; municipality?: string; state?: string };
  };
  const detectedName = result.address?.state_district || result.address?.county || "";
  if (!detectedName) return { districtId: null, districtName: null };

  const district = await upsertLocationPath({
    districtName: detectedName,
    blockName: result.address?.county || null,
    villageName: result.address?.village || result.address?.town || result.address?.city || result.address?.municipality || null,
  });

  return {
    ...district,
    displayName: result.display_name || detectedName,
  };
}

export async function searchLocations(query: string) {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 3) return [];

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(trimmedQuery)}`,
    { headers: { "User-Agent": "Maitri-Livestock-Health/1.0" }, cache: "no-store" },
  );
  if (!response.ok) throw new Error("Location search is currently unavailable.");

  const results = await response.json() as Array<{ display_name: string; lat: string; lon: string }>;
  return results.map((result) => ({
    displayName: result.display_name,
    latitude: Number(result.lat),
    longitude: Number(result.lon),
  }));
}

export async function resolveLocation(latitude: number, longitude: number) {
  return detectDistrictFromCoordinates(latitude, longitude);
}

async function upsertLocationPath(input: { districtName: string; blockName?: string | null; villageName?: string | null }) {
  const districtName = input.districtName.trim();
  const district = await prisma.district.upsert({
    where: { name: districtName },
    update: {},
    create: { name: districtName },
  });

  let blockId: string | null = null;
  let villageId: string | null = null;
  if (input.blockName?.trim()) {
    const block = await prisma.block.upsert({
      where: { districtId_name: { districtId: district.id, name: input.blockName.trim() } },
      update: {},
      create: { districtId: district.id, name: input.blockName.trim() },
    });
    blockId = block.id;

    if (input.villageName?.trim()) {
      const village = await prisma.village.upsert({
        where: { blockId_name: { blockId: block.id, name: input.villageName.trim() } },
        update: {},
        create: { blockId: block.id, name: input.villageName.trim() },
      });
      villageId = village.id;
    }
  }

  return { districtId: district.id, districtName: district.name, blockId, villageId };
}
