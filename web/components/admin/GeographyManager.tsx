"use client";

import React, { useState, useTransition } from "react";
import {
  createDistrictAction,
  updateDistrictAction,
  createBlockAction,
  updateBlockAction,
  createVillageAction,
  updateVillageAction,
  getGeographyTreeAction,
} from "@/lib/actions/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Building2,
  Home,
  Plus,
  Edit2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  FolderTree,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface Village {
  id: string;
  name: string;
  blockId: string;
}

interface Block {
  id: string;
  name: string;
  districtId: string;
  villages: Village[];
}

interface District {
  id: string;
  name: string;
  blocks: Block[];
}

interface GeographyManagerProps {
  initialDistricts: District[];
}

type ModalType =
  | "ADD_DISTRICT"
  | "EDIT_DISTRICT"
  | "ADD_BLOCK"
  | "EDIT_BLOCK"
  | "ADD_VILLAGE"
  | "EDIT_VILLAGE"
  | null;

export function GeographyManager({ initialDistricts }: GeographyManagerProps) {
  const t = useTranslations("admin");
  const [districts, setDistricts] = useState<District[]>(initialDistricts);
  const [expandedDistricts, setExpandedDistricts] = useState<Record<string, boolean>>({});
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalTarget, setModalTarget] = useState<{
    districtId?: string;
    districtName?: string;
    blockId?: string;
    blockName?: string;
    villageId?: string;
    villageName?: string;
  }>({});

  const [formName, setFormName] = useState("");
  const [formParentId, setFormParentId] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const refreshTree = () => {
    startTransition(async () => {
      try {
        const tree = await getGeographyTreeAction();
        setDistricts(tree);
      } catch (err) {
        console.error("Failed to refresh geography tree:", err);
      }
    });
  };

  const toggleDistrict = (id: string) => {
    setExpandedDistricts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleBlock = (id: string) => {
    setExpandedBlocks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openModal = (
    type: ModalType,
    target: {
      districtId?: string;
      districtName?: string;
      blockId?: string;
      blockName?: string;
      villageId?: string;
      villageName?: string;
    } = {}
  ) => {
    setActiveModal(type);
    setModalTarget(target);
    setFormError(null);
    setFormSuccess(null);
    setFormReason("");

    if (type === "EDIT_DISTRICT") {
      setFormName(target.districtName || "");
      setFormParentId("");
    } else if (type === "ADD_BLOCK") {
      setFormName("");
      setFormParentId(target.districtId || (districts[0]?.id ?? ""));
    } else if (type === "EDIT_BLOCK") {
      setFormName(target.blockName || "");
      setFormParentId(target.districtId || "");
    } else if (type === "ADD_VILLAGE") {
      setFormName("");
      setFormParentId(target.blockId || "");
    } else if (type === "EDIT_VILLAGE") {
      setFormName(target.villageName || "");
      setFormParentId(target.blockId || "");
    } else {
      setFormName("");
      setFormParentId("");
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalTarget({});
    setFormName("");
    setFormParentId("");
    setFormReason("");
    setFormError(null);
    setFormSuccess(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const cleanName = formName.trim();
    if (!cleanName) {
      setFormError("Name cannot be empty.");
      return;
    }

    startTransition(async () => {
      try {
        if (activeModal === "ADD_DISTRICT") {
          const res = await createDistrictAction({ name: cleanName, reason: formReason.trim() || undefined });
          if (!res.success) {
            setFormError(res.error || "Failed to create district.");
            return;
          }
        } else if (activeModal === "EDIT_DISTRICT" && modalTarget.districtId) {
          const res = await updateDistrictAction(modalTarget.districtId, {
            name: cleanName,
            reason: formReason.trim() || undefined,
          });
          if (!res.success) {
            setFormError(res.error || "Failed to update district.");
            return;
          }
        } else if (activeModal === "ADD_BLOCK") {
          const res = await createBlockAction({
            districtId: formParentId,
            name: cleanName,
            reason: formReason.trim() || undefined,
          });
          if (!res.success) {
            setFormError(res.error || "Failed to create block.");
            return;
          }
          if (formParentId) {
            setExpandedDistricts((prev) => ({ ...prev, [formParentId]: true }));
          }
        } else if (activeModal === "EDIT_BLOCK" && modalTarget.blockId) {
          const res = await updateBlockAction(modalTarget.blockId, {
            name: cleanName,
            districtId: formParentId || undefined,
            reason: formReason.trim() || undefined,
          });
          if (!res.success) {
            setFormError(res.error || "Failed to update block.");
            return;
          }
        } else if (activeModal === "ADD_VILLAGE") {
          const res = await createVillageAction({
            blockId: formParentId,
            name: cleanName,
            reason: formReason.trim() || undefined,
          });
          if (!res.success) {
            setFormError(res.error || "Failed to create village.");
            return;
          }
          if (formParentId) {
            setExpandedBlocks((prev) => ({ ...prev, [formParentId]: true }));
          }
        } else if (activeModal === "EDIT_VILLAGE" && modalTarget.villageId) {
          const res = await updateVillageAction(modalTarget.villageId, {
            name: cleanName,
            blockId: formParentId || undefined,
            reason: formReason.trim() || undefined,
          });
          if (!res.success) {
            setFormError(res.error || "Failed to update village.");
            return;
          }
        }

        // Refresh tree and close
        const updatedTree = await getGeographyTreeAction();
        setDistricts(updatedTree);
        closeModal();
      } catch (err: unknown) {
        setFormError((err as Error)?.message || "An unexpected error occurred.");
      }
    });
  };

  // Summary counts
  const totalDistricts = districts.length;
  const totalBlocks = districts.reduce((acc, d) => acc + d.blocks.length, 0);
  const totalVillages = districts.reduce(
    (acc, d) => acc + d.blocks.reduce((bAcc, b) => bAcc + b.villages.length, 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Bar / Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-[#E5E0D8] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              {t("districtsCount")}
            </span>
            <div className="text-2xl font-black font-mono text-stone-900 mt-1">
              {totalDistricts}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E5E0D8] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              {t("blocksCount")}
            </span>
            <div className="text-2xl font-black font-mono text-stone-900 mt-1">
              {totalBlocks}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
            <MapPin className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E5E0D8] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              {t("villagesCount")}
            </span>
            <div className="text-2xl font-black font-mono text-stone-900 mt-1">
              {totalVillages}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Home className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Hierarchy Card */}
      <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 bg-[#FAF8F3] border-b border-[#E5E0D8]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                <FolderTree className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-[#191F1C]">
                  {t("adminGeoTree")}
                </CardTitle>
                <CardDescription className="text-xs text-stone-500">
                  {t("strictHierarchy")}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshTree}
                disabled={isPending}
                className="h-8 text-xs rounded-xl border-[#D9D3C7] gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
                <span>{t("refresh")}</span>
              </Button>
              <Button
                size="sm"
                onClick={() => openModal("ADD_DISTRICT")}
                className="h-8 text-xs rounded-xl bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t("addDistrict")}</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-3">
          {districts.length === 0 ? (
            <div className="text-center py-12 text-stone-500 bg-[#FAF8F3]/50 rounded-2xl border border-[#E5E0D8]">
              <MapPin className="h-8 w-8 mx-auto text-stone-300 mb-2" />
              <span className="block font-medium">{t("noDistrictsConfigured")}</span>
              <span className="text-[11px] text-stone-400">
                {t("clickAddDistrict")}
              </span>
            </div>
          ) : (
            districts.map((district) => {
              const isDistrictExpanded = !!expandedDistricts[district.id];
              return (
                <div
                  key={district.id}
                  className="rounded-2xl border border-[#E5E0D8] bg-white overflow-hidden shadow-2xs"
                >
                  {/* District Row */}
                  <div className="p-3 sm:p-4 bg-[#FAF8F3]/70 hover:bg-[#FAF8F3] transition-colors flex items-center justify-between gap-3">
                    <div
                      className="flex items-center gap-2 cursor-pointer flex-1 select-none"
                      onClick={() => toggleDistrict(district.id)}
                    >
                      <button className="text-stone-500 hover:text-stone-900 p-0.5">
                        {isDistrictExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <Building2 className="h-4 w-4 text-purple-700 shrink-0" />
                      <span className="font-bold text-sm text-stone-900">{district.name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono border-purple-200 text-purple-900 bg-purple-50">
                        {t("blocksCountBadge", { count: district.blocks.length })}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          openModal("ADD_BLOCK", {
                            districtId: district.id,
                            districtName: district.name,
                          })
                        }
                        className="h-7 px-2 text-xs rounded-lg text-purple-800 hover:bg-purple-100 gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span className="hidden sm:inline">{t("addBlock")}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          openModal("EDIT_DISTRICT", {
                            districtId: district.id,
                            districtName: district.name,
                          })
                        }
                        className="h-7 px-2 text-xs rounded-lg text-stone-600 hover:bg-stone-200"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Blocks under District */}
                  {isDistrictExpanded && (
                    <div className="p-3 sm:p-4 pl-6 sm:pl-8 space-y-2.5 bg-stone-50/50 border-t border-[#E5E0D8]">
                      {district.blocks.length === 0 ? (
                        <div className="text-xs text-stone-400 italic py-2">
                          {t("noBlocksInDistrict")}
                        </div>
                      ) : (
                        district.blocks.map((block) => {
                          const isBlockExpanded = !!expandedBlocks[block.id];
                          return (
                            <div
                              key={block.id}
                              className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-2xs"
                            >
                              {/* Block Row */}
                              <div className="p-2.5 sm:p-3 bg-white hover:bg-stone-50 transition-colors flex items-center justify-between gap-3">
                                <div
                                  className="flex items-center gap-2 cursor-pointer flex-1 select-none"
                                  onClick={() => toggleBlock(block.id)}
                                >
                                  <button className="text-stone-400 hover:text-stone-800 p-0.5">
                                    {isBlockExpanded ? (
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                  <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                  <span className="font-semibold text-xs text-stone-800">
                                    {block.name}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] font-mono border-blue-200 text-blue-900 bg-blue-50"
                                  >
                                    {t("villagesCountBadge", { count: block.villages.length })}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      openModal("ADD_VILLAGE", {
                                        blockId: block.id,
                                        blockName: block.name,
                                        districtId: district.id,
                                        districtName: district.name,
                                      })
                                    }
                                    className="h-6 px-1.5 text-[11px] rounded-lg text-blue-700 hover:bg-blue-50 gap-1"
                                  >
                                    <Plus className="h-2.5 w-2.5" />
                                    <span className="hidden sm:inline">{t("addVillage")}</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      openModal("EDIT_BLOCK", {
                                        blockId: block.id,
                                        blockName: block.name,
                                        districtId: district.id,
                                      })
                                    }
                                    className="h-6 px-1.5 text-[11px] rounded-lg text-stone-500 hover:bg-stone-100"
                                  >
                                    <Edit2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Villages under Block */}
                              {isBlockExpanded && (
                                <div className="p-2 sm:p-3 pl-6 sm:pl-8 space-y-1.5 bg-stone-50/80 border-t border-stone-100">
                                  {block.villages.length === 0 ? (
                                    <div className="text-[11px] text-stone-400 italic py-1">
                                      {t("noVillagesInBlock")}
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                      {block.villages.map((village) => (
                                        <div
                                          key={village.id}
                                          className="p-2 rounded-lg bg-white border border-stone-200 flex items-center justify-between text-xs hover:border-emerald-300 transition-colors"
                                        >
                                          <div className="flex items-center gap-1.5 truncate">
                                            <Home className="h-3 w-3 text-emerald-600 shrink-0" />
                                            <span className="font-medium text-stone-800 truncate">
                                              {village.name}
                                            </span>
                                          </div>

                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              openModal("EDIT_VILLAGE", {
                                                villageId: village.id,
                                                villageName: village.name,
                                                blockId: block.id,
                                                districtId: district.id,
                                              })
                                            }
                                            className="h-5 w-5 p-0 text-stone-400 hover:text-stone-700"
                                          >
                                            <Edit2 className="h-2.5 w-2.5" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Modal Dialog */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5E0D8] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 sm:p-5 bg-[#FAF8F3] border-b border-[#E5E0D8] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#191F1C]">
                    {activeModal === "ADD_DISTRICT" && "Create New District"}
                    {activeModal === "EDIT_DISTRICT" && `Edit District: ${modalTarget.districtName}`}
                    {activeModal === "ADD_BLOCK" && "Create New Block / Tehsil"}
                    {activeModal === "EDIT_BLOCK" && `Edit Block: ${modalTarget.blockName}`}
                    {activeModal === "ADD_VILLAGE" && "Create New Village"}
                    {activeModal === "EDIT_VILLAGE" && `Edit Village: ${modalTarget.villageName}`}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {t("mutationAuditDesc")}
                  </p>
                </div>
              </div>

              <button
                onClick={closeModal}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-4 sm:p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Parent Selector if creating/editing Block */}
              {(activeModal === "ADD_BLOCK" || activeModal === "EDIT_BLOCK") && (
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    {t("parentDistrict")} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formParentId}
                    onChange={(e) => setFormParentId(e.target.value)}
                    required
                    className="w-full text-xs h-9 rounded-xl border border-[#D9D3C7] bg-white px-3 text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  >
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Parent Selector if creating/editing Village */}
              {(activeModal === "ADD_VILLAGE" || activeModal === "EDIT_VILLAGE") && (
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    {t("parentBlock")} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formParentId}
                    onChange={(e) => setFormParentId(e.target.value)}
                    required
                    className="w-full text-xs h-9 rounded-xl border border-[#D9D3C7] bg-white px-3 text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  >
                    {districts.flatMap((d) =>
                      d.blocks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {d.name} &gt; {b.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Entity Name */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder={t("placeholderMayurbhanj")}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="text-xs h-9 rounded-xl border-[#D9D3C7]"
                />
              </div>

              {/* Audit Reason */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  {t("adminReasonLabel")}
                </label>
                <Input
                  placeholder={t("placeholderGovNotif")}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className="text-xs h-9 rounded-xl border-[#D9D3C7]"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">
                  {t("adminReasonDesc")}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F0EBE1]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeModal}
                  disabled={isPending}
                  className="text-xs rounded-xl border-[#D9D3C7]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="text-xs rounded-xl bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {isPending ? "Saving..." : "Save Master Data"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
