"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, UserCheck, Stethoscope, Building2, CheckCircle2, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { completeOnboardingAction } from "@/lib/actions/auth";
import { getDistricts, getBlocks, getVillages } from "@/lib/actions/geo";
import { LocationSearch, SelectedLocationData } from "@/components/geo/LocationSearch";
import { useLocale } from "@/components/layout/LocaleProvider";
import { Locale } from "@/lib/i18n";

interface GeoItem {
  id: string;
  name: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { locale } = useLocale();

  const [selectedRole, setSelectedRole] = useState<"FARMER" | "FIELD_AGENT" | "VETERINARIAN" | "DISTRICT_AUTHORITY">("FARMER");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [language] = useState<Locale>(locale);

  const [districts, setDistricts] = useState<GeoItem[]>([]);
  const [blocks, setBlocks] = useState<GeoItem[]>([]);
  const [villages, setVillages] = useState<GeoItem[]>([]);

  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedVillage, setSelectedVillage] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocationData | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load districts on mount
  useEffect(() => {
    getDistricts().then((res) => setDistricts(res));
  }, []);

  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrict(districtId);
    setSelectedBlock("");
    setVillages([]);
    setSelectedVillage("");
    if (districtId) {
      getBlocks(districtId).then((res) => setBlocks(res));
    } else {
      setBlocks([]);
    }
  };

  const handleBlockChange = (blockId: string) => {
    setSelectedBlock(blockId);
    setSelectedVillage("");
    if (blockId) {
      getVillages(blockId).then((res) => setVillages(res));
    } else {
      setVillages([]);
    }
  };

  const handleLocationSearchResult = (loc: SelectedLocationData) => {
    setSelectedLocation(loc);
    if (loc.districtId) {
      setSelectedDistrict(loc.districtId);
      getBlocks(loc.districtId).then((nextBlocks) => {
        setBlocks(nextBlocks);
        if (loc.blockId) {
          setSelectedBlock(loc.blockId);
          getVillages(loc.blockId).then((nextVillages) => {
            setVillages(nextVillages);
            if (loc.villageId) {
              setSelectedVillage(loc.villageId);
            } else {
              setSelectedVillage("");
            }
          });
        }
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (selectedRole !== "FARMER" && !selectedDistrict) {
      setErrorMessage("Please detect or select a district before submitting an officer account.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await completeOnboardingAction({
        role: selectedRole,
        name: fullName,
        phone,
        preferredLanguage: language,
        districtId: selectedDistrict || null,
        blockId: selectedBlock || null,
        villageId: selectedVillage || null,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to complete registration.");
        setSubmitting(false);
        return;
      }

      if (res.redirectUrl) {
        router.push(res.redirectUrl);
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected server error occurred.";
      setErrorMessage(errorMsg);
      setSubmitting(false);
    }
  };

  const roles = [
    {
      id: "FARMER",
      title: "Farmer / Livestock Owner",
      badge: "Instant Access (Auto-Approved)",
      icon: UserCheck,
      description: "Ear-tag registration, symptom reporting, AI health assistant, and veterinary guidance.",
    },
    {
      id: "FIELD_AGENT",
      title: "Pashu Sakhi / Field Agent",
      badge: "Verification Required",
      icon: ShieldCheck,
      description: "Village-level farm visits, photo & GPS intake, offline field inspection, and farmer assistance.",
    },
    {
      id: "VETERINARIAN",
      title: "Veterinary Officer",
      badge: "Verification Required",
      icon: Stethoscope,
      description: "Case triage, clinical diagnosis, prescription management, and diagnostic lab sampling.",
    },
    {
      id: "DISTRICT_AUTHORITY",
      title: "District Authority / Admin",
      badge: "Verification Required",
      icon: Building2,
      description: "District disease outbreak surveillance, cluster mapping, emergency alerts, and approvals.",
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-10 relative bg-[#FAF8F3] text-[#191F1C] min-h-screen">
      <div className="max-w-3xl w-full flex flex-col gap-6">
        <div className="text-center flex flex-col items-center gap-2">
          <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 text-xs px-3 py-1">
            Maitri Account Setup
          </Badge>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#191F1C] tracking-tight">
            Select Your Role
          </h1>
          <p className="text-stone-600 text-xs md:text-sm max-w-md">
            Choose your professional role and operating jurisdiction on the animal health surveillance platform.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            return (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role.id as "FARMER" | "FIELD_AGENT" | "VETERINARIAN" | "DISTRICT_AUTHORITY")}
                className={`relative cursor-pointer rounded-3xl border p-5 transition-all flex flex-col justify-between gap-4 shadow-2xs ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/30 shadow-xs"
                    : "border-[#E5E0D8] bg-white hover:border-stone-400 hover:bg-[#FAF8F3]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                        isSelected
                          ? "bg-[#047857] text-white shadow-xs"
                          : "bg-[#FAF8F3] text-stone-600 border border-[#E5E0D8]"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#191F1C] text-sm">{role.title}</h3>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] mt-0.5 ${
                          role.id === "FARMER"
                            ? "bg-emerald-100 text-emerald-900 border-emerald-200"
                            : "bg-amber-100 text-amber-900 border-amber-200"
                        }`}
                      >
                        {role.badge}
                      </Badge>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-700 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">{role.description}</p>
              </div>
            );
          })}
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit}>
          <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs overflow-hidden">
            <CardHeader className="bg-[#FAF8F3] border-b border-[#E5E0D8]">
              <CardTitle className="text-base text-[#191F1C] font-bold">Profile & Jurisdiction</CardTitle>
              <CardDescription className="text-xs text-stone-500">
                This links your account to local farms, villages, and district administrative authorities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name" className="text-xs text-stone-700 font-medium">Full Name *</Label>
                  <Input
                    id="name"
                    required
                    placeholder="e.g. Ramesh Patil or Dr. Anjali Kulkarni"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-[#FAF8F3] border-[#D9D3C7] text-xs text-[#191F1C]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone" className="text-xs text-stone-700 font-medium">Mobile Number (SMS / Alerts) *</Label>
                  <Input
                    id="phone"
                    required
                    placeholder="+91 98220 12345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-[#FAF8F3] border-[#D9D3C7] text-xs text-[#191F1C]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="language" className="text-xs text-stone-700 font-medium">Preferred Interface Language</Label>
                <select
                  id="language"
                  value="en"
                  disabled
                  className="bg-[#FAF8F3] border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-2.5 opacity-80 min-h-[44px]"
                >
                  <option value="en">English (Default)</option>
                </select>
              </div>

              {/* Geographic Hierarchy & Location Search */}
              <div className="border-t border-[#E5E0D8] pt-4 space-y-4">
                <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  Assigned Jurisdiction & Location
                </h4>

                <div className="space-y-4">
                  <LocationSearch
                    label="Search Operating Village / Block / District"
                    required={selectedRole !== "FARMER"}
                    value={selectedLocation}
                    onLocationSelect={handleLocationSearchResult}
                    showMapPreview={true}
                  />

                  {/* Administrative Hierarchy Dropdowns (Verified / Refined) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#E5E0D8]/60">
                    {/* District Select */}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="district" className="text-xs text-stone-700">District *</Label>
                      <select
                        id="district"
                        value={selectedDistrict}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="bg-[#FAF8F3] border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-2.5 focus:border-emerald-600 focus:outline-none min-h-[44px]"
                      >
                        <option value="">Select district...</option>
                        {districts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Block Select */}
                    {(selectedRole === "FIELD_AGENT" || selectedRole === "VETERINARIAN") && (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="block" className="text-xs text-stone-700">Block / Taluka</Label>
                        <select
                          id="block"
                          disabled={!selectedDistrict}
                          value={selectedBlock}
                          onChange={(e) => handleBlockChange(e.target.value)}
                          className="bg-[#FAF8F3] border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-2.5 focus:border-emerald-600 focus:outline-none disabled:opacity-50 min-h-[44px]"
                        >
                          <option value="">Select block...</option>
                          {blocks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Village Select */}
                    {selectedRole === "FIELD_AGENT" && (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="village" className="text-xs text-stone-700">Village</Label>
                        <select
                          id="village"
                          disabled={!selectedBlock}
                          value={selectedVillage}
                          onChange={(e) => setSelectedVillage(e.target.value)}
                          className="bg-[#FAF8F3] border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-2.5 focus:border-emerald-600 focus:outline-none disabled:opacity-50 min-h-[44px]"
                        >
                          <option value="">Select village...</option>
                          {villages.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center border-t border-[#E5E0D8] pt-4 pb-4">
              <span className="text-xs text-stone-500">
                {selectedRole === "FARMER"
                  ? "Farmer accounts are activated immediately upon registration."
                  : "Officer accounts require district authority approval."}
              </span>
              <Button type="submit" disabled={submitting} className="gap-2 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-semibold min-h-[44px] shadow-xs cursor-pointer">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving registration...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}
