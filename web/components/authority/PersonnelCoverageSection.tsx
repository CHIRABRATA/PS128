"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VetCoverageItem, FieldAgentCoverageItem } from "@/lib/authority/metrics";
import {
  Stethoscope,
  ShieldCheck,
  Search,
  ChevronRight,
  X,
  Phone,
  MapPin,
  Calendar,
  User,
} from "lucide-react";

interface PersonnelCoverageSectionProps {
  veterinarians: VetCoverageItem[];
  fieldAgents: FieldAgentCoverageItem[];
}

export function PersonnelCoverageSection({
  veterinarians,
  fieldAgents,
}: PersonnelCoverageSectionProps) {
  const [activeTab, setActiveTab] = useState<"VETS" | "AGENTS">("VETS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVet, setSelectedVet] = useState<VetCoverageItem | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<FieldAgentCoverageItem | null>(null);

  // Filtered list
  const filteredVets = veterinarians.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return v.name.toLowerCase().includes(q) || v.serviceArea.toLowerCase().includes(q) || v.phone.includes(q);
  });

  const filteredAgents = fieldAgents.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return a.name.toLowerCase().includes(q) || a.serviceArea.toLowerCase().includes(q) || a.phone.includes(q);
  });

  return (
    <div className="space-y-6">
      <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-[#E5E0D8]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-[#191F1C] flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-700" />
                <span>Personnel Responsibility & District Coverage</span>
              </CardTitle>
              <CardDescription className="text-xs text-stone-500">
                100% database-derived caseloads, distinct farmers/animals under care, and field responsibility
              </CardDescription>
            </div>

            {/* Tab Switches */}
            <div className="flex items-center gap-2 bg-[#FAF8F3] p-1 rounded-2xl border border-[#E5E0D8]">
              <button
                onClick={() => {
                  setActiveTab("VETS");
                  setSearchQuery("");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "VETS"
                    ? "bg-white text-purple-950 shadow-xs border border-[#E5E0D8]"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Stethoscope className="h-3.5 w-3.5 text-purple-700" />
                <span>Veterinarians ({veterinarians.length})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("AGENTS");
                  setSearchQuery("");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "AGENTS"
                    ? "bg-white text-blue-950 shadow-xs border border-[#E5E0D8]"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <User className="h-3.5 w-3.5 text-blue-700" />
                <span>Field Agents ({fieldAgents.length})</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="pt-2 max-w-xs relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <Input
              type="text"
              placeholder={`Search ${activeTab === "VETS" ? "veterinarian" : "field agent"} by name or area...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-[#FAF8F3] border-[#D9D3C7] rounded-xl"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {activeTab === "VETS" ? (
            /* VETERINARIANS TABLE */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F3] border-b border-[#E5E0D8] text-stone-600 font-semibold">
                    <th className="py-3 px-4">Veterinarian</th>
                    <th className="py-3 px-3">Service Area</th>
                    <th className="py-3 px-2 text-center">Assigned</th>
                    <th className="py-3 px-2 text-center text-amber-700">Active</th>
                    <th className="py-3 px-2 text-center">Pending</th>
                    <th className="py-3 px-2 text-center">Exam</th>
                    <th className="py-3 px-2 text-center">Lab Ref</th>
                    <th className="py-3 px-2 text-center">Follow-ups</th>
                    <th className="py-3 px-2 text-center font-bold text-emerald-800">Farmers</th>
                    <th className="py-3 px-2 text-center font-bold text-emerald-800">Animals</th>
                    <th className="py-3 px-3 text-center">Workload</th>
                    <th className="py-3 px-4 text-right">Drill-Down</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D8]">
                  {filteredVets.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-stone-500 bg-stone-50/50">
                        No veterinarians found for this query or jurisdiction.
                      </td>
                    </tr>
                  ) : (
                    filteredVets.map((vet) => (
                      <tr key={vet.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#191F1C]">Dr. {vet.name}</div>
                          <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3 text-stone-400" />
                            <span>{vet.phone}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-stone-700 font-medium">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-purple-600 shrink-0" />
                            <span>{vet.serviceArea}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-semibold">{vet.assignedCases}</td>
                        <td className="py-3 px-2 text-center font-mono font-bold text-amber-800 bg-amber-50/50">
                          {vet.activeCases}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-stone-700">{vet.pendingReviews}</td>
                        <td className="py-3 px-2 text-center font-mono text-orange-700">{vet.underExam}</td>
                        <td className="py-3 px-2 text-center font-mono text-purple-700">{vet.labReferrals}</td>
                        <td className="py-3 px-2 text-center font-mono text-rose-700">{vet.followUps}</td>
                        <td className="py-3 px-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40">
                          {vet.farmersUnderCare}
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40">
                          {vet.animalsUnderCare}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge
                            className={`text-[10px] font-mono font-bold ${
                              vet.workloadScore >= 10
                                ? "bg-red-100 text-red-900 border-red-200"
                                : vet.workloadScore >= 5
                                ? "bg-amber-100 text-amber-900 border-amber-200"
                                : "bg-emerald-100 text-emerald-900 border-emerald-200"
                            }`}
                          >
                            Score: {vet.workloadScore}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedVet(vet)}
                            className="h-7 px-2.5 text-xs text-purple-800 hover:text-purple-900 hover:bg-purple-100 rounded-xl gap-1"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* FIELD AGENTS TABLE */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F3] border-b border-[#E5E0D8] text-stone-600 font-semibold">
                    <th className="py-3 px-4">Field Agent</th>
                    <th className="py-3 px-3">Service Area</th>
                    <th className="py-3 px-2 text-center text-amber-700">Pending</th>
                    <th className="py-3 px-2 text-center text-blue-700">Accepted</th>
                    <th className="py-3 px-2 text-center">Scheduled</th>
                    <th className="py-3 px-2 text-center text-emerald-700">Completed</th>
                    <th className="py-3 px-2 text-center font-bold text-emerald-800">Farmers Assisted</th>
                    <th className="py-3 px-2 text-center font-bold text-emerald-800">Animals Visited</th>
                    <th className="py-3 px-2 text-center font-bold text-purple-800">Open Requests</th>
                    <th className="py-3 px-3 text-center">Workload</th>
                    <th className="py-3 px-4 text-right">Drill-Down</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D8]">
                  {filteredAgents.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-stone-500 bg-stone-50/50">
                        No field agents found for this query or jurisdiction.
                      </td>
                    </tr>
                  ) : (
                    filteredAgents.map((agent) => (
                      <tr key={agent.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#191F1C]">{agent.name}</div>
                          <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3 text-stone-400" />
                            <span>{agent.phone}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-stone-700 font-medium">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-blue-600 shrink-0" />
                            <span>{agent.serviceArea}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-semibold text-amber-800">
                          {agent.pendingRequests}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-blue-700">{agent.acceptedRequests}</td>
                        <td className="py-3 px-2 text-center font-mono text-stone-700">{agent.scheduledVisits}</td>
                        <td className="py-3 px-2 text-center font-mono text-emerald-700 font-semibold">
                          {agent.completedVisits}
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40">
                          {agent.farmersAssisted}
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40">
                          {agent.animalsVisited}
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-bold text-purple-800 bg-purple-50/40">
                          {agent.openRequests}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge
                            className={`text-[10px] font-mono font-bold ${
                              agent.workloadScore >= 10
                                ? "bg-red-100 text-red-900 border-red-200"
                                : agent.workloadScore >= 5
                                ? "bg-amber-100 text-amber-900 border-amber-200"
                                : "bg-emerald-100 text-emerald-900 border-emerald-200"
                            }`}
                          >
                            Score: {agent.workloadScore}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedAgent(agent)}
                            className="h-7 px-2.5 text-xs text-blue-800 hover:text-blue-900 hover:bg-blue-100 rounded-xl gap-1"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* VETERINARIAN DRILL-DOWN MODAL / DRAWER */}
      {selectedVet && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5E0D8] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E5E0D8] bg-[#FAF8F3] flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-purple-700" />
                  <h3 className="text-base font-bold text-[#191F1C]">Dr. {selectedVet.name} • Clinical Caseload</h3>
                  <Badge className="bg-purple-100 text-purple-900 border-purple-200 text-xs">
                    {selectedVet.serviceArea}
                  </Badge>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Phone: <span className="font-semibold text-stone-800">{selectedVet.phone}</span> •{" "}
                  <span className="text-emerald-800 font-bold">{selectedVet.farmersUnderCare} Farmers</span> &{" "}
                  <span className="text-emerald-800 font-bold">{selectedVet.animalsUnderCare} Animals</span> currently under active care.
                </p>
              </div>
              <button
                onClick={() => setSelectedVet(null)}
                className="p-1 rounded-xl hover:bg-stone-200 text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Assigned Cases List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider font-mono">
                Assigned Health Cases ({selectedVet.assignedCasesList.length})
              </h4>

              {selectedVet.assignedCasesList.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 bg-[#FAF8F3] rounded-2xl border border-[#E5E0D8]">
                  No health cases currently assigned to this veterinarian.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedVet.assignedCasesList.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#191F1C]">Case #{c.caseNumber}</span>
                          <Badge
                            className={`text-[10px] ${
                              c.riskLevel === "CRITICAL"
                                ? "bg-red-100 text-red-900 border-red-200"
                                : c.riskLevel === "HIGH"
                                ? "bg-orange-100 text-orange-900 border-orange-200"
                                : "bg-emerald-100 text-emerald-900 border-emerald-200"
                            }`}
                          >
                            {c.riskLevel}
                          </Badge>
                          <Badge className="text-[10px] bg-stone-100 text-stone-700 border-stone-200">
                            {c.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-stone-600">
                          Animal: <strong className="text-stone-800">{c.species} ({c.animalTag})</strong> • Farm:{" "}
                          <strong>{c.farmName}</strong> ({c.villageName}, {c.blockName}) • Farmer:{" "}
                          <strong className="text-stone-800">{c.farmerName}</strong>
                        </p>
                        {c.diagnosis && (
                          <p className="text-xs text-emerald-900 bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-200">
                            Diagnosis: <strong>{c.diagnosis}</strong>
                          </p>
                        )}
                        {c.followUpDate && (
                          <p className="text-[11px] text-rose-700 flex items-center gap-1 font-mono">
                            <Calendar className="h-3 w-3" />
                            <span>Follow-up: {new Date(c.followUpDate).toLocaleDateString()} {c.followUpCompleted ? "(Completed)" : "(Pending)"}</span>
                          </p>
                        )}
                      </div>

                      <div className="text-[11px] text-stone-500 font-mono shrink-0">
                        Reported: {new Date(c.reportedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E5E0D8] bg-[#FAF8F3] flex justify-end">
              <Button size="sm" onClick={() => setSelectedVet(null)} className="rounded-xl px-4 text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FIELD AGENT DRILL-DOWN MODAL / DRAWER */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5E0D8] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E5E0D8] bg-[#FAF8F3] flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-700" />
                  <h3 className="text-base font-bold text-[#191F1C]">{selectedAgent.name} (Field Agent) • Assignments</h3>
                  <Badge className="bg-blue-100 text-blue-900 border-blue-200 text-xs">
                    {selectedAgent.serviceArea}
                  </Badge>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Phone: <span className="font-semibold text-stone-800">{selectedAgent.phone}</span> •{" "}
                  <span className="text-emerald-800 font-bold">{selectedAgent.farmersAssisted} Farmers Assisted</span> &{" "}
                  <span className="text-emerald-800 font-bold">{selectedAgent.animalsVisited} Animals Visited</span>.
                </p>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="p-1 rounded-xl hover:bg-stone-200 text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Active Assistance Requests */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider font-mono">
                Assigned Assistance Requests & Field Visits ({selectedAgent.activeRequestsList.length})
              </h4>

              {selectedAgent.activeRequestsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 bg-[#FAF8F3] rounded-2xl border border-[#E5E0D8]">
                  No assistance requests currently assigned to this field agent.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedAgent.activeRequestsList.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#191F1C]">{r.reason}</span>
                          <Badge className="text-[10px] bg-blue-100 text-blue-900 border-blue-200">
                            {r.status}
                          </Badge>
                          {r.caseNumber && (
                            <Badge className="text-[10px] bg-purple-50 text-purple-800 border-purple-200">
                              Case #{r.caseNumber}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-stone-600">
                          Farmer: <strong className="text-stone-800">{r.farmerName}</strong> • Farm:{" "}
                          <strong>{r.farmName}</strong> ({r.villageName}, {r.blockName})
                          {r.species && ` • Animal: ${r.species} (${r.animalTag || "Tagged"})`}
                        </p>
                        {r.visitObservations && (
                          <p className="text-xs text-stone-700 bg-stone-100 p-1.5 rounded-lg border border-stone-200">
                            Visit Report: <em>{r.visitObservations}</em>
                          </p>
                        )}
                        {r.scheduledAt && (
                          <p className="text-[11px] text-blue-700 flex items-center gap-1 font-mono">
                            <Calendar className="h-3 w-3" />
                            <span>Scheduled: {new Date(r.scheduledAt).toLocaleString()}</span>
                          </p>
                        )}
                      </div>

                      <div className="text-[11px] text-stone-500 font-mono shrink-0">
                        Requested: {new Date(r.requestedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E5E0D8] bg-[#FAF8F3] flex justify-end">
              <Button size="sm" onClick={() => setSelectedAgent(null)} className="rounded-xl px-4 text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
