"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecentActivityItem } from "@/lib/authority/metrics";
import { Activity, ClipboardList, Footprints, FileText, BellRing, ChevronRight } from "lucide-react";

interface RecentActivityFeedProps {
  activities: RecentActivityItem[];
}

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  const getActivityIcon = (type: RecentActivityItem["type"]) => {
    switch (type) {
      case "CASE":
        return <ClipboardList className="h-4 w-4 text-emerald-700" />;
      case "VISIT":
        return <Footprints className="h-4 w-4 text-blue-700" />;
      case "REPORT":
        return <FileText className="h-4 w-4 text-purple-700" />;
      case "ALERT":
        return <BellRing className="h-4 w-4 text-red-600 animate-pulse" />;
      default:
        return <Activity className="h-4 w-4 text-stone-600" />;
    }
  };

  return (
    <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-[#E5E0D8]">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-[#191F1C] flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-700" />
              <span>Recent Surveillance Activity Stream</span>
            </CardTitle>
            <CardDescription className="text-xs text-stone-500">
              Live chronological feed of new health intakes, field agent inspections, veterinary reports, and alerts
            </CardDescription>
          </div>
          <Badge className="bg-stone-100 text-stone-700 border-stone-200 text-xs">
            Live Stream ({activities.length})
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 bg-[#FAF8F3] rounded-2xl border border-[#E5E0D8]">
            No recent surveillance activity logged in this district scope yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activities.map((act) => (
              <div
                key={act.id}
                className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] flex items-start justify-between gap-3 shadow-2xs hover:border-emerald-600/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white border border-[#E5E0D8] shadow-2xs shrink-0 mt-0.5">
                    {getActivityIcon(act.type)}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-[#191F1C]">{act.title}</span>
                      <Badge
                        className={`text-[10px] ${
                          act.statusVariant === "destructive"
                            ? "bg-red-100 text-red-900 border-red-200"
                            : act.statusVariant === "secondary"
                            ? "bg-blue-100 text-blue-900 border-blue-200"
                            : "bg-stone-100 text-stone-700 border-stone-200"
                        }`}
                      >
                        {act.statusBadge}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-stone-500">{act.subtitle}</p>
                    <p className="text-[10px] text-stone-400 font-mono">
                      {new Date(act.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                {act.linkUrl && (
                  <Link href={act.linkUrl} className="shrink-0">
                    <button className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
