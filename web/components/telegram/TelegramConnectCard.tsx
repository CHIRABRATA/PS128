"use client";

import { useState } from "react";
import { generateTelegramLinkTokenAction } from "@/lib/actions/telegram";
import { Button } from "@/components/ui/button";
import { Send, Check, Copy, ExternalLink, RefreshCw, AlertCircle, ShieldCheck } from "lucide-react";

export function TelegramConnectCard({ isConnected }: { isConnected: boolean }) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateTelegramLinkTokenAction();
      if (res.success && res.token && res.botUsername) {
        setToken(res.token);
        setBotUsername(res.botUsername);
      } else {
        setError(res.error || "Failed to generate connection token");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deepLink = botUsername && token ? `https://t.me/${botUsername}?start=${token}` : null;

  return (
    <div className="p-5 bg-white border border-[#E5E0D8] rounded-3xl space-y-4 text-[#191F1C] shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#191F1C]">टेलिग्राम प्रादुर्भाव सूचना नेटवर्क | Telegram Alerts</h3>
            <p className="text-xs text-stone-500">
              गावात रोग प्रादुर्भाव झाल्यास त्वरित मोबाईल सूचना मिळवा.
            </p>
          </div>
        </div>

        {isConnected ? (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>जोडलेले आहे</span>
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold rounded-full">
            जोडलेले नाही
          </span>
        )}
      </div>

      {isConnected ? (
        <div className="p-3.5 bg-[#FAF8F3] border border-[#E5E0D8] rounded-2xl text-xs text-stone-700 space-y-1">
          <p className="font-semibold text-emerald-800">आपले खाते टेलिग्राम अलर्ट बॉटशी जोडलेले आहे.</p>
          <p className="text-stone-500 text-[11px]">
            आपल्या कार्यकक्षेतील रोग प्रादुर्भाव सूचना आणि पशुआरोग्य अलर्ट थेट आपल्या टेलिग्रामवर पाठवले जातील.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {!token ? (
            <Button
              onClick={handleGenerateToken}
              disabled={loading}
              className="w-full bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-xs py-2.5 rounded-2xl shadow-xs flex items-center justify-center gap-2 min-h-[44px]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>टोकन तयार होत आहे...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>टेलिग्राम खाते जोडा (Connect Telegram)</span>
                </>
              )}
            </Button>
          ) : (
            <div className="p-3.5 bg-[#FAF8F3] border border-[#E5E0D8] rounded-2xl space-y-3">
              <p className="text-xs text-stone-700 font-medium">
                खालील लिंक उघडून बॉट सुरू करा:
              </p>

              {deepLink && (
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-semibold rounded-xl transition shadow-xs"
                >
                  <span>Maitri Bot उघडा</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={`/start ${token}`}
                  className="bg-white border border-[#D9D3C7] rounded-xl px-3 py-2 text-xs text-[#191F1C] font-mono flex-1 focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(`/start ${token}`)}
                  className="p-2 bg-white hover:bg-stone-100 border border-[#D9D3C7] text-stone-700 rounded-xl text-xs font-medium transition cursor-pointer"
                  title="Copy command"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[10px] text-amber-800 font-medium">
                * हा टोकन १५ मिनिटांसाठी वैध आहे.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
