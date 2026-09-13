import Link from "next/link";
import Image from "next/image";
import { requireFarmer } from "@/lib/auth/permissions";
import { getFarmerDashboardMetricsAction } from "@/lib/actions/farmer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MotionFadeIn } from "@/components/motion/MotionFadeIn";
import { formatDateTime } from "@/lib/utils";
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
  User,
  MapPin,
  Cpu,
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
    <div className="workspace-page flex-1 flex flex-col w-full gap-8 text-[#20271F]">
      {/* Top Banner & Opening Greeting */}
      <div className="workspace-heading flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="workspace-eyebrow">
            FARMER HEALTH REGISTER • LIVESTOCK PORTAL
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#20271F] tracking-tight mt-1">
            {greetingTime}, {farmerDisplayName}.
          </h1>
          <p className="text-stone-600 text-xs sm:text-sm mt-1 flex flex-wrap items-center gap-1.5">
            <span>Registered livestock, daily health monitoring, veterinary advisory, and vaccination records.</span>
            {farmer.village?.name && (
              <Link
                href="/farmer/profile"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 hover:bg-emerald-100 transition-colors"
                title="View and edit registered location"
              >
                <MapPin className="h-3 w-3 text-emerald-700" />
                <span>{farmer.village.name}, {farmer.block?.name || ""}, {farmer.district?.name || ""}</span>
              </Link>
            )}
          </p>
        </div>

        {/* PROMINENT ENTRY PATHS */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/farmer/profile">
            <Button variant="outline" size="sm" className="gap-2 text-xs border-[#D9D3C7] bg-white text-stone-800 hover:bg-stone-50 rounded-xl min-h-[40px] shadow-2xs hover-lift-sm">
              <User className="h-4 w-4 text-emerald-700" />
              <span>My Profile</span>
            </Button>
          </Link>
          <Link href="/farmer/talk">
            <Button variant="outline" size="sm" className="gap-2 text-xs border-[#D9D3C7] bg-white text-stone-800 hover:bg-stone-50 rounded-xl min-h-[40px] shadow-2xs hover-lift-sm">
              <MessageSquare className="h-4 w-4 text-emerald-700" />
              <span>Farmer Talk (AI)</span>
            </Button>
          </Link>
          <Link href="/farmer/iot">
            <Button variant="outline" size="sm" className="gap-2 text-xs border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 rounded-xl min-h-[40px] shadow-2xs hover-lift-sm font-semibold">
              <Cpu className="h-4 w-4 text-emerald-700" />
              <span>IoT Vitals</span>
            </Button>
          </Link>
          <Link href="/farmer/request-help">
            <Button size="sm" variant="outline" className="gap-2 text-xs border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-semibold rounded-xl min-h-[40px] shadow-xs hover-lift-sm">
              <UserCheck className="h-4 w-4 text-amber-700" />
              <span>Request Field Agent</span>
            </Button>
          </Link>
          <Link href="/farmer/report">
            <Button size="sm" className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl min-h-[40px] shadow-sm hover-lift-sm">
              <PlusCircle className="h-4 w-4" />
              <span>Report Health Concern</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* REAL KPI DASHBOARD COUNTS */}
      <div className="metric-register grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-[#D7CFBB] border border-[#D7CFBB]">
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

                    <div className="px-5 pb-5 pt-2 border-t border-[#E5E0D8] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Link href={`/farmer/animals/${animal.id}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-50 gap-1 rounded-xl cursor-pointer">
                            <span>Health Passport</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/farmer/iot?animalId=${animal.id}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs border-stone-200 text-stone-700 hover:bg-stone-50 gap-1 rounded-xl cursor-pointer">
                            <Cpu className="w-3.5 h-3.5 text-emerald-700" />
                            <span>IoT</span>
                          </Button>
                        </Link>
                      </div>
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
      {/* 2. MY ACTIVE REPORTS & REQUESTS (ROUTING & DESTINATION VISIBILITY)         */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E0D8] pb-3">
          <div>
            <h2 className="text-xl font-bold text-[#191F1C] tracking-tight">Active Reports & Assistance Requests</h2>
            <p className="text-xs text-stone-500">Live tracking of your submissions, destination routing, and assigned healthcare personnel.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/farmer/report">
              <Button size="sm" variant="outline" className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-xl h-8">
                + Self-Report Case
              </Button>
            </Link>
            <Link href="/farmer/request-help">
              <Button size="sm" variant="outline" className="text-xs border-amber-300 text-amber-900 hover:bg-amber-50 rounded-xl h-8">
                + Field Agent Visit
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Health Cases (Path 1 / Direct or Completed Agent Reports) */}
          <div className="p-5 rounded-3xl bg-white border border-[#E5E0D8] space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-amber-700" />
                <div>
                  <h3 className="font-bold text-[#191F1C] text-sm">Active Health Cases ({activeCases.length})</h3>
                  <span className="text-[11px] text-stone-500">Directly routed to Veterinarians</span>
                </div>
              </div>
              <Badge className="bg-amber-50 text-amber-900 border-amber-200 text-[10px]">
                Under Vet Review
              </Badge>
            </div>

            {activeCases.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500 bg-[#FAF8F3] rounded-2xl border border-[#E5E0D8]">
                No active health cases pending veterinary examination.
              </div>
            ) : (
              <div className="space-y-3">
                {activeCases.slice(0, 5).map((c) => {
                  const farmLoc = c.animal?.herd?.farm?.village;
                  const locText = farmLoc
                    ? `${farmLoc.name}, ${farmLoc.block?.name || ""}`
                    : "Territory";

                  return (
                    <div key={c.id} className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] space-y-2.5 hover-lift">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-stone-900">#{c.caseNumber}</span>
                          <span className="text-xs font-semibold text-stone-700">
                            {c.animal?.tag} ({c.animal?.species})
                          </span>
                        </div>
                        <Badge className="bg-amber-100 text-amber-950 border-amber-300 text-[10px] font-semibold">
                          {c.status}
                        </Badge>
                      </div>

                      <div className="text-xs space-y-1 text-stone-600 bg-white p-2.5 rounded-xl border border-[#E5E0D8]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-500">Destination / Vet:</span>
                          {c.assignedVeterinarianUser ? (
                            <span className="font-bold text-emerald-950">
                              Dr. {c.assignedVeterinarianUser.name}
                              {c.assignmentLevel && (
                                <span className="ml-1 text-[10px] font-normal text-emerald-800">
                                  ({c.assignmentLevel.toLowerCase()})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-amber-800 font-medium italic">Awaiting vet assignment</span>
                          )}
                        </div>

                        {c.veterinaryReports && c.veterinaryReports.length > 0 ? (
                          <div className="flex items-center justify-between text-[11px] pt-0.5">
                            <span className="text-stone-500">Latest Vet Report:</span>
                            <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] font-semibold">
                              {c.veterinaryReports[0].diagnosis} ({c.veterinaryReports[0].action})
                            </Badge>
                          </div>
                        ) : null}

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-500">Location:</span>
                          <span className="text-stone-700">{locText}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-500">Symptoms:</span>
                          <span className="text-stone-800 truncate max-w-[200px]">{c.symptoms.join(", ")}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-mono text-stone-500">
                          {formatDateTime(c.reportedAt)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Link href={`/farmer/animals/${c.animalId}`}>
                            <Button size="sm" variant="outline" className="text-xs border-[#D9D3C7] text-stone-700 hover:bg-stone-50 rounded-xl h-7 px-2.5">
                              Animal Profile
                            </Button>
                          </Link>
                          <Link href={`/farmer/cases/${c.id}`}>
                            <Button size="sm" className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl h-7 px-3">
                              {c.veterinaryReports && c.veterinaryReports.length > 0 ? "View Vet Report" : "Case Details"}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Field Assistance Requests (Path 2) */}
          <div className="p-5 rounded-3xl bg-white border border-[#E5E0D8] space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-sky-700" />
                <div>
                  <h3 className="font-bold text-[#191F1C] text-sm">Field Assistance Requests ({assistanceRequests.length})</h3>
                  <span className="text-[11px] text-stone-500">Doorstep Pashusakhi visit requests</span>
                </div>
              </div>
              <Badge className="bg-sky-50 text-sky-900 border-sky-200 text-[10px]">
                On-Site Visits
              </Badge>
            </div>

            {assistanceRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500 bg-[#FAF8F3] rounded-2xl border border-[#E5E0D8]">
                No field assistance requests currently logged.
              </div>
            ) : (
              <div className="space-y-3">
                {assistanceRequests.slice(0, 5).map((req) => {
                  const reqLoc = req.village || req.farm?.village;
                  const locText = reqLoc
                    ? `${reqLoc.name}, ${reqLoc.block?.name || ""}`
                    : "Territory";

                  return (
                    <div key={req.id} className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] space-y-2.5 hover-lift">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-stone-500">REQ-{req.id.slice(-6).toUpperCase()}</span>
                          {req.animal && (
                            <span className="text-xs font-semibold text-stone-800">
                              {req.animal.tag} ({req.animal.species})
                            </span>
                          )}
                        </div>
                        <Badge className="bg-sky-100 text-sky-950 border-sky-300 text-[10px] font-semibold">
                          {req.status}
                        </Badge>
                      </div>

                      <div className="text-xs space-y-1 text-stone-600 bg-white p-2.5 rounded-xl border border-[#E5E0D8]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-500">Assigned Agent:</span>
                          {req.assignedFieldAgentUser ? (
                            <span className="font-bold text-sky-950">
                              {req.assignedFieldAgentUser.name}
                              {req.assignmentLevel && (
                                <span className="ml-1 text-[10px] font-normal text-sky-800">
                                  ({req.assignmentLevel.toLowerCase()})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-amber-800 font-medium italic">Waiting for a field agent</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-500">Location:</span>
                          <span className="text-stone-700">{locText}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-500">Reason:</span>
                          <span className="text-stone-800 truncate max-w-[200px]">{req.reason}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-stone-500">
                        <span>Requested: {formatDateTime(req.requestedAt)}</span>
                        {req.status === "REQUESTED" || req.status === "ASSIGNED" ? (
                          <span className="text-amber-700 font-medium">Pending Agent Visit</span>
                        ) : req.status === "IN_PROGRESS" ? (
                          <span className="text-sky-700 font-bold">Visit in Progress</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">Completed</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
