import React from "react";
import Link from "next/link";
import { getVetFollowUpsAction } from "@/lib/actions/vet";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default async function VetFollowUpsPage() {
  const followUps = await getVetFollowUpsAction();
  const today = new Date();

  return (
    <div className="space-y-6 text-[#191F1C]">
      <div className="flex justify-between items-center border-b border-[#E5E0D8] pb-4">
        <div>
          <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 text-[10px] uppercase font-mono">
            Clinical Calendar
          </Badge>
          <h1 className="text-2xl font-black text-[#191F1C] tracking-tight mt-1">
            Veterinary Follow-up Tracker
          </h1>
          <p className="text-xs text-stone-500">
            Scheduled follow-up appointments and post-treatment clinical checkups.
          </p>
        </div>
      </div>

      <Card className="border border-[#E5E0D8] bg-white shadow-xs rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-[#E5E0D8] pb-3 bg-[#FAF8F3]">
          <CardTitle className="text-base font-bold text-[#191F1C] flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-600" />
            <span>Scheduled Follow-ups ({followUps.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {followUps.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500 space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <p className="font-semibold text-[#191F1C]">No Pending Follow-ups</p>
              <p>There are currently no follow-up visits scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {followUps.map((item) => {
                const dueDate = new Date(item.vetFollowUpDate!);
                const isOverdue = dueDate < today;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-xs ${
                      isOverdue
                        ? "bg-red-50/50 border-red-200"
                        : "bg-white border-[#E5E0D8]"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#191F1C]">Case #{item.caseNumber}</span>
                        <Badge variant="outline" className="text-[10px] border-[#D9D3C7] text-stone-700">
                          {item.status}
                        </Badge>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-[10px] bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> OVERDUE
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-stone-600">
                        Animal: <strong className="text-[#191F1C] font-mono">{item.animal.tag} ({item.animal.species})</strong> • Farm: <strong className="text-[#191F1C]">{item.animal.herd.farm.name}</strong> ({item.animal.herd.farm.village.name})
                      </p>

                      {item.vetDiagnosis && (
                        <p className="text-xs text-emerald-800 font-medium pt-0.5">
                          Diagnosis: {item.vetDiagnosis}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <span className="text-[10px] text-stone-500 uppercase font-semibold block">Scheduled Date</span>
                        <span className={`text-xs font-bold font-mono ${isOverdue ? "text-red-700" : "text-amber-800"}`}>
                          {dueDate.toLocaleDateString()}
                        </span>
                      </div>

                      <Link href={`/vet/cases/${item.id}`}>
                        <Button type="button" size="sm" className="text-xs h-8 bg-[#047857] hover:bg-[#065f46] text-white font-semibold gap-1 min-h-[32px]">
                          <span>Perform Follow-up</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
