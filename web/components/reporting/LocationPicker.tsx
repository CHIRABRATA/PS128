// components/reporting/LocationPicker.tsx
"use client";

import React from "react";
import { LocationSearch, SelectedLocationData } from "@/components/geo/LocationSearch";

export interface LocationData {
  village: string;
  latitude: number | null;
  longitude: number | null;
  districtId?: string | null;
  blockId?: string | null;
  villageId?: string | null;
}

interface LocationPickerProps {
  value?: string;
  onLocationSelect: (location: LocationData) => void;
  label?: string;
  required?: boolean;
}

export function LocationPicker({
  onLocationSelect,
  label = "Village / Location",
  required = true,
}: LocationPickerProps) {
  const handleSelect = (selected: SelectedLocationData) => {
    onLocationSelect({
      village: selected.displayName || selected.villageName || selected.placeName || "Selected Location",
      latitude: selected.latitude,
      longitude: selected.longitude,
      districtId: selected.districtId,
      blockId: selected.blockId,
      villageId: selected.villageId,
    });
  };

  return (
    <LocationSearch
      label={label}
      required={required}
      onLocationSelect={handleSelect}
    />
  );
}