import { getCurrentAppUser } from "@/lib/auth/session";
import { SignOutButton } from "@clerk/nextjs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ShieldAlert, LogOut, RefreshCw } from "lucide-react";
import Link from "next/link";

export default async function PendingApprovalPage() {
  const appUser = await getCurrentAppUser();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-[#FAF8F3] text-[#191F1C] min-h-screen">
      <Card className="max-w-md w-full border-[#E5E0D8] bg-white text-center shadow-xs rounded-3xl overflow-hidden">
        <CardHeader className="flex flex-col items-center gap-3 bg-[#FAF8F3] border-b border-[#E5E0D8] pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 shadow-2xs">
            <Clock className="h-7 w-7 animate-pulse" />
          </div>

          <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-200 text-xs px-3 py-1">
            पडताळणी प्रलंबित (Verification Pending)
          </Badge>

          <CardTitle className="text-xl font-bold text-[#191F1C]">खाते मंजुरीची प्रतीक्षा आहे</CardTitle>

          <CardDescription className="text-xs text-stone-600">
            आपली <strong className="text-[#191F1C]">{appUser?.role ? appUser.role.replace("_", " ") : "व्यावसायिक"}</strong> म्हणून नोंदणी पडताळणीसाठी जिल्हा पशुवैद्यकीय अधिकाऱ्यांकडे पाठवली आहे.
          </CardDescription>
        </CardHeader>

        {appUser && (
          <CardContent className="space-y-3 text-left pt-5">
            <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#E5E0D8] text-xs space-y-2">
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">अर्जदाराचे नाव:</span>
                <span className="font-semibold text-[#191F1C]">{appUser.name}</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">मोबाईल फोन:</span>
                <span className="font-medium text-stone-700">{appUser.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">नेमून दिलेली कार्यकक्षा:</span>
                <span className="font-medium text-emerald-800">
                  {appUser.district?.name || appUser.block?.name || appUser.village?.name || "Assigned District"}
                </span>
              </div>
            </div>

            <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-amber-900">
                <ShieldAlert className="h-4 w-4 text-amber-700" />
                <span>मंजुरी का आवश्यक आहे?</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                रोग प्रादुर्भाव डेटाच्या अचूकतेसाठी आणि सुरक्षिततेसाठी, पशुवैद्यकीय आणि फील्ड एजंट खात्यांची जिल्हा पशुसंवर्धन विभागाकडून पडताळणी केली जाते.
              </p>
            </div>
          </CardContent>
        )}

        <CardFooter className="flex flex-col sm:flex-row gap-2 justify-center pt-4 pb-4 border-t border-[#E5E0D8]">
          <Link href="/dashboard" className="w-full sm:w-auto flex-1">
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-[#D9D3C7] text-stone-700 hover:bg-[#FAF8F3] min-h-[40px]">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>स्थिती तपासा</span>
            </Button>
          </Link>

          <SignOutButton>
            <Button variant="secondary" size="sm" className="w-full sm:w-auto flex-1 gap-1.5 text-xs bg-[#FAF8F3] hover:bg-stone-200 border border-[#E5E0D8] text-stone-700 min-h-[40px]">
              <LogOut className="h-3.5 w-3.5" />
              <span>बाहेर पडा (Sign Out)</span>
            </Button>
          </SignOutButton>
        </CardFooter>
      </Card>
    </div>
  );
}
