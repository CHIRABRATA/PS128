"use client";

import React, { useState } from "react";
import { SampleStatus } from "@prisma/client";
import { updateSampleStatusAction } from "@/lib/actions/vet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FlaskConical, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface SampleItem {
  id: string;
  status: SampleStatus;
  labName?: string | null;
  resultSummary?: string | null;
  collectedAt: Date | string;
  sentAt?: Date | string | null;
  resultReceivedAt?: Date | string | null;
  updatedAt: Date | string;
  case: {
    id: string;
    caseNumber: string;
    status: string;
    animal: {
      tag: string;
      species: string;
    };
  };
  collectedByUser: {
    name: string;
  };
}

interface SampleTrackerTableProps {
  samples: SampleItem[];
}

export function SampleTrackerTable({ samples }: SampleTrackerTableProps) {
  const t = useTranslations("vet");
  const [activeSample, setActiveSample] = useState<SampleItem | null>(null);
  const [newStatus, setNewStatus] = useState<SampleStatus>("SENT");
  const [labName, setLabName] = useState<string>("");
  const [resultSummary, setResultSummary] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const openUpdateModal = (sample: SampleItem) => {
    setActiveSample(sample);
    setNewStatus(sample.status);
    setLabName(sample.labName || "District Veterinary Disease Investigation Laboratory");
    setResultSummary(sample.resultSummary || "");
    setError(null);
  };

  const handleUpdateSample = async () => {
    if (!activeSample) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await updateSampleStatusAction({
        sampleId: activeSample.id,
        expectedUpdatedAt: new Date(activeSample.updatedAt).toISOString(),
        status: newStatus,
        labName: labName || null,
        resultSummary: resultSummary || null,
      });

      if (!res.success) {
        setError(res.error || "Failed to update sample status.");
      } else {
        setActiveSample(null);
        window.location.reload();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: SampleStatus) => {
    switch (status) {
      case "COLLECTED":
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">{t("sampleCollected")}</Badge>;
      case "SENT":
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">{t("sentToLab")}</Badge>;
      case "RESULT_PENDING":
        return <Badge variant="outline" className="bg-stone-100 text-stone-700 border-stone-200">{t("resultPending")}</Badge>;
      case "RESULT_RECEIVED":
        return <Badge variant="success" className="bg-emerald-50 text-emerald-800 border-emerald-200">{t("resultReceived")}</Badge>;
    }
  };

  if (samples.length === 0) {
    return (
      <div className="p-8 rounded-2xl border border-[#E5E0D8] bg-[#FAF8F3] text-center space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto">
          <FlaskConical className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-[#191F1C]">{t("noLabSamplesRegistered")}</p>
        <p className="text-xs text-stone-500 max-w-sm mx-auto">{t("samplesReferredDesc")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Card List */}
      <div className="grid grid-cols-1 md:hidden gap-3">
        {samples.map((sample) => (
          <div key={sample.id} className="p-4 rounded-2xl border border-[#E5E0D8] bg-white space-y-2.5 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#191F1C]">Case #{sample.case.caseNumber}</span>
              {getStatusBadge(sample.status)}
            </div>

            <div className="text-xs text-stone-600 space-y-1">
              <div>Animal: <strong className="text-[#191F1C]">{sample.case.animal.tag} ({sample.case.animal.species})</strong></div>
              <div>Lab: <span className="text-stone-700">{sample.labName || "Not recorded"}</span></div>
              <div>Collector: <span className="text-stone-700">{sample.collectedByUser.name}</span></div>
            </div>

            {sample.resultSummary && (
              <div className="p-2.5 rounded-xl bg-[#FAF8F3] text-xs text-stone-700 border border-[#E5E0D8]">
                <strong>Diagnostic Finding:</strong> {sample.resultSummary}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openUpdateModal(sample)}
              className="w-full text-xs gap-1.5 border-[#D9D3C7] text-stone-700 hover:bg-[#FAF8F3] min-h-[36px]"
            >
              {t("updateSampleStatusModal")}
            </Button>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#E5E0D8] bg-white shadow-xs">
        <table className="w-full text-xs text-left text-stone-700">
          <thead className="bg-[#FAF8F3] text-stone-600 font-semibold uppercase tracking-wider border-b border-[#E5E0D8]">
            <tr>
              <th className="p-3">{t("caseNumberCol")}</th>
              <th className="p-3">{t("animalHeader")}</th>
              <th className="p-3">{t("labNameCol")}</th>
              <th className="p-3">{t("statusHeader")}</th>
              <th className="p-3">{t("collectionDateCol")}</th>
              <th className="p-3">{t("labFindingCol")}</th>
              <th className="p-3 text-right">{t("actionHeader")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E0D8]">
            {samples.map((sample) => (
              <tr key={sample.id} className="hover:bg-[#FAF8F3]/50">
                <td className="p-3 font-bold text-[#191F1C]">#{sample.case.caseNumber}</td>
                <td className="p-3">{sample.case.animal.tag} ({sample.case.animal.species})</td>
                <td className="p-3 text-stone-700">{sample.labName || "Not recorded"}</td>
                <td className="p-3">{getStatusBadge(sample.status)}</td>
                <td className="p-3 text-stone-500">{formatDate(sample.collectedAt)}</td>
                <td className="p-3 truncate max-w-xs text-stone-600">{sample.resultSummary || "Pending"}</td>
                <td className="p-3 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openUpdateModal(sample)}
                    className="text-xs h-7 border-[#D9D3C7] text-stone-700 hover:bg-[#FAF8F3]"
                  >
                    {t("update")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Update Sample Modal */}
      {activeSample && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-[#E5E0D8] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-[#191F1C] animate-scale-in">
            <div className="flex justify-between items-center border-b border-[#E5E0D8] pb-3">
              <h4 className="text-sm font-bold text-[#191F1C] flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-amber-600" />
                <span>{t("updateSampleStatusModal")} — #{activeSample.case.caseNumber}</span>
              </h4>
              <Button type="button" variant="ghost" size="sm" onClick={() => setActiveSample(null)} className="h-7 w-7 p-0 text-stone-500 cursor-pointer rounded-xl">✕</Button>
            </div>

            {/* Progressive 4-stage visual timeline */}
            <div className="grid grid-cols-4 gap-1 p-2 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] text-[10px] text-center font-medium">
              <div className={`p-1.5 rounded-xl transition-all ${newStatus === "COLLECTED" ? "bg-amber-100 text-amber-900 font-bold" : "text-stone-500"}`}>
                {t("statusStep1")}
              </div>
              <div className={`p-1.5 rounded-xl transition-all ${newStatus === "SENT" ? "bg-amber-100 text-amber-900 font-bold" : "text-stone-500"}`}>
                {t("statusStep2")}
              </div>
              <div className={`p-1.5 rounded-xl transition-all ${newStatus === "RESULT_PENDING" ? "bg-amber-100 text-amber-900 font-bold" : "text-stone-500"}`}>
                {t("statusStep3")}
              </div>
              <div className={`p-1.5 rounded-xl transition-all ${newStatus === "RESULT_RECEIVED" ? "bg-emerald-100 text-emerald-900 font-bold" : "text-stone-500"}`}>
                {t("statusStep4")}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-fade-in">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-stone-700 font-semibold mb-1 block">Sample Status</label>
                <select
                  value={newStatus}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewStatus(e.target.value as SampleStatus)}
                  className="w-full bg-[#FAF8F3] border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-2.5 min-h-[44px] focus:border-emerald-700"
                >
                  <option value="COLLECTED">Sample Collected (COLLECTED)</option>
                  <option value="SENT">Sent to Lab (SENT TO LAB)</option>
                  <option value="RESULT_PENDING">Result Pending (RESULT PENDING)</option>
                  <option value="RESULT_RECEIVED">Result Received (RESULT RECEIVED)</option>
                </select>
              </div>

              <div>
                <label className="text-stone-700 font-semibold mb-1 block">Laboratory Name</label>
                <Input
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  placeholder="e.g. Regional Animal Disease Investigation Laboratory"
                  className="bg-[#FAF8F3] border-[#D9D3C7] text-xs text-[#191F1C]"
                />
              </div>

              {newStatus === "RESULT_RECEIVED" && (
                <div>
                  <label className="text-stone-700 font-semibold mb-1 block">{t("diagnosticResultSummary")}</label>
                  <Textarea
                    value={resultSummary}
                    onChange={(e) => setResultSummary(e.target.value)}
                    placeholder="e.g. PCR confirmed positive for Lumpy Skin Disease virus"
                    rows={3}
                    className="bg-[#FAF8F3] border-[#D9D3C7] text-xs text-[#191F1C]"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E0D8]">
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveSample(null)} disabled={submitting} className="text-xs border-[#D9D3C7] text-stone-700">
                {t("cancel")}
              </Button>
              <Button type="button" size="sm" onClick={handleUpdateSample} disabled={submitting} className="text-xs bg-[#047857] hover:bg-[#065f46] text-white font-semibold gap-1.5 min-h-[36px]">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>{t("saveSampleRecord")}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
