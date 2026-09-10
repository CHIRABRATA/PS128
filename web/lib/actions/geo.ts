"use server";

import prisma from "@/lib/db/prisma";
import { calculateHaversineDistanceKm as computeHaversine } from "@/lib/geo/distance";

export interface GeocodedLocationResult {
  id: string;
  displayName: string;
  placeName: string;
  subdistrict?: string | null;
  district?: string | null;
  state?: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm?: number | null;
  isUrban?: boolean;
}

export interface ResolvedLocationHierarchy {
  districtId: string | null;
  districtName: string | null;
  blockId: string | null;
  blockName: string | null;
  villageId: string | null;
  villageName: string | null;
  isUrban: boolean;
  latitude: number | null;
  longitude: number | null;
  displayName: string;
  placeName?: string;
}

export interface UserGpsCoordinates {
  lat: number;
  lng: number;
}

/**
 * Calculates Haversine distance in kilometers between two GPS coordinate pairs.
 */
export async function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): Promise<number> {
  return computeHaversine(lat1, lon1, lat2, lon2);
}

/**
 * Returns all active districts ordered alphabetically.
 */
export async function getDistricts() {
  return await prisma.district.findMany({
    orderBy: { name: "asc" },
  });
}

/**
 * Returns all blocks in a district ordered alphabetically.
 */
export async function getBlocks(districtId: string) {
  if (!districtId) return [];
  return await prisma.block.findMany({
    where: { districtId },
    orderBy: { name: "asc" },
  });
}

/**
 * Returns all villages in a block ordered alphabetically.
 */
export async function getVillages(blockId: string) {
  if (!blockId) return [];
  return await prisma.village.findMany({
    where: { blockId },
    orderBy: { name: "asc" },
  });
}

/**
 * Mapbox Geocoding v6 forward search implementation.
 */
async function searchMapboxV6(
  query: string,
  userGps?: UserGpsCoordinates | null,
  token?: string
): Promise<GeocodedLocationResult[] | null> {
  if (!token) return null;

  try {
    const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
    url.searchParams.set("q", query);
    url.searchParams.set("access_token", token);
    url.searchParams.set("country", "IN");
    url.searchParams.set("limit", "6");
    url.searchParams.set("language", "en");

    // Proximity ONLY if user explicitly provided/allowed GPS
    if (userGps && typeof userGps.lat === "number" && typeof userGps.lng === "number") {
      url.searchParams.set("proximity", `${userGps.lng},${userGps.lat}`);
    }

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as {
      features?: Array<{
        id: string;
        geometry: { coordinates: [number, number] };
        properties: {
          name: string;
          name_preferred?: string;
          place_formatted?: string;
          full_address?: string;
          feature_type?: string;
          context?: {
            district?: { name: string };
            place?: { name: string };
            region?: { name: string };
            country?: { name: string };
            locality?: { name: string };
            neighborhood?: { name: string };
          };
        };
      }>;
    };

    if (!data.features || data.features.length === 0) {
      return [];
    }

    return data.features.map((feat) => {
      const lng = feat.geometry?.coordinates?.[0] ?? null;
      const lat = feat.geometry?.coordinates?.[1] ?? null;
      const placeName = feat.properties.name_preferred || feat.properties.name;
      const district = feat.properties.context?.district?.name || feat.properties.context?.place?.name || null;
      const subdistrict = feat.properties.context?.locality?.name || feat.properties.context?.neighborhood?.name || null;
      const state = feat.properties.context?.region?.name || "Maharashtra";

      let distanceKm: number | null = null;
      if (
        userGps &&
        typeof userGps.lat === "number" &&
        typeof userGps.lng === "number" &&
        lat !== null &&
        lng !== null
      ) {
        distanceKm = computeHaversine(userGps.lat, userGps.lng, lat, lng);
      }

      const formattedParts = [placeName];
      if (district && district !== placeName) formattedParts.push(district);
      if (state) formattedParts.push(state);

      return {
        id: feat.id || `mbx_${lat}_${lng}`,
        placeName,
        displayName: formattedParts.join(", "),
        subdistrict,
        district,
        state,
        latitude: lat,
        longitude: lng,
        distanceKm,
        isUrban: feat.properties.feature_type === "place" || feat.properties.feature_type === "district",
      };
    });
  } catch {
    return null;
  }
}

/**
 * Fallback local search against authoritative Prisma records (District, Block, Village).
 * Never creates duplicate Village rows.
 * Never uses Pune or 0,0 coordinates when no real coordinates exist.
 */
async function searchLocalPrismaHierarchy(
  query: string,
  userGps?: UserGpsCoordinates | null
): Promise<GeocodedLocationResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  // 1. Search existing Villages
  const villages = await prisma.village.findMany({
    where: {
      name: { contains: trimmed, mode: "insensitive" },
    },
    include: {
      block: {
        include: {
          district: true,
        },
      },
      farms: {
        take: 1,
        select: { latitude: true, longitude: true },
      },
    },
    take: 6,
  });

  const results: GeocodedLocationResult[] = [];

  for (const v of villages) {
    const lat = v.farms[0]?.latitude ?? null;
    const lng = v.farms[0]?.longitude ?? null;
    const distanceKm =
      userGps && lat !== null && lng !== null
        ? computeHaversine(userGps.lat, userGps.lng, lat, lng)
        : null;

    results.push({
      id: `local_village_${v.id}`,
      placeName: v.name,
      displayName: `${v.name}, ${v.block.name}, ${v.block.district.name}`,
      subdistrict: v.block.name,
      district: v.block.district.name,
      state: "Maharashtra",
      latitude: lat,
      longitude: lng,
      distanceKm,
      isUrban: false,
    });
  }

  // 2. If needed, search existing Blocks (no fake coords)
  if (results.length < 6) {
    const blocks = await prisma.block.findMany({
      where: {
        name: { contains: trimmed, mode: "insensitive" },
      },
      include: {
        district: true,
      },
      take: 6 - results.length,
    });

    for (const b of blocks) {
      results.push({
        id: `local_block_${b.id}`,
        placeName: b.name,
        displayName: `${b.name} (Block), ${b.district.name}`,
        subdistrict: b.name,
        district: b.district.name,
        state: "Maharashtra",
        latitude: null,
        longitude: null,
        distanceKm: null,
        isUrban: true,
      });
    }
  }

  // 3. Search Districts if still room (no fake coords)
  if (results.length < 6) {
    const districts = await prisma.district.findMany({
      where: {
        name: { contains: trimmed, mode: "insensitive" },
      },
      take: 6 - results.length,
    });

    for (const d of districts) {
      results.push({
        id: `local_district_${d.id}`,
        placeName: d.name,
        displayName: `${d.name} (District)`,
        subdistrict: null,
        district: d.name,
        state: "Maharashtra",
        latitude: null,
        longitude: null,
        distanceKm: null,
        isUrban: true,
      });
    }
  }

  // If GPS is provided, sort by distance: valid distance results first, then others
  if (userGps) {
    results.sort((a, b) => {
      const hasA = typeof a.distanceKm === "number";
      const hasB = typeof b.distanceKm === "number";
      if (hasA && hasB) {
        return (a.distanceKm as number) - (b.distanceKm as number);
      }
      if (hasA) return -1;
      if (hasB) return 1;
      return 0;
    });
  }

  return results;
}

/**
 * Searches for locations with Mapbox Geocoding v6 and strictly falls back to local Prisma hierarchy.
 * Never calls uncontrolled public endpoints.
 */
export async function searchLocationsAction(
  query: string,
  userGps?: UserGpsCoordinates | null
): Promise<GeocodedLocationResult[]> {
  const trimmed = (query || "").trim();
  if (trimmed.length < 3) return [];

  if (process.env.NODE_ENV !== "production") {
    console.log(`SEARCH\nquery=${trimmed}\ngps=${userGps ? `${userGps.lat},${userGps.lng}` : "null"}`);
  }

  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

  // 1. Try Mapbox Geocoding v6
  if (mapboxToken) {
    const mapboxResults = await searchMapboxV6(trimmed, userGps, mapboxToken);
    if (mapboxResults !== null && mapboxResults.length > 0) {
      return mapboxResults;
    }
  }

  // 2. Fallback to Local Prisma Hierarchy
  return await searchLocalPrismaHierarchy(trimmed, userGps);
}

/**
 * Reverse geocoding via Mapbox v6 or actual GPS detection for "Use my current location".
 * NEVER defaults to Pune or fake coordinates.
 */
export async function reverseGeocodeLocationAction(
  latitude: number,
  longitude: number
): Promise<GeocodedLocationResult | null> {
  if (process.env.NODE_ENV !== "production") {
    console.log(`REVERSE GEOCODE\nlatitude=${latitude}\nlongitude=${longitude}`);
  }

  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

  if (mapboxToken) {
    try {
      const url = new URL("https://api.mapbox.com/search/geocode/v6/reverse");
      url.searchParams.set("longitude", String(longitude));
      url.searchParams.set("latitude", String(latitude));
      url.searchParams.set("access_token", mapboxToken);
      url.searchParams.set("country", "IN");
      url.searchParams.set("limit", "1");
      url.searchParams.set("language", "en");

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (res.ok) {
        const data = (await res.json()) as {
          features?: Array<{
            id: string;
            properties: {
              name: string;
              name_preferred?: string;
              context?: {
                district?: { name: string };
                place?: { name: string };
                region?: { name: string };
                locality?: { name: string };
                neighborhood?: { name: string };
              };
            };
          }>;
        };

        const feature = data.features?.[0];
        if (feature) {
          const placeName = feature.properties.name_preferred || feature.properties.name;
          const district = feature.properties.context?.district?.name || feature.properties.context?.place?.name || null;
          const subdistrict = feature.properties.context?.locality?.name || feature.properties.context?.neighborhood?.name || null;
          const state = feature.properties.context?.region?.name || "Maharashtra";

          const formattedParts = [placeName];
          if (district && district !== placeName) formattedParts.push(district);
          if (state) formattedParts.push(state);

          return {
            id: feature.id,
            placeName,
            displayName: formattedParts.join(", "),
            subdistrict,
            district,
            state,
            latitude,
            longitude,
            distanceKm: 0,
            isUrban: false,
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  // Fallback: Return actual detected GPS location coordinates without fabricating administrative values
  return {
    id: `detected_${latitude}_${longitude}`,
    placeName: "Current GPS Location",
    displayName: `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    subdistrict: null,
    district: null,
    state: null,
    latitude,
    longitude,
    distanceKm: 0,
    isUrban: true,
  };
}

/**
 * Resolves a selected location against the existing authoritative Prisma hierarchy.
 * Never creates new Village rows in database.
 * Supports urban locations where villageId is null.
 */
export async function resolveLocationHierarchyAction(input: {
  latitude: number | null;
  longitude: number | null;
  placeName: string;
  districtName?: string | null;
  blockName?: string | null;
}): Promise<ResolvedLocationHierarchy> {
  const { latitude, longitude, placeName, districtName, blockName } = input;

  let resolvedDistrictId: string | null = null;
  let resolvedDistrictName: string | null = null;
  let resolvedBlockId: string | null = null;
  let resolvedBlockName: string | null = null;
  let resolvedVillageId: string | null = null;
  let resolvedVillageName: string | null = null;

  // 1. Try to match District
  if (districtName) {
    const district = await prisma.district.findFirst({
      where: {
        name: { contains: districtName.trim(), mode: "insensitive" },
      },
    });
    if (district) {
      resolvedDistrictId = district.id;
      resolvedDistrictName = district.name;
    }
  }

  // If district still not resolved, check if placeName is a district
  if (!resolvedDistrictId && placeName) {
    const district = await prisma.district.findFirst({
      where: {
        name: { contains: placeName.trim(), mode: "insensitive" },
      },
    });
    if (district) {
      resolvedDistrictId = district.id;
      resolvedDistrictName = district.name;
    }
  }

  // 2. Try to match Block
  if (resolvedDistrictId) {
    if (blockName) {
      const block = await prisma.block.findFirst({
        where: {
          districtId: resolvedDistrictId,
          name: { contains: blockName.trim(), mode: "insensitive" },
        },
      });
      if (block) {
        resolvedBlockId = block.id;
        resolvedBlockName = block.name;
      }
    }
    if (!resolvedBlockId && placeName) {
      const block = await prisma.block.findFirst({
        where: {
          districtId: resolvedDistrictId,
          name: { contains: placeName.trim(), mode: "insensitive" },
        },
      });
      if (block) {
        resolvedBlockId = block.id;
        resolvedBlockName = block.name;
      }
    }
  } else if (blockName) {
    const block = await prisma.block.findFirst({
      where: {
        name: { contains: blockName.trim(), mode: "insensitive" },
      },
      include: { district: true },
    });
    if (block) {
      resolvedBlockId = block.id;
      resolvedBlockName = block.name;
      resolvedDistrictId = block.districtId;
      resolvedDistrictName = block.district.name;
    }
  }

  // 3. Try to match Village (only from authoritative existing records)
  if (resolvedBlockId) {
    const village = await prisma.village.findFirst({
      where: {
        blockId: resolvedBlockId,
        name: { contains: placeName.trim(), mode: "insensitive" },
      },
    });
    if (village) {
      resolvedVillageId = village.id;
      resolvedVillageName = village.name;
    }
  } else {
    const village = await prisma.village.findFirst({
      where: {
        name: { contains: placeName.trim(), mode: "insensitive" },
      },
      include: { block: { include: { district: true } } },
    });
    if (village) {
      resolvedVillageId = village.id;
      resolvedVillageName = village.name;
      resolvedBlockId = village.blockId;
      resolvedBlockName = village.block.name;
      resolvedDistrictId = village.block.districtId;
      resolvedDistrictName = village.block.district.name;
    }
  }

  const isUrban = !resolvedVillageId;

  return {
    districtId: resolvedDistrictId,
    districtName: resolvedDistrictName,
    blockId: resolvedBlockId,
    blockName: resolvedBlockName,
    villageId: resolvedVillageId,
    villageName: resolvedVillageName,
    isUrban,
    latitude,
    longitude,
    displayName: placeName,
    placeName,
  };
}

/**
 * Backward compatibility helpers for existing onboarding and tests.
 */
export async function detectDistrictFromCoordinates(latitude: number, longitude: number) {
  const reverseResult = await reverseGeocodeLocationAction(latitude, longitude);
  if (!reverseResult) return { districtId: null, districtName: null, displayName: "" };

  const hierarchy = await resolveLocationHierarchyAction({
    latitude,
    longitude,
    placeName: reverseResult.placeName,
    districtName: reverseResult.district,
    blockName: reverseResult.subdistrict,
  });

  return {
    ...hierarchy,
    displayName: reverseResult.displayName,
  };
}

export async function searchLocations(query: string) {
  const results = await searchLocationsAction(query);
  return results.map((r) => ({
    displayName: r.displayName,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

export async function resolveLocation(latitude: number, longitude: number) {
  return detectDistrictFromCoordinates(latitude, longitude);
}
