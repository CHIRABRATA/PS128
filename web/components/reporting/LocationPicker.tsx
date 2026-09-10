// components/reporting/LocationPicker.tsx
"use client";

import React, { useState } from "react";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LocationData {
  village: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  value?: string;
  onLocationSelect: (location: LocationData) => void;
}

export function LocationPicker({ value, onLocationSelect }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  // 1. Detect Live GPS
  const handleFetchGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          // Reverse geocode to get village/town name
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          const locationName =
            data.address.village ||
            data.address.town ||
            data.address.suburb ||
            data.address.city ||
            "Current Location";

          setSearchQuery(locationName);
          onLocationSelect({ village: locationName, latitude: lat, longitude: lng });
        } catch {
          setSearchQuery("GPS Location Detected");
          onLocationSelect({ village: "GPS Location Detected", latitude: lat, longitude: lng });
        } finally {
          setIsGpsLoading(false);
        }
      },
      () => {
        alert("Unable to fetch GPS position. Please search manually.");
        setIsGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // 2. Search location (e.g. "Burdwan Merual")
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&countrycodes=in&limit=5`
      );
      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      console.error("Geocoding error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = (item: any) => {
    const mainTitle = item.display_name.split(",")[0];
    setSearchQuery(mainTitle);
    setSuggestions([]);

    onLocationSelect({
      village: mainTitle,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    });
  };

  return (
    <div className="space-y-1.5 relative">
      <label className="text-xs font-bold text-stone-700 uppercase tracking-wide flex items-center justify-between">
        <span>Village / Location *</span>
      </label>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search village (e.g. Merual, Burdwan)..."
            className="w-full px-3 py-2 text-sm border border-[#D9D3C7] rounded-md bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-2.5 text-stone-400" />
          )}
        </div>

        <Button
          type="button"
          onClick={handleFetchGPS}
          disabled={isGpsLoading}
          variant="outline"
          size="sm"
          className="gap-1.5 border-[#D9D3C7] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold whitespace-nowrap"
        >
          {isGpsLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Navigation className="h-3.5 w-3.5" />
          )}
          <span>{isGpsLoading ? "Detecting..." : "Detect GPS"}</span>
        </Button>
      </div>

      {/* Auto-complete Suggestions List */}
      {suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-[#D9D3C7] rounded-md shadow-lg max-h-56 overflow-y-auto mt-1">
          {suggestions.map((item, idx) => (
            <li
              key={idx}
              onClick={() => handleSelectSuggestion(item)}
              className="px-3 py-2.5 hover:bg-emerald-50 cursor-pointer border-b border-stone-100 text-xs text-stone-800 flex items-start gap-2"
            >
              <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-stone-900">{item.display_name.split(",")[0]}</p>
                <p className="text-[11px] text-stone-500 truncate">{item.display_name}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}