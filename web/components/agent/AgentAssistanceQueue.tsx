"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  acceptAssistanceRequestAction,
  startVisitAssistanceRequestAction,
} from "@/lib/actions/assistance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Clock,
  UserCheck,
  ChevronRight,
  FilePlus2,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface RequestItem {
  id: string;
  reason: string;
  status: string;
  requestedAt: Date | string;
  notes?: string | null;
  farmerUser: {
    id: string;
    name: string;
    phone: string;
  };
  animal?: {
    id: string;
    tag: string;
    species: string;
  } | null;
  farm: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  village?: {
    name: string;
    block: {
      name: string;
      district: {
        name: string;
      };
    };
  } | null;
  assignedAgentUser?: {
    id: string;
    name: string;
  } | null;
  case?: {
    id: string;
    caseNumber: string;
    status: string;
  } | null;
}

interface AgentAssistanceQueueProps {
  requests: RequestItem[];
  currentAgentId: string;
}

export function AgentAssistanceQueue({
  requests,
  currentAgentId,
}: AgentAssistanceQueueProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAccept = async (requestId: string) => {
    setLoadingId(requestId);
    setActionError(null);
    try {
      const res = await acceptAssistanceRequestAction(requestId);
      if (!res.success) {
        setActionError(res.error || "Failed to accept request.");
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Accept failed.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleStartVisit = async (requestId: string) => {
    setLoadingId(requestId);
    setActionError(null);
    try {
      const res = await startVisitAssistanceRequestAction(requestId);
      if (!res.success) {
        setActionError(res.error || "Failed to start visit.");
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Start visit failed.");
    } finally {
      setLoadingId(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-[#FAF8F3] border border-[#E5E0D8] text-center text-xs text-stone-500 space-y-2">
        <UserCheck className="h-8 w-8 text-stone-400 mx-auto" />
        <p className="font-bold text-stone-800">No Pending Field Assistance Requests</p>
        <p>All village requests in your territory have been completed or assigned.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="space-y-3">
        {requests.map((req) => {
          const isAssignedToMe = req.assignedAgentUser?.id === currentAgentId;
          const isRequested = req.status === "REQUESTED";
          const isAccepted = req.status === "ACCEPTED";
          const isInProgress = req.status === "IN_PROGRESS";
          const isCompleted = req.status === "COMPLETED";

          return (
            <div
              key={req.id}
              className="p-4 rounded-3xl bg-[#FAF8F3] border border-[#E5E0D8] flex flex-col md:flex-row md:items-center justify-between gap-4 hover-lift transition-all"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[#191F1C] text-sm">
                    {req.village ? `${req.village.name} • ` : ""}{req.farm.name}
                  </span>
                  <Badge
                    className={
                      isRequested
                        ? "bg-amber-100 text-amber-950 border-amber-300 text-[10px]"
                        : isAccepted || isInProgress
                        ? "bg-sky-100 text-sky-950 border-sky-300 text-[10px]"
                        : "bg-emerald-100 text-emerald-950 border-emerald-300 text-[10px]"
                    }
                  >
                    {req.status}
                  </Badge>
                  {isAssignedToMe && (
                    <Badge className="bg-purple-100 text-purple-950 border-purple-300 text-[10px]">
                      Assigned to you
                    </Badge>
                  )}
                </div>

                <p className="text-xs font-semibold text-stone-800">
                  Reason: <span className="text-amber-900">{req.reason}</span>
                </p>

                <p className="text-xs text-stone-600">
                  Farmer: <strong className="text-stone-900">{req.farmerUser.name}</strong> ({req.farmerUser.phone})
                  {req.animal ? ` • Animal: ${req.animal.tag} (${req.animal.species})` : " • General Farm Visit"}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-stone-500 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-stone-400" />
                    Requested: {new Date(req.requestedAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {req.village && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-stone-400" />
                      {req.village.block.name}, {req.village.block.district.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons based on status */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {isRequested && (
                  <Button
                    size="sm"
                    onClick={() => handleAccept(req.id)}
                    disabled={loadingId === req.id}
                    className="text-xs bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-xl h-9 min-h-[36px]"
                  >
                    {loadingId === req.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5 mr-1" />
                        <span>Accept Visit</span>
                      </>
                    )}
                  </Button>
                )}

                {isAccepted && isAssignedToMe && (
                  <Button
                    size="sm"
                    onClick={() => handleStartVisit(req.id)}
                    disabled={loadingId === req.id}
                    className="text-xs bg-sky-700 hover:bg-sky-800 text-white font-semibold rounded-xl h-9 min-h-[36px]"
                  >
                    {loadingId === req.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        <span>Start Visit</span>
                      </>
                    )}
                  </Button>
                )}

                {isInProgress && isAssignedToMe && (
                  <Link href={`/agent/report?requestId=${req.id}&farmId=${req.farm.id}${req.animal ? `&animalId=${req.animal.id}` : ""}`}>
                    <Button
                      size="sm"
                      className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl h-9 min-h-[36px] shadow-sm gap-1"
                    >
                      <FilePlus2 className="h-3.5 w-3.5" />
                      <span>Record Inspection</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                )}

                {isCompleted && req.case && (
                  <Badge className="bg-emerald-50 text-emerald-900 border-emerald-300 text-xs px-2.5 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-700" />
                    <span>Case #{req.case.caseNumber}</span>
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
