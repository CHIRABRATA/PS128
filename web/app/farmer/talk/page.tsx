import Link from "next/link";
import { requireFarmer } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { getDictionary, Locale } from "@/lib/i18n";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ChevronRight, ArrowLeft } from "lucide-react";

export default async function FarmerTalkAnimalSelectorPage() {
  const farmer = await requireFarmer();
  const locale = (farmer.preferredLanguage === "hi" ? "hi" : farmer.preferredLanguage === "mr" ? "mr" : "en") as Locale;
  const dict = getDictionary(locale);

  // Fetch all animals owned by farmer across their farms
  const animals = await prisma.animal.findMany({
    where: {
      herd: {
        farm: {
          farmerUserId: farmer.id,
        },
      },
    },
    include: {
      herd: {
        include: {
          farm: true,
        },
      },
      cases: {
        take: 1,
        orderBy: { reportedAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full gap-6 text-[#191F1C]">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#191F1C] tracking-tight">{dict.farmerTalk.title}</h1>
            <Badge className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
              पशु आरोग्य संवाद
            </Badge>
          </div>
          <p className="text-stone-600 text-xs mt-1">
            {dict.farmerTalk.selectAnimalPrompt}
          </p>
        </div>

        <Link href="/farmer">
          <Button variant="outline" size="sm" className="text-xs border-[#D9D3C7] bg-white text-stone-800 hover:bg-stone-50 gap-1.5 rounded-xl">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>पशु नोंदवहीत परत जा</span>
          </Button>
        </Link>
      </div>

      {animals.length === 0 ? (
        <Card className="border-[#E5E0D8] bg-white p-8 text-center rounded-3xl shadow-xs">
          <MessageSquare className="w-12 h-12 text-stone-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-stone-900">कोणतेही नोंदणीकृत जनावर आढळले नाही</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            आपल्या खात्यावर नोंदणीकृत जनावरे नाहीत. जनावरांच्या कान-टॅग नोंदणीसाठी कृपया स्थानिक पशुसखी किंवा पशुवैद्यकीय अधिकाऱ्यांशी संपर्क साधा.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {animals.map((animal) => {
            const recentCase = animal.cases[0];
            const analysis = (recentCase?.analysisResult as Record<string, unknown> | null) || {};
            const riskLevel = (analysis.overall_risk_level as string) || null;
            const isHighRisk = riskLevel === "HIGH" || riskLevel === "CRITICAL";

            return (
              <Card key={animal.id} className="border-[#E5E0D8] bg-white hover:border-emerald-600 transition-all rounded-3xl shadow-xs flex flex-col justify-between overflow-hidden">
                <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-[#E5E0D8]">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base text-[#191F1C]">टॅग: {animal.tag}</CardTitle>
                      <Badge className="text-[10px] bg-stone-100 text-stone-700 border-stone-200">
                        {animal.species}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-stone-500 mt-1">
                      {animal.herd.farm.name} • जात: {animal.breed || "Standard"} • वय: {animal.ageMonths ? `${animal.ageMonths} महिने` : "नोंद नाही"}
                    </CardDescription>
                  </div>

                  {riskLevel && (
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                        isHighRisk
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {riskLevel}
                    </span>
                  )}
                </CardHeader>

                <CardContent className="flex items-center justify-between pt-4">
                  <div className="text-xs text-stone-500">
                    {recentCase ? (
                      <span>शेवटची नोंद: <strong className="text-stone-800">{recentCase.status}</strong></span>
                    ) : (
                      <span>नियमित देखरेख</span>
                    )}
                  </div>

                  <Link href={`/farmer/talk/${animal.id}`}>
                    <Button size="sm" className="gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm font-semibold rounded-xl">
                      <span>आरोग्य चर्चा सुरू करा</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
