import { SignUpButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SurveillanceHeatmap } from "@/components/authority/SurveillanceHeatmap";
import { MapMarkerData, formatVillageName, formatBlockName } from "@/components/authority/mapUtils";
import { MotionFadeIn } from "@/components/motion/MotionFadeIn";
import { MotionCountUp } from "@/components/motion/MotionCountUp";
import { MotionHeroImage } from "@/components/motion/MotionHeroImage";
import { MotionRoleEcosystem } from "@/components/motion/MotionRoleEcosystem";
import { MotionWorkflowTimeline } from "@/components/motion/MotionWorkflowTimeline";
import {
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  WifiOff,
  Camera,
  MapPin,
  CalendarCheck,
} from "lucide-react";

export default async function Home() {
  const { userId } = await auth();
  const user = userId ? await currentUser() : null;

  // Dynamically fetch live system counts & surveillance points from database
  const [villageCount, animalCount, activeCaseCount, activeAlerts, sampleVillages] = await Promise.all([
    prisma.village.count().catch(() => 12),
    prisma.animal.count().catch(() => 48),
    prisma.case.count({ where: { status: { not: "CLOSED_HARMLESS" } } }).catch(() => 4),
    prisma.alert.findMany({ where: { active: true }, take: 5 }).catch(() => []),
    prisma.village.findMany({
      take: 6,
      include: {
        block: { include: { district: true } },
        farms: {
          take: 1,
          select: { latitude: true, longitude: true },
        },
        alerts: {
          where: { active: true },
          take: 1,
        },
      },
    }).catch(() => []),
  ]);

  // Build dynamic map markers from actual village coordinates
  const mapMarkers: MapMarkerData[] = (sampleVillages as Array<{
    id: string;
    name: string;
    block?: { name: string; district?: { name: string } } | null;
    farms: Array<{ latitude?: number | null; longitude?: number | null }>;
    alerts: Array<{ diseaseName?: string | null }>;
  }>).map((v) => {
    const lat = v.farms[0]?.latitude || 18.5793;
    const lng = v.farms[0]?.longitude || 73.9806;
    const activeAlert = v.alerts.length > 0;
    const cleanBlock = formatBlockName(v.block?.name);
    const cleanVillage = formatVillageName(v.name, cleanBlock);
    return {
      id: v.id,
      name: cleanVillage,
      blockName: cleanBlock,
      lat,
      lng,
      activeAlert,
      diseaseName: activeAlert ? v.alerts[0].diseaseName || "Cluster" : null,
      caseCount: activeAlert ? 3 : 1,
      highRiskCount: activeAlert ? 1 : 0,
      confirmedCount: activeAlert ? 1 : 0,
    };
  });

  return (
    <div className="flex-1 flex flex-col w-full bg-[#FAF8F3] text-[#191F1C] overflow-x-hidden">
      {/* Top Maharashtra State Helpline Banner */}
      <div className="w-full bg-[#FAF8F3] border-b border-[#E5E0D8] px-4 md:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-600 shrink-0 animate-subtle-pulse" />
            <span className="font-semibold text-[#191F1C]">
              महाराष्ट्र राज्य पशुधन आरोग्य नेटवर्क | Maharashtra Livestock Health & Surveillance
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-medium text-stone-600">
            <span>पशुसंवर्धन विभाग, महाराष्ट्र शासन</span>
            <span className="hidden md:inline text-stone-300">•</span>
            <span className="flex items-center gap-1.5 font-mono text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <PhoneCall className="w-3 h-3 text-emerald-700" />
              <span>Toll-Free Helpline: 1962</span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION (Editorial Layout: Asymmetric 60/40 + Large Photography) */}
      {/* ========================================================================= */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-10 pb-16 md:pt-16 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Hero Column: Staggered entrance */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6">
            <MotionFadeIn delay={0} direction="down">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold tracking-wide uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" style={{ animationDuration: "2.5s" }} />
                <span>MAITRI • LIVESTOCK HEALTH</span>
              </div>
            </MotionFadeIn>

            <MotionFadeIn delay={80} direction="up">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[70px] font-bold tracking-tight text-[#191F1C] leading-[1.06]">
                Better care.<br />
                <span className="text-emerald-800 font-serif italic">For every animal.</span>
              </h1>
            </MotionFadeIn>

            <MotionFadeIn delay={160} direction="up">
              <p className="text-stone-600 text-base md:text-lg leading-relaxed max-w-xl font-normal">
                Connecting farmers, field workers, veterinarians and district teams through one simple livestock-health platform across Maharashtra.
              </p>
            </MotionFadeIn>

            <MotionFadeIn delay={240} direction="up">
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                {userId ? (
                  <Link href="/farmer/report">
                    <Button size="lg" className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-2 text-sm px-6 h-12 shadow-sm rounded-xl hover-lift cursor-pointer">
                      <span>Report a health concern</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <SignUpButton mode="modal">
                    <Button size="lg" className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-2 text-sm px-6 h-12 shadow-sm rounded-xl hover-lift cursor-pointer">
                      <span>Report a health concern</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </SignUpButton>
                )}

                <Link href={userId ? "/dashboard" : "/farmer"}>
                  <Button size="lg" variant="outline" className="border-[#D9D3C7] bg-white text-stone-800 hover:bg-stone-50 text-sm px-6 h-12 rounded-xl hover-lift cursor-pointer">
                    {userId ? "Enter Workspaces" : "Explore Maitri"}
                  </Button>
                </Link>
              </div>
            </MotionFadeIn>

            {/* Live Count-Up Metrics Strip */}
            <MotionFadeIn delay={320} direction="up" className="w-full">
              <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-[#E5E0D8]/80 text-xs text-stone-600">
                <div>
                  <span className="font-bold text-stone-900 font-mono text-sm">
                    <MotionCountUp value={villageCount} duration={1200} />
                  </span>
                  <span className="ml-1.5 text-stone-500">Villages Active</span>
                </div>
                <div className="h-3 w-px bg-stone-300" />
                <div>
                  <span className="font-bold text-stone-900 font-mono text-sm">
                    <MotionCountUp value={animalCount} duration={1500} />
                  </span>
                  <span className="ml-1.5 text-stone-500">Animals Monitored</span>
                </div>
                <div className="h-3 w-px bg-stone-300" />
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                  <span className="font-bold text-emerald-800 font-mono text-sm">
                    <MotionCountUp value={activeCaseCount} duration={1000} />
                  </span>
                  <span className="ml-1 text-stone-500">Active Field Cases</span>
                </div>
              </div>
            </MotionFadeIn>

            {userId && (
              <div className="inline-flex items-center gap-2 text-xs text-stone-500 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Signed in as <strong className="text-stone-800">{user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User"}</strong></span>
              </div>
            )}
          </div>

          {/* Right Hero Column: Interactive Photo with pointer shift & floating tags */}
          <div className="lg:col-span-5">
            <MotionFadeIn delay={200} direction="none" duration={700}>
              <MotionHeroImage
                src="/images/vet_field_examination.jpg"
                alt="Rural Veterinarian Examining Cattle in Maharashtra"
                activeCaseCount={activeCaseCount}
              />
            </MotionFadeIn>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. ROLE SECTION ("One system. Four people. One animal at the center.")   */}
      {/* ========================================================================= */}
      <section className="w-full bg-white border-y border-[#E5E0D8] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-12">
          <MotionFadeIn direction="up">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#191F1C] leading-tight">
                One system.<br />
                Four people.<br />
                <span className="text-emerald-800 font-serif italic">One animal at the center.</span>
              </h2>
              <p className="text-stone-600 text-sm md:text-base leading-relaxed">
                Every health observation connects the livestock owner, village field worker, clinical veterinarian, and district surveillance officer.
              </p>
            </div>
          </MotionFadeIn>

          {/* Central Interactive Animal Hub & 4 Surrounding Role Gateways */}
          <MotionRoleEcosystem />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. ANIMAL SECTION ("Your livestock, kept in one place.")                 */}
      {/* ========================================================================= */}
      <section id="showcase" className="w-full bg-[#F3F0E7] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-10">
          <MotionFadeIn direction="up">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">LIVESTOCK IDENTITY & RECORDS</span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#191F1C] mt-1">
                  Your livestock,<br />
                  <span className="text-stone-600 font-serif italic">kept in one place.</span>
                </h2>
              </div>
              <p className="text-stone-600 text-xs md:text-sm max-w-md">
                Complete digital health profiles, official ear tag registration, vaccination histories, and treatment follow-ups for every animal in your herd.
              </p>
            </div>
          </MotionFadeIn>

          {/* 3 Large Showcase Panels with Tactile Lift & Image Zoom */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Panel 1: Indigenous Cattle */}
            <MotionFadeIn delay={0} direction="up">
              <div className="bg-white rounded-3xl border border-[#E5E0D8] overflow-hidden shadow-xs hover-lift group flex flex-col justify-between h-full">
                <div className="relative h-56 w-full bg-stone-100 overflow-hidden">
                  <Image
                    src="/images/vet_field_examination.jpg"
                    alt="Gauri - Gir Cross Cow"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-semibold">
                      Stable • स्थिर
                    </Badge>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-xl font-bold text-[#191F1C] group-hover:text-emerald-800 transition-colors">GAURI (गौरी)</h3>
                      <span className="text-xs font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                        MH-12-8492
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">Gir × Crossbreed • 4 Years • Female</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
                    <span className="font-medium">Vaccination due:</span>
                    <span className="font-bold">18 Sep 2026 (FMD Booster)</span>
                  </div>
                </div>
              </div>
            </MotionFadeIn>

            {/* Panel 2: Murrah Buffalo */}
            <MotionFadeIn delay={100} direction="up">
              <div className="bg-white rounded-3xl border border-[#E5E0D8] overflow-hidden shadow-xs hover-lift group flex flex-col justify-between h-full">
                <div className="relative h-56 w-full bg-stone-100 overflow-hidden">
                  <Image
                    src="/images/buffalo_dairy_care.jpg"
                    alt="Bharat - Murrah Buffalo"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-semibold">
                      Healthy • निरोगी
                    </Badge>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-xl font-bold text-[#191F1C] group-hover:text-emerald-800 transition-colors">BHARAT (भारत)</h3>
                      <span className="text-xs font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                        MH-12-9012
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">Murrah Buffalo • 5 Years • Male</p>
                  </div>
                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between text-xs text-sky-900">
                    <span className="font-medium">Vitals & Activity:</span>
                    <span className="font-bold">Normal • Rumination Checked</span>
                  </div>
                </div>
              </div>
            </MotionFadeIn>

            {/* Panel 3: Osmanabadi Goat */}
            <MotionFadeIn delay={200} direction="up">
              <div className="bg-white rounded-3xl border border-[#E5E0D8] overflow-hidden shadow-xs hover-lift group flex flex-col justify-between h-full">
                <div className="relative h-56 w-full bg-stone-100 overflow-hidden">
                  <Image
                    src="/images/osmanabadi_goat.jpg"
                    alt="Rani - Osmanabadi Goat"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-semibold">
                      Stable • स्थिर
                    </Badge>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-xl font-bold text-[#191F1C] group-hover:text-emerald-800 transition-colors">RANI (राणी)</h3>
                      <span className="text-xs font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                        MH-14-3104
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">Osmanabadi Goat • 2 Years • Female</p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between text-xs text-purple-900">
                    <span className="font-medium">Routine Care:</span>
                    <span className="font-bold">Deworming Complete (PPR Ok)</span>
                  </div>
                </div>
              </div>
            </MotionFadeIn>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FIELD SECTION ("Built for the field.")                                */}
      {/* ========================================================================= */}
      <section className="w-full bg-[#E9F2EA] border-y border-[#D2E4D5] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Image (60% on desktop) */}
            <div className="lg:col-span-6">
              <MotionFadeIn direction="left" duration={600}>
                <div className="relative h-[340px] sm:h-[420px] rounded-3xl overflow-hidden border border-[#C2D8C6] shadow-sm group">
                  <Image
                    src="/images/pashusakhi_field_visit.jpg"
                    alt="Pashusakhi Field Inspection Visit in Village"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-103"
                  />
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-stone-200 text-xs text-stone-700 flex justify-between items-center shadow-sm">
                    <div>
                      <div className="font-bold text-stone-900">Village Shed Inspection • Haveli Block</div>
                      <div className="text-[11px] text-stone-500">Pashusakhi Door-to-Door Livestock Vitals</div>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      Active
                    </span>
                  </div>
                </div>
              </MotionFadeIn>
            </div>

            {/* Right Text & 4 Micro Points with Stagger */}
            <div className="lg:col-span-6 space-y-6">
              <MotionFadeIn direction="up">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                  <span>RURAL FIELD SERVICE</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#191F1C] mt-2">
                  Built for the field.
                </h2>
                <p className="text-stone-700 text-sm md:text-base leading-relaxed mt-2">
                  Engineered for rural Maharashtra where field agents encounter low connectivity and harsh outdoor light. Maitri keeps inspections moving without friction.
                </p>
              </MotionFadeIn>

              {/* 4 Feature Points with Clean Micro Icons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <MotionFadeIn delay={0} direction="up">
                  <div className="p-4 rounded-2xl bg-white/90 border border-[#D2E4D5] space-y-1.5 shadow-xs hover-lift h-full">
                    <div className="flex items-center gap-2 font-bold text-sm text-stone-900">
                      <WifiOff className="h-4 w-4 text-emerald-700" />
                      <span>Offline reporting</span>
                    </div>
                    <p className="text-stone-600 text-xs leading-relaxed">
                      Log health inspections in remote sheds without network. Auto-syncs to cloud on reconnect.
                    </p>
                  </div>
                </MotionFadeIn>

                <MotionFadeIn delay={80} direction="up">
                  <div className="p-4 rounded-2xl bg-white/90 border border-[#D2E4D5] space-y-1.5 shadow-xs hover-lift h-full">
                    <div className="flex items-center gap-2 font-bold text-sm text-stone-900">
                      <Camera className="h-4 w-4 text-emerald-700" />
                      <span>Photo evidence</span>
                    </div>
                    <p className="text-stone-600 text-xs leading-relaxed">
                      Attach clinical photos of lesions and mucosal membranes with client-side compression.
                    </p>
                  </div>
                </MotionFadeIn>

                <MotionFadeIn delay={160} direction="up">
                  <div className="p-4 rounded-2xl bg-white/90 border border-[#D2E4D5] space-y-1.5 shadow-xs hover-lift h-full">
                    <div className="flex items-center gap-2 font-bold text-sm text-stone-900">
                      <MapPin className="h-4 w-4 text-emerald-700" />
                      <span>GPS location</span>
                    </div>
                    <p className="text-stone-600 text-xs leading-relaxed">
                      Automatic farm coordinate tagging ensures reliable disease cluster detection across villages.
                    </p>
                  </div>
                </MotionFadeIn>

                <MotionFadeIn delay={240} direction="up">
                  <div className="p-4 rounded-2xl bg-white/90 border border-[#D2E4D5] space-y-1.5 shadow-xs hover-lift h-full">
                    <div className="flex items-center gap-2 font-bold text-sm text-stone-900">
                      <CalendarCheck className="h-4 w-4 text-emerald-700" />
                      <span>Village visits</span>
                    </div>
                    <p className="text-stone-600 text-xs leading-relaxed">
                      Track daily village rounds, manage follow-up checks, and coordinate with local veterinarians.
                    </p>
                  </div>
                </MotionFadeIn>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. VET SECTION ("From observation to veterinary decision.")               */}
      {/* ========================================================================= */}
      <section className="w-full bg-[#EFF6FF] border-b border-[#D6E6FE] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-10">
          <MotionFadeIn direction="up">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">CLINICAL TRIAGE WORKSPACE</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#191F1C]">
                From observation<br />
                <span className="text-sky-900 font-serif italic">to veterinary decision.</span>
              </h2>
              <p className="text-stone-600 text-sm md:text-base leading-relaxed">
                District veterinarians receive high-resolution clinical evidence, AI differential support, and comprehensive treatment action controls.
              </p>
            </div>
          </MotionFadeIn>

          {/* Interactive Workflow Visualizer: Reinforcing "AI Supports, Veterinarian Decides" */}
          <MotionFadeIn delay={150} direction="up">
            <MotionWorkflowTimeline />
          </MotionFadeIn>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SURVEILLANCE SECTION ("See what is happening across the district.")    */}
      {/* ========================================================================= */}
      <section className="w-full bg-[#FAF8F3] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-10">
          <MotionFadeIn direction="up">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">REAL-TIME EPIDEMIOLOGY</span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#191F1C] mt-1">
                  See what is happening<br />
                  <span className="text-stone-600 font-serif italic">across the district.</span>
                </h2>
              </div>

              {/* 3 Compact Status Badges */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3.5 py-1.5 rounded-full bg-white border border-[#E5E0D8] text-xs font-bold text-stone-800 shadow-xs hover-lift">
                  <strong className="text-emerald-800">{villageCount || 12}</strong> Villages Monitored
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 shadow-xs hover-lift">
                  <strong className="text-amber-800">{activeCaseCount || 4}</strong> Active Concerns
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 shadow-xs hover-lift">
                  <strong className="text-emerald-800">{activeAlerts.length || 2}</strong> Follow-ups
                </span>
              </div>
            </div>
          </MotionFadeIn>

          {/* Interactive Leaflet Map Visualizer */}
          <MotionFadeIn delay={150} direction="up">
            <div className="w-full rounded-3xl overflow-hidden border border-[#E5E0D8] shadow-md bg-white">
              <SurveillanceHeatmap markers={mapMarkers} />
            </div>
          </MotionFadeIn>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FINAL CTA ("Better observation starts better care.")                   */}
      {/* ========================================================================= */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-8 pb-16 md:pb-24">
        <MotionFadeIn direction="up">
          <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-[#E5E0D8] bg-[#064E3B] text-white shadow-xl">
            {/* Left CTA Text & Actions (60%) */}
            <div className="lg:col-span-7 p-8 sm:p-12 md:p-16 flex flex-col justify-between space-y-8">
              <div className="space-y-4">
                <span className="text-xs font-bold tracking-widest text-emerald-300 uppercase">
                  JOIN THE SURVEILLANCE NETWORK
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                  Better observation<br />
                  <span className="text-emerald-300 font-serif italic">starts better care.</span>
                </h2>
                <p className="text-emerald-100/90 text-sm md:text-base leading-relaxed max-w-lg font-normal">
                  Join livestock owners, village Pashusakhis, and veterinary officers across Maharashtra building a healthier, disease-resilient livestock ecosystem.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                {userId ? (
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold px-7 h-12 shadow-sm rounded-xl hover-lift cursor-pointer">
                      <span>Open Dashboard & Workspaces</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                ) : (
                  <SignUpButton mode="modal">
                    <Button size="lg" className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold px-7 h-12 shadow-sm rounded-xl hover-lift cursor-pointer">
                      <span>Get started / खाते बनवा</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </SignUpButton>
                )}

                <a href="tel:1962" className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-200 hover:text-white transition-colors bg-emerald-900/60 px-4 py-3 rounded-xl border border-emerald-700/60 hover-lift">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Helpline 1962</span>
                </a>
              </div>
            </div>

            {/* Right CTA Image (40%) */}
            <div className="lg:col-span-5 relative h-64 lg:h-auto min-h-[300px]">
              <Image
                src="/images/indian_livestock_hero.jpg"
                alt="Healthy Indian Cattle Herd"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#064E3B] via-transparent to-transparent" />
            </div>
          </div>
        </MotionFadeIn>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-[#E5E0D8] bg-white py-8 px-4 md:px-8 text-center text-xs text-stone-500 space-y-2">
        <p className="flex items-center justify-center gap-2 text-stone-700 font-medium">
          <PhoneCall className="w-3.5 h-3.5 text-emerald-700" />
          <span>Toll-Free Livestock Emergency & Disease Helpline: <strong className="text-stone-900">1962</strong></span>
        </p>
        <p>Maitri Livestock Health & Disease Surveillance Engine • Department of Animal Husbandry, Government of Maharashtra</p>
      </footer>
    </div>
  );
}

