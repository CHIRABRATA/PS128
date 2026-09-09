import Link from "next/link";
import { requireDistrictAuthority } from "@/lib/auth/permissions";
import {
  getAuthorityDashboardMetricsAction,
  getDistrictAlertsAction,
  getGeographicHierarchyAction,
  listPendingApprovals,
} from "@/lib/actions/authority";
import { AuthorityMetricsCards } from "@/components/authority/AuthorityMetricsCards";
import { SurveillanceHeatmap } from "@/components/authority/SurveillanceHeatmap";
import {
  MapMarkerData,
  isInternalIdentifier,
  formatVillageName,
  formatBlockName,
} from "@/components/authority/mapUtils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApprovalButtons } from "./ApprovalButtons";
import { AlertTriangle, BellRing, MapPin, ShieldCheck, UserCheck } from "lucide-react";

export default async function AuthorityDashboardPage() {
  const authority = await requireDistrictAuthority();

  const [metrics, alerts, hierarchy, pendingApprovals] = await Promise.all([
    getAuthorityDashboardMetricsAction(),
    getDistrictAlertsAction(),
    getGeographicHierarchyAction(),
    listPendingApprovals(),
  ]);

  // Transform geographic hierarchy data into map markers
  const mapMarkers: MapMarkerData[] = [];
  if (hierarchy.length > 0) {
    const district = hierarchy[0];
    district.blocks.forEach((block) => {
      block.villages.forEach((village) => {
        let totalCases = 0;
        let confirmedCount = 0;
        let highRiskCount = 0;
        const speciesBreakdown = { cow: 0, buffalo: 0, goat: 0, other: 0 };
        let latestDate: Date | null = null;

        village.farms.forEach((farm) => {
          farm.herds.forEach((herd) => {
            herd.animals.forEach((animal) => {
              const sp = animal.species.toLowerCase();
              if (sp.includes("cow") || sp.includes("गाय")) speciesBreakdown.cow++;
              else if (sp.includes("buffalo") || sp.includes("म्हैस")) speciesBreakdown.buffalo++;
              else if (sp.includes("goat") || sp.includes("शेळी")) speciesBreakdown.goat++;
              else speciesBreakdown.other++;

              animal.cases.forEach((c) => {
                totalCases++;
                if (c.status === "CONFIRMED") confirmedCount++;
                if (c.status === "UNDER_EXAMINATION" || c.status === "PENDING_REVIEW") highRiskCount++;
                if (!latestDate || new Date(c.reportedAt) > latestDate) {
                  latestDate = new Date(c.reportedAt);
                }
              });
            });
          });
        });

        const activeAlert = village.alerts.length > 0;
        const diseaseName = activeAlert ? village.alerts[0].diseaseName : null;

        const sampleFarm = village.farms[0];
        const lat = sampleFarm ? sampleFarm.latitude : 18.5793;
        const lng = sampleFarm ? sampleFarm.longitude : 73.9806;

        const cleanBlock = formatBlockName(block.name);
        const cleanVillage = formatVillageName(village.name, cleanBlock);

        mapMarkers.push({
          id: village.id,
          name: cleanVillage,
          blockName: cleanBlock,
          lat,
          lng,
          activeAlert,
          diseaseName,
          caseCount: totalCases,
          highRiskCount,
          confirmedCount,
          speciesBreakdown,
          lastReportedDate: latestDate ? (latestDate as Date).toISOString() : null,
        });
      });
    });
  }

  const activeAlerts = alerts.filter((a) => a.active);
  const rawDistrictName = authority.district?.name;
  const districtName = !rawDistrictName || isInternalIdentifier(rawDistrictName) ? "पुणे जिल्हा (Pune District)" : rawDistrictName;

  return (
    <div className="space-y-6 text-[#191F1C]">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#191F1C] tracking-tight">
              {districtName} • रोग नियंत्रण केंद्र
            </h1>
            <Badge className="bg-purple-50 text-purple-900 border-purple-200 text-[10px]">
              District Surveillance Cockpit
            </Badge>
          </div>
          <p className="text-stone-600 text-xs mt-1">
            लोकसंख्या-पातळीवरील रोग प्रादुर्भाव देखरेख, गाव-क्लस्टर विश्लेषण व अधिकृत पद मंजुऱ्या.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/authority/alerts">
            <Button size="sm" className="gap-1.5 text-xs bg-red-700 hover:bg-red-800 text-white min-h-[36px] rounded-xl shadow-sm hover-lift-sm">
              <BellRing className="h-4 w-4 animate-pulse" />
              <span>सक्रिय प्रादुर्भाव सूचना ({activeAlerts.length})</span>
            </Button>
          </Link>
          <Link href="/authority/approvals">
            <Badge className="text-xs bg-amber-50 text-amber-900 border-amber-200 px-3 py-1.5 gap-1.5 cursor-pointer rounded-xl hover-lift-sm transition-all">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-700" />
              <span>प्रलंबित मंजुऱ्या: {pendingApprovals.length}</span>
            </Badge>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards & Operational Turnaround Times */}
      <AuthorityMetricsCards metrics={metrics} />

      {/* Interactive Outbreak Surveillance Heatmap as Hero Visual */}
      <SurveillanceHeatmap markers={mapMarkers} />

      {/* Grid: Pending Approvals & Active Alerts Quick Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending User Approvals */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-[#E5E0D8]">
            <div>
              <CardTitle className="text-base text-[#191F1C] flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-amber-700" />
                <span>प्रलंबित पद मंजुऱ्या ({pendingApprovals.length})</span>
              </CardTitle>
              <CardDescription className="text-xs text-stone-500">
                पशुसखी, पशुवैद्यक व क्षेत्रीय अधिकाऱ्यांच्या खात्यांची अधिकृत तपासणी व पडताळणी.
              </CardDescription>
            </div>
            <Link href="/authority/approvals">
              <Button variant="ghost" size="sm" className="text-xs text-amber-800 hover:text-amber-900 hover:bg-amber-50 rounded-xl">
                सर्व पहा &rarr;
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {pendingApprovals.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] text-center text-xs text-stone-500">
                सध्या या जिल्ह्यात कोणतीही खाते पडताळणी प्रलंबित नाही.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.slice(0, 3).map((user) => (
                  <div
                    key={user.id}
                    className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#191F1C] text-sm">{user.name}</h4>
                        <Badge className="text-[10px] bg-stone-100 text-stone-700 border-stone-200">
                          {user.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-stone-500">
                        फोन: <span className="text-stone-800 font-medium">{user.phone}</span> • जिल्हा:{" "}
                        <span className="text-emerald-800 font-medium">{user.district?.name || "Assigned"}</span>
                      </p>
                    </div>
                    <ApprovalButtons userId={user.id} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Outbreak Alerts (Elegant Notification Panels) */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-[#E5E0D8]">
            <div>
              <CardTitle className="text-base text-red-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span>सक्रिय रोग प्रादुर्भाव सूचना ({activeAlerts.length})</span>
              </CardTitle>
              <CardDescription className="text-xs text-stone-500">
                ७ दिवसांच्या कालावधीत गावात ३ किंवा अधिक समान रोग प्रकरणे आढळल्यास स्वयंचलित सूचना.
              </CardDescription>
            </div>
            <Link href="/authority/alerts">
              <Button variant="ghost" size="sm" className="text-xs text-red-700 hover:text-red-800 hover:bg-red-50 rounded-xl">
                सर्व पहा &rarr;
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {activeAlerts.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] text-center text-xs text-stone-500">
                सध्या या जिल्ह्यात कोणताही सक्रिय रोग प्रादुर्भाव आढळलेला नाही.
              </div>
            ) : (
              <div className="space-y-3">
                {activeAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3.5 rounded-2xl bg-red-50/70 border border-red-200 flex items-center justify-between shadow-2xs"
                  >
                    <div>
                      <div className="font-bold text-red-950 text-sm flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-red-700" />
                        <span>{alert.village.name} ({alert.village.block.name})</span>
                      </div>
                      <div className="text-xs text-red-800 mt-0.5">
                        रोग संशय: <strong className="text-red-950">{alert.diseaseName || "Cluster Outbreak"}</strong> •{" "}
                        प्रकरणे: <span className="text-red-950 font-bold">{alert.caseCount}</span>
                      </div>
                    </div>
                    <Badge className="bg-red-100 text-red-900 border-red-300 text-[10px] font-bold">
                      सक्रिय सूचना
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
