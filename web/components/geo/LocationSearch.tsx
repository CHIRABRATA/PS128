"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  Navigation,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  searchLocationsAction,
  reverseGeocodeLocationAction,
  resolveLocationHierarchyAction,
  GeocodedLocationResult,
  ResolvedLocationHierarchy,
  UserGpsCoordinates,
} from "@/lib/actions/geo";

export type SelectedLocationData = ResolvedLocationHierarchy;

interface LocationSearchProps {
  value?: SelectedLocationData | null;
  initialQuery?: string;
  onLocationSelect: (location: SelectedLocationData) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  showMapPreview?: boolean;
  className?: string;
}

export function LocationSearch({
  value,
  initialQuery = "",
  onLocationSelect,
  label = "Village / Location",
  required = false,
  disabled = false,
  showMapPreview = true,
  className = "",
}: LocationSearchProps) {
  const [internalSelectedLocation, setInternalSelectedLocation] = useState<SelectedLocationData | null>(value ?? null);
  const selectedLocation = value !== undefined ? value : internalSelectedLocation;

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<GeocodedLocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [userGps, setUserGps] = useState<UserGpsCoordinates | null>(null);
  const [gpsDenied, setGpsDenied] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Stale request counter to cancel out-of-order search responses
  const searchRequestIdRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Request GPS once on mount and cache in session state
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: UserGpsCoordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserGps(coords);
        setGpsDenied(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGpsDenied(true);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  // Perform search with debounce and stale request guard
  const executeSearch = useCallback(
    async (searchTerm: string, gpsCoords: UserGpsCoordinates | null) => {
      const trimmed = searchTerm.trim();
      if (trimmed.length < 3) {
        setResults([]);
        setIsSearching(false);
        setHasSearched(false);
        setSearchError(null);
        return;
      }

      const currentRequestId = ++searchRequestIdRef.current;
      setIsSearching(true);
      setSearchError(null);

      try {
        const searchResults = await searchLocationsAction(trimmed, gpsCoords);

        // Discard stale responses if user continued typing
        if (currentRequestId === searchRequestIdRef.current) {
          setResults(searchResults);
          setHasSearched(true);
        }
      } catch (err: unknown) {
        if (currentRequestId === searchRequestIdRef.current) {
          setSearchError(err instanceof Error ? err.message : "Unable to search locations.");
          setResults([]);
          setHasSearched(true);
        }
      } finally {
        if (currentRequestId === searchRequestIdRef.current) {
          setIsSearching(false);
        }
      }
    },
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length < 3) {
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(val, userGps);
    }, 350);
  };

  // Explicit user selection (never silent auto-select)
  const handleSelectResult = async (item: GeocodedLocationResult) => {
    setIsResolving(true);
    setSearchError(null);

    try {
      const hierarchy = await resolveLocationHierarchyAction({
        latitude: item.latitude,
        longitude: item.longitude,
        placeName: item.placeName,
        districtName: item.district,
        blockName: item.subdistrict,
      });

      const selected: SelectedLocationData = {
        ...hierarchy,
        displayName: item.displayName,
      };

      setInternalSelectedLocation(selected);
      setResults([]);
      setQuery("");
      setHasSearched(false);
      onLocationSelect(selected);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : "Failed to resolve location hierarchy.");
    } finally {
      setIsResolving(false);
    }
  };

  // One-tap "Use my current location"
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsDenied(true);
      return;
    }

    setIsGpsLoading(true);
    setSearchError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserGps({ lat, lng });
        setGpsDenied(false);

        try {
          const reverseRes = await reverseGeocodeLocationAction(lat, lng);
          if (reverseRes) {
            await handleSelectResult(reverseRes);
          }
        } catch (err: unknown) {
          setSearchError(err instanceof Error ? err.message : "Unable to reverse geocode current GPS location.");
        } finally {
          setIsGpsLoading(false);
        }
      },
      (error) => {
        setIsGpsLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsDenied(true);
        } else {
          setSearchError("Unable to retrieve GPS signal. Please search by name below.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleClearSelection = () => {
    setInternalSelectedLocation(null);
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setSearchError(null);
  };

  return (
    <div className={`space-y-2.5 relative text-[#191F1C] ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wide flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-700" />
            <span>
              {label} {required && <span className="text-red-500">*</span>}
            </span>
          </label>

          {!selectedLocation && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseCurrentLocation}
              disabled={disabled || isGpsLoading}
              className="h-7 px-2.5 text-[11px] gap-1.5 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer transition-colors"
            >
              {isGpsLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-emerald-700" />
              ) : (
                <Navigation className="h-3 w-3 text-emerald-700" />
              )}
              <span>{isGpsLoading ? "Acquiring GPS..." : "Use My Location"}</span>
            </Button>
          )}
        </div>
      )}

      {/* GPS Denied Informative Banner */}
      {gpsDenied && !selectedLocation && (
        <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2 animate-fade-in">
          <Compass className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
          <span>
            Location access was not granted. Search results may be less precise. You can still search any village or district name.
          </span>
        </div>
      )}

      {/* Error Banner */}
      {searchError && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px] flex items-start gap-2 animate-fade-in">
          <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Confirmed Selected State */}
      {selectedLocation ? (
        <div className="p-4 rounded-2xl border border-emerald-300 bg-emerald-50/50 space-y-3 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                <span className="min-w-0 font-bold text-sm text-stone-900 wrap-break-word">
                  {selectedLocation.displayName || selectedLocation.villageName || selectedLocation.districtName}
                </span>
                {selectedLocation.isUrban && (
                  <Badge className="bg-stone-200 text-stone-700 border-stone-300 text-[10px]">
                    Urban / Town
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 pt-0.5 text-[11px] text-stone-600 sm:grid-cols-2 lg:grid-cols-3">
                {selectedLocation.villageName && (
                  <span className="block min-w-0 rounded-md border border-[#E5E0D8] bg-white/80 px-2 py-1 wrap-break-word">
                    Village: <strong className="text-stone-800">{selectedLocation.villageName}</strong>
                  </span>
                )}
                {selectedLocation.blockName && (
                  <span className="block min-w-0 rounded-md border border-[#E5E0D8] bg-white/80 px-2 py-1 wrap-break-word">
                    Block: <strong className="text-stone-800">{selectedLocation.blockName}</strong>
                  </span>
                )}
                {selectedLocation.districtName && (
                  <span className="block min-w-0 rounded-md border border-[#E5E0D8] bg-white/80 px-2 py-1 wrap-break-word">
                    District: <strong className="text-stone-800">{selectedLocation.districtName}</strong>
                  </span>
                )}
              </div>

              <p className="text-[10px] font-mono text-emerald-900/80 pt-0.5">
                Coordinates: {selectedLocation.latitude.toFixed(4)}° N, {selectedLocation.longitude.toFixed(4)}° E
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearSelection}
              disabled={disabled}
              className="h-8 px-2.5 text-xs text-stone-600 hover:text-red-700 hover:bg-red-50 border-[#D9D3C7] rounded-xl cursor-pointer shrink-0"
            >
              Change
            </Button>
          </div>

          {/* Visual Map Tile Preview with Vector Marker */}
          {showMapPreview && (
            <div className="relative w-full h-28 rounded-xl overflow-hidden border border-emerald-200 bg-stone-100 shadow-2xs">
              <div
                className="w-full h-full bg-cover bg-center opacity-85"
                style={{
                  backgroundImage: `url("https://tile.openstreetmap.org/13/${Math.floor(
                    ((selectedLocation.longitude + 180) / 360) * Math.pow(2, 13)
                  )}/${Math.floor(
                    ((1 -
                      Math.log(
                        Math.tan((selectedLocation.latitude * Math.PI) / 180) +
                          1 / Math.cos((selectedLocation.latitude * Math.PI) / 180)
                      ) /
                        Math.PI) /
                      2) *
                      Math.pow(2, 13)
                  )}.png")`,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative flex flex-col items-center animate-bounce">
                  <MapPin className="h-6 w-6 text-emerald-700 drop-shadow-md fill-emerald-100" />
                  <span className="h-1.5 w-3 bg-stone-800/30 rounded-full blur-[1px]" />
                </div>
              </div>
              <div className="absolute bottom-1 right-2 text-[9px] text-stone-500 bg-white/90 px-1.5 py-0.5 rounded shadow-xs">
                © OpenStreetMap
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Search Box Input */
        <div className="space-y-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3.5 top-3.5 text-stone-400 pointer-events-none" />
            <Input
              type="text"
              value={query}
              onChange={handleInputChange}
              disabled={disabled || isResolving}
              placeholder={
                userGps
                  ? "Search village or location (biased near you)..."
                  : "Search village or location (e.g. Wagholi, Haveli)..."
              }
              className="pl-9 pr-9 bg-white border-[#D9D3C7] text-xs text-[#191F1C] min-h-[44px] rounded-xl focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
            {isSearching || isResolving ? (
              <Loader2 className="h-4 w-4 animate-spin absolute right-3.5 top-3.5 text-emerald-600" />
            ) : query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setHasSearched(false);
                }}
                className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {/* Search Results Dropdown */}
          {results.length > 0 && (
            <div className="absolute z-50 w-full bg-white border border-[#D9D3C7] rounded-2xl shadow-xl max-h-64 overflow-y-auto mt-1 divide-y divide-stone-100 animate-fade-in">
              <div className="p-2 bg-[#FAF8F3] border-b border-[#E5E0D8] text-[10px] text-stone-500 font-semibold uppercase tracking-wider flex items-center justify-between">
                <span>{userGps ? "Nearby Locations Ranked by GPS Proximity" : "Matching Locations"}</span>
                <span>{results.length} results</span>
              </div>
              <ul className="divide-y divide-stone-100">
                {results.map((item) => (
                  <li
                    key={item.id}
                    onClick={() => handleSelectResult(item)}
                    className="p-3 hover:bg-emerald-50/80 cursor-pointer text-xs text-stone-800 flex items-start justify-between gap-2.5 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <MapPin className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-stone-900">{item.placeName}</span>
                          {item.isUrban && (
                            <Badge className="text-[9px] bg-stone-100 text-stone-600 border-stone-200 px-1 py-0">
                              Town
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 truncate max-w-xs sm:max-w-md">
                          {[item.subdistrict, item.district, item.state].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </div>

                    {item.distanceKm !== null && item.distanceKm !== undefined && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-emerald-100 text-emerald-900 border-emerald-200 whitespace-nowrap shrink-0"
                      >
                        {item.distanceKm < 1 ? "< 1 km away" : `${item.distanceKm} km away`}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* No Results State */}
          {hasSearched && !isSearching && results.length === 0 && query.trim().length >= 3 && (
            <div className="p-4 rounded-xl border border-stone-200 bg-[#FAF8F3] text-center space-y-1 text-xs text-stone-600 animate-fade-in">
              <p className="font-semibold text-stone-800">No matching locations found</p>
              <p className="text-[11px] text-stone-500">
                Try searching with a broader town, subdistrict, or district name.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
