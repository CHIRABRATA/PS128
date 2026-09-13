"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Home, MapPin, ShieldAlert } from "lucide-react";

export interface GeoDistrict {
  id: string;
  name: string;
  blocks: Array<{
    id: string;
    name: string;
    villages: Array<{
      id: string;
      name: string;
      alerts: Array<{ id: string; diseaseName: string | null; caseCount: number }>;
      farms: Array<{
        id: string;
        name: string;
        herds: Array<{
          id: string;
          name: string;
          species: string;
          animals: Array<{
            id: string;
            tag: string;
            cases: Array<{ id: string; status: string; reportedAt: Date }>;
          }>;
        }>;
      }>;
    }>;
  }>;
}

interface GeographicDrilldownProps {
  districts: GeoDistrict[];
}

export function GeographicDrilldown({ districts }: GeographicDrilldownProps) {
  const t = useTranslations("authority");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);

  if (districts.length === 0) {
    return (
      <Card className="p-6 bg-[#FAF8F3] border-[#E5E0D8] text-center text-xs text-stone-500 rounded-2xl">
        {t("noGeoSurveillanceData")}
      </Card>
    );
  }

  const district = districts[0];
  const selectedBlock = district.blocks.find((b) => b.id === selectedBlockId) || district.blocks[0];
  const selectedVillage = selectedBlock?.villages.find((v) => v.id === selectedVillageId) || selectedBlock?.villages[0];

  return (
    <Card className="border-[#E5E0D8] bg-white text-[#191F1C] rounded-3xl shadow-xs overflow-hidden">
      <CardHeader className="pb-3 bg-[#FAF8F3] border-b border-[#E5E0D8]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base text-[#191F1C] flex items-center gap-2 font-bold">
              <MapPin className="h-4 w-4 text-emerald-700" />
              <span>{t("geoHierarchyTitle")}</span>
            </CardTitle>
            <CardDescription className="text-xs text-stone-500">
              {t("geoHierarchySub")}
            </CardDescription>
          </div>

          <Badge variant="outline" className="text-xs text-emerald-800 border-emerald-300 bg-emerald-50 w-fit">
            {t("districtBadge", { name: district.name })}
          </Badge>
        </div>

        {/* Breadcrumb Navigation Bar */}
        <div className="flex items-center gap-1 text-xs text-stone-600 mt-2 bg-white p-2 rounded-xl border border-[#E5E0D8] overflow-x-auto shadow-2xs">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 cursor-pointer"
            onClick={() => {
              setSelectedBlockId(null);
              setSelectedVillageId(null);
            }}
          >
            <Home className="h-3 w-3 mr-1" />
            {district.name}
          </Button>

          {selectedBlock && (
            <>
              <ChevronRight className="h-3 w-3 text-stone-400 shrink-0" />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 cursor-pointer"
                onClick={() => setSelectedVillageId(null)}
              >
                {t("blockPrefix", { name: selectedBlock.name })}
              </Button>
            </>
          )}

          {selectedVillage && (
            <>
              <ChevronRight className="h-3 w-3 text-stone-400 shrink-0" />
              <span className="font-semibold text-[#191F1C] px-2">{t("villagePrefix", { name: selectedVillage.name })}</span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Block Selection Grid */}
        <div className="space-y-2">
          <label className="text-xs text-stone-600 font-medium">{t("selectBlockSubDistrict")}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {district.blocks.map((block) => (
              <Button
                key={block.id}
                variant={selectedBlock?.id === block.id ? "default" : "outline"}
                size="sm"
                className={`justify-between text-xs h-auto py-2 px-3 cursor-pointer ${
                  selectedBlock?.id === block.id
                    ? "bg-[#047857] text-white hover:bg-[#065f46]"
                    : "bg-white text-stone-700 border-[#E5E0D8] hover:bg-[#FAF8F3]"
                }`}
                onClick={() => {
                  setSelectedBlockId(block.id);
                  setSelectedVillageId(null);
                }}
              >
                <span>{block.name}</span>
                <Badge variant="secondary" className="text-[10px] bg-[#FAF8F3] text-stone-600 border border-[#E5E0D8]">
                  {t("villagesCount", { count: block.villages.length })}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Village Selection Grid */}
        {selectedBlock && (
          <div className="space-y-2 pt-2 border-t border-[#E5E0D8]">
            <label className="text-xs text-stone-600 font-medium">{t("villagesIn", { name: selectedBlock.name })}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {selectedBlock.villages.map((village) => (
                <div
                  key={village.id}
                  onClick={() => setSelectedVillageId(village.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all shadow-2xs ${
                    selectedVillage?.id === village.id
                      ? "bg-emerald-50/70 border-emerald-500 text-[#191F1C] shadow-xs"
                      : "bg-white border-[#E5E0D8] hover:border-stone-400 text-stone-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-sm text-[#191F1C]">{village.name}</h5>
                    {village.alerts.length > 0 && (
                      <Badge variant="destructive" className="text-[10px] gap-1 bg-red-100 text-red-800 border-red-200">
                        <ShieldAlert className="h-3 w-3" />
                        {t("activeAlertBadge")}
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-stone-500 mt-2 flex justify-between">
                    <span>{t("farmsCount", { count: village.farms.length })}</span>
                    <span>
                      {t("totalAnimals")}:{" "}
                      {village.farms.reduce(
                        (sum, f) => sum + f.herds.reduce((hSum, h) => hSum + h.animals.length, 0),
                        0
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Farm & Herd Inspection for Selected Village */}
        {selectedVillage && (
          <div className="space-y-3 pt-3 border-t border-[#E5E0D8]">
            <h4 className="text-xs font-semibold text-stone-700">
              {t("farmsAndAnimalsIn", { name: selectedVillage.name })}
            </h4>

            {selectedVillage.farms.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E5E0D8] text-xs text-stone-500">
                {t("noFarmsInVillage")}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedVillage.farms.map((farm) => (
                  <div key={farm.id} className="p-3 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-[#191F1C]">{farm.name}</span>
                      <Badge variant="outline" className="text-[10px] text-stone-600 border-[#D9D3C7] bg-white">
                        {t("herdsCount", { count: farm.herds.length })}
                      </Badge>
                    </div>

                    <div className="space-y-2 pl-2">
                      {farm.herds.map((herd) => (
                        <div key={herd.id} className="p-2 rounded-xl bg-white border border-[#E5E0D8] text-xs flex items-center justify-between">
                          <div>
                            <span className="text-[#191F1C] font-medium">{herd.name || herd.species}</span>
                            <span className="text-stone-500 ml-2 font-mono">({herd.species})</span>
                          </div>
                          <span className="text-emerald-800 font-semibold font-mono">{t("animalsCount", { count: herd.animals.length })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
