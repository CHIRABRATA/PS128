"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Calendar, MapPin, ShieldAlert, ShieldCheck, Search, ChevronRight } from "lucide-react";

export interface AlertWithLocation {
  id: string;
  villageId: string;
  diseaseName: string | null;
  caseCount: number;
  windowStart: Date;
  windowEnd: Date;
  active: boolean;
  createdAt: Date;
  village: {
    name: string;
    block: {
      name: string;
      district: {
        name: string;
      };
    };
  };
}

interface AlertsListProps {
  alerts: AlertWithLocation[];
}

export function AlertsList({ alerts }: AlertsListProps) {
  const [filterTab, setFilterTab] = useState<"all" | "active" | "historical">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const activeAlerts = alerts.filter((a) => a.active);
  const historicalAlerts = alerts.filter((a) => !a.active);

  const displayedAlerts = alerts.filter((a) => {
    if (filterTab === "active" && !a.active) return false;
    if (filterTab === "historical" && a.active) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        a.village.name.toLowerCase().includes(q) ||
        a.village.block.name.toLowerCase().includes(q) ||
        (a.diseaseName && a.diseaseName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 text-[#191F1C]">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-white border border-[#E5E0D8] p-1 rounded-2xl shadow-xs">
          <Button
            size="sm"
            variant={filterTab === "all" ? "default" : "ghost"}
            onClick={() => setFilterTab("all")}
            className="h-8 text-xs rounded-xl"
          >
            सर्व अलर्ट ({alerts.length})
          </Button>
          <Button
            size="sm"
            variant={filterTab === "active" ? "destructive" : "ghost"}
            onClick={() => setFilterTab("active")}
            className="h-8 text-xs rounded-xl"
          >
            सक्रिय ({activeAlerts.length})
          </Button>
          <Button
            size="sm"
            variant={filterTab === "historical" ? "secondary" : "ghost"}
            onClick={() => setFilterTab("historical")}
            className="h-8 text-xs rounded-xl"
          >
            मागील इतिहास ({historicalAlerts.length})
          </Button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
          <Input
            type="text"
            placeholder="गाव किंवा रोगाचे नाव शोधा..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-xs bg-white border-[#D9D3C7] rounded-xl"
          />
        </div>
      </div>

      {/* Active Alerts Section */}
      <Card className="border-red-200 bg-white rounded-3xl shadow-xs overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between bg-red-50/50 border-b border-red-100">
          <div>
            <CardTitle className="text-base text-red-900 flex items-center gap-2 font-bold">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              <span>सक्रिय जिल्हा रोग प्रादुर्भाव सूचना ({activeAlerts.length})</span>
            </CardTitle>
            <CardDescription className="text-xs text-stone-600">
              गावात ७ दिवसांच्या कालावधीत ३ किंवा अधिक समान रोग प्रकरणे आढळल्यास स्वयंचलित अलर्ट.
            </CardDescription>
          </div>
          <Badge variant="destructive" className="text-xs bg-red-100 text-red-800 border-red-200">
            स्वयंचलित प्रणाली
          </Badge>
        </CardHeader>
        <CardContent className="pt-4">
          {displayedAlerts.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] text-center text-xs text-stone-600 flex flex-col items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-emerald-600" />
              <span>कोणताही जुळणारा रोग प्रादुर्भाव अलर्ट आढळला नाही.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 hover-lift transition-all ${
                    alert.active
                      ? "bg-red-50/40 border-red-200"
                      : "bg-[#FAF8F3] border-[#E5E0D8]"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-red-900 text-sm flex items-center gap-1.5">
                        <AlertTriangle className={`h-4 w-4 ${alert.active ? "text-red-600 animate-pulse" : "text-stone-400"}`} />
                        <span>{alert.diseaseName || "संशयित प्रादुर्भाव क्लस्टर"}</span>
                      </h4>
                      <Badge
                        variant={alert.active ? "destructive" : "outline"}
                        className={`text-[10px] px-2 py-0.5 ${
                          alert.active
                            ? "bg-red-200 text-red-900 border-red-300 font-bold"
                            : "bg-white text-stone-600 border-[#D9D3C7]"
                        }`}
                      >
                        {alert.caseCount} बाधित जनावरे
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
                      <span className="flex items-center gap-1 text-[#191F1C] font-medium">
                        <MapPin className="h-3.5 w-3.5 text-amber-600" />
                        {alert.village.name}, {alert.village.block.name}
                      </span>
                      <span className="flex items-center gap-1 text-stone-500 font-mono">
                        <Calendar className="h-3.5 w-3.5 text-stone-400" />
                        कालावधी: {new Date(alert.windowStart).toLocaleDateString()} — {new Date(alert.windowEnd).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Link href="/authority">
                      <Button size="sm" variant="outline" className="h-8 text-xs border-red-200 text-red-800 hover:bg-red-50 rounded-xl gap-1">
                        <span>नकाशावर पहा</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

