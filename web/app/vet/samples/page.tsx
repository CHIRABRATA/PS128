import React from "react";
import { getVetSamplesAction } from "@/lib/actions/vet";
import { SampleTrackerTable } from "@/components/vet/SampleTrackerTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FlaskConical } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function VetSamplesPage() {
  const samples = await getVetSamplesAction();
  const t = await getTranslations("vet");

  return (
    <div className="space-y-6 text-[#191F1C]">
      <div className="flex justify-between items-center border-b border-[#E5E0D8] pb-4">
        <div>
          <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 text-[10px] uppercase font-mono">
            {t("labSampleRegistry")}
          </Badge>
          <h1 className="text-2xl font-black text-[#191F1C] tracking-tight mt-1">
            {t("livestockDiagnosticSamples")}
          </h1>
          <p className="text-xs text-stone-500">
            {t("samplesLead")}
          </p>
        </div>
      </div>

      <Card className="border border-[#E5E0D8] bg-white shadow-xs rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-[#E5E0D8] pb-3 bg-[#FAF8F3]">
          <CardTitle className="text-base font-bold text-[#191F1C] flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-600" />
            <span>{t("labSampleRegistry")} ({samples.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <SampleTrackerTable samples={samples} />
        </CardContent>
      </Card>
    </div>
  );
}
