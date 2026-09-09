import { requireDistrictAuthority } from "@/lib/auth/permissions";
import { listPendingApprovals } from "@/lib/actions/authority";
import { ApprovalButtons } from "../ApprovalButtons";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Clock, MapPin } from "lucide-react";

export default async function AuthorityApprovalsPage() {
  await requireDistrictAuthority();
  const pendingApprovals = await listPendingApprovals();

  return (
    <div className="space-y-6 text-[#191F1C]">
      <div>
        <h1 className="text-2xl font-bold text-[#191F1C] tracking-tight">प्रलंबित पद मंजुऱ्या | Credential Approvals</h1>
        <p className="text-stone-500 text-xs mt-1">
          पशुसखी, पशुवैद्यक व क्षेत्रीय कर्मचाऱ्यांच्या कार्यकक्षेची अधिकृत पडताळणी.
        </p>
      </div>

      <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between bg-[#FAF8F3] border-b border-[#E5E0D8]">
          <div>
            <CardTitle className="text-base text-[#191F1C] flex items-center gap-2 font-bold">
              <UserCheck className="h-5 w-5 text-amber-600" />
              <span>पडताळणी प्रलंबित खाती ({pendingApprovals.length})</span>
            </CardTitle>
            <CardDescription className="text-xs text-stone-500">
              खात्याची खात्री करून अधिकृत भूमिका मंजूर (Approve) किंवा नामंजूर (Reject) करा.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500 bg-[#FAF8F3] rounded-2xl border border-[#E5E0D8]">
              सध्या या जिल्ह्यात कोणतीही पडताळणी प्रलंबित नाही.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((user) => (
                <div
                  key={user.id}
                  className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-[#191F1C] text-sm">{user.name}</h4>
                      <Badge variant="secondary" className="text-[10px] bg-white text-stone-700 border-[#D9D3C7]">
                        {user.role}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
                      <span>फोन: <strong className="text-[#191F1C]">{user.phone}</strong></span>
                      <span className="flex items-center gap-1 text-emerald-800 font-medium">
                        <MapPin className="h-3 w-3" />
                        {user.district?.name || "Assigned District"}
                        {user.block && ` • ${user.block.name}`}
                      </span>
                      <span className="flex items-center gap-1 text-stone-500 font-mono">
                        <Clock className="h-3 w-3" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <ApprovalButtons userId={user.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
