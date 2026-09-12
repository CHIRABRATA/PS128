"use client";

import React, { useState, useTransition } from "react";
import { listAuditLogAction } from "@/lib/actions/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ScrollText,
  Search,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  Clock,
  FileCode2,
} from "lucide-react";

import { formatDateTime } from "@/lib/utils";

interface AuditLogItem {
  id: string;
  action: string;
  actorUserId: string | null;
  actorName: string;
  actorRole: string | null;
  targetUserId: string | null;
  targetName: string | null;
  targetRole: string | null;
  previousValue: unknown;
  newValue: unknown;
  reason: string | null;
  createdAt: string;
}

interface AuditLogViewerProps {
  initialData: {
    items: AuditLogItem[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export function AuditLogViewer({ initialData }: AuditLogViewerProps) {
  const [items, setItems] = useState<AuditLogItem[]>(initialData.items);
  const [totalCount, setTotalCount] = useState<number>(initialData.totalCount);
  const [page, setPage] = useState<number>(initialData.page);
  const [totalPages, setTotalPages] = useState<number>(initialData.totalPages);

  const [filterAction, setFilterAction] = useState("");
  const [filterActorId, setFilterActorId] = useState("");
  const [filterTargetId, setFilterTargetId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const fetchLogs = (targetPage: number) => {
    startTransition(async () => {
      try {
        const res = await listAuditLogAction(
          {
            action: filterAction.trim() || undefined,
            actorUserId: filterActorId.trim() || undefined,
            targetUserId: filterTargetId.trim() || undefined,
            dateFrom: filterDateFrom || undefined,
            dateTo: filterDateTo || undefined,
          },
          {
            page: targetPage,
            pageSize: 20,
          }
        );

        setItems(res.items);
        setTotalCount(res.totalCount);
        setPage(res.page);
        setTotalPages(res.totalPages);
      } catch (err) {
        console.error("Failed to fetch audit logs:", err);
      }
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleReset = () => {
    setFilterAction("");
    setFilterActorId("");
    setFilterTargetId("");
    setFilterDateFrom("");
    setFilterDateTo("");
    startTransition(async () => {
      const res = await listAuditLogAction({}, { page: 1, pageSize: 20 });
      setItems(res.items);
      setTotalCount(res.totalCount);
      setPage(res.page);
      setTotalPages(res.totalPages);
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 bg-[#FAF8F3] border-b border-[#E5E0D8]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-[#191F1C]">
                  Audit Filter & Search Ledger
                </CardTitle>
                <CardDescription className="text-xs text-stone-500">
                  Search by action code, actor/target ID, or date range
                </CardDescription>
              </div>
            </div>

            <Badge variant="outline" className="font-mono text-xs bg-white">
              {totalCount} Total Events
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Action Filter */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Action Name / Code
                </label>
                <Input
                  placeholder="e.g. DISTRICT_CREATED"
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="text-xs h-9 rounded-xl border-[#D9D3C7]"
                />
              </div>

              {/* Actor User ID */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Actor User ID
                </label>
                <Input
                  placeholder="Actor user ID"
                  value={filterActorId}
                  onChange={(e) => setFilterActorId(e.target.value)}
                  className="text-xs h-9 rounded-xl border-[#D9D3C7] font-mono"
                />
              </div>

              {/* Target User ID */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Target User ID
                </label>
                <Input
                  placeholder="Target user ID"
                  value={filterTargetId}
                  onChange={(e) => setFilterTargetId(e.target.value)}
                  className="text-xs h-9 rounded-xl border-[#D9D3C7] font-mono"
                />
              </div>

              {/* Date From */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Date From
                </label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="text-xs h-9 rounded-xl border-[#D9D3C7]"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Date To
                </label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="text-xs h-9 rounded-xl border-[#D9D3C7]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EBE1]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isPending}
                className="text-xs rounded-xl border-[#D9D3C7] gap-1.5 h-9"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="text-xs rounded-xl bg-slate-900 hover:bg-slate-800 text-white gap-1.5 h-9"
              >
                <Search className="h-3.5 w-3.5" />
                <span>{isPending ? "Filtering..." : "Apply Filters"}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF8F3] border-b border-[#E5E0D8] text-stone-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE1]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-stone-500 bg-[#FAF8F3]/50">
                    <ScrollText className="h-8 w-8 mx-auto text-stone-300 mb-2" />
                    <span className="block font-medium">No audit events found</span>
                    <span className="text-[11px] text-stone-400">
                      Try adjusting the filters above to find specific events.
                    </span>
                  </td>
                </tr>
              ) : (
                items.map((log) => {
                  const isExpanded = !!expandedRows[log.id];
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className={`hover:bg-stone-50/80 transition-colors ${
                          isExpanded ? "bg-stone-50/60" : ""
                        }`}
                      >
                        {/* Timestamp */}
                        <td className="py-3.5 px-4 font-mono text-stone-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-stone-400" />
                            <span>{formatDateTime(log.createdAt)}</span>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge className="bg-slate-900 text-white font-mono text-[10px] px-2 py-0.5 shadow-none">
                            {log.action}
                          </Badge>
                        </td>

                        {/* Actor */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <div>
                              <span className="font-semibold text-stone-900 block truncate">
                                {log.actorName}
                              </span>
                              {log.actorRole && (
                                <span className="text-[10px] text-stone-500 font-mono">
                                  {log.actorRole}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Target */}
                        <td className="py-3.5 px-4">
                          {log.targetName ? (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <div>
                                <span className="font-semibold text-stone-900 block truncate">
                                  {log.targetName}
                                </span>
                                {log.targetRole && (
                                  <span className="text-[10px] text-stone-500 font-mono">
                                    {log.targetRole}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-stone-400 italic text-[11px]">—</span>
                          )}
                        </td>

                        {/* Reason */}
                        <td className="py-3.5 px-4 max-w-[220px]">
                          {log.reason ? (
                            <span className="text-stone-700 truncate block text-[11px]" title={log.reason}>
                              {log.reason}
                            </span>
                          ) : (
                            <span className="text-stone-400 italic text-[11px]">—</span>
                          )}
                        </td>

                        {/* Expand Details Button */}
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(log.id)}
                            className="h-7 px-2 text-xs rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 gap-1 cursor-pointer"
                          >
                            <FileCode2 className="h-3.5 w-3.5" />
                            <span>{isExpanded ? "Hide Diff" : "View Diff"}</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </td>
                      </tr>

                      {/* Expandable Before / After State JSON View */}
                      {isExpanded && (
                        <tr className="bg-stone-50/90 border-b border-[#E5E0D8]">
                          <td colSpan={6} className="p-4 sm:p-5">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs text-stone-600 font-bold">
                                <span>State Mutation Delta (Audit Event ID: {log.id})</span>
                                <span className="text-[11px] text-stone-400 font-mono">
                                  Actor ID: {log.actorUserId || "N/A"} • Target ID: {log.targetUserId || "N/A"}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Previous Value */}
                                <div className="rounded-2xl border border-rose-200 bg-white p-3.5 shadow-2xs">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                                      Previous State (Before)
                                    </span>
                                  </div>
                                  <pre className="p-3 bg-stone-900 text-rose-300 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 leading-relaxed">
                                    {log.previousValue !== null && log.previousValue !== undefined
                                      ? JSON.stringify(log.previousValue, null, 2)
                                      : "null (No prior state recorded)"}
                                  </pre>
                                </div>

                                {/* New Value */}
                                <div className="rounded-2xl border border-emerald-200 bg-white p-3.5 shadow-2xs">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                      New State (After)
                                    </span>
                                  </div>
                                  <pre className="p-3 bg-stone-900 text-emerald-300 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 leading-relaxed">
                                    {log.newValue !== null && log.newValue !== undefined
                                      ? JSON.stringify(log.newValue, null, 2)
                                      : "null"}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 bg-[#FAF8F3] border-t border-[#E5E0D8] flex items-center justify-between text-xs text-stone-600">
          <div>
            Showing Page <strong className="text-stone-900 font-mono">{page}</strong> of{" "}
            <strong className="text-stone-900 font-mono">{totalPages}</strong> ({totalCount} items)
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1 || isPending}
              className="h-8 text-xs rounded-xl border-[#D9D3C7] gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages || isPending}
              className="h-8 text-xs rounded-xl border-[#D9D3C7] gap-1"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
