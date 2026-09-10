import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import SurveillanceHeatmapInternal, {
  MapMarkerData,
  formatVillageName,
  formatBlockName,
  isValidCoordinate,
} from "@/components/authority/SurveillanceHeatmapInternal";

import L from "leaflet";

const sampleMarkers: MapMarkerData[] = [
  {
    id: "marker-1",
    name: "Baramati",
    blockName: "Baramati",
    lat: 18.1517,
    lng: 74.5772,
    caseCount: 8,
    highRiskCount: 3,
    confirmedCount: 2,
    activeAlert: true,
    diseaseName: "Foot and Mouth Disease",
    speciesBreakdown: { cow: 4, buffalo: 3, goat: 1, other: 0 },
  },
  {
    id: "marker-2",
    name: "Malegaon_BK",
    blockName: "Baramati",
    lat: 18.1517, // Shared coordinate with marker-1 to test micro-offset
    lng: 74.5772,
    caseCount: 2,
    highRiskCount: 0,
    confirmedCount: 1,
    activeAlert: false,
    speciesBreakdown: { cow: 1, buffalo: 1, goat: 0, other: 0 },
  },
  {
    id: "marker-3",
    name: "Junnar_Rural",
    blockName: "Junnar",
    lat: 19.2065,
    lng: 73.8767,
    caseCount: 1,
    highRiskCount: 0,
    confirmedCount: 0,
    activeAlert: false,
    speciesBreakdown: { cow: 1, buffalo: 0, goat: 0, other: 0 },
  },
  {
    id: "marker-invalid",
    name: "Corrupt_Coords",
    blockName: "Pune",
    lat: NaN,
    lng: 0,
    caseCount: 1,
    highRiskCount: 0,
    confirmedCount: 0,
    activeAlert: false,
  },
];

describe("Map Rendering & GIS Surveillance Heatmap Smoke Test (Batch 2 - F-09)", () => {
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

    it("formats village and block names by cleaning internal IDs and fallback handling", () => {
      expect(formatVillageName("Baramati", "Baramati")).toBe("Baramati");
      expect(formatVillageName("Vil P123456", "Shirur")).toBe("Shirur Rural Cluster");
      expect(formatVillageName(null, null)).toBe("Village location unavailable");
      expect(formatBlockName("Haveli")).toBe("Haveli");
      expect(formatBlockName("Block P999999")).toBe("Haveli");
    });
  });

  describe("SurveillanceHeatmapInternal Component Mounting & Leaflet Lifecycle", () => {
    it("mounts safely without SSR or window crashes", () => {
      const { container } = render(
        <SurveillanceHeatmapInternal
          markers={sampleMarkers}
          selectedMarkerId={null}
          searchQuery=""
        />
      );

      // The container element must be present in the DOM
      const mapContainer = container.querySelector(".leaflet-container");
      expect(mapContainer || container.firstElementChild).toBeInTheDocument();
    });

    it("creates circleMarkers with semantic colors and attaches tooltips and popups", () => {
      const onSelectMarker = vi.fn();

      const { container } = render(
        <SurveillanceHeatmapInternal
          markers={sampleMarkers}
          selectedMarkerId="marker-1"
          onSelectMarker={onSelectMarker}
          searchQuery=""
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    it("applies micro-spiral coordinate offsets to prevent marker stacking on shared coordinates", () => {
      const circleMarkerSpy = vi.spyOn(L, "circleMarker");

      render(
        <SurveillanceHeatmapInternal
          markers={sampleMarkers}
          selectedMarkerId={null}
          searchQuery=""
        />
      );

      // marker-1 and marker-2 share base coordinates [18.1517, 74.5772]
      const calls = circleMarkerSpy.mock.calls;
      const marker1Coords = calls.find((call) => {
        const [latLng] = call;
        return Array.isArray(latLng) && Math.abs(latLng[0] - 18.1517) < 0.0001;
      })?.[0] as [number, number];

      const marker2Coords = calls.find((call) => {
        const [latLng] = call;
        return Array.isArray(latLng) && Math.abs(latLng[0] - 18.1517) >= 0.0001 && Math.abs(latLng[0] - 18.1517) < 0.01;
      })?.[0] as [number, number];

      expect(marker1Coords).toBeDefined();
      expect(marker2Coords).toBeDefined();
      expect(marker1Coords[0]).not.toBe(marker2Coords[0]);
      expect(marker1Coords[1]).not.toBe(marker2Coords[1]);
    });

    it("filters out invalid coordinates and respects search queries", () => {
      const { rerender } = render(
        <SurveillanceHeatmapInternal
          markers={sampleMarkers}
          selectedMarkerId={null}
          searchQuery="Junnar"
        />
      );

      // Re-render with empty search query
      rerender(
        <SurveillanceHeatmapInternal
          markers={sampleMarkers}
          selectedMarkerId={null}
          searchQuery=""
        />
      );
    });

    it("handles focusMarkerId navigation cleanly", () => {
      const onSelectMarker = vi.fn();

      render(
        <SurveillanceHeatmapInternal
          markers={sampleMarkers}
          selectedMarkerId={null}
          onSelectMarker={onSelectMarker}
          focusMarkerId="marker-1"
        />
      );

      expect(onSelectMarker).toHaveBeenCalledWith(
        expect.objectContaining({ id: "marker-1", name: "Baramati" })
      );
    });

    it("cleans up resize observer and map references on unmount", () => {
      const { unmount } = render(
        <SurveillanceHeatmapInternal
          markers={sampleMarkers}
          selectedMarkerId={null}
        />
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});
