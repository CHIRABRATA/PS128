"use client";

import React, { useEffect, useState } from "react";
import { PrintableAnimalOption, getAgentScopeFarms } from "@/lib/actions/reporting_data";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Cpu, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface AgentAnimalSelectorProps {
  selectedAnimal: PrintableAnimalOption | null;
  onSelectAnimal: (animal: PrintableAnimalOption) => void;
}

interface AgentAnimal {
  id: string;
  tag: string;
  species: string;
  breed?: string | null;
  iotDeviceId?: string | null;
}

interface AgentHerd {
  id: string;
  name?: string | null;
  species: string;
  animals: AgentAnimal[];
}

interface AgentFarm {
  id: string;
  name: string;
  village?: { name: string } | null;
  farmerUser?: { name: string } | null;
  herds: AgentHerd[];
}

export function AgentAnimalSelector({ selectedAnimal, onSelectAnimal }: AgentAnimalSelectorProps) {
  const t = useTranslations("reporting");
  const [farms, setFarms] = useState<AgentFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [selectedHerdId, setSelectedHerdId] = useState("");

  useEffect(() => {
    getAgentScopeFarms()
      .then((res) => {
        setFarms(res as unknown as AgentFarm[]);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load authorized field scope.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 bg-[#FAF8F3] rounded-2xl border border-[#E5E0D8]">
        <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        <span className="text-xs text-stone-600">{t("loadingArea")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const selectedFarm = farms.find((f) => f.id === selectedFarmId);
  const herds = selectedFarm?.herds || [];
  const selectedHerd = herds.find((h) => h.id === selectedHerdId);
  const animals = selectedHerd?.animals || [];

  return (
    <div className="space-y-4">
      {/* 1. Farm Dropdown */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
          {t("selectFarmLabel")}
        </label>
        <select
          value={selectedFarmId}
          onChange={(e) => {
            setSelectedFarmId(e.target.value);
            setSelectedHerdId("");
          }}
          className="bg-white border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-3 focus:border-amber-600 focus:outline-none min-h-[44px] shadow-xs"
        >
          <option value="">{t("chooseFarmOption")}</option>
          {farms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.village?.name || "Village"}) — Farmer: {f.farmerUser?.name || "Not recorded"}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Herd Dropdown (Conditional) */}
      {selectedFarm && (
        <div className="flex flex-col gap-2 animate-in fade-in-50 duration-200">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            {t("selectHerdLabel")}
          </label>
          <select
            value={selectedHerdId}
            onChange={(e) => setSelectedHerdId(e.target.value)}
            className="bg-white border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-3 focus:border-amber-600 focus:outline-none min-h-[44px] shadow-xs"
          >
            <option value="">{t("chooseHerdOption")}</option>
            {herds.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name || `${h.species} Herd`} ({h.animals.length} animals)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 3. Animal Cards Grid (Conditional) */}
      {selectedHerd && (
        <div className="space-y-3 animate-in fade-in-50 duration-200">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              {t("selectAnimalInspection")}
            </label>
            <span className="text-[11px] text-amber-900 font-mono font-bold">
              {t("animalsAvailable", { count: animals.length })}
            </span>
          </div>

          {animals.length === 0 ? (
            <div className="p-6 rounded-2xl border border-[#E5E0D8] bg-[#FAF8F3] text-center text-xs text-stone-500">
              {t("noAnimalsHerd")}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {animals.map((animal) => {
                const isSelected = selectedAnimal?.id === animal.id;
                return (
                  <div
                    key={animal.id}
                    onClick={() =>
                      selectedFarm &&
                      onSelectAnimal({
                        id: animal.id,
                        tag: animal.tag,
                        species: animal.species,
                        breed: animal.breed || null,
                        farmId: selectedFarm.id,
                        farmName: selectedFarm.name,
                        villageName: selectedFarm.village?.name || "Village",
                        iotDeviceId: animal.iotDeviceId || null,
                        herdSize: animals.length,
                      })
                    }
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3 min-h-[90px] shadow-2xs ${
                      isSelected
                        ? "border-amber-600 bg-amber-50 ring-2 ring-amber-500/40 shadow-xs"
                        : "border-[#E5E0D8] bg-white hover:border-stone-400 hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#191F1C] text-sm">Tag: {animal.tag}</span>
                          <Badge className="text-[10px] bg-stone-100 text-stone-700 border-stone-200">
                            {animal.species}
                          </Badge>
                        </div>
                        {animal.breed && <p className="text-xs text-stone-500 mt-0.5">Breed: {animal.breed}</p>}
                      </div>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-amber-700 flex-shrink-0" />}
                    </div>

                    <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-between text-[11px] text-stone-500">
                      <span>{selectedFarm?.name || "Farm"}</span>
                      {animal.iotDeviceId ? (
                        <Badge className="bg-amber-50 text-amber-900 border-amber-200 text-[9px] gap-1 px-1.5 py-0.5">
                          <Cpu className="h-2.5 w-2.5" />
                          <span>{t("iotActive")}</span>
                        </Badge>
                      ) : (
                        <span className="text-stone-400">{t("noIot")}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
