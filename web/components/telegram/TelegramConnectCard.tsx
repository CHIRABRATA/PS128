"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  generateTelegramLinkTokenAction,
  getTelegramStatusAction,
  unlinkTelegramAccountAction,
} from "@/lib/actions/telegram";
import { Button } from "@/components/ui/button";
import {
  Send,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Unlink,
  Clock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface TelegramConnectCardProps {
  initialConnected?: boolean;
  initialUsername?: string;
  initialConnectedAt?: string;
}

export function TelegramConnectCard({
  initialConnected,
  initialUsername,
  initialConnectedAt,
}: TelegramConnectCardProps) {
  const t = useTranslations("common.telegram");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [isConnected, setIsConnected] = useState(initialConnected ?? false);
  const [username, setUsername] = useState<string | undefined>(initialUsername);
  const [connectedAt, setConnectedAt] = useState<string | undefined>(initialConnectedAt);
  const [token, setToken] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch status on initial render if not explicitly passed
  useEffect(() => {
    let active = true;
    if (initialConnected === undefined) {
      getTelegramStatusAction().then((res) => {
        if (active && res.success) {
          setIsConnected(res.isLinked);
          setUsername(res.username);
          setConnectedAt(res.connectedAt);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [initialConnected]);

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

  const handleUnlink = async () => {
    setUnlinking(true);
    setError(null);
    try {
      const res = await unlinkTelegramAccountAction();
      if (res.success) {
        setIsConnected(false);
        setUsername(undefined);
        setConnectedAt(undefined);
        setToken(null);
      } else {
        setError(res.error || "Failed to disconnect Telegram account.");
      }
    } catch {
      setError("Failed to disconnect. Please try again.");
    } finally {
      setUnlinking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deepLink = botUsername && token ? `https://t.me/${botUsername}?start=${token}` : null;

  const formattedDate = connectedAt ? formatDate(connectedAt) : null;

  return (
    <div className="p-5 bg-white border border-[#E5E0D8] rounded-3xl space-y-4 text-[#191F1C] shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#191F1C]">{t("title")}</h3>
            <p className="text-xs text-stone-500">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {isConnected ? (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t("connected")}</span>
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-stone-100 text-stone-700 border border-[#D9D3C7] text-xs font-semibold rounded-full">
            Not connected
          </span>
        )}
      </div>

      {isConnected ? (
        <div className="space-y-3">
          <div className="p-3.5 bg-[#FAF8F3] border border-[#E5E0D8] rounded-2xl text-xs text-stone-700 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>{t("botConnected")}</span>
              </span>
              {username && (
                <span className="font-mono text-[11px] px-2 py-0.5 bg-white border border-[#D9D3C7] rounded-md text-stone-800">
                  @{username}
                </span>
              )}
            </div>
            <p className="text-stone-500 text-[11px]">
              {t("botConnectedDesc")}
            </p>
            {formattedDate && (
              <p className="text-[10px] text-stone-400 flex items-center gap-1 pt-0.5">
                <Clock className="w-3 h-3" />
                <span>Connected on {formattedDate}</span>
              </p>
            )}
          </div>

          <Button
            onClick={handleUnlink}
            disabled={unlinking}
            variant="outline"
            className="w-full border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-2 min-h-[38px] cursor-pointer"
          >
            {unlinking ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{t("disconnecting")}</span>
              </>
            ) : (
              <>
                <Unlink className="w-3.5 h-3.5" />
                <span>{t("disconnect")}</span>
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {!token ? (
            <Button
              onClick={handleGenerateToken}
              disabled={loading}
              className="w-full bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-xs py-2.5 rounded-2xl shadow-xs flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t("generatingToken")}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t("connect")}</span>
                </>
              )}
            </Button>
          ) : (
            <div className="p-3.5 bg-[#FAF8F3] border border-[#E5E0D8] rounded-2xl space-y-3">
              <p className="text-xs text-stone-700 font-medium">
                Click below to open the bot and link your account:
              </p>

              {deepLink && (
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-semibold rounded-xl transition shadow-xs"
                >
                  <span>Open {botUsername || "Maitri Bot"}</span>
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
                  title={t("copyCommand")}
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[10px] text-amber-800 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                <span>{t("tokenNotice")}</span>
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
