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

interface GeoItem {
  id: string;
  name: string;
}

export default function OnboardingPage() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<"FARMER" | "FIELD_AGENT" | "VETERINARIAN" | "DISTRICT_AUTHORITY">("FARMER");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("mr");

  const [districts, setDistricts] = useState<GeoItem[]>([]);
  const [blocks, setBlocks] = useState<GeoItem[]>([]);
  const [villages, setVillages] = useState<GeoItem[]>([]);

  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedVillage, setSelectedVillage] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
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
        setErrorMessage(res.error || "नोंदणी पूर्ण करण्यात त्रुटी आली.");
        setSubmitting(false);
        return;
      }

      if (res.redirectUrl) {
        router.push(res.redirectUrl);
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "अनपेक्षित सर्व्हर त्रुटी आली.";
      setErrorMessage(errorMsg);
      setSubmitting(false);
    }
  };

  const roles = [
    {
      id: "FARMER",
      title: "पशुपालक / शेतकरी (Farmer)",
      badge: "त्वरित सक्रिय (Auto-Approved)",
      icon: UserCheck,
      description: "जनावरांची कान-टॅग नोंदणी, आजारपण लक्षणे नोंद, पशु संवाद AI सहाय्यक व पशुवैद्यकीय सल्ला.",
    },
    {
      id: "FIELD_AGENT",
      title: "पशुसखी / फील्ड एजंट (Field Agent)",
      badge: "पडताळणी आवश्यक",
      icon: ShieldCheck,
      description: "गावनिहाय गोठा भेटी, फोटो व GPS संकलन, ऑफलाइन तपासणी अहवाल व पशुपालक सहाय्य.",
    },
    {
      id: "VETERINARIAN",
      title: "पशुवैद्यकीय अधिकारी (Veterinarian)",
      badge: "पडताळणी आवश्यक",
      icon: Stethoscope,
      description: "प्रकरण तपासणी, नैदानिक निर्णय, औषधोपचार शिफारशी व लॅब नमुना वर्गवारी.",
    },
    {
      id: "DISTRICT_AUTHORITY",
      title: "जिल्हा नियंत्रण अधिकारी (District Authority)",
      badge: "पडताळणी आवश्यक",
      icon: Building2,
      description: "जिल्हास्तरीय रोग प्रादुर्भाव देखरेख, क्लस्टर मॅपिंग, टेलिग्राम अलर्ट व पद मंजुऱ्या.",
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-10 relative bg-[#FAF8F3] text-[#191F1C] min-h-screen">
      <div className="max-w-3xl w-full flex flex-col gap-6">
        <div className="text-center flex flex-col items-center gap-2">
          <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 text-xs px-3 py-1">
            मैत्री खाते नोंदणी | Maitri Setup
          </Badge>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#191F1C] tracking-tight">
            आपली अधिकृत भूमिका निवडा
          </h1>
          <p className="text-stone-600 text-xs md:text-sm max-w-md">
            पशु आरोग्य नेटवर्कवर आपली व्यावसायिक भूमिका आणि कार्यकक्षेची निवड करा.
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
              <CardTitle className="text-base text-[#191F1C] font-bold">वैयक्तिक व क्षेत्रीय माहिती | Profile & Jurisdiction</CardTitle>
              <CardDescription className="text-xs text-stone-500">
                ही माहिती आपले खाते नजीकच्या गोठ्यांशी, गावाशी आणि जिल्हा अधिकाऱ्यांशी जोडते.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name" className="text-xs text-stone-700 font-medium">पूर्ण नाव (Full Name) *</Label>
                  <Input
                    id="name"
                    required
                    placeholder="उदा. रमेश तानाजी पाटील किंवा डॉ. अंजली कुलकर्णी"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-[#FAF8F3] border-[#D9D3C7] text-xs text-[#191F1C]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone" className="text-xs text-stone-700 font-medium">मोबाईल नंबर (Outbreak SMS/Alerts) *</Label>
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
                <Label htmlFor="language" className="text-xs text-stone-700 font-medium">पसंतीची भाषा (Interface Language)</Label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-[#FAF8F3] border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-2.5 focus:border-emerald-600 focus:outline-none min-h-[44px]"
                >
                      <option value="mr">मराठी (Maharashtra / Marathi)</option>
                      <option value="bn">বাংলা (Bengali)</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* Geographic Hierarchy Selects */}
              {selectedRole !== "FARMER" && (
                <div className="border-t border-[#E5E0D8] pt-4 space-y-4">
                  <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    नेमून दिलेली कार्यकक्षा (Assigned Scope)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* District Select */}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="district" className="text-xs text-stone-700">जिल्हा (District) *</Label>
                      <select
                        id="district"
                        value={selectedDistrict}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="bg-[#FAF8F3] border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-2.5 focus:border-emerald-600 focus:outline-none min-h-[44px]"
                      >
                        <option value="">जिल्हा निवडा...</option>
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
                        <Label htmlFor="block" className="text-xs text-stone-700">तालुका (Block)</Label>
                        <select
                          id="block"
                          disabled={!selectedDistrict}
                          value={selectedBlock}
                          onChange={(e) => handleBlockChange(e.target.value)}
                          className="bg-[#FAF8F3] border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-2.5 focus:border-emerald-600 focus:outline-none disabled:opacity-50 min-h-[44px]"
                        >
                          <option value="">तालुका निवडा...</option>
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
                        <Label htmlFor="village" className="text-xs text-stone-700">गाव (Village)</Label>
                        <select
                          id="village"
                          disabled={!selectedBlock}
                          value={selectedVillage}
                          onChange={(e) => setSelectedVillage(e.target.value)}
                          className="bg-[#FAF8F3] border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-2.5 focus:border-emerald-600 focus:outline-none disabled:opacity-50 min-h-[44px]"
                        >
                          <option value="">गाव निवडा...</option>
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
              )}
            </CardContent>
            <CardFooter className="flex justify-between items-center border-t border-[#E5E0D8] pt-4 pb-4">
              <span className="text-xs text-stone-500">
                {selectedRole === "FARMER"
                  ? "पशुपालक खाती नोंदणीनंतर लगेच सुरू होतात."
                  : "अधिकारी खात्यांना जिल्हा मंजुरी आवश्यक असते."}
              </span>
              <Button type="submit" disabled={submitting} className="gap-2 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-semibold min-h-[44px] shadow-xs cursor-pointer">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>नोंदणी जतन होत आहे...</span>
                  </>
                ) : (
                  <>
                    <span>नोंदणी पूर्ण करा</span>
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
