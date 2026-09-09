import React from "react";
import { getVetSamplesAction } from "@/lib/actions/vet";
import { SampleTrackerTable } from "@/components/vet/SampleTrackerTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FlaskConical } from "lucide-react";

export default async function VetSamplesPage() {
  const samples = await getVetSamplesAction();

  return (
    <div className="space-y-6 text-[#191F1C]">
      <div className="flex justify-between items-center border-b border-[#E5E0D8] pb-4">
        <div>
          <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 text-[10px] uppercase font-mono">
            प्रयोगशाळा नमुना ट्रॅकर (Lab Sample Registry)
          </Badge>
          <h1 className="text-2xl font-black text-[#191F1C] tracking-tight mt-1">
            पशु रोग निदान प्रयोगशाळा नमुने
          </h1>
          <p className="text-xs text-stone-500">
            जिल्हा व प्रादेशिक रोग अन्वेषण प्रयोगशाळेकडे पाठवलेले रक्त, लाळ व उती नमुने.
          </p>
        </div>
      </div>

      <Card className="border border-[#E5E0D8] bg-white shadow-xs rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-[#E5E0D8] pb-3 bg-[#FAF8F3]">
          <CardTitle className="text-base font-bold text-[#191F1C] flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-600" />
            <span>प्रयोगशाळा नमुना नोंदवही ({samples.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <SampleTrackerTable samples={samples} />
        </CardContent>
      </Card>
    </div>
  );
}
