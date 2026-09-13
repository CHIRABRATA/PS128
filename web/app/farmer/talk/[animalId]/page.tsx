"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Send, Loader2, Bot, User, AlertTriangle, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { AnimalContextPacket } from "@/lib/ai/farmer-talk";

interface Message {
  role: "user" | "assistant";
  content: string;
  riskNotice?: string | null;
  suggestedNextStep?: string;
}

interface PageProps {
  params: Promise<{ animalId: string }>;
}

export default function FarmerTalkPage({ params }: PageProps) {
  const { animalId } = use(params);
  const t = useTranslations("farmer");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<"en" | "hi" | "bn" | "mr">("en");

  // Context packet retrieved for the active animal tag
  const animalContextPacket: AnimalContextPacket = {
    animalIdentity: {
      tag: animalId,
      species: "Cow",
      breed: "Gir",
      ageMonths: 24,
    },
    location: {
      farmName: "Green Dairy Farm",
      villageName: "Bidhannagar",
      blockName: "Rajarhat",
      districtName: "North 24 Parganas",
    },
    recentCases: [
      {
        caseNumber: "CASE-2026-829995",
        status: "PENDING_REVIEW",
        reportedAt: "2026-09-12T12:26:00Z",
        symptoms: ["Skin Lesions"],
        durationDays: 3,
        affectedCount: 1,
        mortalityCount: 0,
        overallRiskLevel: "LOW",
        suspectedCondition: "No strong disease signal",
        vetDiagnosis: null,
        vetAction: null,
        sanitizedVetNotes: null,
      },
    ],
    vaccinations: [
      {
        vaccineName: "FMD Vaccine",
        dateGiven: "2026-03-15",
        nextDueDate: "2026-09-15",
      },
    ],
    treatments: [],
    samples: [],
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage("");

    const updatedHistory: Message[] = [...messages, { role: "user", content: userText }];
    setMessages(updatedHistory);
    setIsLoading(true);

    try {
      const apiHistory = updatedHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/farmer/talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animalContext: animalContextPacket,
          conversationHistory: apiHistory,
          userMessage: userText,
          preferredLanguage: language,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      setMessages([
        ...updatedHistory,
        {
          role: "assistant",
          content: data.answer,
          riskNotice: data.risk_notice,
          suggestedNextStep: data.suggested_next_step,
        },
      ]);
    } catch (err) {
      console.error("[Talk Component Error]:", err);
      setMessages([
        ...updatedHistory,
        {
          role: "assistant",
          content:
            "I am currently unable to fetch live AI advice. For clinical assistance regarding your animal, please consult your local veterinarian.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full gap-4 bg-[#FAF8F3] text-[#191F1C]">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
        <div className="flex items-center gap-2">
          <Link href="/farmer">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-[#D9D3C7]">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[#191F1C]">
              Maitri AI Assistant — {animalId}
            </h1>
            <p className="text-[11px] text-stone-500">
              {t("informationalSupport")}
            </p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-1 bg-white border border-[#D9D3C7] rounded-xl p-1 text-xs">
          {(["en", "hi", "bn", "mr"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-2 py-1 rounded-lg uppercase text-[10px] font-bold transition-colors ${
                language === lang ? "bg-emerald-700 text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col border-[#E5E0D8] bg-white rounded-3xl overflow-hidden shadow-xs min-h-[500px]">
        <CardHeader className="bg-[#FAF8F3] border-b border-[#E5E0D8] py-3 px-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span>{t("clinicalGuardrailsActive")}</span>
          </div>
          <CardDescription className="text-[11px] text-stone-500">
            {animalContextPacket.recentCases.length} Health Record(s) Linked
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-stone-500">
              <Bot className="h-10 w-10 text-emerald-700" />
              <p className="text-xs max-w-sm">
                Ask any question regarding health records, recent vaccinations, or general care for ear tag{" "}
                <strong className="text-stone-800">{animalId}</strong>.
              </p>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${
                  m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    m.role === "user" ? "bg-emerald-700 text-white" : "bg-stone-200 text-stone-800"
                  }`}
                >
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                <div className="space-y-2">
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-emerald-700 text-white"
                        : "bg-[#FAF8F3] border border-[#E5E0D8] text-stone-900"
                    }`}
                  >
                    {m.content}
                  </div>

                  {m.riskNotice && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 flex items-start gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                      <span>{m.riskNotice}</span>
                    </div>
                  )}

                  {m.suggestedNextStep && (
                    <div className="text-[10px] text-stone-500 font-semibold pl-1">
                      Suggested Action: <span className="text-emerald-800">{m.suggestedNextStep}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-stone-500 bg-[#FAF8F3] p-3 rounded-2xl w-fit border border-[#E5E0D8]">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
              <span>{t("checkingHealthContext")}</span>
            </div>
          )}
        </CardContent>

        {/* Chat Input Bar */}
        <div className="p-3 bg-[#FAF8F3] border-t border-[#E5E0D8] flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Ask about ${animalId}'s health or symptoms...`}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            className="bg-white border-[#D9D3C7] text-xs min-h-[44px] rounded-xl focus:outline-none"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="bg-emerald-700 hover:bg-emerald-800 text-white min-h-[44px] px-4 rounded-xl shadow-xs"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
