import React from "react";
import Link from "next/link";
import { getVetQueueAction } from "@/lib/actions/vet";
import { RiskBadge } from "@/components/ai/RiskBadge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MotionFadeIn } from "@/components/motion/MotionFadeIn";
import { Activity, Camera, Cpu, ArrowRight, Clock, AlertTriangle, ShieldCheck } from "lucide-react";

export default async function VetDashboardPage() {
  const queue = await getVetQueueAction();

  const criticalCount = queue.filter((c) => {
    const analysis = (c.analysisResult as Record<string, unknown> | null) || {};
    return analysis.overall_risk_level === "CRITICAL";
  }).length;

  const pendingCount = queue.filter((c) => c.status === "PENDING_REVIEW").length;
  const underExamCount = queue.filter((c) => c.status === "UNDER_EXAMINATION").length;
  const labRefCount = queue.filter((c) => c.status === "LAB_REFERRAL").length;

  return (
    <div className="space-y-6 text-[#191F1C]">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-4">
        <div>
          <Badge className="border-emerald-200 text-emerald-800 bg-emerald-50 text-[10px] uppercase font-mono">
            नैदानिक प्राथमिकता कक्ष (Clinical Priority Queue)
          </Badge>
          <h1 className="text-2xl font-bold text-[#191F1C] tracking-tight mt-1">
            पशुवैद्यकीय प्राथमिक तपासणी टेबल (Triage Queue)
          </h1>
          <p className="text-xs text-stone-500">
            रोग तीव्रतेनुसार (CRITICAL &gt; HIGH &gt; ELEVATED &gt; MEDIUM &gt; LOW) आणि अहवाल वेळेनुसार क्रमवारी.
          </p>
        </div>
      </div>

      {/* Summary Metrics Grid with Soft Pastel Surfaces */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MotionFadeIn delay={0} direction="up">
          <div className="p-4 rounded-2xl border border-red-200 bg-red-50/80 flex flex-col justify-between shadow-2xs hover-lift h-full">
            <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider">अति-गंभीर प्रकरणे (Critical)</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-red-900">{criticalCount}</span>
              <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
            </div>
          </div>
        </MotionFadeIn>

        <MotionFadeIn delay={80} direction="up">
          <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/80 flex flex-col justify-between shadow-2xs hover-lift h-full">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">समीक्षा प्रलंबित (Pending)</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-amber-950">{pendingCount}</span>
              <Clock className="h-5 w-5 text-amber-700" />
            </div>
          </div>
        </MotionFadeIn>

        <MotionFadeIn delay={160} direction="up">
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 flex flex-col justify-between shadow-2xs hover-lift h-full">
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">तपासणी सुरू (Under Exam)</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-emerald-950">{underExamCount}</span>
              <Activity className="h-5 w-5 text-emerald-700" />
            </div>
          </div>
        </MotionFadeIn>

        <MotionFadeIn delay={240} direction="up">
          <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/80 flex flex-col justify-between shadow-2xs hover-lift h-full">
            <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider">लॅब तपासणी पाठवले (Lab Referrals)</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-sky-950">{labRefCount}</span>
              <ShieldCheck className="h-5 w-5 text-sky-700" />
            </div>
          </div>
        </MotionFadeIn>
      </div>

      {/* Queue Section */}
      <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
        <CardHeader className="border-b border-[#E5E0D8] pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-bold text-[#191F1C]">सक्रिय तपासणी यादी (Active Triage Register)</CardTitle>
              <CardDescription className="text-xs text-stone-500">
                {queue.length} प्रकरणे पशुवैद्यकीय डॉक्टरांच्या निर्णयासाठी प्रलंबित आहेत
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {queue.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500 space-y-2">
              <ShieldCheck className="h-8 w-8 text-emerald-700 mx-auto" />
              <p className="font-bold text-stone-900">तपासणी रांग पूर्णपणे मोकळी आहे</p>
              <p>आपल्या कार्यकक्षेत सध्या कोणतीही प्रलंबित आरोग्य तक्रार नाही.</p>
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="grid grid-cols-1 md:hidden gap-3">
                {queue.map((item) => {
                  const analysis = (item.analysisResult as Record<string, unknown> | null) || {};
                  const level = (analysis.overall_risk_level as string) || "UNKNOWN";
                  const score = Number(analysis.overall_risk_score || 0);

                  return (
                    <div key={item.id} className="p-4 rounded-2xl border border-[#E5E0D8] bg-[#FAF8F3] space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-[#191F1C]">#{item.caseNumber}</span>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            टॅग: <strong className="text-stone-800 font-mono">{item.animal.tag}</strong> ({item.animal.species})
                          </p>
                        </div>
                        <RiskBadge level={level} />
                      </div>

                      <div className="text-xs text-stone-600 space-y-1">
                        <div>शेत: <span className="text-stone-900 font-medium">{item.animal.herd.farm.name}</span></div>
                        <div>गाव: <span className="text-stone-900 font-medium">{item.animal.herd.farm.village.name}</span></div>
                        <div>नोंदणी वेळ: <span className="text-stone-500">{new Date(item.reportedAt).toLocaleString()}</span></div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        {item.photoUrl && (
                          <Badge className="text-[10px] border-emerald-200 text-emerald-800 bg-emerald-50 flex items-center gap-1">
                            <Camera className="h-3 w-3" /> छायाचित्र
                          </Badge>
                        )}
                        {item.iotTelemetry && (
                          <Badge className="text-[10px] border-emerald-200 text-emerald-800 bg-emerald-50 flex items-center gap-1">
                            <Cpu className="h-3 w-3" /> IoT Vitals
                          </Badge>
                        )}
                        {item.analysisResult && (
                          <Badge className="text-[10px] border-amber-200 text-amber-800 bg-amber-50 flex items-center gap-1">
                            <Activity className="h-3 w-3" /> AI Score ({score})
                          </Badge>
                        )}
                      </div>

                      <Link href={`/vet/cases/${item.id}`}>
                        <Button type="button" size="sm" className="w-full text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold mt-2 min-h-[40px] rounded-xl">
                          <span>तपासणी सुरू करा</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-600 border-collapse">
                  <thead className="bg-[#FAF8F3] border-b border-[#E5E0D8] text-[11px] font-bold text-stone-800 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3">केस क्र. (Case #)</th>
                      <th className="py-3 px-3">धोका (Risk)</th>
                      <th className="py-3 px-3">जनावर (Animal)</th>
                      <th className="py-3 px-3">शेतकरी व गाव (Location)</th>
                      <th className="py-3 px-3">वेळ (Reported)</th>
                      <th className="py-3 px-3">स्थिती (Status)</th>
                      <th className="py-3 px-3 text-right">कृती (Action)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E0D8]">
                    {queue.map((item) => {
                      const analysis = (item.analysisResult as Record<string, unknown> | null) || {};
                      const level = (analysis.overall_risk_level as string) || "UNKNOWN";

                      return (
                        <tr key={item.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-stone-900">
                            #{item.caseNumber}
                          </td>
                          <td className="py-3 px-3">
                            <RiskBadge level={level} />
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-stone-900">{item.animal.tag}</div>
                            <span className="text-[11px] text-stone-500">{item.animal.species}</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-stone-800">{item.animal.herd.farm.village.name}</div>
                            <span className="text-[11px] text-stone-500">{item.animal.herd.farm.name}</span>
                          </td>
                          <td className="py-3 px-3 text-stone-500">
                            {new Date(item.reportedAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-3">
                            <Badge className="bg-stone-100 text-stone-700 border-stone-200 text-[10px]">
                              {item.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Link href={`/vet/cases/${item.id}`}>
                              <Button type="button" size="sm" variant="outline" className="h-8 text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-50 gap-1 rounded-xl">
                                <span>तपासा</span>
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
