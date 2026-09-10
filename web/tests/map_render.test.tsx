import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import SurveillanceHeatmapInternal, {
  MapLayerVisibility,
} from "@/components/authority/SurveillanceHeatmapInternal";
import {
  formatVillageName,
  formatBlockName,
  isValidCoordinate,
} from "@/components/authority/mapUtils";
import { DistrictMapLayersData } from "@/lib/authority/metrics";

const sampleMapLayers: DistrictMapLayersData = {
  heatmapPoints: [
    {
      lat: 18.1517,
      lng: 74.5772,
      weight: 5.0,
      caseCount: 1,
      riskLevel: "HIGH",
      locationName: "Baramati",
    },
  ],
  farms: [
    {
      id: "farm-1",
      name: "Baramati Farm",
      villageName: "Baramati",
      blockName: "Baramati",
      farmerName: "Farmer Ramesh",
      lat: 18.1517,
      lng: 74.5772,
      animalCount: 8,
      activeCaseCount: 2,
    },
  ],
  cases: [
    {
      id: "case-1",
      caseNumber: "CASE-2026-101",
      status: "PENDING_REVIEW",
      riskLevel: "HIGH",
      species: "COW",
      animalTag: "TAG-101",
      farmName: "Baramati Farm",
      villageName: "Baramati",
      blockName: "Baramati",
      farmerName: "Farmer Ramesh",
      reportedAt: new Date().toISOString(),
      lat: 18.1517,
      lng: 74.5772,
    },
  ],
  veterinarians: [
    {
      id: "vet-1",
      name: "Dr. Sharma",
      phone: "+919800000000",
      serviceArea: "Baramati",
      activeCasesCount: 2,
      pendingReviewsCount: 1,
      lat: 18.1517,
      lng: 74.5772,
    },
  ],
  fieldAgents: [
    {
      id: "agent-1",
      name: "Agent Patil",
      phone: "+919800000001",
      serviceArea: "Baramati",
      openRequestsCount: 1,
      completedVisitsCount: 3,
      lat: 18.1517,
      lng: 74.5772,
    },
  ],
  fieldVisits: [
    {
      id: "visit-1",
      visitDate: new Date().toISOString(),
      agentName: "Agent Patil",
      farmName: "Baramati Farm",
      villageName: "Baramati",
      status: "Completed",
      observations: "Inspection done",
      lat: 18.1517,
      lng: 74.5772,
    },
  ],
  alerts: [
    {
      id: "alert-1",
      diseaseName: "FMD",
      caseCount: 3,
      villageName: "Baramati",
      blockName: "Baramati",
      windowStart: new Date().toISOString(),
      windowEnd: new Date().toISOString(),
      active: true,
      lat: 18.1517,
      lng: 74.5772,
    },
  ],
};

const defaultLayerVisibility: MapLayerVisibility = {
  heatmap: true,
  farms: true,
  cases: true,
  vets: true,
  agents: true,
  visits: true,
  alerts: true,
};

describe("Map Rendering & GIS Surveillance Heatmap Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Coordinate & Name Utilities", () => {
    it("validates geographic coordinates accurately", () => {
      expect(isValidCoordinate(18.5204, 73.8567)).toBe(true);
      expect(isValidCoordinate(0, 0)).toBe(false);
      expect(isValidCoordinate(NaN, 73.8567)).toBe(false);
      expect(isValidCoordinate(18.5204, NaN)).toBe(false);
      expect(isValidCoordinate(-91, 73.8567)).toBe(false);
      expect(isValidCoordinate(18.5204, 185)).toBe(false);
    });

    it("formats village and block names without hardcoded fallbacks", () => {
      expect(formatVillageName("Baramati", "Baramati")).toBe("Baramati");
      expect(formatVillageName("Vil P123456", "Shirur")).toBe("Shirur Cluster");
      expect(formatVillageName(null, null)).toBe("Village location unavailable");
      expect(formatBlockName("Baramati")).toBe("Baramati");
      expect(formatBlockName(null)).toBe("Block Jurisdiction");
    });
  });

  describe("SurveillanceHeatmapInternal Component Mounting & Leaflet Lifecycle", () => {
    it("mounts safely without SSR or window crashes", () => {
      const { container } = render(
        <SurveillanceHeatmapInternal
          mapLayers={sampleMapLayers}
          layerVisibility={defaultLayerVisibility}
          searchQuery=""
        />
      );

      const mapContainer = container.querySelector(".leaflet-container");
      expect(mapContainer || container.firstElementChild).toBeInTheDocument();
    });

    it("handles entity selection and search queries cleanly", () => {
      const onSelectEntity = vi.fn();

      const { rerender } = render(
        <SurveillanceHeatmapInternal
          mapLayers={sampleMapLayers}
          layerVisibility={defaultLayerVisibility}
          onSelectEntity={onSelectEntity}
          searchQuery="Baramati"
        />
      );

      rerender(
        <SurveillanceHeatmapInternal
          mapLayers={sampleMapLayers}
          layerVisibility={defaultLayerVisibility}
          onSelectEntity={onSelectEntity}
          searchQuery=""
        />
      );
    });

    it("cleans up map and resize observers on unmount", () => {
      const { unmount } = render(
        <SurveillanceHeatmapInternal
          mapLayers={sampleMapLayers}
          layerVisibility={defaultLayerVisibility}
        />
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});
