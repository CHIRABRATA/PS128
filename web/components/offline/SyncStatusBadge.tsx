"use client";

import { useState, useEffect, useCallback } from "react";
import { getQueuedReports, OfflineQueueRecord } from "@/lib/offline/db";
import { triggerQueueSync, checkServerReachability } from "@/lib/offline/sync";
import { RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export function SyncStatusBadge() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isReachable, setIsReachable] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [queuedItems, setQueuedItems] = useState<OfflineQueueRecord[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const refreshQueueState = useCallback(async () => {
    const items = await getQueuedReports();
    setQueuedItems(items);
  }, []);

  const checkConnectivity = useCallback(async () => {
    const online = typeof navigator !== "undefined" ? navigator.onLine : true;
    setIsOnline(online);
    if (online) {
      const reachable = await checkServerReachability();
      setIsReachable(reachable);
    } else {
      setIsReachable(false);
    }
  }, []);

  const handleManualSync = useCallback(async () => {
    setSyncing(true);
    try {
      await triggerQueueSync();
      await refreshQueueState();
    } finally {
      setSyncing(false);
    }
  }, [refreshQueueState]);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (isMounted) {
        await checkConnectivity();
        await refreshQueueState();
      }
    };
    init();

    const handleOnline = () => {
      checkConnectivity();
      handleManualSync();
    };

    const handleOffline = () => {
      checkConnectivity();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen to multi-tab sync completion messages
    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      channel = new BroadcastChannel("maitri_offline_sync");
      channel.onmessage = () => {
        refreshQueueState();
      };
    }

    // Periodic reachability & queue refresh poll (30s)
    const interval = setInterval(() => {
      checkConnectivity();
      refreshQueueState();
    }, 30000);

    return () => {
      isMounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (channel) channel.close();
      clearInterval(interval);
    };
  }, [checkConnectivity, refreshQueueState, handleManualSync]);

  const pendingCount = queuedItems.filter(
    (item) => item.status === "QUEUED" || item.status === "SYNCING" || item.status === "FAILED"
  ).length;

  return (
    <>
      {/* Floating Status Pill */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold shadow-md border backdrop-blur-md transition cursor-pointer ${
            !isOnline || !isReachable
              ? "bg-red-50 text-red-800 border-red-200"
              : syncing
              ? "bg-amber-50 text-amber-900 border-amber-200 animate-pulse"
              : pendingCount > 0
              ? "bg-amber-50 text-amber-900 border-amber-200"
              : "bg-white/95 text-emerald-800 border-emerald-200 hover:bg-emerald-50/50"
          }`}
        >
          {!isOnline || !isReachable ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-600" />
              <span>ऑफलाइन (Offline)</span>
            </>
          ) : syncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span>सिंक होत आहे...</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span>ऑनलाइन (Online)</span>
            </>
          )}

          {pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-200/80 text-amber-950 rounded-full border border-amber-300 font-mono">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Offline Queue Drawer Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-[#E5E0D8] rounded-3xl shadow-2xl overflow-hidden text-[#191F1C] flex flex-col max-h-[80vh]">
            <div className="p-4 bg-[#FAF8F3] border-b border-[#E5E0D8] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-[#191F1C]">स्थानिक ऑफलाइन अहवाल रांग | Offline Queue</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-stone-500 hover:text-stone-800 px-2 py-1 rounded cursor-pointer"
              >
                बंद करा
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-[#FAF8F3]/50">
              {queuedItems.length === 0 ? (
                <div className="text-center py-8 text-stone-500 text-xs">
                  फोनमध्ये सध्या कोणतेही प्रलंबित ऑफलाइन अहवाल नाहीत.
                </div>
              ) : (
                queuedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white border border-[#E5E0D8] rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#191F1C]">नोंद: {item.submissionId.substring(0, 12)}...</span>
                        {item.photoBlob && <span className="text-[10px] text-emerald-700 font-medium">📷 फोटो जोडला</span>}
                      </div>
                      <p className="text-stone-600 text-[11px] mt-0.5">
                        लक्षणे: {item.symptoms.slice(0, 2).join(", ")}
                      </p>
                      {item.lastError && (
                        <p className="text-[10px] text-red-600 mt-1">{item.lastError}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === "SYNCED" ? (
                        <span className="flex items-center gap-1 text-emerald-700 text-[10px] font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" /> सिंक झाले
                        </span>
                      ) : item.status === "SYNCING" ? (
                        <span className="flex items-center gap-1 text-amber-700 text-[10px] font-semibold">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> सिंक सुरू
                        </span>
                      ) : item.status === "FAILED_AUTHORIZATION" ? (
                        <span className="flex items-center gap-1 text-red-700 text-[10px] font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Auth Failed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-700 text-[10px] font-semibold">
                          <Clock className="w-3.5 h-3.5" /> स्थानिक जतन
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3.5 bg-white border-t border-[#E5E0D8] flex items-center justify-between">
              <span className="text-[11px] text-stone-500">
                {isOnline && isReachable ? "सिंकसाठी सज्ज" : "नेटवर्कची प्रतीक्षा करत आहे..."}
              </span>
              <button
                onClick={handleManualSync}
                disabled={syncing || !isOnline || !isReachable}
                className="py-2 px-3.5 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 min-h-[36px] shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                <span>आत्ता सिंक करा</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
