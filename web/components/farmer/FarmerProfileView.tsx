"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FarmerProfileData,
  updateFarmerProfileAction,
} from "@/lib/actions/farmer";
import { getBlocks, getVillages } from "@/lib/actions/geo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Globe,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  X,
  ShieldCheck,
  Calendar,
  Info,
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

interface FarmerProfileViewProps {
  initialProfile: FarmerProfileData;
  districts: DistrictOption[];
}

export function FarmerProfileView({
  initialProfile,
  districts,
}: FarmerProfileViewProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<FarmerProfileData>(initialProfile);
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

  const primaryFarm = initialProfile.farms[0] || null;
  const [primaryFarmName, setPrimaryFarmName] = useState<string>(
    primaryFarm ? primaryFarm.name : ""
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
          if (active) setBlocks(loadedBlocks);
        } catch (err) {
          console.error("Failed to load initial blocks:", err);
        } finally {
          if (active) setLoadingBlocks(false);
        }
      }

      if (initialProfile.blockId) {
        setLoadingVillages(true);
        try {
          const loadedVillages = await getVillages(initialProfile.blockId);
          if (active) setVillages(loadedVillages);
        } catch (err) {
          console.error("Failed to load initial villages:", err);
        } finally {
          if (active) setLoadingVillages(false);
        }
      }
    }

    loadInitialLocations();
    return () => {
      active = false;
    };
  }, [initialProfile.districtId, initialProfile.blockId]);

  const handleDistrictChange = async (distId: string) => {
    setSelectedDistrictId(distId);
    setSelectedBlockId("");
    setSelectedVillageId("");
    setVillages([]);

    if (!distId) {
      setBlocks([]);
      return;
    }

    setLoadingBlocks(true);
    try {
      const data = await getBlocks(distId);
      setBlocks(data);
      if (data.length > 0) {
        setSelectedBlockId(data[0].id);
        setLoadingVillages(true);
        const villData = await getVillages(data[0].id);
        setVillages(villData);
        if (villData.length > 0) {
          setSelectedVillageId(villData[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load blocks:", err);
    } finally {
      setLoadingBlocks(false);
      setLoadingVillages(false);
    }
  };

  const handleBlockChange = async (blkId: string) => {
    setSelectedBlockId(blkId);
    setSelectedVillageId("");

    if (!blkId) {
      setVillages([]);
      return;
    }

    setLoadingVillages(true);
    try {
      const data = await getVillages(blkId);
      setVillages(data);
      if (data.length > 0) {
        setSelectedVillageId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load villages:", err);
    } finally {
      setLoadingVillages(false);
    }
  };

  const handleCancelEdit = () => {
    setName(profile.name);
    setPhone(profile.phone);
    setPreferredLanguage((profile.preferredLanguage as "en" | "hi" | "mr" | "bn") || "en");
    setSelectedDistrictId(profile.districtId || "");
    setSelectedBlockId(profile.blockId || "");
    setSelectedVillageId(profile.villageId || "");
    setPrimaryFarmName(primaryFarm ? primaryFarm.name : "");
    setIsEditing(false);
    setErrorMessage(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage("Please enter a valid name (at least 2 characters).");
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setErrorMessage("Please enter a valid 10-digit phone number.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await updateFarmerProfileAction({
        name: name.trim(),
        phone: phone.trim(),
        preferredLanguage,
        districtId: selectedDistrictId || null,
        blockId: selectedBlockId || null,
        villageId: selectedVillageId || null,
        primaryFarmId: primaryFarm?.id || null,
        primaryFarmName: primaryFarmName.trim() || null,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Unable to update profile. Please try again.");
      } else {
        setSuccessMessage("Profile updated successfully.");
        // Update local state to reflect changes
        const selectedDistObj = districts.find((d) => d.id === selectedDistrictId);
        const selectedBlockObj = blocks.find((b) => b.id === selectedBlockId);
        const selectedVillObj = villages.find((v) => v.id === selectedVillageId);

        setProfile((prev) => ({
          ...prev,
          name: name.trim(),
          phone: phone.trim(),
          preferredLanguage,
          districtId: selectedDistrictId || null,
          districtName: selectedDistObj?.name || prev.districtName,
          blockId: selectedBlockId || null,
          blockName: selectedBlockObj?.name || prev.blockName,
          villageId: selectedVillageId || null,
          villageName: selectedVillObj?.name || prev.villageName,
          farms: prev.farms.map((f, idx) =>
            idx === 0 && primaryFarmName.trim() ? { ...f, name: primaryFarmName.trim() } : f
          ),
        }));

        setIsEditing(false);
        router.refresh();
      }
    } catch (err: unknown) {
      console.error("[Profile Save Error]:", err);
      setErrorMessage("Unable to update profile right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const languageLabels: Record<string, string> = {
    en: "English",
    hi: "English",
    mr: "English",
    bn: "English",
  };

  const totalAnimals = profile.farms.reduce((acc, f) => acc + f.animalCount, 0);
  const formattedDate = formatDate(profile.createdAt);

  return (
    <div className="space-y-6">
      {/* SUCCESS / ERROR ALERTS */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-700 hover:text-red-900 text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* HEADER HERO CARD */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#E5E0D8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Avatar */}
          <div className="relative h-18 w-18 sm:h-20 sm:w-20 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-800 to-emerald-950 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0 border-2 border-emerald-600/30">
            {profile.imageUrl ? (
              <Image
                src={profile.imageUrl}
                alt={profile.name}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span>{profile.name.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-[#191F1C] tracking-tight">
                {profile.name}
              </h2>
              <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[11px] font-semibold">
                Farmer Profile
              </Badge>
              <Badge className="bg-stone-100 text-stone-700 border-[#D9D3C7] text-[10px]">
                {profile.status}
              </Badge>
            </div>
            <p className="text-xs text-stone-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-stone-400" />
              <span>Registered Member since {formattedDate}</span>
            </p>
          </div>
        </div>

        {/* Edit Button */}
        {!isEditing && (
          <Button
            type="button"
            onClick={() => {
              setIsEditing(true);
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-2 rounded-xl min-h-[42px] px-5 shadow-xs shrink-0 self-start md:self-auto hover-lift-sm"
          >
            <Edit3 className="h-4 w-4" />
            <span>Edit Profile</span>
          </Button>
        )}
      </div>

      {/* VIEW MODE */}
      {!isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Metrics */}
          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-[#E5E0D8] shadow-2xs">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                Registered Farms
              </span>
              <span className="text-xl font-bold text-stone-900 mt-1 block">
                {profile.farms.length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E5E0D8] shadow-2xs">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                Total Livestock
              </span>
              <span className="text-xl font-bold text-stone-900 mt-1 block">
                {totalAnimals}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E5E0D8] shadow-2xs">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                Assigned Territory
              </span>
              <span className="text-xs font-bold text-emerald-900 mt-1.5 block truncate">
                {profile.districtName || "Unassigned"}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E5E0D8] shadow-2xs">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                Language
              </span>
              <span className="text-xs font-bold text-stone-800 mt-1.5 block">
                {languageLabels[profile.preferredLanguage] || profile.preferredLanguage}
              </span>
            </div>
          </div>

          {/* Card 1: Personal Details */}
          <div className="p-6 rounded-3xl bg-white border border-[#E5E0D8] shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E5E0D8] pb-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                <User className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-[#191F1C]">Personal Information</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-stone-500 block text-[11px]">Full Name:</span>
                <span className="font-semibold text-stone-900 text-sm">{profile.name}</span>
              </div>

              <div>
                <span className="text-stone-500 block text-[11px]">Phone Number:</span>
                <span className="font-mono font-medium text-stone-900 flex items-center gap-1.5 mt-0.5">
                  <Phone className="h-3 w-3 text-emerald-700" />
                  <span>{profile.phone}</span>
                </span>
              </div>

              <div>
                <span className="text-stone-500 block text-[11px]">Email Address:</span>
                <span className="font-medium text-stone-900 flex items-center gap-1.5 mt-0.5">
                  <Mail className="h-3 w-3 text-stone-400" />
                  <span>{profile.email || "No email linked (Phone-based login)"}</span>
                </span>
                <span className="text-[10px] text-stone-400 block mt-0.5">
                  Managed via secure authentication account.
                </span>
              </div>

              <div>
                <span className="text-stone-500 block text-[11px]">Preferred Interface Language:</span>
                <span className="font-medium text-stone-900 flex items-center gap-1.5 mt-0.5">
                  <Globe className="h-3 w-3 text-emerald-700" />
                  <span>{languageLabels[profile.preferredLanguage] || "English"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Administrative Location */}
          <div className="p-6 rounded-3xl bg-white border border-[#E5E0D8] shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E5E0D8] pb-3">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                <MapPin className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-[#191F1C]">Administrative Location</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FAF8F3] rounded-xl border border-[#E5E0D8] space-y-2">
                <div className="flex justify-between items-center border-b border-[#E5E0D8] pb-1.5">
                  <span className="text-stone-500 text-[11px]">Village / Locality:</span>
                  <strong className="text-stone-900">{profile.villageName || "Not Set"}</strong>
                </div>
                <div className="flex justify-between items-center border-b border-[#E5E0D8] pb-1.5">
                  <span className="text-stone-500 text-[11px]">Block / Taluka:</span>
                  <strong className="text-stone-900">{profile.blockName || "Not Set"}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 text-[11px]">District:</span>
                  <strong className="text-stone-900">{profile.districtName || "Not Set"}</strong>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-950 space-y-1">
                <span className="font-bold block flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Surveillance Service Area</span>
                </span>
                <p className="text-stone-600">
                  Your registered village links you directly to the nearest Pashusakhi (Field Agent) and assigned Veterinary Officer for doorstep care.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Farm Infrastructure */}
          <div className="p-6 rounded-3xl bg-white border border-[#E5E0D8] shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E5E0D8] pb-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-800 border border-blue-200">
                <Building2 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-[#191F1C]">Farm Infrastructure</h3>
            </div>

            <div className="space-y-3 text-xs">
              {profile.farms.length > 0 ? (
                profile.farms.map((farm) => (
                  <div key={farm.id} className="p-3 bg-[#FAF8F3] rounded-xl border border-[#E5E0D8] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-stone-900 text-xs">{farm.name}</span>
                      <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px]">
                        {farm.animalCount} Animals
                      </Badge>
                    </div>
                    <span className="text-[11px] text-stone-600 block">
                      Location: {farm.villageName}, {farm.blockName}, {farm.districtName}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono block">
                      GPS: {farm.latitude.toFixed(4)}, {farm.longitude.toFixed(4)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-center text-stone-500">
                  No farm recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* EDIT MODE FORM */
        <form onSubmit={handleSaveProfile} className="p-6 md:p-8 rounded-3xl bg-white border border-emerald-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Edit3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#191F1C]">Edit Farmer Profile</h3>
                <p className="text-xs text-stone-500">
                  Update your contact details, preferred language, administrative location, and primary farm name.
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-xs font-semibold">
              Editing
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-emerald-700" />
                <span>Full Name *</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Ramesh Patil"
                className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl min-h-[44px]"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-700" />
                <span>Phone Number *</span>
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="e.g. +91 98765 43210"
                className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl min-h-[44px]"
              />
            </div>

            {/* Preferred Language */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-emerald-700" />
                <span>Preferred Language</span>
              </Label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as "en" | "hi" | "mr" | "bn")}
                className="w-full bg-white border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-3 focus:border-emerald-600 focus:outline-none min-h-[44px]"
              >
                <option value="en">English</option>
              </select>
            </div>

            {/* Primary Farm Name (if farm exists) */}
            {primaryFarm && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Primary Farm Name</span>
                </Label>
                <Input
                  value={primaryFarmName}
                  onChange={(e) => setPrimaryFarmName(e.target.value)}
                  placeholder="e.g. Patil Dairy Farm"
                  className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl min-h-[44px]"
                />
              </div>
            )}
          </div>

          {/* Location Hierarchy Selectors */}
          <div className="p-5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-2.5">
              <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-emerald-700" />
                <span>Administrative Jurisdiction Hierarchy</span>
              </span>
              <span className="text-[10px] text-stone-500">
                Controls Field Agent & Vet routing
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. District */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-stone-700">District *</Label>
                <select
                  value={selectedDistrictId}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  required
                  className="w-full bg-white border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-2.5 focus:border-emerald-600 focus:outline-none min-h-[40px]"
                >
                  <option value="">Select District</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Block */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                  <span>Block / Taluka</span>
                  {loadingBlocks && <Loader2 className="h-3 w-3 animate-spin text-emerald-700" />}
                </Label>
                <select
                  value={selectedBlockId}
                  onChange={(e) => handleBlockChange(e.target.value)}
                  disabled={loadingBlocks || blocks.length === 0}
                  className="w-full bg-white border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-2.5 focus:border-emerald-600 focus:outline-none min-h-[40px] disabled:bg-stone-100 disabled:text-stone-400"
                >
                  <option value="">{blocks.length === 0 ? "No blocks found" : "Select Block"}</option>
                  {blocks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Village */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                  <span>Village / Locality</span>
                  {loadingVillages && <Loader2 className="h-3 w-3 animate-spin text-emerald-700" />}
                </Label>
                <select
                  value={selectedVillageId}
                  onChange={(e) => setSelectedVillageId(e.target.value)}
                  disabled={loadingVillages || villages.length === 0}
                  className="w-full bg-white border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-2.5 focus:border-emerald-600 focus:outline-none min-h-[40px] disabled:bg-stone-100 disabled:text-stone-400"
                >
                  <option value="">{villages.length === 0 ? "No villages found" : "Select Village"}</option>
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-[11px] text-amber-950 flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              Modifying your profile location updates your personal profile and routing for future assistance requests. Historical cases and existing clinical reports will retain their original record.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelEdit}
              disabled={submitting}
              className="text-xs border-[#D9D3C7] text-stone-700 hover:bg-stone-50 rounded-xl min-h-[42px] gap-1.5"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-2 rounded-xl min-h-[42px] px-6 shadow-sm hover-lift-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
