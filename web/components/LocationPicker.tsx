// components/LocationPicker.tsx
"use client";

import React, { useState } from "react";

interface LocationData {
  village: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
}

export default function LocationPicker({ onLocationSelect }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // 1. Fetch current live GPS location
  const handleFetchGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          // Reverse geocode to get village/city name
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          const villageName =
            data.address.village ||
            data.address.town ||
            data.address.suburb ||
            data.address.city ||
            "Current Location";

          setSearchQuery(villageName);
          onLocationSelect({ village: villageName, latitude: lat, longitude: lng });
        } catch (error) {
          onLocationSelect({ village: "Current Location", latitude: lat, longitude: lng });
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        alert("Unable to retrieve your location. Please type manually.");
        setGpsLoading(false);
      }
    );
  };

  // 2. Search location via OpenStreetMap / Google API (e.g. Burdwan Merual)
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          value
        )}&countrycodes=in&limit=5`
      );
      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectSuggestion = (item: any) => {
    const displayName = item.display_name.split(",")[0];
    setSearchQuery(displayName);
    setSuggestions([]);
    
    onLocationSelect({
      village: displayName,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    });
  };

  return (
    <div className="space-y-2 relative">
      <label className="block text-sm font-medium text-gray-700">
        Village / Location *
      </label>

      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Type to search (e.g. Merual, Burdwan)..."
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-black"
        />

        <button
          type="button"
          onClick={handleFetchGPS}
          disabled={gpsLoading}
          className="flex items-center gap-1 px-3 py-2 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 text-xs font-semibold whitespace-nowrap"
        >
          {gpsLoading ? "Fetching..." : "📍 Detect GPS"}
        </button>
      </div>

      {/* Dropdown Suggestions List */}
      {suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1">
          {suggestions.map((item, index) => (
            <li
              key={index}
              onClick={() => selectSuggestion(item)}
              className="p-3 hover:bg-emerald-50 cursor-pointer border-b text-sm text-gray-800"
            >
              <div className="font-medium">{item.display_name.split(",")[0]}</div>
              <div className="text-xs text-gray-500 truncate">{item.display_name}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}