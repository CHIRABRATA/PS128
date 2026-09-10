"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  VetProfileData,
  updateVetProfileAction,
} from "@/lib/actions/vet";
import { getBlocks, getVillages } from "@/lib/actions/geo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  Globe,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  X,
  ShieldCheck,
  Calendar,
  Award,
} from "lucide-react";

interface DistrictOption {
  id: string;
  name: string;
}

interface BlockOption {
  id: string;
  name: string;
  districtId: string;
}

interface VillageOption {
  id: string;
  name: string;
  blockId: string;
}

interface VetProfileViewProps {
  initialProfile: VetProfileData;
  districts: DistrictOption[];
}

export function VetProfileView({
  initialProfile,
  districts,
}: VetProfileViewProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<VetProfileData>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState(initialProfile.name);
  const [phone, setPhone] = useState(initialProfile.phone);
  const [preferredLanguage, setPreferredLanguage] = useState<"en" | "hi" | "mr" | "bn">(
    (initialProfile.preferredLanguage as "en" | "hi" | "mr" | "bn") || "en"
  );
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(
    initialProfile.districtId || (districts.length > 0 ? districts[0].id : "")
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string>(
    initialProfile.blockId || ""
  );
  const [selectedVillageId, setSelectedVillageId] = useState<string>(
    initialProfile.villageId || ""
  );

  // Dynamic dropdown lists for Location Hierarchy
  const [blocks, setBlocks] = useState<BlockOption[]>([]);
  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  // Initial load of blocks and villages for the current profile
  useEffect(() => {
    let active = true;
    async function loadInitialLocations() {
      if (initialProfile.districtId) {
        setLoadingBlocks(true);
        try {
          const loadedBlocks = await getBlocks(initialProfile.districtId);
          if (active) {
            setBlocks(loadedBlocks);
            if (initialProfile.blockId) {
              setLoadingVillages(true);
              const loadedVillages = await getVillages(initialProfile.blockId);
              if (active) {
                setVillages(loadedVillages);
              }
            }
          }
        } catch (e) {
          console.error("Failed to load initial blocks/villages:", e);
        } finally {
          if (active) {
            setLoadingBlocks(false);
            setLoadingVillages(false);
          }
        }
      }
    }
    loadInitialLocations();
    return () => {
      active = false;
    };
  }, [initialProfile.districtId, initialProfile.blockId]);

  // Handle District Change
  const handleDistrictChange = async (newDistrictId: string) => {
    setSelectedDistrictId(newDistrictId);
    setSelectedBlockId("");
    setSelectedVillageId("");
    setVillages([]);

    if (!newDistrictId) {
      setBlocks([]);
      return;
    }

    setLoadingBlocks(true);
    try {
      const loadedBlocks = await getBlocks(newDistrictId);
      setBlocks(loadedBlocks);
    } catch (e) {
      console.error("Failed to load blocks for district:", e);
    } finally {
      setLoadingBlocks(false);
    }
  };

  // Handle Block Change
  const handleBlockChange = async (newBlockId: string) => {
    setSelectedBlockId(newBlockId);
    setSelectedVillageId("");

    if (!newBlockId) {
      setVillages([]);
      return;
    }

    setLoadingVillages(true);
    try {
      const loadedVillages = await getVillages(newBlockId);
      setVillages(loadedVillages);
    } catch (e) {
      console.error("Failed to load villages for block:", e);
    } finally {
      setLoadingVillages(false);
    }
  };

  // Reset Edit Form
  const handleCancel = () => {
    setName(profile.name);
    setPhone(profile.phone);
    setPreferredLanguage((profile.preferredLanguage as "en" | "hi" | "mr" | "bn") || "en");
    setSelectedDistrictId(profile.districtId || (districts.length > 0 ? districts[0].id : ""));
    setSelectedBlockId(profile.blockId || "");
    setSelectedVillageId(profile.villageId || "");
    setIsEditing(false);
    setErrorMessage(null);
  };

  // Save Profile
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic Validation
    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage("Please enter a valid full name (at least 2 characters).");
      return;
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid phone number (at least 10 digits).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateVetProfileAction({
        name: name.trim(),
        phone: cleanPhone,
        preferredLanguage,
        districtId: selectedDistrictId || null,
        blockId: selectedBlockId || null,
        villageId: selectedVillageId || null,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update profile.");
      } else {
        setSuccessMessage("Profile updated successfully.");
        setIsEditing(false);

        // Update local state
        const selectedDistObj = districts.find((d) => d.id === selectedDistrictId);
        const selectedBlockObj = blocks.find((b) => b.id === selectedBlockId);
        const selectedVillageObj = villages.find((v) => v.id === selectedVillageId);

        setProfile((prev) => ({
          ...prev,
          name: name.trim(),
          phone: cleanPhone,
          preferredLanguage,
          districtId: selectedDistrictId || null,
          districtName: selectedDistObj ? selectedDistObj.name : prev.districtName,
          blockId: selectedBlockId || null,
          blockName: selectedBlockObj ? selectedBlockObj.name : prev.blockName,
          villageId: selectedVillageId || null,
          villageName: selectedVillageObj ? selectedVillageObj.name : prev.villageName,
        }));

        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const getLanguageLabel = (code: string) => {
    switch (code) {
      case "hi":
        return "हिंदी (Hindi)";
      case "mr":
        return "मराठी (Marathi)";
      case "bn":
        return "বাংলা (Bengali)";
      default:
        return "English";
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Summary & Avatar Card */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-[#E5E0D8] bg-white shadow-xs flex flex-col items-center text-center space-y-4">
            <div className="relative">
              {profile.imageUrl ? (
                <Image
                  src={profile.imageUrl}
                  alt={profile.name}
                  width={96}
                  height={96}
                  className="rounded-full border-4 border-emerald-100 object-cover shadow-sm"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center text-emerald-800 text-2xl font-bold shadow-sm">
                  {profile.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "DR"}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-700 text-white border-2 border-white shadow-xs">
                <Stethoscope className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-1 w-full">
              <h2 className="text-xl font-bold text-[#191F1C] tracking-tight">
                {profile.name}
              </h2>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Badge className="bg-emerald-100 text-emerald-950 border-emerald-300 text-[10px] font-semibold">
                  <ShieldCheck className="h-3 w-3 mr-1 text-emerald-700" />
                  {profile.role}
                </Badge>
                <Badge className="bg-blue-50 text-blue-900 border-blue-200 text-[10px] font-semibold">
                  {profile.status}
                </Badge>
              </div>
            </div>

            <div className="w-full border-t border-[#E5E0D8] pt-4 text-xs space-y-2.5 text-left">
              <div className="flex items-center justify-between text-stone-600">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Mail className="h-3.5 w-3.5 text-stone-400" />
                  Email
                </span>
                <span className="font-medium text-stone-900 truncate max-w-[160px]" title={profile.email || "Not linked"}>
                  {profile.email || "Not linked"}
                </span>
              </div>

              <div className="flex items-center justify-between text-stone-600">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Phone className="h-3.5 w-3.5 text-stone-400" />
                  Phone
                </span>
                <span className="font-medium text-stone-900">{profile.phone}</span>
              </div>

              <div className="flex items-center justify-between text-stone-600">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Globe className="h-3.5 w-3.5 text-stone-400" />
                  Language
                </span>
                <span className="font-medium text-stone-900">
                  {getLanguageLabel(profile.preferredLanguage)}
                </span>
              </div>

              <div className="flex items-center justify-between text-stone-600">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Calendar className="h-3.5 w-3.5 text-stone-400" />
                  Registered
                </span>
                <span className="font-medium text-stone-900">
                  {new Date(profile.createdAt).toLocaleDateString([], {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>

            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="w-full gap-2 text-xs border-emerald-300 text-emerald-900 bg-emerald-50/50 hover:bg-emerald-100 rounded-xl min-h-[38px] shadow-2xs font-semibold"
              >
                <Edit3 className="h-3.5 w-3.5 text-emerald-700" />
                <span>Edit Profile</span>
              </Button>
            )}
          </div>

          {/* Clinical Activity KPI Card */}
          <div className="p-5 rounded-3xl border border-[#E5E0D8] bg-white shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <Award className="h-4 w-4" />
              <span>Clinical Record Metrics</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
                <span className="text-[10px] text-stone-500 font-medium block">Active Queue</span>
                <span className="text-lg font-bold text-emerald-900">
                  {profile.assignedActiveCasesCount}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
                <span className="text-[10px] text-stone-500 font-medium block">Reports</span>
                <span className="text-lg font-bold text-stone-900">
                  {profile.authoredReportsCount}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
                <span className="text-[10px] text-stone-500 font-medium block">Reviewed</span>
                <span className="text-lg font-bold text-stone-900">
                  {profile.reviewedCasesCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed View / Edit Form (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl border border-[#E5E0D8] bg-white shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#191F1C]">
                  {isEditing ? "Edit Veterinary Profile" : "Veterinarian Account & Jurisdiction"}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {isEditing
                    ? "Update your personal details, preferred language, and clinical service area."
                    : "Official credential details and authorized geographical service boundaries."}
                </p>
              </div>

              {isEditing && (
                <Badge className="bg-amber-100 text-amber-950 border-amber-300 text-[10px] font-semibold">
                  Editing Mode
                </Badge>
              )}
            </div>

            {isEditing ? (
              /* EDIT FORM */
              <form onSubmit={handleSave} className="space-y-5 text-xs">
                <div className="space-y-4">
                  {/* Personal Information Section */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-emerald-700" />
                      <span>1. Personal & Contact Details</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="vet-name" className="text-xs font-semibold text-stone-700">
                          Full Name *
                        </Label>
                        <Input
                          id="vet-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={submitting}
                          placeholder="Dr. Full Name"
                          className="bg-white border-[#D9D3C7] text-xs rounded-xl"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="vet-phone" className="text-xs font-semibold text-stone-700">
                          Phone Number *
                        </Label>
                        <Input
                          id="vet-phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={submitting}
                          placeholder="+91 9876543210"
                          className="bg-white border-[#D9D3C7] text-xs rounded-xl"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="vet-email" className="text-xs font-semibold text-stone-700">
                          Email (Managed via Authentication Identity)
                        </Label>
                        <Input
                          id="vet-email"
                          value={profile.email || "No email linked"}
                          disabled
                          className="bg-stone-50 border-[#E5E0D8] text-xs text-stone-500 rounded-xl cursor-not-allowed"
                        />
                        <p className="text-[10px] text-stone-400">
                          Email address is derived securely from your authentication session.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="vet-language" className="text-xs font-semibold text-stone-700">
                          Preferred Communication Language
                        </Label>
                        <select
                          id="vet-language"
                          value={preferredLanguage}
                          onChange={(e) =>
                            setPreferredLanguage(e.target.value as "en" | "hi" | "mr" | "bn")
                          }
                          disabled={submitting}
                          className="w-full bg-white border border-[#D9D3C7] text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                        >
                          <option value="en">English</option>
                          <option value="hi">हिंदी (Hindi)</option>
                          <option value="mr">मराठी (Marathi)</option>
                          <option value="bn">বাংলা (Bengali)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Professional & Role Constraints Notice */}
                  <div className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] text-[11px] text-stone-600 flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900 block font-semibold">Security & Role Authorization:</strong>
                      <span>
                        Clinical role (<span className="font-mono text-emerald-800">VETERINARIAN</span>) and account status are strictly managed by system governance and cannot be modified directly.
                      </span>
                    </div>
                  </div>

                  {/* Location & Service Jurisdiction Hierarchy */}
                  <div className="space-y-3 pt-3 border-t border-[#E5E0D8]">
                    <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                      <span>2. Service Location Jurisdiction</span>
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Selecting your service district, block, and village determines your case assignment eligibility in the automated routing hierarchy.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* District Selector */}
                      <div className="space-y-1.5">
                        <Label htmlFor="vet-district" className="text-xs font-semibold text-stone-700">
                          District *
                        </Label>
                        <select
                          id="vet-district"
                          value={selectedDistrictId}
                          onChange={(e) => handleDistrictChange(e.target.value)}
                          disabled={submitting}
                          className="w-full bg-white border border-[#D9D3C7] text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                        >
                          <option value="">-- Select District --</option>
                          {districts.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Block Selector */}
                      <div className="space-y-1.5">
                        <Label htmlFor="vet-block" className="text-xs font-semibold text-stone-700 flex items-center justify-between">
                          <span>Block / Taluka</span>
                          {loadingBlocks && <Loader2 className="h-3 w-3 animate-spin text-emerald-700" />}
                        </Label>
                        <select
                          id="vet-block"
                          value={selectedBlockId}
                          onChange={(e) => handleBlockChange(e.target.value)}
                          disabled={submitting || !selectedDistrictId || loadingBlocks}
                          className="w-full bg-white border border-[#D9D3C7] text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:bg-stone-50 disabled:cursor-not-allowed"
                        >
                          <option value="">-- Select Block --</option>
                          {blocks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Village Selector */}
                      <div className="space-y-1.5">
                        <Label htmlFor="vet-village" className="text-xs font-semibold text-stone-700 flex items-center justify-between">
                          <span>Village / Locality</span>
                          {loadingVillages && <Loader2 className="h-3 w-3 animate-spin text-emerald-700" />}
                        </Label>
                        <select
                          id="vet-village"
                          value={selectedVillageId}
                          onChange={(e) => setSelectedVillageId(e.target.value)}
                          disabled={submitting || !selectedBlockId || loadingVillages}
                          className="w-full bg-white border border-[#D9D3C7] text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:bg-stone-50 disabled:cursor-not-allowed"
                        >
                          <option value="">-- Select Village --</option>
                          {villages.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E5E0D8]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={submitting}
                    className="text-xs border-[#D9D3C7] text-stone-700 hover:bg-stone-50 rounded-xl min-h-[38px] px-4"
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    <span>Cancel</span>
                  </Button>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl min-h-[38px] px-5 shadow-xs"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              /* READONLY VIEW */
              <div className="space-y-6 text-xs">
                {/* Personal Information */}
                <div className="space-y-3">
                  <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Personal Information</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
                      <span className="text-[10px] text-stone-500 font-medium block">Full Name</span>
                      <span className="text-sm font-bold text-stone-900 mt-0.5 block">{profile.name}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
                      <span className="text-[10px] text-stone-500 font-medium block">Primary Phone</span>
                      <span className="text-sm font-bold text-stone-900 mt-0.5 block">{profile.phone}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
                      <span className="text-[10px] text-stone-500 font-medium block">Email Address</span>
                      <span className="text-xs font-semibold text-stone-800 mt-0.5 block">
                        {profile.email || "No email linked"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
                      <span className="text-[10px] text-stone-500 font-medium block">Language Preference</span>
                      <span className="text-xs font-semibold text-stone-800 mt-0.5 block">
                        {getLanguageLabel(profile.preferredLanguage)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Professional & Jurisdiction Information */}
                <div className="space-y-3 pt-3 border-t border-[#E5E0D8]">
                  <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Professional Information & Authorization</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
                      <span className="text-[10px] text-stone-500 font-medium block">Clinical Role</span>
                      <span className="text-xs font-bold text-emerald-900 mt-0.5 block">
                        Veterinary Medical Officer ({profile.role})
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
                      <span className="text-[10px] text-stone-500 font-medium block">Account Verification Status</span>
                      <span className="text-xs font-bold text-emerald-900 mt-0.5 block">
                        {profile.status} (Authorized Clinician)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Service Location Jurisdiction */}
                <div className="space-y-3 pt-3 border-t border-[#E5E0D8]">
                  <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Registered Service Jurisdiction</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
                      <span className="text-[10px] text-stone-500 font-medium block">District</span>
                      <strong className="text-stone-900 text-xs mt-0.5 block">
                        {profile.districtName || "Unassigned District"}
                      </strong>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
                      <span className="text-[10px] text-stone-500 font-medium block">Block / Taluka</span>
                      <strong className="text-stone-900 text-xs mt-0.5 block">
                        {profile.blockName || "All District Blocks"}
                      </strong>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
                      <span className="text-[10px] text-stone-500 font-medium block">Village / Locality</span>
                      <strong className="text-stone-900 text-xs mt-0.5 block">
                        {profile.villageName || "Block-wide Scope"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
