import React from "react";
import { requireAdmin } from "@/lib/auth/permissions";
import { listAuditLogAction } from "@/lib/actions/admin";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";


export default async function AdminAuditLogPage() {
  await requireAdmin();
  const initialData = await listAuditLogAction({}, { page: 1, pageSize: 20 });

  return (
    <div className="space-y-6 text-[#191F1C]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-4">
        <div>
          <span className="text-xs font-bold text-blue-800 uppercase tracking-wide font-mono">
            IMMUTABLE SECURITY LEDGER • APPEND-ONLY
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#191F1C] tracking-tight mt-1">
            System Audit Log
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            Cryptographically and architecturally append-only audit trail of all governance, credential, and geography modifications.
          </p>
        </div>
      </div>

      <AuditLogViewer initialData={initialData} />
    </div>
  );
}
