import React from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/permissions";
import { getAdminDashboardMetricsAction } from "@/lib/actions/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  AlertTriangle,
  Clock,
  ScrollText,
  CheckCircle2,
  Building2,
  ChevronRight,
  MapPin,
  Flame,
} from "lucide-react";

import { formatDateTime } from "@/lib/utils";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const data = await getAdminDashboardMetricsAction();

  const roleOrder = ["ADMIN", "DISTRICT_AUTHORITY", "VETERINARIAN", "FIELD_AGENT", "FARMER"] as const;

  // Calculate totals by role
  const roleTotals = roleOrder.map((role) => {
    const active = data.userDistribution.find((d) => d.role === role && d.status === "ACTIVE")?.count || 0;
    const pending = data.userDistribution.find((d) => d.role === role && d.status === "PENDING_APPROVAL")?.count || 0;
    const rejected = data.userDistribution.find((d) => d.role === role && d.status === "REJECTED")?.count || 0;
    const total = active + pending + rejected;
    return { role, active, pending, rejected, total };
  });

  const grandTotalUsers = roleTotals.reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="space-y-8 text-[#191F1C]">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-4">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide font-mono">
            ADMINISTRATION COCKPIT • SYSTEM GOVERNANCE
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#191F1C] tracking-tight mt-1">
            Maitri Platform Overview
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            Real-time role distribution, operational district gaps, pending approvals, and immutable audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/audit-log">
            <Button variant="outline" size="sm" className="rounded-xl border-[#D9D3C7] text-xs gap-1.5 min-h-[36px]">
              <ScrollText className="h-3.5 w-3.5 text-blue-600" />
              <span>Full Audit Ledger</span>
            </Button>
          </Link>
          <Link href="/admin/geography">
            <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs gap-1.5 min-h-[36px]">
              <MapPin className="h-3.5 w-3.5" />
              <span>Manage Geography</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. USER DISTRIBUTION BY ROLE & STATUS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#191F1C] uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-700" />
            <span>User Distribution by Role & Status ({grandTotalUsers} Total)</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {roleTotals.map((r) => (
            <div
              key={r.role}
              className="p-4 rounded-2xl bg-white border border-[#E5E0D8] shadow-2xs flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700 truncate">
                    {r.role === "DISTRICT_AUTHORITY"
                      ? "District Authority"
                      : r.role === "FIELD_AGENT"
                      ? "Field Agent"
                      : r.role === "VETERINARIAN"
                      ? "Veterinarian"
                      : r.role === "FARMER"
                      ? "Farmer"
                      : "Admin"}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono border-stone-300">
                    {r.total}
                  </Badge>
                </div>
                <div className="text-2xl font-black font-mono text-stone-900 mt-2">
                  {r.active}
                  <span className="text-xs font-normal text-stone-500 ml-1">active</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F0EBE1] flex items-center justify-between text-[11px] text-stone-600 font-mono">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>{r.pending} pending</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  <span>{r.rejected} rejected</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. OPERATIONAL GAPS & OVERDUE APPROVALS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card A: District Operational Gaps (0 Active Authorities) */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs overflow-hidden">
          <CardHeader className="p-5 bg-[#FAF8F3] border-b border-[#E5E0D8] pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-[#191F1C]">
                    District Operational Gaps ({data.districtsWithZeroAuthorities.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-stone-500">
                    Districts with ZERO active District Authorities
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-amber-50 text-amber-900 border-amber-300 text-[10px]">
                Operational Warning
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            {data.districtsWithZeroAuthorities.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500 bg-[#FAF8F3] rounded-2xl border border-[#E5E0D8] flex flex-col items-center justify-center gap-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold text-stone-700">All districts have active authority coverage.</span>
                <span className="text-[11px] text-stone-400">No coverage gaps detected.</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {data.districtsWithZeroAuthorities.map((gap) => (
                  <div
                    key={gap.districtId}
                    className="p-3 rounded-2xl bg-amber-50/40 border border-amber-200/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-stone-900 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-amber-700" />
                        <span>{gap.districtName}</span>
                      </div>
                      <span className="text-[11px] text-stone-500">
                        {gap.totalVets} Vets • {gap.totalAgents} Agents • {gap.totalFarmers} Farmers
                      </span>
                    </div>

                    <Badge className="bg-rose-100 text-rose-900 border-rose-300 font-mono text-[10px]">
                      0 Authorities
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card B: Pending Approvals Older than 48 Hours */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs overflow-hidden">
          <CardHeader className="p-5 bg-[#FAF8F3] border-b border-[#E5E0D8] pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-[#191F1C]">
                    Overdue Approvals (&gt;48 Hours: {data.pendingApprovalsOverdue.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-stone-500">
                    Registrations awaiting credential review for over 2 days
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-rose-50 text-rose-900 border-rose-300 text-[10px]">
                {data.totalPendingApprovals} Total Pending
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            {data.pendingApprovalsOverdue.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500 bg-[#FAF8F3] rounded-2xl border border-[#E5E0D8] flex flex-col items-center justify-center gap-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold text-stone-700">No overdue credential approvals.</span>
                <span className="text-[11px] text-stone-400">All pending approvals are under 48 hours old.</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {data.pendingApprovalsOverdue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-rose-50/40 border border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">{item.name}</span>
                        <Badge variant="outline" className="text-[10px] font-mono bg-white border-stone-300">
                          {item.role}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                        <span>{item.districtName || "Unassigned District"}</span>
                        <span>•</span>
                        <span>{item.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-rose-700 font-mono font-bold text-[11px] shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{item.hoursPending}h overdue</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. RECENT AUDIT ACTIVITY (10 MOST RECENT ENTRIES) */}
      <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs overflow-hidden">
        <CardHeader className="p-5 bg-[#FAF8F3] border-b border-[#E5E0D8] pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <ScrollText className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-[#191F1C]">
                  Recent Audit Activity (Latest 10 Events)
                </CardTitle>
                <CardDescription className="text-xs text-stone-500">
                  Immutable administrative ledger events
                </CardDescription>
              </div>
            </div>

            <Link href="/admin/audit-log">
              <Button variant="ghost" size="sm" className="text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 gap-1 rounded-xl">
                <span>View Full Log</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {data.recentAuditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500 bg-[#FAF8F3]/50">
              No audit log activity recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-[#F0EBE1] text-xs">
              {data.recentAuditLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-stone-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-900 text-white font-mono text-[10px] px-2 py-0.5">
                        {log.action}
                      </Badge>
                      <span className="text-stone-700 font-medium">
                        by <strong className="text-stone-900">{log.actorName}</strong>
                        {log.actorRole && ` (${log.actorRole})`}
                      </span>
                      {log.targetName && (
                        <span className="text-stone-500">
                          $\to$ target: <strong className="text-stone-800">{log.targetName}</strong>
                        </span>
                      )}
                    </div>
                    {log.reason && (
                      <p className="text-[11px] text-stone-500 italic">
                        Reason: {log.reason}
                      </p>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-stone-500 shrink-0">
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
