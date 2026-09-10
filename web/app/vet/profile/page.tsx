import Link from "next/link";
import { requireVeterinarian } from "@/lib/auth/permissions";
import { getVetProfileAction } from "@/lib/actions/vet";
import { getDistricts } from "@/lib/actions/geo";
import { VetProfileView } from "@/components/vet/VetProfileView";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Stethoscope } from "lucide-react";

export const metadata = {
  title: "My Profile — Veterinary Portal | Maitri",
  description: "View and edit your veterinarian profile, registered service jurisdiction, contact details, and clinical activity.",
};

export default async function VetProfilePage() {
  await requireVeterinarian();

  const [profile, districts] = await Promise.all([
    getVetProfileAction(),
    getDistricts(),
  ]);

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full gap-6 text-[#191F1C]">
      {/* Top Breadcrumb & Page Header */}
      <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wide">
            <Stethoscope className="h-3.5 w-3.5" />
            <span>VETERINARY CLINICAL ACCOUNT & SERVICE AREA</span>
          </div>
          <h1 className="text-2xl font-bold text-[#191F1C] tracking-tight mt-1">
            My Profile
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage your personal contact information, preferred language, and clinical service territory.
          </p>
        </div>

        <Link href="/vet">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-[#D9D3C7] text-stone-700 hover:bg-white rounded-xl min-h-[38px] shadow-2xs hover-lift-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Triage Queue</span>
          </Button>
        </Link>
      </div>

      <VetProfileView
        initialProfile={profile}
        districts={districts.map((d) => ({ id: d.id, name: d.name }))}
      />
    </div>
  );
}
