"use client";

import React from "react";
import { LocationSearch, SelectedLocationData } from "@/components/geo/LocationSearch";

interface LocationCaptureProps {
  gpsLat: number | null;
  gpsLng: number | null;
  onChangeLocation: (lat: number | null, lng: number | null) => void;
}

export function LocationCapture({
  gpsLat,
  gpsLng,
  onChangeLocation,
}: LocationCaptureProps) {
  const initialValue: SelectedLocationData | null =
    gpsLat !== null && gpsLng !== null
      ? {
          districtId: null,
          districtName: null,
          blockId: null,
          blockName: null,
          villageId: null,
          villageName: null,
          isUrban: false,
          latitude: gpsLat,
          longitude: gpsLng,
          displayName: `Location (${gpsLat.toFixed(4)}, ${gpsLng.toFixed(4)})`,
        }
      : null;

  const handleLocationSelect = (selected: SelectedLocationData) => {
    onChangeLocation(selected.latitude, selected.longitude);
  };

  return (
    <div className="space-y-3">
      <LocationSearch
        value={initialValue}
        onLocationSelect={handleLocationSelect}
        label="Farm / Disease Outbreak Location"
        required={false}
        showMapPreview={true}
      />
    </div>
  );
}