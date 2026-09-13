"use client";

import { useState } from "react";
import { approveUserAction, rejectUserAction } from "@/lib/actions/authority";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";

export function ApprovalButtons({ userId }: { userId: string }) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const handleApprove = async () => {
    setLoading("approve");
    try {
      await approveUserAction(userId);
      window.location.reload();
    } catch {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading("reject");
    try {
      await rejectUserAction(userId);
      window.location.reload();
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        className="text-xs h-8 gap-1 border-red-200 text-red-700 hover:bg-red-50 min-h-[36px]"
        onClick={handleReject}
        disabled={loading !== null}
      >
        {loading === "reject" ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
        <span>Reject</span>
      </Button>

      <Button
        size="sm"
        className="text-xs h-8 gap-1 bg-[#047857] hover:bg-[#065f46] text-white font-semibold min-h-[36px]"
        onClick={handleApprove}
        disabled={loading !== null}
      >
        {loading === "approve" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        <span>Approve</span>
      </Button>
    </div>
  );
}
