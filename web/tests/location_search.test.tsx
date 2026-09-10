import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
import { LocationSearch, SelectedLocationData } from "@/components/geo/LocationSearch";

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
      assistanceRequest: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        groupBy: vi.fn(),
      },
    },
  };
});

// Mock server actions for UI tests
vi.mock("@/lib/actions/geo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/actions/geo")>();
  return {
    ...actual,
    searchLocationsAction: vi.fn().mockImplementation(actual.searchLocationsAction),
    reverseGeocodeLocationAction: vi.fn().mockImplementation(actual.reverseGeocodeLocationAction),
    resolveLocationHierarchyAction: vi.fn().mockImplementation(actual.resolveLocationHierarchyAction),
  };
});

describe("GPS-Biased Location Search & Rebuilt Two-Choice UX", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  /* ------------------------------------------------------------------
   * UI FLOW & PERMISSION TESTS
   * ------------------------------------------------------------------ */

  it("1. Location screen shows exactly two primary choices on landing", () => {
    render(<LocationSearch onLocationSelect={vi.fn()} />);

    expect(screen.getByText("Where is the animal/farm located?")).toBeInTheDocument();
    expect(screen.getByText("Search for a location")).toBeInTheDocument();
    expect(screen.getByText("Use my current location")).toBeInTheDocument();
  });

  it("2. Opening LocationSearch does NOT invoke navigator.geolocation on mount", () => {
    const getCurrentPositionMock = vi.fn();
    Object.defineProperty(global.navigator, "geolocation", {
      value: { getCurrentPosition: getCurrentPositionMock },
      configurable: true,
      writable: true,
    });

    render(<LocationSearch onLocationSelect={vi.fn()} />);

    expect(getCurrentPositionMock).not.toHaveBeenCalled();
  });

  it("3. Tapping 'Search for a location' switches to search input without requesting GPS", () => {
    const getCurrentPositionMock = vi.fn();
    Object.defineProperty(global.navigator, "geolocation", {
      value: { getCurrentPosition: getCurrentPositionMock },
      configurable: true,
      writable: true,
    });

    render(<LocationSearch onLocationSelect={vi.fn()} />);

    fireEvent.click(screen.getByText("Search for a location"));

    expect(screen.getByPlaceholderText(/Type at least 3 letters/i)).toBeInTheDocument();
    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(getCurrentPositionMock).not.toHaveBeenCalled();
  });

  it("4. GPS permission is requested ONLY after tapping 'Use my current location'", () => {
    const getCurrentPositionMock = vi.fn();
    Object.defineProperty(global.navigator, "geolocation", {
      value: { getCurrentPosition: getCurrentPositionMock },
      configurable: true,
      writable: true,
    });

    render(<LocationSearch onLocationSelect={vi.fn()} />);

    expect(getCurrentPositionMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Use my current location"));

    expect(getCurrentPositionMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Detecting your current location...")).toBeInTheDocument();
  });

  it("5. GPS denied flow shows clear non-blocking message and 'Search for a location' button", () => {
    Object.defineProperty(global.navigator, "geolocation", {
      value: {
        getCurrentPosition: vi.fn((_success, error) => {
          error({ code: 1, PERMISSION_DENIED: 1, message: "User denied Geolocation" });
        }),
      },
      configurable: true,
      writable: true,
    });

    render(<LocationSearch onLocationSelect={vi.fn()} />);

    fireEvent.click(screen.getByText("Use my current location"));

    expect(screen.getByText("Location access was not granted.")).toBeInTheDocument();
    expect(screen.getByText("Search for a location instead.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Search for a location/i })).toBeInTheDocument();
  });

  it("6. GPS unavailable flow shows clear error message and provides fallback to search", () => {
    Object.defineProperty(global.navigator, "geolocation", {
      value: {
        getCurrentPosition: vi.fn((_success, error) => {
          error({ code: 2, PERMISSION_DENIED: 1, message: "Position unavailable" });
        }),
      },
      configurable: true,
      writable: true,
    });

    render(<LocationSearch onLocationSelect={vi.fn()} />);

    fireEvent.click(screen.getByText("Use my current location"));

    expect(screen.getByText("GPS Unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Search for a location/i })).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------
   * GEOCODING & MAPBOX V6 TESTS
   * ------------------------------------------------------------------ */

  it("7. Haversine Distance: accurately computes distance and identical coords return 0", () => {
    // 18.5204, 73.8567 to 19.0760, 72.8777 ~ 120 km
    const dist = calculateHaversineDistanceKm(18.5204, 73.8567, 19.076, 72.8777);
    expect(dist).toBeGreaterThan(110);
    expect(dist).toBeLessThan(130);

    expect(calculateHaversineDistanceKm(18.5204, 73.8567, 18.5204, 73.8567)).toBe(0);
  });

  it("8. Min query length: returns empty array when query is less than 3 characters", async () => {
    const resEmpty = await searchLocationsAction("");
    const resOne = await searchLocationsAction("a");
    const resTwo = await searchLocationsAction("ab");

    expect(resEmpty).toEqual([]);
    expect(resOne).toEqual([]);
    expect(resTwo).toEqual([]);
  });

  it("9. Mapbox Geocoding v6 Forward: does NOT include proximity if user GPS was not granted", async () => {
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
                },
              },
            },
          ],
        }),
      };
    });

    const results = await searchLocationsAction("Wagholi", null);

    expect(requestedUrl).toContain("https://api.mapbox.com/search/geocode/v6/forward");
    expect(requestedUrl).toContain("q=Wagholi");
    expect(requestedUrl).toContain("country=IN");
    expect(requestedUrl).not.toContain("proximity=");
    expect(results).toHaveLength(1);
    expect(results[0].placeName).toBe("Wagholi");
  });

  it("10. Mapbox Geocoding v6 Forward: includes proximity only when user GPS is provided", async () => {
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
                },
              },
            },
          ],
        }),
      };
    });

    const results = await searchLocationsAction("Wagholi", { lat: 18.5204, lng: 73.8567 });

    expect(requestedUrl).toContain("proximity=73.8567%2C18.5204");
    expect(results[0].distanceKm).toBeDefined();
    expect(results[0].distanceKm).toBeGreaterThan(0);
  });

  it("11. Mapbox Geocoding v6 Reverse: uses exact device coordinates and returns reverse place", async () => {
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
              id: "place.rev1",
              geometry: { coordinates: [73.8567, 18.5204] },
              properties: {
                name: "Shivajinagar",
                name_preferred: "Shivajinagar",
                context: {
                  district: { name: "Pune" },
                  region: { name: "Maharashtra" },
                },
              },
            },
          ],
        }),
      };
    });

    const result = await reverseGeocodeLocationAction(18.5204, 73.8567);

    expect(requestedUrl).toContain("https://api.mapbox.com/search/geocode/v6/reverse");
    expect(requestedUrl).toContain("latitude=18.5204");
    expect(requestedUrl).toContain("longitude=73.8567");
    expect(result?.placeName).toBe("Shivajinagar");
    expect(result?.district).toBe("Pune");
  });

  /* ------------------------------------------------------------------
   * LOCAL PRISMA FALLBACK & NO PUNE DEFAULT TESTS
   * ------------------------------------------------------------------ */

  it("12. Local Prisma Fallback: searches existing database hierarchy and NEVER fabricates Pune coordinates or 0,0", async () => {
    delete process.env.MAPBOX_ACCESS_TOKEN;

    vi.mocked(prisma.village.findMany).mockResolvedValue([
      {
        id: "v-local-1",
        name: "Shikrapur",
        blockId: "b1",
        createdAt: new Date(),
        updatedAt: new Date(),
        block: {
          id: "b1",
          name: "Shirur",
          districtId: "d1",
          createdAt: new Date(),
          updatedAt: new Date(),
          district: { id: "d1", name: "Pune", createdAt: new Date(), updatedAt: new Date() },
        },
        farms: [], // No farm coordinates stored
      },
    ] as never);

    vi.mocked(prisma.block.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.district.findMany).mockResolvedValue([] as never);

    const results = await searchLocationsAction("Shikrapur", null);

    expect(results).toHaveLength(1);
    expect(results[0].placeName).toBe("Shikrapur");
    expect(results[0].latitude).toBeNull();
    expect(results[0].longitude).toBeNull();
    expect(results[0].distanceKm).toBeNull();
  });

  it("13. Authoritative Hierarchy Resolution: matches District, Block, and Village without creating new records", async () => {
    vi.mocked(prisma.district.findFirst).mockResolvedValue({
      id: "dist_pune",
      name: "Pune",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    vi.mocked(prisma.block.findFirst).mockResolvedValue({
      id: "block_shirur",
      name: "Shirur",
      districtId: "dist_pune",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    vi.mocked(prisma.village.findFirst).mockResolvedValue({
      id: "vill_shikrapur",
      name: "Shikrapur",
      blockId: "block_shirur",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const hierarchy = await resolveLocationHierarchyAction({
      latitude: 18.7001,
      longitude: 74.1202,
      placeName: "Shikrapur",
      districtName: "Pune",
      blockName: "Shirur",
    });

    expect(hierarchy.districtId).toBe("dist_pune");
    expect(hierarchy.blockId).toBe("block_shirur");
    expect(hierarchy.villageId).toBe("vill_shikrapur");
    expect(hierarchy.isUrban).toBe(false);

    // Verify ZERO Village creation was attempted
    expect(prisma.village.create).not.toHaveBeenCalled();
    expect(prisma.village.upsert).not.toHaveBeenCalled();
  });

  it("14. Urban Location Handling: returns villageId: null and isUrban: true for city/town areas", async () => {
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

    vi.mocked(prisma.village.findFirst).mockResolvedValue(null);

    const hierarchy = await resolveLocationHierarchyAction({
      latitude: 18.5204,
      longitude: 73.8567,
      placeName: "Kothrud",
      districtName: "Pune",
      blockName: "Pune City",
    });

    expect(hierarchy.districtId).toBe("dist_pune");
    expect(hierarchy.blockId).toBe("block_pune_city");
    expect(hierarchy.villageId).toBeNull();
    expect(hierarchy.isUrban).toBe(true);
  });

  /* ------------------------------------------------------------------
   * LOCATION AUTHORIZATION & ROUTING TESTS
   * ------------------------------------------------------------------ */

  it("15. Location Authorization: tier match rules work for SAME_VILLAGE, SAME_BLOCK, SAME_DISTRICT, and CROSS_DISTRICT", () => {
    const locV1 = { villageId: "v1", blockId: "b1", districtId: "d1" };
    const locV2SameBlock = { villageId: "v2", blockId: "b1", districtId: "d1" };
    const locB2SameDistrict = { villageId: "v3", blockId: "b2", districtId: "d1" };
    const locCrossDistrict = { villageId: "v4", blockId: "b3", districtId: "d2" };

    expect(calculateLocationMatch({ villageId: "v1", blockId: "b1", districtId: "d1" }, locV1).tier)
      .toBe(LocationMatchTier.SAME_VILLAGE);

    expect(calculateLocationMatch({ villageId: "v1", blockId: "b1", districtId: "d1" }, locV2SameBlock).tier)
      .toBe(LocationMatchTier.SAME_BLOCK);

    expect(calculateLocationMatch({ villageId: "v1", blockId: "b1", districtId: "d1" }, locB2SameDistrict).tier)
      .toBe(LocationMatchTier.SAME_DISTRICT);

    expect(calculateLocationMatch({ villageId: "v1", blockId: "b1", districtId: "d1" }, locCrossDistrict).tier)
      .toBe(LocationMatchTier.NO_MATCH);

    expect(isLocationAuthorized({ role: "VETERINARIAN", districtId: "d1" }, locV1)).toBe(true);
    expect(isLocationAuthorized({ role: "VETERINARIAN", districtId: "d1" }, locCrossDistrict)).toBe(false);
  });

  it("16. Field Agent Routing Priority: findEligibleFieldAgents sorts by proximity tier", async () => {
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

    vi.mocked(prisma.assistanceRequest.groupBy).mockResolvedValue([] as never);

    const result = await findEligibleFieldAgents("v1", "b1", "d1");

    expect(result).not.toBeNull();
    expect(result?.level).toBe("VILLAGE");
    expect(result?.eligibleAgents[0].id).toBe("agent_village"); // Priority 1: Same village
  });

  it("17. Selected Location Map Preview: renders map iframe ONLY when valid real coordinates exist", () => {
    const locationWithCoords: SelectedLocationData = {
      districtId: "d1",
      districtName: "Pune",
      blockId: "b1",
      blockName: "Haveli",
      villageId: "v1",
      villageName: "Wagholi",
      isUrban: false,
      latitude: 18.5793,
      longitude: 73.9806,
      displayName: "Wagholi, Haveli, Pune",
    };

    const { rerender } = render(
      <LocationSearch value={locationWithCoords} onLocationSelect={vi.fn()} showMapPreview={true} />
    );

    expect(screen.getByTitle("Selected Location Map Preview")).toBeInTheDocument();

    const locationWithoutCoords: SelectedLocationData = {
      districtId: "d1",
      districtName: "Pune",
      blockId: "b1",
      blockName: "Haveli",
      villageId: "v1",
      villageName: "Wagholi",
      isUrban: false,
      latitude: null,
      longitude: null,
      displayName: "Wagholi, Haveli, Pune",
    };

    rerender(
      <LocationSearch value={locationWithoutCoords} onLocationSelect={vi.fn()} showMapPreview={true} />
    );

    expect(screen.queryByTitle("Selected Location Map Preview")).not.toBeInTheDocument();
  });

  it("18. Clearing selected location returns user to landing two-choice options", () => {
    const onClearMock = vi.fn();
    const locationWithCoords: SelectedLocationData = {
      districtId: "d1",
      districtName: "Pune",
      blockId: "b1",
      blockName: "Haveli",
      villageId: "v1",
      villageName: "Wagholi",
      isUrban: false,
      latitude: 18.5793,
      longitude: 73.9806,
      displayName: "Wagholi, Haveli, Pune",
    };

    render(
      <LocationSearch
        value={locationWithCoords}
        onLocationSelect={vi.fn()}
        onClear={onClearMock}
      />
    );

    expect(screen.getByText("Change location")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Change location"));

    expect(onClearMock).toHaveBeenCalled();
  });
});
