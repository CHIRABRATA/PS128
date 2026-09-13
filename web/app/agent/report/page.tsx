import { requireFieldAgent } from "@/lib/auth/permissions";
import { HealthReportForm } from "@/components/reporting/HealthReportForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AgentReportPage(props: {
  searchParams: Promise<{ requestId?: string; farmId?: string; animalId?: string; expectedUpdatedAt?: string }>;
}) {
  await requireFieldAgent();
  const searchParams = await props.searchParams;
  const t = await getTranslations("agent");

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full gap-6 bg-[#FAF8F3] text-[#191F1C]">
      <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#191F1C] tracking-tight">{t("reportTitle")}</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {t("reportSubtitle")}
          </p>
        </div>

        <Link href="/agent">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs border-[#D9D3C7] text-stone-700 hover:bg-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("fieldNotebook")}</span>
          </Button>
        </Link>
      </div>

      <HealthReportForm
        mode="agent"
        initialRequestId={searchParams.requestId}
        initialFarmId={searchParams.farmId}
        initialAnimalId={searchParams.animalId}
        expectedUpdatedAt={searchParams.expectedUpdatedAt}
      />
    </div>
  );
}
