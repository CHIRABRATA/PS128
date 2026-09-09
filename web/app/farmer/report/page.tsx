import { requireFarmer } from "@/lib/auth/permissions";
import { HealthReportForm } from "@/components/reporting/HealthReportForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function FarmerReportPage() {
  await requireFarmer();

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full gap-6 bg-[#FAF8F3] text-[#191F1C]">
      <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#191F1C] tracking-tight">पशु रोग लक्षण नोंद | Report Illness</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            जनावरातील लक्षणे नोंदवून प्राथमिक मार्गदर्शन व पशुवैद्यकीय तपासणी मिळवा.
          </p>
        </div>

        <Link href="/farmer">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs border-[#D9D3C7] text-stone-700 hover:bg-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>पशु नोंदवही</span>
          </Button>
        </Link>
      </div>

      <HealthReportForm mode="farmer" />
    </div>
  );
}
