import Link from "next/link";
import Image from "next/image";
import { requireFarmer } from "@/lib/auth/permissions";
import { getFarmerDashboardMetricsAction } from "@/lib/actions/farmer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MotionFadeIn } from "@/components/motion/MotionFadeIn";
import {
  PlusCircle,
  MessageSquare,
  PhoneCall,
  ChevronRight,
  Stethoscope,
  HeartPulse,
  Activity,
  CalendarCheck,
  UserCheck,
} from "lucide-react";
import { DeleteAnimalButton } from "@/components/farmer/DeleteAnimalButton";

export default async function FarmerPortalPage() {
  const farmer = await requireFarmer();

  const {
    metrics,
    allAnimals,
    activeCases,
    assistanceRequests,
  } = await getFarmerDashboardMetricsAction();

  // Determine greeting based on local time
  const currentHour = new Date().getHours();
  const greetingTime = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
  const farmerDisplayName = farmer.name || (farmer as unknown as { firstName?: string }).firstName || "Farmer";

  // Helper for animal default image based on species
  const getAnimalImage = (species: string) => {
    const s = species.toLowerCase();
    if (s.includes("buffalo") || s.includes("म्हैस")) return "/images/buffalo_dairy_care.jpg";
    if (s.includes("goat") || s.includes("sheep") || s.includes("शेळी") || s.includes("मेंढी")) return "/images/osmanabadi_goat.jpg";
    return "/images/vet_field_examination.jpg";
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-6xl mx-auto w-full gap-8 text-[#191F1C]">
      {/* Top Banner & Opening Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-6">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
            FARMER HEALTH REGISTER • LIVESTOCK PORTAL
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#191F1C] tracking-tight mt-1">
            {greetingTime}, {farmerDisplayName}.
          </h1>
          <p className="text-stone-600 text-xs sm:text-sm mt-1">
            Registered livestock, daily health monitoring, veterinary advisory, and vaccination records.
          </p>
        </div>

        {/* TWO PROMINENT ENTRY PATHS */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/farmer/talk">
            <Button variant="outline" size="sm" className="gap-2 text-xs border-[#D9D3C7] bg-white text-stone-800 hover:bg-stone-50 rounded-xl min-h-[40px]">
              <MessageSquare className="h-4 w-4 text-emerald-700" />
              <span>Farmer Talk (AI)</span>
            </Button>
          </Link>
          <Link href="/farmer/request-help">
            <Button size="sm" variant="outline" className="gap-2 text-xs border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-semibold rounded-xl min-h-[40px] shadow-xs">
              <UserCheck className="h-4 w-4 text-amber-700" />
              <span>Request Field Agent</span>
            </Button>
          </Link>
          <Link href="/farmer/report">
            <Button size="sm" className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl min-h-[40px] shadow-sm">
              <PlusCircle className="h-4 w-4" />
              <span>Report Health Concern</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* REAL KPI DASHBOARD COUNTS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-[#E5E0D8] shadow-2xs hover-lift flex flex-col justify-between">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">My Animals</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-stone-900">{metrics.myAnimalsCount}</span>
            <HeartPulse className="h-5 w-5 text-emerald-700" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs hover-lift flex flex-col justify-between">
          <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Active Cases</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-950">{metrics.activeCasesCount}</span>
            <Activity className="h-5 w-5 text-amber-700" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 shadow-2xs hover-lift flex flex-col justify-between">
          <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider">Field Requests</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-sky-950">{metrics.assistanceRequestsCount}</span>
            <UserCheck className="h-5 w-5 text-sky-700" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs hover-lift flex flex-col justify-between">
          <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Vet Reports</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-950">{metrics.vetReportsCount}</span>
            <Stethoscope className="h-5 w-5 text-emerald-700" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 shadow-2xs hover-lift flex flex-col justify-between">
          <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">Follow-ups Due</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-purple-950">{metrics.upcomingFollowUpsCount}</span>
            <CalendarCheck className="h-5 w-5 text-purple-700" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. HORIZONTAL ANIMAL GALLERY ("My animals.")                              */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#191F1C] tracking-tight">My animals.</h2>
            <span className="text-xs text-stone-500">Registered livestock ({allAnimals.length} Total) • Click any card for full medical history</span>
          </div>
          <Link href="/farmer/report" className="text-xs font-semibold text-emerald-800 hover:underline">
            Register new animal &rarr;
          </Link>
        </div>

        {allAnimals.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-[#E5E0D8] text-center space-y-3">
            <HeartPulse className="h-8 w-8 text-emerald-700 mx-auto" />
            <p className="font-bold text-stone-900 text-sm">No registered animals found</p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              No livestock are currently registered under your account. Click below to register your animals or report a health concern.
            </p>
            <Link href="/farmer/report">
              <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs rounded-xl">
                Register First Animal
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3 pt-1 snap-x scrollbar-thin">
            {allAnimals.map((animal, idx) => {
              const recentCase = animal.cases[0];
              const isUnderCare = recentCase && recentCase.status !== "CLOSED_HARMLESS";
              return (
                <MotionFadeIn key={animal.id} delay={idx * 60} direction="right">
                  <div className="min-w-[280px] sm:min-w-[320px] max-w-[340px] bg-white rounded-3xl border border-[#E5E0D8] overflow-hidden shadow-xs hover-lift group flex flex-col justify-between shrink-0 snap-start h-full">
                    <Link href={`/farmer/animals/${animal.id}`} className="block">
                      <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
                        <Image
                          src={getAnimalImage(animal.species)}
                          alt={animal.tag}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-3 right-3">
                          {isUnderCare ? (
                            <Badge className="bg-amber-100 text-amber-950 border-amber-300 text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
                              <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse shrink-0" />
                              <span>Under Care • {recentCase.status}</span>
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-900 border-emerald-200 text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
                              <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                              <span>Stable</span>
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="p-5 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-lg font-bold text-[#191F1C] group-hover:text-emerald-800 transition-colors">
                            {animal.species}
                          </h3>
                          <span className="text-xs font-mono font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                            {animal.tag}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500">
                          Breed: {animal.breed || "Standard"} • Age: {animal.ageMonths ? `${animal.ageMonths} Months` : "Recorded"}
                        </p>
                      </div>
                    </Link>

                    <div className="px-5 pb-5 pt-2 border-t border-[#E5E0D8] flex items-center justify-between">
                      <Link href={`/farmer/animals/${animal.id}`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-50 gap-1 rounded-xl cursor-pointer">
                          <span>Health Passport</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <DeleteAnimalButton animalId={animal.id} tag={animal.tag} />
                    </div>
                  </div>
                </MotionFadeIn>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. ACTIVE CASES & FIELD ASSISTANCE REQUESTS                                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Health Cases */}
        <div className="p-5 rounded-3xl bg-white border border-[#E5E0D8] space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-amber-700" />
              <h3 className="font-bold text-[#191F1C] text-base">Active Health Episodes ({activeCases.length})</h3>
            </div>
            <Link href="/farmer/report" className="text-xs text-emerald-800 font-semibold hover:underline">
              New Report &rarr;
            </Link>
          </div>

          {activeCases.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-500 bg-[#FAF8F3] rounded-2xl border border-[#E5E0D8]">
              No active livestock disease alerts or pending episodes.
            </div>
          ) : (
            <div className="space-y-3">
              {activeCases.map((c) => (
                <div key={c.id} className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] flex items-center justify-between hover-lift">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#191F1C]">#{c.caseNumber}</span>
                      <Badge className="bg-amber-100 text-amber-950 border-amber-300 text-[10px]">
                        {c.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-stone-600 mt-1">
                      Symptoms: {c.symptoms.join(", ")} • Reported: {new Date(c.reportedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link href={`/farmer/animals/${c.animalId}`}>
                    <Button size="sm" variant="outline" className="text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-xl h-8">
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assistance Requests Queue */}
        <div className="p-5 rounded-3xl bg-white border border-[#E5E0D8] space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-sky-700" />
              <h3 className="font-bold text-[#191F1C] text-base">Field Assistance Requests ({assistanceRequests.length})</h3>
            </div>
            <Link href="/farmer/request-help" className="text-xs text-emerald-800 font-semibold hover:underline">
              Request Help &rarr;
            </Link>
          </div>

          {assistanceRequests.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-500 bg-[#FAF8F3] rounded-2xl border border-[#E5E0D8]">
              No assistance requests currently logged.
            </div>
          ) : (
            <div className="space-y-3">
              {assistanceRequests.slice(0, 4).map((req) => (
                <div key={req.id} className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] flex items-center justify-between hover-lift">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#191F1C]">{req.reason}</span>
                      <Badge className="bg-sky-100 text-sky-950 border-sky-300 text-[10px]">
                        {req.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      {req.assignedAgentUser ? `Assigned Agent: ${req.assignedAgentUser.name} (${req.assignedAgentUser.phone})` : "Awaiting agent assignment"}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-stone-500">
                    {new Date(req.requestedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Emergency Veterinary Guidance */}
      <div className="p-5 rounded-3xl bg-white border border-[#E5E0D8] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
            <PhoneCall className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-[#191F1C] text-sm">Livestock Emergency & Disease Helpline: 1962</h4>
            <p className="text-stone-500 text-xs">
              If any animal exhibits sudden high fever, excessive salivation, or skin nodules, immediately contact veterinary helpline 1962.
            </p>
          </div>
        </div>
        <Link href="/farmer/report">
          <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs whitespace-nowrap rounded-xl min-h-[36px]">
            Report Health Concern
          </Button>
        </Link>
      </div>
    </div>
  );
}
