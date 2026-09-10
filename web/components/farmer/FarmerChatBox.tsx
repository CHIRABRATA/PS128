"use client";

import { useState, useEffect, useRef } from "react";
import {
  sendFarmerChatMessageAction,
  getFarmerConversationHistoryAction,
} from "@/lib/actions/farmer-talk";
import { AnimalContextPacket } from "@/lib/ai/farmer-talk";
import { MessageSquare, Send, AlertTriangle, ShieldCheck, RefreshCw, Stethoscope } from "lucide-react";

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  status?: "sending" | "sent" | "failed";
  error?: string | null;
}

interface FarmerChatBoxProps {
  animalId: string;
  initialContext: AnimalContextPacket;
  dictionary: {
    title: string;
    subtitle: string;
    disclaimer: string;
    escalationNotice: string;
    typePlaceholder: string;
    send: string;
    quickPromptsTitle: string;
    prompt1: string;
    prompt2: string;
    prompt3: string;
    prompt4: string;
  };
}

function generateSubmissionId(): string {
  if (typeof window !== "undefined" && window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `sub_${Date.now()}_idempotent`;
}

export function FarmerChatBox({ animalId, initialContext, dictionary }: FarmerChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [riskNotice, setRiskNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      setLoading(true);
      setError(null);
      try {
        const res = await getFarmerConversationHistoryAction(animalId);
        if (isMounted) {
          if (res.success && res.messages) {
            setMessages(res.messages.map((m) => ({ ...m, status: "sent" })));
            setConversationId(res.conversationId);
          } else {
            setError(res.error || "Failed to load chat history");
          }
        }
      } catch {
        if (isMounted) {
          setError("An unexpected error occurred loading chat history");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [animalId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check recent cases for risk escalation
  const recentCase = initialContext.recentCases[0];
  const activeRiskLevel = recentCase?.overallRiskLevel;
  const isHighRisk = activeRiskLevel === "HIGH" || activeRiskLevel === "CRITICAL";

  async function handleSend(textToSend?: string, retryId?: string) {
    const text = (textToSend || inputMessage).trim();
    if (!text || sending) return;

    const clientSubmissionId = retryId || generateSubmissionId();

    const tempUserMsg: ChatMessageItem = {
      id: clientSubmissionId,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    // Optimistically add or update user message
    if (retryId) {
      setMessages((prev) =>
        prev.map((m) => (m.id === retryId ? tempUserMsg : m))
      );
    } else {
      setMessages((prev) => [...prev, tempUserMsg]);
      setInputMessage("");
    }

    setSending(true);
    setError(null);

    try {
      const res = await sendFarmerChatMessageAction({
        animalId,
        message: text,
        clientSubmissionId,
        conversationId,
      });

      if (res.success && res.assistantMessage) {
        setConversationId(res.conversationId);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== clientSubmissionId),
          { ...res.userMessage!, status: "sent" },
          { ...res.assistantMessage!, status: "sent" },
        ]);

        if (res.riskNotice) {
          setRiskNotice(res.riskNotice);
        }
      } else {
        const errorMsg = res.error || "Failed to get AI response. Please try again.";
        setError(errorMsg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === clientSubmissionId
              ? { ...m, status: "failed", error: errorMsg }
              : m
          )
        );
      }
    } catch {
      const errorMsg = "Network or server error sending message. Please try again.";
      setError(errorMsg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === clientSubmissionId
            ? { ...m, status: "failed", error: errorMsg }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  }

  const quickPrompts = [
    dictionary.prompt1,
    dictionary.prompt2,
    dictionary.prompt3,
    dictionary.prompt4,
  ];

  return (
    <div className="flex flex-col h-[750px] max-h-[85vh] bg-white border border-[#E5E0D8] rounded-3xl shadow-sm overflow-hidden text-[#191F1C]">
      {/* Header & Animal Context Summary */}
      <div className="p-4 sm:p-5 bg-[#FAF8F3] border-b border-[#E5E0D8] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200">
              <Stethoscope className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-[#191F1C] tracking-tight">
                  {dictionary.title}: <span className="text-emerald-800 font-mono">#{initialContext.animalIdentity.tag}</span>
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                  {initialContext.animalIdentity.species}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {initialContext.location.farmName} • {initialContext.location.villageName}, {initialContext.location.districtName}
              </p>
            </div>
          </div>

          {activeRiskLevel && (
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full border ${
                isHighRisk
                  ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}
            >
              Risk: {activeRiskLevel}
            </span>
          )}
        </div>

        {/* Clinical Safety Disclaimer Banner */}
        <div className="p-2.5 bg-white border border-[#E5E0D8] rounded-xl text-xs text-stone-600 flex items-center gap-2 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{dictionary.disclaimer}</span>
        </div>

        {/* Escalation Alert Notice if High Risk */}
        {(isHighRisk || riskNotice) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-medium flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-900">{dictionary.escalationNotice}</p>
              {recentCase && (
                <p className="text-[11px] text-red-700 mt-1">
                  Reported Symptoms: {recentCase.symptoms.join(", ") || "None recorded"} ({recentCase.status})
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#FAF8F3]/50">
        {loading ? (
          <div className="flex items-center justify-center h-full text-stone-500 text-sm gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
            <span>संवाद इतिहास लोड होत आहे...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-stone-500 text-center p-6 space-y-3">
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-3xl">
              <MessageSquare className="w-8 h-8 text-emerald-700" />
            </div>
            <p className="text-sm font-bold text-stone-900">
              जनावर <span className="text-emerald-800 font-mono">#{initialContext.animalIdentity.tag}</span> बाबत आरोग्य संवाद सुरू करा
            </p>
            <p className="text-xs text-stone-500 max-w-sm">
              मागील तपासणी अहवाल, दिलेले लसीकरण, संभाव्य लक्षणे किंवा पशुखाद्य काळजीबाबत प्रश्न विचारा.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            const isFailed = msg.status === "failed";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1 animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed transition-all ${
                    isFailed
                      ? "bg-red-50 border border-red-300 text-red-900 rounded-br-none shadow-xs"
                      : isUser
                      ? "bg-emerald-700 text-white rounded-br-none shadow-xs font-medium"
                      : "bg-white border border-[#E5E0D8] text-[#191F1C] rounded-bl-none shadow-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {isFailed && (
                    <div className="mt-2 pt-2 border-t border-red-200 flex items-center justify-between gap-3 text-xs">
                      <span className="text-red-700 text-[11px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        संदेश अयशस्वी (Failed)
                      </span>
                      <button
                        onClick={() => handleSend(msg.content, msg.id)}
                        disabled={sending}
                        className="text-[11px] font-bold text-red-800 bg-red-100 hover:bg-red-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition cursor-pointer"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${sending ? "animate-spin" : ""}`} />
                        <span>पुन्हा पाठवा (Retry)</span>
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-stone-400 px-1 font-mono">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })
        )}

        {sending && (
          <div className="flex items-center gap-2 text-emerald-800 text-xs p-3 bg-emerald-50 border border-emerald-200 rounded-xl w-fit animate-fade-in">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-700" />
            <span>मैत्री सहाय्यक माहिती तपासत आहे...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-xs flex items-center justify-between animate-fade-in">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-xs font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Prompts */}
      <div className="p-3 bg-white border-t border-[#E5E0D8]">
        <p className="text-[11px] font-semibold text-stone-500 mb-2">{dictionary.quickPromptsTitle}:</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              disabled={sending}
              className="px-3.5 py-1.5 bg-stone-50 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 text-stone-700 hover:text-emerald-800 text-xs font-medium rounded-full whitespace-nowrap transition-all duration-150 hover-lift-sm active:scale-[0.97] disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-[#FAF8F3] border-t border-[#E5E0D8] flex items-center gap-2"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={dictionary.typePlaceholder}
          disabled={sending}
          className="flex-1 bg-white border border-[#D9D3C7] focus:border-emerald-600 rounded-xl px-4 py-2.5 text-sm text-[#191F1C] placeholder-stone-400 focus:outline-none transition disabled:opacity-50 min-h-[44px] shadow-xs"
        />
        <button
          type="submit"
          disabled={sending || !inputMessage.trim()}
          className="p-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-medium transition-all duration-150 shadow-sm disabled:opacity-50 disabled:bg-stone-300 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer hover-lift-sm active:scale-[0.96]"
        >
          {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
