import Link from "next/link";
import Image from "next/image";
import { requireFarmer } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MotionFadeIn } from "@/components/motion/MotionFadeIn";
import {
  PlusCircle,
  MessageSquare,
  PhoneCall,
  ChevronRight,
  Syringe,
  Stethoscope,
  HeartPulse,
  Activity,
  CalendarCheck,
} from "lucide-react";
import { DeleteAnimalButton } from "@/components/farmer/DeleteAnimalButton";

export default async function FarmerPortalPage() {
  const farmer = await requireFarmer();

  // Fetch farmer's farms, herds, and animals
  const farms = await prisma.farm.findMany({
    where: { farmerUserId: farmer.id },
    include: {
      village: {
        include: {
          block: {
            include: {
              district: true,
            },
          },
        },
      },
      herds: {
        include: {
          animals: {
            include: {
              vaccinations: {
                take: 3,
                orderBy: { dateGiven: "desc" },
              },
              cases: {
                take: 3,
                orderBy: { reportedAt: "desc" },
              },
            },
          },
        },
      },
    },
  });

  const allAnimals = farms.flatMap((f) => f.herds.flatMap((h) => h.animals));
  const activeCases = allAnimals.flatMap((a) => a.cases).filter((c) => c.status !== "CLOSED_HARMLESS");

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

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/farmer/talk">
            <Button variant="outline" size="sm" className="gap-2 text-xs border-[#D9D3C7] bg-white text-stone-800 hover:bg-stone-50">
              <MessageSquare className="h-4 w-4 text-emerald-700" />
              <span>Farmer Talk (AI)</span>
            </Button>
          </Link>
          <Link href="/farmer/report">
            <Button size="sm" className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm">
              <PlusCircle className="h-4 w-4" />
              <span>Report Health Concern</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. HORIZONTAL ANIMAL GALLERY ("My animals.")                              */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#191F1C] tracking-tight">My animals.</h2>
            <span className="text-xs text-stone-500">Registered livestock ({allAnimals.length} Total)</span>
          </div>
          <Link href="/farmer/talk" className="text-xs font-semibold text-emerald-800 hover:underline">
            All animals &rarr;
          </Link>
        </div>

        {allAnimals.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-[#E5E0D8] text-center space-y-2">
            <HeartPulse className="h-8 w-8 text-emerald-700 mx-auto" />
            <p className="font-bold text-stone-900 text-sm">No registered animals found</p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              No livestock are currently registered under your account. Please contact your local field agent or veterinary dispensary for ear-tag registration.
            </p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3 pt-1 snap-x scrollbar-thin">
            {allAnimals.map((animal, idx) => {
              const recentCase = animal.cases[0];
              const isUnderCare = recentCase && recentCase.status !== "CLOSED_HARMLESS";
              return (
                <MotionFadeIn key={animal.id} delay={idx * 70} direction="right">
                  <div
                    className="min-w-[280px] sm:min-w-[320px] max-w-[340px] bg-white rounded-3xl border border-[#E5E0D8] overflow-hidden shadow-xs hover-lift group flex flex-col justify-between shrink-0 snap-start h-full"
                  >
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

                    <div className="p-5 space-y-3">
                      <div>
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-lg font-bold text-[#191F1C] group-hover:text-emerald-800 transition-colors">{animal.species}</h3>
                          <span className="text-xs font-mono font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                            {animal.tag}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Breed: {animal.breed || "Standard"} • Age: {animal.ageMonths ? `${animal.ageMonths} Months` : "Not recorded"}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-between">
                        <span className="text-[11px] text-stone-500">
                          {isUnderCare ? "Under Examination" : "Routine Care"}
                        </span>
                        <div className="flex items-center gap-2">
                          <Link href={`/farmer/talk/${animal.id}`}>
                            <Button size="sm" variant="outline" className="h-8 text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-50 gap-1 rounded-xl cursor-pointer">
                              <span>Health Talk</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <DeleteAnimalButton animalId={animal.id} tag={animal.tag} />
                        </div>
                      </div>
                    </div>
                  </div>
                </MotionFadeIn>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. HEALTH TIMELINE (Horizontal: Vaccinations, Visits, Reports, Care)      */}
      {/* ========================================================================= */}
      <MotionFadeIn direction="up">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#191F1C] tracking-tight">Health timeline.</h2>
              <span className="text-xs text-stone-500">Vaccinations, examinations, and health records</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#E5E0D8] p-5 sm:p-6 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Timeline Item 1: Vaccinations */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 hover-lift">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase">
                  <Syringe className="h-4 w-4 text-amber-700" />
                  <span>1. Vaccinations</span>
                </div>
                <div className="text-xs text-stone-700 space-y-1">
                  <div className="font-bold text-stone-900">FMD & HS Boosters</div>
                  <p className="text-stone-600 leading-relaxed">
                    Scheduled bi-annual immunization drive in coordination with taluka veterinary officer.
                  </p>
                  <div className="text-[11px] font-semibold text-amber-900 pt-1">Status: Active Schedule</div>
                </div>
              </div>

              {/* Timeline Item 2: Field Visits */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2 hover-lift">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase">
                  <CalendarCheck className="h-4 w-4 text-emerald-700" />
                  <span>2. Field Visits</span>
                </div>
                <div className="text-xs text-stone-700 space-y-1">
                  <div className="font-bold text-stone-900">Pashusakhi Inspection</div>
                  <p className="text-stone-600 leading-relaxed">
                    Routine door-to-door herd vitals, body condition scoring, and dewlap check.
                  </p>
                  <div className="text-[11px] font-semibold text-emerald-900 pt-1">Weekly Monitoring</div>
                </div>
              </div>

              {/* Timeline Item 3: Active Reports */}
              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2 hover-lift">
                <div className="flex items-center gap-2 text-sky-900 font-bold text-xs uppercase">
                  <Activity className="h-4 w-4 text-sky-700" />
                  <span>3. Health Reports</span>
                </div>
                <div className="text-xs text-stone-700 space-y-1">
                  <div className="font-bold text-stone-900">{activeCases.length} Active Concern(s)</div>
                  <p className="text-stone-600 leading-relaxed">
                    {activeCases.length > 0
                      ? "Case logged and assigned to local veterinary dispensary for review."
                      : "No active disease alerts logged. Herd vitals are within normal range."}
                  </p>
                  <div className="text-[11px] font-semibold text-sky-900 pt-1">
                    {activeCases.length > 0 ? "Under Triage" : "Clear"}
                  </div>
                </div>
              </div>

              {/* Timeline Item 4: Clinical Treatments */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2 hover-lift">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-xs uppercase">
                  <Stethoscope className="h-4 w-4 text-purple-700" />
                  <span>4. Treatments</span>
                </div>
                <div className="text-xs text-stone-700 space-y-1">
                  <div className="font-bold text-stone-900">Veterinary Care</div>
                  <p className="text-stone-600 leading-relaxed">
                    Prescription protocols, dosage tracking, and laboratory referral follow-up.
                  </p>
                  <div className="text-[11px] font-semibold text-purple-900 pt-1">Doctor Supported</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MotionFadeIn>

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
          <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs whitespace-nowrap rounded-xl">
            Report Health Concern
          </Button>
        </Link>
      </div>
    </div>
  );
}
