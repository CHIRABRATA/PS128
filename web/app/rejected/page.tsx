import { getCurrentAppUser } from "@/lib/auth/session";
import { SignOutButton } from "@clerk/nextjs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { XCircle, ShieldX, LogOut } from "lucide-react";

export default async function RejectedPage() {
  const appUser = await getCurrentAppUser();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-[#FAF8F3] text-[#191F1C] min-h-screen">
      <Card className="max-w-md w-full border-[#E5E0D8] bg-white text-center shadow-xs rounded-3xl overflow-hidden">
        <CardHeader className="flex flex-col items-center gap-3 bg-[#FAF8F3] border-b border-[#E5E0D8] pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 border border-red-200 text-red-600 shadow-2xs">
            <XCircle className="h-7 w-7" />
          </div>

          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 text-xs px-3 py-1">
            Access Rejected
          </Badge>

          <CardTitle className="text-xl font-bold text-[#191F1C]">Application Rejected</CardTitle>

          <CardDescription className="text-xs text-stone-600">
            Your role verification request on the Maitri platform has been rejected by the District Animal Husbandry Authority.
          </CardDescription>
        </CardHeader>

        {appUser && (
          <CardContent className="space-y-3 text-left pt-5">
            <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#E5E0D8] text-xs space-y-2 text-stone-600">
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">Applicant Name:</span>
                <span className="font-semibold text-[#191F1C]">{appUser.name}</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">Requested Role:</span>
                <span className="font-medium text-stone-700">{appUser.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Jurisdiction:</span>
                <span className="font-medium text-stone-700">
                  {appUser.district?.name || "Unassigned"}
                </span>
              </div>
            </div>

            <div className="bg-red-50/70 p-3.5 rounded-2xl border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
              <ShieldX className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-red-800">
                If you believe this was an error, please contact your District Animal Husbandry Officer with your professional licensing credentials.
              </p>
            </div>
          </CardContent>
        )}

        <CardFooter className="flex justify-center pt-4 pb-4 border-t border-[#E5E0D8]">
          <SignOutButton>
            <Button variant="secondary" size="sm" className="w-full gap-2 text-xs bg-[#FAF8F3] hover:bg-stone-200 border border-[#E5E0D8] text-stone-700 min-h-[40px]">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </SignOutButton>
        </CardFooter>
      </Card>
    </div>
  );
}
