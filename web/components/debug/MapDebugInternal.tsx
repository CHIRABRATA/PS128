"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function MapDebugInternal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    // Standard geographic center
    const map = L.map(containerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    });

    // Pure standard official OpenStreetMap single-host URL
    const tileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    });

    tileLayer.addTo(map);
    mapRef.current = map;

    const t = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="w-full h-screen flex flex-col p-4 bg-white text-[#191F1C] font-sans">
      <div className="mb-3 p-3 bg-stone-100 rounded-xl border border-stone-300 text-xs flex items-center justify-between">
        <div>
          <span className="font-bold">Map Debug Route:</span> OpenStreetMap Standard Baseline (
          <code className="bg-stone-200 px-1 py-0.5 rounded font-mono">https://tile.openstreetmap.org/&#123;z&#125;/&#123;x&#125;/&#123;y&#125;.png</code>
          )
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 w-full rounded-2xl border border-stone-300 shadow-sm overflow-hidden min-h-[500px]"
        style={{ height: "calc(100vh - 80px)", minHeight: "500px", width: "100%" }}
      />
    </div>
  );
}
