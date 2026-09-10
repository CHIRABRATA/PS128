"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, Loader2, Search } from "lucide-react";

interface LocationCaptureProps {
  gpsLat: number | null;
  gpsLng: number | null;
  onChangeLocation: (lat: number | null, lng: number | null) => void;
}

interface NominatimSearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface NominatimReverseResult {
  address?: {
    village?: string;
    town?: string;
    suburb?: string;
    city?: string;
  };
}

export function LocationCapture({
  gpsLat,
  gpsLng,
  onChangeLocation,
}: LocationCaptureProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(null);

  // 1. Fetch current live device GPS coordinates
  const handleFetchGPS = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        onChangeLocation(lat, lng);

        try {
          // Reverse geocode to convert coordinates to readable village/town name
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data: NominatimReverseResult = await res.json();
          const place =
            data.address?.village ||
            data.address?.town ||
            data.address?.suburb ||
            data.address?.city ||
            "Detected GPS Location";
          setSelectedPlaceName(place);
          setSearchQuery(place);
        } catch {
          setSelectedPlaceName(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } finally {
          setIsGpsLoading(false);
        }
      },
      () => {
        alert("Unable to fetch GPS position. You can search for your village manually below.");
        setIsGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // 2. Search any location or village across India (e.g., "Burdwan Merual")
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
      const data: NominatimSearchResult[] = await res.json();
      setSuggestions(data);
    } catch (err) {
      console.error("Geocoding lookup error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = (item: NominatimSearchResult) => {
    const mainTitle = item.display_name.split(",")[0];
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    setSelectedPlaceName(mainTitle);
    setSearchQuery(mainTitle);
    setSuggestions([]);
    onChangeLocation(lat, lng);
  };

  return (
    <div className="space-y-4">
      {/* Search Input Box with GPS Detection Button */}
      <div className="space-y-2 relative">
        <Label htmlFor="villageSearch" className="text-xs font-bold text-stone-700">
          Search Village / Location or Detect GPS
        </Label>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-3 text-stone-400" />
            <Input
              id="villageSearch"
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search location (e.g. Merual, Burdwan)..."
              className="pl-9 bg-white border-[#D9D3C7] text-xs text-[#191F1C] min-h-[44px] rounded-xl focus:border-emerald-600 focus:outline-none"
            />
            {isSearching && (
              <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3 text-stone-400" />
            )}
          </div>

          <Button
            type="button"
            onClick={handleFetchGPS}
            disabled={isGpsLoading}
            variant="outline"
            className="gap-1.5 border-[#D9D3C7] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold whitespace-nowrap min-h-[44px] rounded-xl"
          >
            {isGpsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            <span>{isGpsLoading ? "Detecting..." : "Detect GPS"}</span>
          </Button>
        </div>

        {/* Dynamic Auto-Complete Dropdown */}
        {suggestions.length > 0 && (
          <ul className="absolute z-50 w-full bg-white border border-[#D9D3C7] rounded-2xl shadow-lg max-h-56 overflow-y-auto mt-1 divide-y divide-stone-100">
            {suggestions.map((item, idx) => (
              <li
                key={idx}
                onClick={() => handleSelectSuggestion(item)}
                className="p-3 hover:bg-emerald-50 cursor-pointer text-xs text-stone-800 flex items-start gap-2.5 transition-colors"
              >
                <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-stone-900">{item.display_name.split(",")[0]}</p>
                  <p className="text-[11px] text-stone-500 truncate">{item.display_name}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Selected Coordinates & Status Badge */}
      <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#E5E0D8] text-xs space-y-2">
        <div className="flex justify-between items-center border-b border-[#E5E0D8] pb-2">
          <span className="text-stone-500 font-medium">Selected Location:</span>
          <span className="font-bold text-emerald-900">
            {selectedPlaceName || (gpsLat && gpsLng ? "Custom Pin" : "Not Set")}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-stone-500 font-medium">GPS Coordinates:</span>
          <span className="font-mono text-stone-800">
            {gpsLat && gpsLng
              ? `${gpsLat.toFixed(5)}, ${gpsLng.toFixed(5)}`
              : "No coordinates attached"}
          </span>
        </div>
      </div>
    </div>
  );
}