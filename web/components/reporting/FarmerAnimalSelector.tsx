"use client";

import React, { useEffect, useState } from "react";
import { PrintableAnimalOption, getFarmerAnimals, getFarmerRegistrationVillages, registerFarmerAnimal } from "@/lib/actions/reporting_data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Cpu, Loader2, AlertCircle, Plus, X } from "lucide-react";

interface FarmerAnimalSelectorProps {
  selectedAnimal: PrintableAnimalOption | null;
  onSelectAnimal: (animal: PrintableAnimalOption) => void;
  onRemoveAnimal: () => void;
  onNewReport: () => void;
}

export function FarmerAnimalSelector({ selectedAnimal, onSelectAnimal, onRemoveAnimal, onNewReport }: FarmerAnimalSelectorProps) {
  const [animals, setAnimals] = useState<PrintableAnimalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [tag, setTag] = useState("");
  const [species, setSpecies] = useState<"COW" | "BUFFALO" | "SHEEP" | "GOAT" | "PET" | "OTHER">("COW");
  const [breed, setBreed] = useState("");
  const [registering, setRegistering] = useState(false);
  const [villages, setVillages] = useState<Array<{ id: string; name: string; block: { name: string; district: { name: string } } }>>([]);
  const [villageId, setVillageId] = useState("");

  const registerAnimal = async () => {
    setRegistering(true);
    setError("");
    const result = await registerFarmerAnimal({ tag, species, breed: breed || null, villageId: villageId || null });
    if (result.success && result.animal) {
      setAnimals((current) => [...current, result.animal!]);
      onSelectAnimal(result.animal);
      setShowRegister(false);
      setTag("");
      setBreed("");
    } else {
      setError(result.error || "Unable to register animal.");
    }
    setRegistering(false);
  };

  const registrationForm = showRegister ? (
    <div className="mx-auto max-w-md space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-left">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-emerald-950">Register a new animal</h4>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowRegister(false)} className="h-7 px-2 text-xs text-stone-600">Cancel</Button>
      </div>
      <label className="text-xs font-semibold text-stone-700">New ear tag number *</label>
      <Input value={tag} onChange={(event) => setTag(event.target.value)} placeholder="e.g. COW-002" className="text-xs" />
      <label className="text-xs font-semibold text-stone-700">Animal type *</label>
      <select value={species} onChange={(event) => setSpecies(event.target.value as typeof species)} className="w-full rounded-xl border border-[#D9D3C7] bg-white p-2.5 text-xs">
        <option value="COW">Cow</option>
        <option value="BUFFALO">Buffalo</option>
        <option value="GOAT">Goat</option>
        <option value="SHEEP">Sheep</option>
        <option value="PET">Pet</option>
        <option value="OTHER">Other</option>
      </select>
      <label className="text-xs font-semibold text-stone-700">Breed (optional)</label>
      <Input value={breed} onChange={(event) => setBreed(event.target.value)} placeholder="e.g. Gir" className="text-xs" />
      {villages.length > 0 && (
        <>
          <label className="text-xs font-semibold text-stone-700">Village *</label>
          <select value={villageId} onChange={(event) => setVillageId(event.target.value)} className="w-full rounded-xl border border-[#D9D3C7] bg-white p-2.5 text-xs">
            <option value="">Select your village...</option>
            {villages.map((village) => <option key={village.id} value={village.id}>{village.name} ({village.block.name})</option>)}
          </select>
        </>
      )}
      {error && <p className="text-xs text-red-700">{error}</p>}
      <Button type="button" disabled={registering || !tag.trim() || (villages.length > 0 && !villageId)} onClick={() => void registerAnimal()} className="w-full bg-emerald-700 text-xs text-white hover:bg-emerald-800">
        {registering ? "Registering..." : "Create animal"}
      </Button>
    </div>
  ) : null;

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
    getFarmerRegistrationVillages().then(setVillages).catch(() => setVillages([]));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 bg-[#FAF8F3] rounded-2xl border border-[#E5E0D8]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
        <span className="text-xs text-stone-600">Loading registered animals...</span>
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
      <div className="p-6 rounded-2xl border border-amber-200 bg-amber-50/70 space-y-4">
        <div className="text-center space-y-2">
          <p className="text-xs text-amber-900 font-bold">No registered animals were found for your farm.</p>
            <p className="text-[11px] text-stone-600">Register an animal ear tag here to start a report.</p>
        </div>
        {!showRegister ? (
              <Button type="button" onClick={() => setShowRegister(true)} className="mx-auto flex gap-2 bg-emerald-700 text-xs text-white hover:bg-emerald-800">
            <Plus className="h-3.5 w-3.5" /> Register an animal
          </Button>
        ) : registrationForm}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
          Select Animal for Examination *
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-emerald-800 font-mono font-bold">{animals.length} registered</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onNewReport();
            }}
            className="h-7 gap-1 px-2 text-[11px]"
          >
            <Plus className="h-3 w-3" /> New report
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setShowRegister((current) => !current)} className="h-7 gap-1 px-2 text-[11px]">
            <Plus className="h-3 w-3" /> Register new animal
          </Button>
        </div>
      </div>

      {registrationForm}

      <div className={`rounded-xl border p-3 text-xs ${selectedAnimal ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`} role="status">
        {selectedAnimal ? `Selected animal: ${selectedAnimal.tag}` : "No animal selected. Choose an animal card to start this report."}
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
                    <span className="font-bold text-[#191F1C] text-sm">Tag: {animal.tag}</span>
                    <Badge className="text-[10px] bg-stone-100 text-stone-700 border-stone-200">
                      {animal.species}
                    </Badge>
                  </div>
                  {animal.breed && <p className="text-xs text-stone-500 mt-0.5">Breed: {animal.breed}</p>}
                </div>
                {isSelected && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label={`Remove selected tag ${animal.tag}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveAnimal();
                    }}
                    className="h-7 gap-1 border-red-200 px-2 text-[10px] text-red-700 hover:bg-red-50"
                  >
                    <X className="h-3 w-3" /> Remove tag
                  </Button>
                )}
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
