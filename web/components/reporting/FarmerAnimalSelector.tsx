"use client";

import React, { useEffect, useState } from "react";
import { PrintableAnimalOption, getFarmerAnimals } from "@/lib/actions/reporting_data";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Cpu, Loader2, AlertCircle } from "lucide-react";

interface FarmerAnimalSelectorProps {
  selectedAnimal: PrintableAnimalOption | null;
  onSelectAnimal: (animal: PrintableAnimalOption) => void;
}

export function FarmerAnimalSelector({ selectedAnimal, onSelectAnimal }: FarmerAnimalSelectorProps) {
  const [animals, setAnimals] = useState<PrintableAnimalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getFarmerAnimals()
      .then((res) => {
        setAnimals(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load your registered animals.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 bg-[#FAF8F3] rounded-2xl border border-[#E5E0D8]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
        <span className="text-xs text-stone-600">नोंदणीकृत जनावरांची माहिती लोड होत आहे...</span>
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

  if (animals.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-amber-200 bg-amber-50/70 text-center space-y-2">
        <p className="text-xs text-amber-900 font-bold">आपल्या शेतासाठी नोंदणीकृत जनावरे आढळली नाहीत.</p>
        <p className="text-[11px] text-stone-600">
          कृपया कान-टॅग नोंदणीसाठी आपल्या स्थानिक पशुसखी किंवा पशुवैद्यकीय दवाखान्याशी संपर्क साधा.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
          तपासणीसाठी जनावर निवडा | Select Animal *
        </label>
        <span className="text-[11px] text-emerald-800 font-mono font-bold">{animals.length} जनावरे नोंदणीकृत</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
        {animals.map((animal) => {
          const isSelected = selectedAnimal?.id === animal.id;
          return (
            <div
              key={animal.id}
              onClick={() => onSelectAnimal(animal)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3 min-h-[90px] shadow-2xs ${
                isSelected
                  ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/40 shadow-xs"
                  : "border-[#E5E0D8] bg-white hover:border-stone-400 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#191F1C] text-sm">टॅग: {animal.tag}</span>
                    <Badge className="text-[10px] bg-stone-100 text-stone-700 border-stone-200">
                      {animal.species}
                    </Badge>
                  </div>
                  {animal.breed && <p className="text-xs text-stone-500 mt-0.5">जात: {animal.breed}</p>}
                </div>
                {isSelected && <CheckCircle2 className="h-5 w-5 text-emerald-700 flex-shrink-0" />}
              </div>

              <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-between text-[11px] text-stone-500">
                <span>{animal.farmName} ({animal.villageName})</span>
                {animal.iotDeviceId ? (
                  <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[9px] gap-1 px-1.5 py-0.5">
                    <Cpu className="h-2.5 w-2.5" />
                    <span>IoT Linked</span>
                  </Badge>
                ) : (
                  <span className="text-stone-400">No IoT</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
