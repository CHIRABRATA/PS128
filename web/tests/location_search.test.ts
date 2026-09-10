import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateHaversineDistanceKm } from "@/lib/geo/distance";
import {
  searchLocationsAction,
  reverseGeocodeLocationAction,
  resolveLocationHierarchyAction,
} from "@/lib/actions/geo";
import {
  calculateLocationMatch,
  isLocationAuthorized,
  findEligibleFieldAgents,
  LocationMatchTier,
} from "@/lib/geo/routing";
import prisma from "@/lib/db/prisma";

// Mock Prisma for database queries
vi.mock("@/lib/db/prisma", () => {
  return {
    default: {
      district: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
        count: vi.fn(),
      },
      block: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
        count: vi.fn(),
      },
      village: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
        count: vi.fn(),
      },
      farm: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  };
});

describe("GPS-Biased Location Search & Authoritative Hierarchy Resolution", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("1. Haversine Distance: accurately computes distance between coordinates", () => {
    // Pune (18.5204, 73.8567) to Mumbai (19.0760, 72.8777) ~ 120 km
    const dist = calculateHaversineDistanceKm(18.5204, 73.8567, 19.076, 72.8777);
    expect(dist).toBeGreaterThan(110);
    expect(dist).toBeLessThan(130);

    // Identical coords = 0 km
    expect(calculateHaversineDistanceKm(18.5204, 73.8567, 18.5204, 73.8567)).toBe(0);
  });

  it("2. Min query length: returns empty array when query is less than 3 characters", async () => {
    const resEmpty = await searchLocationsAction("");
    const resOne = await searchLocationsAction("a");
    const resTwo = await searchLocationsAction("ab");

    expect(resEmpty).toEqual([]);
    expect(resOne).toEqual([]);
    expect(resTwo).toEqual([]);
  });

  it("3. Mapbox Geocoding v6: constructs v6 endpoint with proximity, country=IN, limit, and language", async () => {
    process.env.MAPBOX_ACCESS_TOKEN = "pk_test_mapbox_secret_token";

    let requestedUrl = "";
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [
            {
              id: "place.12345",
              geometry: { coordinates: [73.9806, 18.5793] },
              properties: {
                name: "Wagholi",
                name_preferred: "Wagholi",
                feature_type: "locality",
                context: {
                  district: { name: "Pune" },
                  region: { name: "Maharashtra" },
                  country: { name: "India" },
                  locality: { name: "Haveli" },
                },
              },
            },
          ],
        }),
      };
    });

    const results = await searchLocationsAction("Wagholi", { lat: 18.5204, lng: 73.8567 });

    expect(requestedUrl).toContain("https://api.mapbox.com/search/geocode/v6/forward");
    expect(requestedUrl).toContain("q=Wagholi");
    expect(requestedUrl).toContain("proximity=73.8567%2C18.5204");
    expect(requestedUrl).toContain("country=IN");
    expect(requestedUrl).toContain("language=en");
    expect(requestedUrl).toContain("access_token=pk_test_mapbox_secret_token");

    expect(results).toHaveLength(1);
    expect(results[0].placeName).toBe("Wagholi");
    expect(results[0].district).toBe("Pune");
    expect(results[0].state).toBe("Maharashtra");
    expect(results[0].latitude).toBe(18.5793);
    expect(results[0].longitude).toBe(73.9806);
    expect(results[0].distanceKm).toBeGreaterThan(0);
  });

  it("4. Proximity ranking: nearby location ranks above distant same-name location", async () => {
    process.env.MAPBOX_ACCESS_TOKEN = "pk_test_mapbox_secret_token";

    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [
            {
              id: "place.far",
              geometry: { coordinates: [78.0, 28.0] }, // Far location in UP (~1200 km)
              properties: {
                name: "Khed",
                context: { district: { name: "Aligarh" }, region: { name: "Uttar Pradesh" } },
              },
            },
            {
              id: "place.near",
              geometry: { coordinates: [73.88, 18.85] }, // Near location in Pune district (~35 km)
              properties: {
                name: "Khed",
                context: { district: { name: "Pune" }, region: { name: "Maharashtra" } },
              },
            },
          ],
        }),
      };
    });

    const userGps = { lat: 18.5204, lng: 73.8567 }; // User in Pune
    const results = await searchLocationsAction("Khed", userGps);

    expect(results).toHaveLength(2);
    // Near location has small distanceKm, far has large distanceKm
    const near = results.find((r) => r.district === "Pune");
    const far = results.find((r) => r.district === "Aligarh");

    expect(near?.distanceKm).toBeLessThan(50);
    expect(far?.distanceKm).toBeGreaterThan(1000);
  });

  it("5. GPS Denied / Fallback: text search works cleanly without GPS coordinates", async () => {
    process.env.MAPBOX_ACCESS_TOKEN = "pk_test_mapbox_secret_token";

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      expect(url).not.toContain("proximity=");
      return {
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [
            {
              id: "place.pune",
              geometry: { coordinates: [73.8567, 18.5204] },
              properties: {
                name: "Pune",
                context: { region: { name: "Maharashtra" } },
              },
            },
          ],
        }),
      };
    });

    // Pass null/undefined userGps
    const results = await searchLocationsAction("Pune", null);
    expect(results).toHaveLength(1);
    expect(results[0].placeName).toBe("Pune");
    expect(results[0].distanceKm).toBeNull();
  });

  it("6. Mapbox Unavailable / Token Unset: strictly falls back to local Prisma hierarchy without calling Nominatim", async () => {
    delete process.env.MAPBOX_ACCESS_TOKEN;
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    vi.mocked(prisma.village.findMany).mockResolvedValue([
      {
        id: "v-wagholi",
        name: "Wagholi",
        blockId: "b-haveli",
        createdAt: new Date(),
        updatedAt: new Date(),
        block: {
          id: "b-haveli",
          name: "Haveli",
          districtId: "d-pune",
          createdAt: new Date(),
          updatedAt: new Date(),
          district: { id: "d-pune", name: "Pune", createdAt: new Date(), updatedAt: new Date() },
        },
        farms: [{ latitude: 18.5793, longitude: 73.9806 }],
      },
    ] as never);
    vi.mocked(prisma.block.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.district.findMany).mockResolvedValue([] as never);

    const results = await searchLocationsAction("Wagholi", { lat: 18.5204, lng: 73.8567 });

    // Zero external fetch calls
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].placeName).toBe("Wagholi");
    expect(results[0].district).toBe("Pune");
    expect(results[0].subdistrict).toBe("Haveli");
  });

  it("7. Reverse Geocoding v6: 'Use My Location' reverse geocodes coordinates via v6 endpoint", async () => {
    process.env.MAPBOX_ACCESS_TOKEN = "pk_test_mapbox_secret_token";

    let requestedUrl = "";
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [
            {
              id: "place.rev",
              geometry: { coordinates: [73.9806, 18.5793] },
              properties: {
                name: "Wagholi",
                context: {
                  district: { name: "Pune" },
                  locality: { name: "Haveli" },
                  region: { name: "Maharashtra" },
                },
              },
            },
          ],
        }),
      };
    });

    const result = await reverseGeocodeLocationAction(18.5793, 73.9806);

    expect(requestedUrl).toContain("https://api.mapbox.com/search/geocode/v6/reverse");
    expect(requestedUrl).toContain("latitude=18.5793");
    expect(requestedUrl).toContain("longitude=73.9806");
    expect(result?.placeName).toBe("Wagholi");
    expect(result?.district).toBe("Pune");
  });

  it("8. Authoritative Hierarchy Resolution: matches existing Village, Block, and District IDs without creating duplicates", async () => {
    vi.mocked(prisma.district.findFirst).mockResolvedValue({
      id: "dist_pune",
      name: "Pune",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.block.findFirst).mockResolvedValue({
      id: "block_haveli",
      name: "Haveli",
      districtId: "dist_pune",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.village.findFirst).mockResolvedValue({
      id: "village_wagholi",
      name: "Wagholi",
      blockId: "block_haveli",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const hierarchy = await resolveLocationHierarchyAction({
      latitude: 18.5793,
      longitude: 73.9806,
      placeName: "Wagholi",
      districtName: "Pune",
      blockName: "Haveli",
    });

    expect(hierarchy.districtId).toBe("dist_pune");
    expect(hierarchy.blockId).toBe("block_haveli");
    expect(hierarchy.villageId).toBe("village_wagholi");
    expect(hierarchy.isUrban).toBe(false);

    // CRITICAL: verify zero create or upsert calls were made
    expect(prisma.village.create).not.toHaveBeenCalled();
    expect(prisma.village.upsert).not.toHaveBeenCalled();
    expect(prisma.district.create).not.toHaveBeenCalled();
    expect(prisma.block.create).not.toHaveBeenCalled();
  });

  it("9. Urban/Town Resolution: supports urban location where villageId is null", async () => {
    vi.mocked(prisma.district.findFirst).mockResolvedValue({
      id: "dist_pune",
      name: "Pune",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.block.findFirst).mockResolvedValue({
      id: "block_pune_city",
      name: "Pune City",
      districtId: "dist_pune",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.village.findFirst).mockResolvedValue(null as never); // No rural village

    const hierarchy = await resolveLocationHierarchyAction({
      latitude: 18.5204,
      longitude: 73.8567,
      placeName: "Shivajinagar",
      districtName: "Pune",
      blockName: "Pune City",
    });

    expect(hierarchy.districtId).toBe("dist_pune");
    expect(hierarchy.blockId).toBe("block_pune_city");
    expect(hierarchy.villageId).toBeNull();
    expect(hierarchy.isUrban).toBe(true);
  });

  it("10. Existing Location Authorization Integrity: calculateLocationMatch and isLocationAuthorized remain 100% intact", () => {
    const locV1 = { villageId: "v1", blockId: "b1", districtId: "d1" };
    const locV2 = { villageId: "v2", blockId: "b1", districtId: "d1" };
    const locCrossDistrict = { villageId: "v3", blockId: "b2", districtId: "d2" };

    // Same village: score 100
    const matchSameVillage = calculateLocationMatch(locV1, locV1);
    expect(matchSameVillage.tier).toBe(LocationMatchTier.SAME_VILLAGE);
    expect(matchSameVillage.score).toBe(100);

    // Same block: score 50
    const matchSameBlock = calculateLocationMatch(locV1, locV2);
    expect(matchSameBlock.tier).toBe(LocationMatchTier.SAME_BLOCK);
    expect(matchSameBlock.score).toBe(50);

    // Cross-district: denied / score 0
    const matchCross = calculateLocationMatch(locV1, locCrossDistrict);
    expect(matchCross.tier).toBe(LocationMatchTier.NO_MATCH);
    expect(matchCross.score).toBe(0);

    // Authorization checks
    expect(isLocationAuthorized({ role: "VETERINARIAN", districtId: "d1" }, locV1)).toBe(true);
    expect(isLocationAuthorized({ role: "VETERINARIAN", districtId: "d1" }, locCrossDistrict)).toBe(false);
  });

  it("11. Field Agent Routing Priority: findEligibleFieldAgents sorts by proximity tier", async () => {
    vi.mocked(prisma.village.findUnique).mockResolvedValue({
      id: "v1",
      name: "Village 1",
      blockId: "b1",
      createdAt: new Date(),
      updatedAt: new Date(),
      block: { id: "b1", name: "Block 1", districtId: "d1", createdAt: new Date(), updatedAt: new Date() },
    } as never);

    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "agent_district", name: "District Agent", phone: "123", villageId: null, blockId: null, districtId: "d1" },
      { id: "agent_village", name: "Village Agent", phone: "123", villageId: "v1", blockId: "b1", districtId: "d1" },
      { id: "agent_block", name: "Block Agent", phone: "123", villageId: "v2", blockId: "b1", districtId: "d1" },
    ] as never);

    const agents = await findEligibleFieldAgents("v1", "b1", "d1");

    expect(agents).toHaveLength(3);
    expect(agents[0].id).toBe("agent_village"); // Priority 1: Same village
    expect(agents[1].id).toBe("agent_block"); // Priority 2: Same block
    expect(agents[2].id).toBe("agent_district"); // Priority 3: Same district
  });
});


