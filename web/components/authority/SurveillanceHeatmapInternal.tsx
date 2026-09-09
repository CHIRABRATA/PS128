"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapMarkerData, formatVillageName, formatBlockName, isValidCoordinate } from "./mapUtils";

export type { MapMarkerData };
export { formatVillageName, formatBlockName, isValidCoordinate };

interface SurveillanceHeatmapInternalProps {
  markers: MapMarkerData[];
  selectedMarkerId?: string | null;
  onSelectMarker?: (marker: MapMarkerData | null) => void;
  searchQuery?: string;
  focusMarkerId?: string | null;
}

export default function SurveillanceHeatmapInternal({
  markers,
  selectedMarkerId,
  onSelectMarker,
  searchQuery = "",
  focusMarkerId,
}: SurveillanceHeatmapInternalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // 1. Initialize Map Instance and Official OpenStreetMap Tile Layer
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Standard Maharashtra / Pune District center
    const defaultCenter: [number, number] = [18.5793, 73.9806];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 10,
        zoomControl: true,
        attributionControl: true,
      });

      // Official OpenStreetMap Single-Host Tile Layer (Standard baseline)
      const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
      const osmTileLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
        minZoom: 4,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      });

      osmTileLayer.addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;

      // Invalidate size to ensure tiles render regardless of layout timing
      const t1 = setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 50);

      const t2 = setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 200);

      const t3 = setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 500);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }

    const map = mapInstanceRef.current;
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 2. Render Clean Standard Markers and Popups
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // Filter valid markers and apply search query
    let validMarkers = markers.filter((m) => isValidCoordinate(m.lat, m.lng));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      validMarkers = validMarkers.filter(
        (m) =>
          formatVillageName(m.name, m.blockName).toLowerCase().includes(q) ||
          formatBlockName(m.blockName).toLowerCase().includes(q) ||
          (m.diseaseName && m.diseaseName.toLowerCase().includes(q))
      );
    }

    if (validMarkers.length === 0) return;

    const bounds = L.latLngBounds([]);

    // Deduplicate/offset markers sharing identical coordinates to prevent stacking
    const coordMap = new Map<string, number>();

    validMarkers.forEach((m) => {
      const cleanVillageName = formatVillageName(m.name, m.blockName);
      const cleanBlockName = formatBlockName(m.blockName);

      // Handle duplicate coordinates with slight micro-offset
      const coordKey = `${m.lat.toFixed(4)},${m.lng.toFixed(4)}`;
      const countAtCoord = coordMap.get(coordKey) || 0;
      coordMap.set(coordKey, countAtCoord + 1);

      let adjustedLat = m.lat;
      let adjustedLng = m.lng;
      if (countAtCoord > 0) {
        // Micro-spiral offset so points at identical coords are individually visible and clickable
        const angle = (countAtCoord * Math.PI) / 3;
        const offset = 0.003 * countAtCoord;
        adjustedLat += Math.sin(angle) * offset;
        adjustedLng += Math.cos(angle) * offset;
      }

      bounds.extend([adjustedLat, adjustedLng]);

      const isSelected = selectedMarkerId === m.id;

      // Semantic risk color coding: Red = critical/alert, Orange = high risk, Yellow = monitoring, Green = stable
      const markerColor = m.activeAlert
        ? "#DC2626"
        : m.highRiskCount > 0
        ? "#EA580C"
        : m.caseCount >= 2
        ? "#D97706"
        : "#059669";

      const radius = m.activeAlert ? 10 : Math.max(7, Math.min(13, 6 + m.caseCount * 1.5));

      const circleMarker = L.circleMarker([adjustedLat, adjustedLng], {
        radius: isSelected ? radius + 3 : radius,
        fillColor: markerColor,
        color: isSelected ? "#191F1C" : "#FFFFFF",
        weight: isSelected ? 3 : 2,
        opacity: 1,
        fillOpacity: 0.9,
        className: "leaflet-surveillance-marker",
      });

      // Compact Hover Tooltip (No permanent text on the map canvas)
      circleMarker.bindTooltip(
        `<div style="font-family: system-ui, sans-serif; font-size: 11px; font-weight: 700; color: #191F1C;">
          <span>${cleanVillageName}</span>
          <span style="color: ${markerColor}; margin-left: 4px;">• ${m.caseCount} Cases</span>
        </div>`,
        {
          direction: "top",
          offset: [0, -radius],
          className: "maitri-map-tooltip",
        }
      );

      // Clean, Structured Popup on Click
      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #191F1C; padding: 4px; min-width: 170px;">
          <div style="font-weight: 700; font-size: 13px; color: #191F1C; margin-bottom: 2px;">${cleanVillageName}</div>
          <div style="font-size: 11px; color: #78716C; margin-bottom: 6px;">Taluka: ${cleanBlockName} • Pune District</div>
          <div style="margin-bottom: 8px; display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: 600; font-size: 11px; ${
            m.activeAlert
              ? "background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA;"
              : "background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0;"
          }">
            ${m.activeAlert ? `🚨 ${m.diseaseName || "Active Alert"}` : "✓ Active Surveillance"}
          </div>
          <div style="border-top: 1px solid #E5E0D8; padding-top: 6px; font-size: 11px; color: #57534E; line-height: 1.5;">
            <div>• Total Cases: <strong style="color: #191F1C;">${m.caseCount}</strong></div>
            <div>• High Risk: <strong style="color: #EA580C;">${m.highRiskCount}</strong></div>
            <div>• Confirmed: <strong style="color: #059669;">${m.confirmedCount}</strong></div>
          </div>
        </div>
      `;

      circleMarker.bindPopup(popupHtml, { className: "maitri-custom-popup" });

      circleMarker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        if (onSelectMarker) {
          onSelectMarker(m);
        }
        map.flyTo([adjustedLat, adjustedLng], Math.max(map.getZoom(), 11), {
          duration: 0.5,
        });
      });

      layerGroup.addLayer(circleMarker);
    });

    // Auto-fit geographic extent on initial load if multiple markers exist
    if (validMarkers.length > 1 && !focusMarkerId) {
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 12 });
    }
  }, [markers, selectedMarkerId, onSelectMarker, searchQuery, focusMarkerId]);

  // 3. Handle focus marker requests
  useEffect(() => {
    if (!focusMarkerId || !mapInstanceRef.current) return;
    const target = markers.find((m) => m.id === focusMarkerId && isValidCoordinate(m.lat, m.lng));
    if (target) {
      mapInstanceRef.current.flyTo([target.lat, target.lng], 13, { duration: 0.6 });
      if (onSelectMarker) onSelectMarker(target);
    }
  }, [focusMarkerId, markers, onSelectMarker]);

  return (
    <div className="w-full h-full relative min-h-[480px]">
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[480px] rounded-2xl z-0"
        style={{ height: "100%", minHeight: "480px" }}
      />
    </div>
  );
}
