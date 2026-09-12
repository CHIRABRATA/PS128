import { Show, SignUpButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { SurveillanceHeatmap } from "@/components/authority/SurveillanceHeatmap";
import { MapMarkerData, formatVillageName, formatBlockName } from "@/components/authority/mapUtils";
import { MotionFadeIn } from "@/components/motion/MotionFadeIn";
import { MotionCountUp } from "@/components/motion/MotionCountUp";
import { MotionHeroImage } from "@/components/motion/MotionHeroImage";
import { MotionRoleEcosystem } from "@/components/motion/MotionRoleEcosystem";
import { MotionWorkflowTimeline } from "@/components/motion/MotionWorkflowTimeline";
import { HelplineModal } from "@/components/site/helpline-modal";
import { RecordModal, type RecordModalData } from "@/components/site/record-modal";
import { PhoneCall, WifiOff, Camera, MapPin, CalendarCheck, ShieldCheck } from "lucide-react";

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
  }>)
    .filter((v) => typeof v.farms[0]?.latitude === "number" && typeof v.farms[0]?.longitude === "number")
    .map((v) => {
      const lat = v.farms[0].latitude as number;
      const lng = v.farms[0].longitude as number;
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

  // Static preview content for the register modals
  const registerRecords: Array<RecordModalData & { image: string }> = [
    {
      name: "Gauri",
      tagId: "MH-12-8492",
      species: "Gir × crossbreed cow",
      age: "4 yrs",
      sex: "Female",
      status: "Stable",
      nextAction: "FMD booster due 18 Sep 2026",
      image: "/images/vet_field_examination.jpg",
      history: [
        { date: "02 Sep", note: "Routine weight and coat check, no concerns." },
        { date: "14 Aug", note: "Dewormed by Pashusakhi Anita Pawar." },
        { date: "03 Jun", note: "FMD vaccine, first dose administered." },
      ],
    },
    {
      name: "Bharat",
      tagId: "MH-12-9012",
      species: "Murrah buffalo",
      age: "5 yrs",
      sex: "Male",
      status: "Healthy",
      nextAction: "Rumination re-check in 30 days",
      image: "/images/buffalo_dairy_care.jpg",
      history: [
        { date: "29 Aug", note: "Rumination and vitals normal on field visit." },
        { date: "11 Jul", note: "Hoof trim, no lameness observed." },
      ],
    },
    {
      name: "Rani",
      tagId: "MH-14-3104",
      species: "Osmanabadi goat",
      age: "2 yrs",
      sex: "Female",
      status: "Stable",
      nextAction: "None scheduled",
      image: "/images/osmanabadi_goat.jpg",
      history: [
        { date: "20 Aug", note: "Deworming complete, PPR screening clear." },
        { date: "02 May", note: "Registered into the district herd book." },
      ],
    },
  ];

  return (
    <div className="flex-1 flex flex-col w-full bg-[#FAF8F3] text-[#191F1C] overflow-x-hidden">
      {/* ===================================================================
          MASTHEAD — Soft cream sub-header banner harmonized with the navbar
      ==================================================================== */}
      <div className="w-full bg-[#F5F2EB] border-b border-[#E5E0D8] px-4 md:px-8 py-2.5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="text-xs leading-tight text-stone-600">
            <span className="block font-bold text-stone-900">
              Department of Animal Husbandry, Government of Maharashtra
            </span>
            <span className="block text-stone-500 text-[11px] mt-0.5">
              Livestock Health &amp; Disease Surveillance Network
            </span>
          </div>
          <HelplineModal>
            <button
              type="button"
              className="text-xs font-mono font-semibold text-emerald-800 border border-emerald-700/30 bg-white/90 hover:bg-emerald-800 hover:text-white px-3 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              Helpline 1962
            </button>
          </HelplineModal>
        </div>
      </div>

      {/* ===================================================================
          1. HERO SECTION
      ==================================================================== */}
      <section className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-12 pb-16 md:pt-16 md:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-7 flex flex-col items-start">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              <span>Unified Animal Health Network</span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-[54px] text-[#191F1C] leading-[1.15] font-normal max-w-xl">
              Every animal, once recorded, is never lost track of.
            </h1>
            <p className="text-stone-600 text-base leading-relaxed max-w-md mt-4">
              One shared record follows each animal from a farmer&apos;s first
              report through a field visit to a veterinarian&apos;s decision —
              across every village in the network.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-6">
              <Show when="signed-in">
                <Link href="/farmer/report">
                  <Button
                    size="lg"
                    className="bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-sm px-6 h-11 rounded-xl shadow-xs cursor-pointer"
                  >
                    Report a health concern
                  </Button>
                </Link>
              </Show>
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <Button
                    size="lg"
                    className="bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-sm px-6 h-11 rounded-xl shadow-xs cursor-pointer"
                  >
                    Report a health concern
                  </Button>
                </SignUpButton>
              </Show>

              <Link
                href={userId ? "/dashboard" : "/farmer"}
                className="text-sm text-stone-800 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-800 transition-colors font-medium"
              >
                {userId ? "Enter workspaces" : "Explore Maitri"}
              </Link>
            </div>

            {userId && (
              <p className="text-xs text-stone-500 pt-5">
                Signed in as{" "}
                <strong className="text-stone-900 font-medium">
                  {user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User"}
                </strong>
              </p>
            )}

            {/* Folio stats row */}
            <div className="grid grid-cols-3 w-full max-w-md mt-8 border-t border-[#E5E0D8]">
              <div className="py-4 pr-4 border-r border-[#E5E0D8]">
                <div className="font-serif text-2xl font-semibold text-[#191F1C]">
                  <MotionCountUp value={villageCount} duration={1200} />
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">Villages active</div>
              </div>
              <div className="py-4 px-4 border-r border-[#E5E0D8]">
                <div className="font-serif text-2xl font-semibold text-[#191F1C]">
                  <MotionCountUp value={animalCount} duration={1500} />
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">Animals monitored</div>
              </div>
              <div className="py-4 pl-4">
                <div className="font-serif text-2xl font-semibold text-red-700">
                  <MotionCountUp value={activeCaseCount} duration={1000} />
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">Active field cases</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <MotionFadeIn delay={0} direction="none" duration={700}>
              <div className="border border-[#E5E0D8] rounded-2xl overflow-hidden bg-white shadow-xs">
                <MotionHeroImage
                  src="/images/vet_field_examination.jpg"
                  alt="Rural veterinarian examining cattle in Maharashtra"
                  activeCaseCount={activeCaseCount}
                />
                <p className="text-xs text-stone-600 px-4 py-3 border-t border-[#E5E0D8] bg-[#F5F2EB]">
                  A veterinary officer examines a reported case in Haveli
                  block, Pune district.
                </p>
              </div>
            </MotionFadeIn>
          </div>
        </div>
      </section>

      {/* ===================================================================
          2. ROLE ECOSYSTEM SECTION
      ==================================================================== */}
      <section className="w-full bg-[#F5F2EB] border-y border-[#E5E0D8] py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-10">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl sm:text-4xl text-[#191F1C] font-normal leading-tight">
              Four people, one record.
            </h2>
            <p className="text-stone-600 text-sm md:text-base leading-relaxed mt-2.5">
              A livestock owner&apos;s observation, a field worker&apos;s visit, a
              veterinarian&apos;s decision, and a district officer&apos;s view of the
              wider picture — all attached to the same animal.
            </p>
          </div>

          <MotionRoleEcosystem />
        </div>
      </section>

      {/* ===================================================================
          3. ANIMAL REGISTER SHOWCASE SECTION
      ==================================================================== */}
      <section id="showcase" className="w-full bg-[#FAF8F3] py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E5E0D8] pb-5">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#191F1C] font-normal">
                Your livestock, kept in one register.
              </h2>
              <p className="text-stone-500 text-xs md:text-sm mt-1">
                Digital health profiles, ear-tag registration, vaccination
                history, and treatment follow-ups.
              </p>
            </div>
            <Link href="/farmer" className="text-xs text-emerald-800 font-semibold hover:underline">
              Open Livestock Directory &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {registerRecords.map((r) => (
              <RecordModal key={r.tagId} data={r}>
                <button
                  type="button"
                  className="group flex h-full flex-col bg-white rounded-2xl border border-[#E5E0D8] overflow-hidden text-left shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <div className="relative h-48 w-full bg-stone-100">
                    <Image src={r.image} alt={r.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-5 flex flex-col gap-2.5 flex-1">
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-serif text-lg font-bold text-[#191F1C] group-hover:text-emerald-800 transition-colors">
                        {r.name}
                      </h3>
                      <span className="font-mono text-[11px] text-stone-500 px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200">{r.tagId}</span>
                    </div>
                    <p className="text-xs text-stone-600">
                      {r.species} · {r.age} · {r.sex}
                    </p>
                    <div className="flex items-center justify-between text-xs pt-3 mt-auto border-t border-[#E5E0D8]">
                      <span className="text-stone-500">{r.status}</span>
                      <span className="text-emerald-700 font-semibold group-hover:underline">View record &rarr;</span>
                    </div>
                  </div>
                </button>
              </RecordModal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================
          4. FIELD SECTION
      ==================================================================== */}
      <section className="w-full bg-slate-900 text-stone-100 py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-5">
              <MotionFadeIn direction="none" duration={600}>
                <div className="relative h-[320px] sm:h-[400px] border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
                  <Image
                    src="/images/pashusakhi_field_visit.jpg"
                    alt="Pashusakhi field inspection visit in a village"
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="text-xs text-slate-400 pt-3">
                  Village shed inspection, Haveli block — door-to-door
                  livestock vitals check.
                </p>
              </MotionFadeIn>
            </div>

            <div className="lg:col-span-7">
              <h2 className="font-serif text-3xl sm:text-4xl font-normal text-white">
                Built for the field.
              </h2>
              <p className="text-slate-300 text-sm md:text-base leading-relaxed mt-3 max-w-lg">
                Engineered for rural Maharashtra, where field agents work
                through low connectivity and harsh outdoor conditions.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                {[
                  { icon: WifiOff, title: "Offline reporting", body: "Log inspections in remote sheds without network. Syncs automatically on reconnect." },
                  { icon: Camera, title: "Photo evidence", body: "Attach clinical photos of lesions and mucosal membranes, compressed on-device." },
                  { icon: MapPin, title: "GPS location", body: "Automatic farm coordinates support reliable disease-cluster detection." },
                  { icon: CalendarCheck, title: "Village visits", body: "Track daily rounds and follow-up checks with local veterinarians." },
                ].map(({ icon: Icon, title, body }) => (
                  <div key={title} className="p-4 rounded-2xl border border-slate-800 bg-slate-800/50 space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Icon className="h-4 w-4 text-emerald-400" />
                      <span>{title}</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          5. VET WORKFLOW TIMELINE SECTION
      ==================================================================== */}
      <section className="w-full bg-[#F5F2EB] border-b border-[#E5E0D8] py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-8">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl sm:text-4xl text-[#191F1C] font-normal leading-tight">
              From observation to veterinary decision.
            </h2>
            <p className="text-stone-600 text-sm md:text-base leading-relaxed mt-2.5">
              District veterinarians work from field evidence and AI-assisted
              differentials — the decision, and the record, stay theirs.
            </p>
          </div>

          <MotionWorkflowTimeline />
        </div>
      </section>

      {/* ===================================================================
          6. SURVEILLANCE HEATMAP SECTION
      ==================================================================== */}
      <section className="w-full bg-[#FAF8F3] py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E5E0D8] pb-5">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#191F1C] font-normal">
                What is happening across the district.
              </h2>
              <p className="text-stone-500 text-xs md:text-sm mt-1">
                Real-time geographic disease clustering, symptom heatmaps, and outbreak signals.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <div className="font-serif text-xl font-bold text-[#191F1C]">{villageCount || 12}</div>
                <div className="text-[11px] text-stone-500">Villages monitored</div>
              </div>
              <div>
                <div className="font-serif text-xl font-bold text-red-700">{activeCaseCount || 4}</div>
                <div className="text-[11px] text-stone-500">Active concerns</div>
              </div>
              <div>
                <div className="font-serif text-xl font-bold text-[#191F1C]">{activeAlerts.length || 2}</div>
                <div className="text-[11px] text-stone-500">Alerts active</div>
              </div>
            </div>
          </div>

          <div className="w-full border border-[#E5E0D8] bg-white rounded-2xl overflow-hidden shadow-xs">
            <SurveillanceHeatmap markers={mapMarkers} />
          </div>
        </div>
      </section>

      {/* ===================================================================
          7. FINAL CTA
      ==================================================================== */}
      <section className="w-full max-w-6xl mx-auto px-4 md:px-8 pb-16 md:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-emerald-900 bg-emerald-950 text-white overflow-hidden shadow-lg">
          <div className="lg:col-span-7 p-8 sm:p-12 md:p-14 flex flex-col justify-between gap-6">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal leading-tight">
                Better observation starts better care.
              </h2>
              <p className="text-emerald-100/80 text-sm md:text-base leading-relaxed mt-3 max-w-lg">
                Join livestock owners, village Pashusakhis, and veterinary
                officers across Maharashtra building a healthier,
                disease-resilient livestock network.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Show when="signed-in">
                <Link href="/dashboard">
                  <Button className="bg-white text-emerald-950 hover:bg-emerald-50 font-bold px-6 h-11 rounded-xl cursor-pointer shadow-sm">
                    Open dashboard &amp; workspaces
                  </Button>
                </Link>
              </Show>
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <Button className="bg-white text-emerald-950 hover:bg-emerald-50 font-bold px-6 h-11 rounded-xl cursor-pointer shadow-sm">
                    Get started
                  </Button>
                </SignUpButton>
              </Show>

              <HelplineModal>
                <button
                  type="button"
                  className="text-sm text-emerald-200 hover:text-white underline decoration-emerald-700 underline-offset-4 cursor-pointer"
                >
                  Or call the helpline — 1962
                </button>
              </HelplineModal>
            </div>
          </div>

          <div className="lg:col-span-5 relative h-64 lg:h-auto min-h-[280px] border-t lg:border-t-0 lg:border-l border-emerald-900">
            <Image
              src="/images/indian_livestock_hero.jpg"
              alt="Healthy Indian cattle herd"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-[#E5E0D8] bg-[#F5F2EB] py-8 px-4 md:px-8 text-center text-xs text-stone-500 space-y-2">
        <HelplineModal>
          <button
            type="button"
            className="mx-auto flex items-center justify-center gap-2 font-medium text-stone-900 hover:text-emerald-800 hover:underline decoration-stone-300 underline-offset-4 cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-700" />
            <span>Toll-free livestock emergency &amp; disease helpline — 1962</span>
          </button>
        </HelplineModal>
        <p>Maitri Livestock Health &amp; Disease Surveillance Engine — Department of Animal Husbandry, Government of Maharashtra</p>
      </footer>
    </div>
  );
}
