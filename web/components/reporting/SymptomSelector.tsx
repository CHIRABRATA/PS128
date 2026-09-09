"use client";

import React from "react";
import { Check } from "lucide-react";

interface SymptomSelectorProps {
  selectedSymptoms: string[];
  onChangeSymptoms: (symptoms: string[]) => void;
}

const AVAILABLE_SYMPTOMS = [
  { id: "Fever", label: "High Fever (तीव्र ताप)" },
  { id: "Skin Lesions", label: "Skin Nodules / Lumps (अंगावर गाठी व फोड)" },
  { id: "Nasal Discharge", label: "Nasal Discharge (नाकातून स्त्राव)" },
  { id: "Salivation", label: "Excessive Salivation (तोंडातून लाळ गळणे)" },
  { id: "Reduced Milk Yield", label: "Drop in Milk Yield (दूध उत्पादनात घट)" },
  { id: "Coughing", label: "Coughing / Sneezing (खोकला / शिंका)" },
  { id: "Labored Breathing", label: "Rapid Breathing (धाप लागणे)" },
  { id: "Difficulty Walking", label: "Lameness / Limping (लंगडणे / चालण्यास त्रास)" },
  { id: "Reduced Eating", label: "Loss of Appetite (चारा न खाणे)" },
  { id: "Diarrhea", label: "Diarrhea (हगवण / पातळ शेण)" },
  { id: "Weakness", label: "Lethargy / Weakness (सुस्ती / अशक्तपणा)" },
  { id: "Other", label: "Other Symptoms (इतर लक्षणे)" },
];

export function SymptomSelector({ selectedSymptoms, onChangeSymptoms }: SymptomSelectorProps) {
  const toggleSymptom = (id: string) => {
    if (selectedSymptoms.includes(id)) {
      onChangeSymptoms(selectedSymptoms.filter((s) => s !== id));
    } else {
      onChangeSymptoms([...selectedSymptoms, id]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
          दिसणारी लक्षणे निवडा | Observed Symptoms (Select All) *
        </label>
        <span className="text-[11px] text-emerald-800 font-bold font-mono">
          {selectedSymptoms.length} निवडले
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
        {AVAILABLE_SYMPTOMS.map((symptom) => {
          const isChecked = selectedSymptoms.includes(symptom.id);
          return (
            <div
              key={symptom.id}
              onClick={() => toggleSymptom(symptom.id)}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-150 flex items-center justify-between gap-3 min-h-[50px] shadow-2xs hover-lift-sm active:scale-[0.98] ${
                isChecked
                  ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-600/30"
                  : "border-[#E5E0D8] bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs">{symptom.label}</span>
              </div>

              <div
                className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all duration-150 ${
                  isChecked
                    ? "bg-emerald-700 border-emerald-800 text-white scale-105"
                    : "border-stone-300 bg-white"
                }`}
              >
                {isChecked && <Check className="h-3.5 w-3.5 animate-scale-in" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
