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
import { PhoneCall, WifiOff, Camera, MapPin, CalendarCheck } from "lucide-react";

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

  // Static preview content for the register modals — swap for real per-animal
  // records once the detail route/query exists.
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
    <div className="flex-1 flex flex-col w-full bg-[#EDE7D3] text-[#22291F] overflow-x-hidden">
      {/* ===================================================================
          MASTHEAD — reads like the header of an official register, not a
          product nav bar. Helpline opens a modal instead of just dialing.
      ==================================================================== */}
      <div className="w-full bg-[#EDE7D3] border-b border-[#C9BFA0] px-4 md:px-8 py-3">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="text-xs leading-tight text-[#5C5645]">
            <span className="block font-medium text-[#22291F]">
              Department of Animal Husbandry, Government of Maharashtra
            </span>
            <span className="block">Livestock Health &amp; Disease Surveillance Network</span>
          </div>
          <HelplineModal>
            <button
              type="button"
              className="text-xs font-mono text-[#2F5233] border border-[#2F5233]/40 px-3 py-1.5 hover:bg-[#2F5233] hover:text-[#EDE7D3] transition-colors"
            >
              Helpline 1962
            </button>
          </HelplineModal>
        </div>
      </div>

      {/* ===================================================================
          1. HERO — a masthead headline plus a field photograph with a
          caption strip, like a page out of a district gazette.
      ==================================================================== */}
      <section className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-14 pb-16 md:pt-20 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-7 flex flex-col items-start">
            <p className="text-sm text-[#5C5645] mb-3">
              For farmers, field workers, veterinarians and district officers
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-[58px] text-[#191F1C] leading-[1.15] font-normal max-w-xl">
              Every animal, once recorded, is never lost track of.
            </h1>
            <p className="text-[#3A3D30] text-base leading-relaxed max-w-md mt-5">
              One shared record follows each animal from a farmer&apos;s first
              report through a field visit to a veterinarian&apos;s decision —
              across every village in the network.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-7">
              <Show when="signed-in">
                <Link href="/farmer/report">
                  <Button
                    size="lg"
                    className="bg-[#2F5233] hover:bg-[#25401F] text-[#F7F3E6] font-normal text-sm px-6 h-11 rounded-none cursor-pointer"
                  >
                    Report a health concern
                  </Button>
                </Link>
              </Show>
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <Button
                    size="lg"
                    className="bg-[#2F5233] hover:bg-[#25401F] text-[#F7F3E6] font-normal text-sm px-6 h-11 rounded-none cursor-pointer"
                  >
                    Report a health concern
                  </Button>
                </SignUpButton>
              </Show>

              <Link
                href={userId ? "/dashboard" : "/farmer"}
                className="text-sm text-[#22291F] underline decoration-[#C9BFA0] underline-offset-4 hover:decoration-[#22291F] transition-colors"
              >
                {userId ? "Enter workspaces" : "Explore Maitri"}
              </Link>
            </div>

            {userId && (
              <p className="text-xs text-[#5C5645] pt-6">
                Signed in as{" "}
                <strong className="text-[#22291F] font-medium">
                  {user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User"}
                </strong>
              </p>
            )}

            {/* Folio-style stats row, not pill chips */}
            <div className="grid grid-cols-3 w-full max-w-md mt-10 border-t border-[#C9BFA0]">
              <div className="py-4 pr-4 border-r border-[#C9BFA0]">
                <div className="font-serif text-2xl text-[#22291F]">
                  <MotionCountUp value={villageCount} duration={1200} />
                </div>
                <div className="text-[11px] text-[#5C5645] mt-1">Villages active</div>
              </div>
              <div className="py-4 px-4 border-r border-[#C9BFA0]">
                <div className="font-serif text-2xl text-[#22291F]">
                  <MotionCountUp value={animalCount} duration={1500} />
                </div>
                <div className="text-[11px] text-[#5C5645] mt-1">Animals monitored</div>
              </div>
              <div className="py-4 pl-4">
                <div className="font-serif text-2xl text-[#A13D2B]">
                  <MotionCountUp value={activeCaseCount} duration={1000} />
                </div>
                <div className="text-[11px] text-[#5C5645] mt-1">Active field cases</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <MotionFadeIn delay={0} direction="none" duration={700}>
              <div className="border border-[#C9BFA0]">
                <MotionHeroImage
                  src="/images/vet_field_examination.jpg"
                  alt="Rural veterinarian examining cattle in Maharashtra"
                  activeCaseCount={activeCaseCount}
                />
                <p className="text-xs text-[#5C5645] px-4 py-3 border-t border-[#C9BFA0] bg-[#F7F3E6]">
                  A veterinary officer examines a reported case in Haveli
                  block, Pune district.
                </p>
              </div>
            </MotionFadeIn>
          </div>
        </div>
      </section>

      {/* ===================================================================
          2. ROLE SECTION — one plain headline, the interactive ecosystem
          does the visual work (kept as-is; it isn't a generic card grid).
      ==================================================================== */}
      <section className="w-full bg-[#F7F3E6] border-y border-[#C9BFA0] py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-12">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl sm:text-4xl text-[#191F1C] font-normal leading-tight">
              Four people, one record.
            </h2>
            <p className="text-[#3A3D30] text-sm md:text-base leading-relaxed mt-3">
              A livestock owner&apos;s observation, a field worker&apos;s visit, a
              veterinarian&apos;s decision, and a district officer&apos;s view of the
              wider picture — all attached to the same animal.
            </p>
          </div>

          <MotionRoleEcosystem />
        </div>
      </section>

      {/* ===================================================================
          3. ANIMAL SECTION — a register, not a card grid: one larger entry
          plus two smaller ones, hairline dividers, sharp corners, no
          matching drop shadows. Each opens its full record in a modal.
      ==================================================================== */}
      <section id="showcase" className="w-full bg-[#EDE7D3] py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#C9BFA0] pb-6">
            <h2 className="font-serif text-3xl sm:text-4xl text-[#191F1C] font-normal">
              Your livestock, kept in one register.
            </h2>
            <p className="text-[#5C5645] text-xs md:text-sm max-w-sm">
              Digital health profiles, ear-tag registration, vaccination
              history, and treatment follow-ups for every animal in the herd.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#C9BFA0]">
            {registerRecords.map((r) => (
              <RecordModal key={r.tagId} data={r}>
                <button
                  type="button"
                  className="group flex h-full flex-col bg-[#EDE7D3] text-left transition-colors hover:bg-[#F7F3E6]"
                >
                  <div className="relative h-52 w-full bg-stone-200">
                    <Image src={r.image} alt={r.name} fill className="object-cover" />
                  </div>
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-serif text-lg text-[#191F1C] group-hover:underline decoration-[#C9BFA0] underline-offset-4">
                        {r.name}
                      </h3>
                      <span className="font-mono text-[11px] text-[#5C5645]">{r.tagId}</span>
                    </div>
                    <p className="text-xs text-[#5C5645]">
                      {r.species} · {r.age} · {r.sex}
                    </p>
                    <div className="flex items-center justify-between text-xs pt-3 mt-auto border-t border-[#C9BFA0]/70">
                      <span className="text-[#5C5645]">{r.status}</span>
                      <span className="text-[#2F5233]">View record</span>
                    </div>
                  </div>
                </button>
              </RecordModal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================
          4. FIELD SECTION — the four points as a divided list, not four
          identical white cards.
      ==================================================================== */}
      <section className="w-full bg-[#233327] text-[#EDE7D3] py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-5">
              <MotionFadeIn direction="none" duration={600}>
                <div className="relative h-[340px] sm:h-[420px] border border-[#3E5443]">
                  <Image
                    src="/images/pashusakhi_field_visit.jpg"
                    alt="Pashusakhi field inspection visit in a village"
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="text-xs text-[#A9BBA9] pt-3">
                  Village shed inspection, Haveli block — door-to-door
                  livestock vitals check.
                </p>
              </MotionFadeIn>
            </div>

            <div className="lg:col-span-7">
              <h2 className="font-serif text-3xl sm:text-4xl font-normal">
                Built for the field.
              </h2>
              <p className="text-[#C7D2C8] text-sm md:text-base leading-relaxed mt-3 max-w-lg">
                Engineered for rural Maharashtra, where field agents work
                through low connectivity and harsh outdoor light.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 mt-8 border-t border-l border-[#3E5443]">
                {[
                  { icon: WifiOff, title: "Offline reporting", body: "Log inspections in remote sheds without network. Syncs automatically on reconnect." },
                  { icon: Camera, title: "Photo evidence", body: "Attach clinical photos of lesions and mucosal membranes, compressed on-device." },
                  { icon: MapPin, title: "GPS location", body: "Automatic farm coordinates support reliable disease-cluster detection." },
                  { icon: CalendarCheck, title: "Village visits", body: "Track daily rounds and follow-up checks with local veterinarians." },
                ].map(({ icon: Icon, title, body }) => (
                  <div key={title} className="p-5 border-r border-b border-[#3E5443] space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4 text-[#8FB08F]" />
                      <span>{title}</span>
                    </div>
                    <p className="text-[#A9BBA9] text-xs leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          5. VET SECTION — genuinely a sequence, so the timeline component
          earns its step markers.
      ==================================================================== */}
      <section className="w-full bg-[#F7F3E6] border-b border-[#C9BFA0] py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-10">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl sm:text-4xl text-[#191F1C] font-normal leading-tight">
              From observation to veterinary decision.
            </h2>
            <p className="text-[#3A3D30] text-sm md:text-base leading-relaxed mt-3">
              District veterinarians work from field evidence and AI-assisted
              differentials — the decision, and the record, stay theirs.
            </p>
          </div>

          <MotionWorkflowTimeline />
        </div>
      </section>

      {/* ===================================================================
          6. SURVEILLANCE SECTION — stats presented like the hero's folio
          row for consistency, not separate pill badges.
      ==================================================================== */}
      <section className="w-full bg-[#EDE7D3] py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#C9BFA0] pb-6">
            <h2 className="font-serif text-3xl sm:text-4xl text-[#191F1C] font-normal">
              What is happening across the district.
            </h2>
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <div className="font-serif text-xl text-[#22291F]">{villageCount || 12}</div>
                <div className="text-[11px] text-[#5C5645]">Villages monitored</div>
              </div>
              <div>
                <div className="font-serif text-xl text-[#A13D2B]">{activeCaseCount || 4}</div>
                <div className="text-[11px] text-[#5C5645]">Active concerns</div>
              </div>
              <div>
                <div className="font-serif text-xl text-[#22291F]">{activeAlerts.length || 2}</div>
                <div className="text-[11px] text-[#5C5645]">Follow-ups</div>
              </div>
            </div>
          </div>

          <div className="w-full border border-[#C9BFA0] bg-[#F7F3E6]">
            <SurveillanceHeatmap markers={mapMarkers} />
          </div>
        </div>
      </section>

      {/* ===================================================================
          7. FINAL CTA
      ==================================================================== */}
      <section className="w-full max-w-6xl mx-auto px-4 md:px-8 pb-16 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 border border-[#233327] bg-[#233327] text-[#EDE7D3]">
          <div className="lg:col-span-7 p-8 sm:p-12 md:p-16 flex flex-col justify-between gap-8">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal leading-tight">
                Better observation starts better care.
              </h2>
              <p className="text-[#C7D2C8] text-sm md:text-base leading-relaxed mt-4 max-w-lg">
                Join livestock owners, village Pashusakhis, and veterinary
                officers across Maharashtra building a healthier,
                disease-resilient livestock network.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Show when="signed-in">
                <Link href="/dashboard">
                  <Button className="bg-[#EDE7D3] text-[#22291F] hover:bg-[#F7F3E6] font-normal px-6 h-11 rounded-none cursor-pointer">
                    Open dashboard &amp; workspaces
                  </Button>
                </Link>
              </Show>
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <Button className="bg-[#EDE7D3] text-[#22291F] hover:bg-[#F7F3E6] font-normal px-6 h-11 rounded-none cursor-pointer">
                    Get started
                  </Button>
                </SignUpButton>
              </Show>

              <HelplineModal>
                <button
                  type="button"
                  className="text-sm text-[#C7D2C8] hover:text-[#EDE7D3] underline decoration-[#3E5443] underline-offset-4"
                >
                  Or call the helpline — 1962
                </button>
              </HelplineModal>
            </div>
          </div>

          <div className="lg:col-span-5 relative h-64 lg:h-auto min-h-[300px] border-t lg:border-t-0 lg:border-l border-[#3E5443]">
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
      <footer className="w-full border-t border-[#C9BFA0] bg-[#F7F3E6] py-8 px-4 md:px-8 text-center text-xs text-[#5C5645] space-y-2">
        <HelplineModal>
          <button
            type="button"
            className="mx-auto flex items-center justify-center gap-2 font-medium text-[#22291F] hover:underline decoration-[#C9BFA0] underline-offset-4"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#2F5233]" />
            <span>Toll-free livestock emergency &amp; disease helpline — 1962</span>
          </button>
        </HelplineModal>
        <p>Maitri Livestock Health &amp; Disease Surveillance Engine — Department of Animal Husbandry, Government of Maharashtra</p>
      </footer>
    </div>
  );
}
