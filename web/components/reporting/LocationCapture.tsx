"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, CheckCircle2, AlertTriangle } from "lucide-react";

interface LocationCaptureProps {
  gpsLat: number | null;
  gpsLng: number | null;
  onChangeLocation: (lat: number | null, lng: number | null) => void;
}

export function LocationCapture({ gpsLat, gpsLng, onChangeLocation }: LocationCaptureProps) {
  const [fetching, setFetching] = useState(false);
  const [geoError, setGeoError] = useState("");

  const handleCaptureGPS = () => {
    setFetching(true);
    setGeoError("");

    if (!navigator.geolocation) {
      setGeoError("GPS is not available in this browser.");
      setFetching(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChangeLocation(position.coords.latitude, position.coords.longitude);
        setFetching(false);
      },
      (error) => {
        setFetching(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError("GPS permission was denied. The report will use the village default location.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError("Unable to get GPS location.");
            break;
          case error.TIMEOUT:
            setGeoError("GPS request timed out. Try again.");
            break;
          default:
            setGeoError("Unable to capture GPS location.");
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-emerald-700" />
          <span>Field GPS Location</span>
        </label>
        <span className="text-[11px] text-stone-500">Optional</span>
      </div>

      <div className="p-4 rounded-2xl border border-[#E5E0D8] bg-[#FAF8F3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="space-y-1">
          {gpsLat && gpsLng ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 flex-shrink-0" />
              <span className="text-xs font-bold text-stone-900 font-mono">
                GPS captured: {gpsLat.toFixed(4)}, {gpsLng.toFixed(4)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-stone-400 flex-shrink-0" />
              <span className="text-xs text-stone-600">
                {geoError ? geoError : "Add your farm GPS location for accurate disease mapping."}
              </span>
            </div>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          variant={gpsLat ? "outline" : "default"}
          disabled={fetching}
          onClick={handleCaptureGPS}
          className="gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex-shrink-0 min-h-[40px] rounded-xl cursor-pointer"
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>{fetching ? "Finding GPS..." : gpsLat ? "Change GPS" : "Get GPS location"}</span>
        </Button>
      </div>

      {geoError && (
        <p className="text-[11px] text-amber-800 flex items-center gap-1.5 pl-1">
          <AlertTriangle className="h-3 w-3 text-amber-600" />
          <span>{geoError}</span>
        </p>
      )}
    </div>
  );
}
