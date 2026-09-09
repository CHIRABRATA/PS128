import { requireDistrictAuthority } from "@/lib/auth/permissions";
import { getDistrictAlertsAction } from "@/lib/actions/authority";
import { AlertsList } from "@/components/authority/AlertsList";
import { AlertWithLocation } from "@/components/authority/AlertsList";

export default async function AuthorityAlertsPage() {
  await requireDistrictAuthority();
  const alerts = await getDistrictAlertsAction();

  return (
    <div className="space-y-6 text-[#191F1C]">
      <div>
        <h1 className="text-2xl font-bold text-[#191F1C] tracking-tight">जिल्हा रोग प्रादुर्भाव सूचना | Outbreak Surveillance</h1>
        <p className="text-stone-500 text-xs mt-1">
          गावांमध्ये अल्प कालावधीत उद्भवणारे रोग क्लस्टर्स आणि सक्रिय प्रादुर्भाव सूचना.
        </p>
      </div>

      <AlertsList alerts={alerts as unknown as AlertWithLocation[]} />
    </div>
  );
}
