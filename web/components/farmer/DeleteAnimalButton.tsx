"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteFarmerAnimal } from "@/lib/actions/reporting_data";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function DeleteAnimalButton({ animalId, tag }: { animalId: string; tag: string }) {
  const router = useRouter();
  const tFarmer = useTranslations("farmer");
  const tCommon = useTranslations("common");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!window.confirm(tFarmer("deletePrompt"))) return;
    setDeleting(true);
    setError("");
    const result = await deleteFarmerAnimal(animalId);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Unable to delete this animal.");
    }
    setDeleting(false);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleDelete}
        disabled={deleting}
        title={tFarmer("deleteAnimalTitle")}
        className="h-8 gap-1 border-red-200 px-2 text-xs text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>{deleting ? tCommon("saving") : tCommon("delete")}</span>
      </Button>
      {error && <span className="max-w-[180px] text-right text-[10px] leading-tight text-red-700">{error}</span>}
    </div>
  );
}