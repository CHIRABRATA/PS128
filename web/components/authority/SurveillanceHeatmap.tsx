"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapMarkerData, formatVillageName, formatBlockName } from "./mapUtils";
import {
  MapPin,
  BellRing,
  Search,
  RotateCcw,
  X,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  Building2,
} from "lucide-react";

const DynamicHeatmap = dynamic(() => import("./SurveillanceHeatmapInternal"), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] sm:h-[620px] w-full rounded-2xl bg-[#E5E3DF] border border-[#E5E0D8] flex flex-col items-center justify-center text-xs text-stone-600 gap-3">
      <div className="h-7 w-7 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin" />
      <span className="font-semibold">Loading OpenStreetMap GIS visualizer...</span>
    </div>
  ),
});

interface SurveillanceHeatmapProps {
  markers: MapMarkerData[];
  initialFocusMarkerId?: string | null;
}

export function SurveillanceHeatmap({ markers, initialFocusMarkerId }: SurveillanceHeatmapProps) {
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [resetCount, setResetCount] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(initialFocusMarkerId || null);

  const totalCases = markers.reduce((sum, m) => sum + m.caseCount, 0);
  const totalAlerts = markers.filter((m) => m.activeAlert).length;

  // Filter markers for the side surveillance queue
  const displayMarkers = markers.filter((m) => {
    const cleanName = formatVillageName(m.name, m.blockName);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        cleanName.toLowerCase().includes(q) ||
        m.blockName.toLowerCase().includes(q) ||
        (m.diseaseName && m.diseaseName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSelectVillageFromList = (marker: MapMarkerData) => {
    setSelectedMarker(marker);
    setFocusId(marker.id);
  };

  return (
    <Card className="border-[#E5E0D8] bg-white overflow-hidden shadow-xs rounded-3xl">
      {/* Top Header & Surveillance Toolbar */}
      <CardHeader className="pb-3 border-b border-[#E5E0D8] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2 text-[#191F1C] font-bold">
              <MapPin className="h-4 w-4 text-emerald-700" />
              <span>District Outbreak & Cluster Surveillance Map</span>
            </CardTitle>
            <CardDescription className="text-xs text-stone-500">
              Live OpenStreetMap GIS • {markers.length} villages monitored • {totalCases} total field cases tracked
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {totalAlerts > 0 && (
              <Badge className="text-xs text-red-900 bg-red-100 border border-red-300 font-bold">
                🚨 {totalAlerts} Active Outbreak Alerts
              </Badge>
            )}
            <Badge className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200">
              Pune District GIS
            </Badge>
          </div>
        </div>

        {/* Search & Reset Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <Input
              type="text"
              placeholder="गाव किंवा तालुका शोधा (Search village)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-xs bg-[#FAF8F3] border-[#D9D3C7] rounded-xl focus:border-emerald-700"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedMarker(null);
              setSearchQuery("");
              setFocusId(null);
              setResetCount((c) => c + 1);
            }}
            title="Reset Map View"
            className="h-8 px-3 text-xs rounded-xl border-[#D9D3C7] text-stone-700 hover:text-stone-900 bg-white gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset View</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Two-Way Synchronized Layout: Desktop 70% Map + 30% Surveillance Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[520px] sm:min-h-[620px]">
          {/* Map Column (70% on Desktop) */}
          <div className="lg:col-span-8 relative h-[420px] sm:h-[620px] w-full border-b lg:border-b-0 lg:border-r border-[#E5E0D8]">
            <DynamicHeatmap
              key={resetCount}
              markers={markers}
              selectedMarkerId={selectedMarker?.id}
              onSelectMarker={(m) => setSelectedMarker(m)}
              searchQuery={searchQuery}
              focusMarkerId={focusId}
            />

            {/* Unobtrusive Floating Legend (Bottom-Left) */}
            <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-md border border-[#E5E0D8] rounded-2xl p-2.5 shadow-md text-[10px] space-y-1.5 max-w-[190px]">
              <div className="font-bold text-[#191F1C] flex items-center gap-1.5 border-b border-[#E5E0D8] pb-1">
                <Layers className="h-3 w-3 text-emerald-700" />
                <span>Map Legend</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-600 shrink-0" />
                  <span className="text-stone-700 font-medium">Active Outbreak Alert</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />
                  <span className="text-stone-700">High Risk Concern</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-stone-700">Monitoring (2–3 cases)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0" />
                  <span className="text-stone-700">Stable Surveillance</span>
                </div>
              </div>
            </div>

            {/* Sliding Selected Location Dossier Drawer */}
            {selectedMarker && (
              <div className="absolute top-3 right-3 bottom-3 z-[400] w-72 sm:w-88 bg-white/98 backdrop-blur-md border border-[#E5E0D8] rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col justify-between text-[#191F1C]">
                <div className="space-y-3.5 overflow-y-auto pr-1">
                  {/* Drawer Header */}
                  <div className="flex items-start justify-between border-b border-[#E5E0D8] pb-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-mono">
                        Village Surveillance Dossier
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-[#191F1C] mt-0.5">
                        {formatVillageName(selectedMarker.name, selectedMarker.blockName)}
                      </h3>
                      <p className="text-xs text-stone-600">
                        Taluka: <span className="font-semibold text-stone-800">{formatBlockName(selectedMarker.blockName)}</span> • Pune District
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedMarker(null)}
                      className="p-1 rounded-xl hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {selectedMarker.activeAlert ? (
                      <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-950 space-y-1">
                        <div className="font-bold text-xs flex items-center gap-1.5 text-red-900">
                          <BellRing className="h-3.5 w-3.5 text-red-600" />
                          <span>सक्रिय रोग प्रादुर्भाव सूचना</span>
                        </div>
                        <p className="text-[11px] text-red-800">
                          रोग संशय: <strong>{selectedMarker.diseaseName || "Outbreak Alert"}</strong>
                        </p>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-600" />
                        <span>नियमित देखरेख सुरू (Active Surveillance)</span>
                      </div>
                    )}
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
                      <div className="text-base sm:text-lg font-bold text-[#191F1C]">{selectedMarker.caseCount}</div>
                      <div className="text-[10px] text-stone-500 font-medium">एकूण प्रकरणे</div>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
                      <div className="text-base sm:text-lg font-bold text-amber-700">{selectedMarker.highRiskCount}</div>
                      <div className="text-[10px] text-stone-500 font-medium">उच्च जोखीम</div>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
                      <div className="text-base sm:text-lg font-bold text-emerald-700">{selectedMarker.confirmedCount}</div>
                      <div className="text-[10px] text-stone-500 font-medium">पुष्टी झालेले</div>
                    </div>
                  </div>

                  {/* Species Breakdown */}
                  {selectedMarker.speciesBreakdown && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-stone-700">बाधित पशुप्रजाती वर्गीकरण</span>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div className="p-2 rounded-xl bg-stone-50 border border-stone-200 flex justify-between">
                          <span className="text-stone-600">गाय (Cattle):</span>
                          <span className="font-bold text-stone-900">{selectedMarker.speciesBreakdown.cow}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-stone-50 border border-stone-200 flex justify-between">
                          <span className="text-stone-600">म्हैस (Buffalo):</span>
                          <span className="font-bold text-stone-900">{selectedMarker.speciesBreakdown.buffalo}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-stone-50 border border-stone-200 flex justify-between">
                          <span className="text-stone-600">शेळी (Goat):</span>
                          <span className="font-bold text-stone-900">{selectedMarker.speciesBreakdown.goat}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-stone-50 border border-stone-200 flex justify-between">
                          <span className="text-stone-600">इतर:</span>
                          <span className="font-bold text-stone-900">{selectedMarker.speciesBreakdown.other}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Last Reported Date */}
                  {selectedMarker.lastReportedDate && (
                    <div className="text-[11px] text-stone-500 flex items-center gap-1.5 font-mono pt-1">
                      <Calendar className="h-3.5 w-3.5 text-stone-400" />
                      <span>शेवटचा अहवाल: {new Date(selectedMarker.lastReportedDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Drawer Footer Actions */}
                <div className="pt-3 border-t border-[#E5E0D8] flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedMarker(null)}
                    className="flex-1 text-xs border-[#D9D3C7] rounded-xl"
                  >
                    बंद करा
                  </Button>
                  <Link href={`/authority/alerts?villageId=${selectedMarker.id}`} className="flex-1">
                    <Button
                      size="sm"
                      className="w-full text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl gap-1"
                    >
                      <span>तपशील पहा</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Surveillance Queue Column (30% on Desktop) */}
          <div className="lg:col-span-4 bg-[#FAF8F3]/60 flex flex-col justify-between max-h-[620px] overflow-hidden">
            <div className="p-4 border-b border-[#E5E0D8] bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-700" />
                <span className="font-bold text-xs text-[#191F1C]">गाव-निहाय निरीक्षण यादी</span>
              </div>
              <Badge className="text-[10px] bg-stone-100 text-stone-700 border-stone-200">
                {displayMarkers.length} गावे
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {displayMarkers.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white border border-[#E5E0D8] text-center text-xs text-stone-500 space-y-2">
                  <ShieldCheck className="h-6 w-6 text-emerald-600 mx-auto" />
                  <p className="font-bold text-stone-800">कोणतीही जुळणारी गावे नाहीत</p>
                  <p className="text-[11px] text-stone-500">कृपया शोध शब्द बदला किंवा फिल्टर्स रीसेट करा.</p>
                </div>
              ) : (
                displayMarkers.map((m) => {
                  const isSelected = selectedMarker?.id === m.id;
                  const cleanName = formatVillageName(m.name, m.blockName);
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleSelectVillageFromList(m)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50/90 border-emerald-600 shadow-sm ring-1 ring-emerald-600/30"
                          : m.activeAlert
                          ? "bg-red-50/50 border-red-200 hover:border-red-400"
                          : "bg-white border-[#E5E0D8] hover:border-stone-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-[#191F1C] flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              m.activeAlert
                                ? "bg-red-600"
                                : m.highRiskCount > 0
                                ? "bg-orange-500"
                                : "bg-emerald-600"
                            }`}
                          />
                          <span>{cleanName}</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-stone-700">
                          {m.caseCount} प्रकरणे
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-1 text-[11px] text-stone-500">
                        <span>तालुका: {formatBlockName(m.blockName)}</span>
                        {m.activeAlert ? (
                          <span className="text-red-700 font-bold">🚨 {m.diseaseName || "Alert"}</span>
                        ) : m.highRiskCount > 0 ? (
                          <span className="text-orange-700 font-semibold">{m.highRiskCount} उच्च जोखीम</span>
                        ) : (
                          <span className="text-emerald-800 font-medium">स्थिर</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-[#E5E0D8] bg-white text-[11px] text-stone-500 text-center">
              गावावर क्लिक केल्यास नकाशा आपोआप त्या ठिकाणी फोकस होईल.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
