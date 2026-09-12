import { requireDistrictAuthority } from "@/lib/auth/permissions";
import { AuthorityReportsClient } from "@/components/authority/AuthorityReportsClient";

export default async function AuthorityReportsPage() {
  const authority = await requireDistrictAuthority();
  const districtName = authority.district?.name || "Authorized District";

  return (
    <AuthorityReportsClient
      districtName={districtName}
    />
  );
}
