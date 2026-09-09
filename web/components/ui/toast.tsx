"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "warning" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<ToastItem, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type = "info", title, message, duration = 3500 }: Omit<ToastItem, "id">) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string) => toast({ type: "success", title, message }), [toast]);
  const error = useCallback((title: string, message?: string) => toast({ type: "error", title, message }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ type: "warning", title, message }), [toast]);
  const info = useCallback((title: string, message?: string) => toast({ type: "info", title, message }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const isSuccess = t.type === "success";
          const isWarning = t.type === "warning";
          const isError = t.type === "error";

          return (
            <div
              key={t.id}
              className={`pointer-events-auto p-4 rounded-2xl border shadow-lg flex items-start gap-3 animate-fade-in transition-all duration-200 backdrop-blur-md ${
                isSuccess
                  ? "bg-emerald-900/95 text-white border-emerald-700/80 shadow-emerald-950/20"
                  : isWarning
                  ? "bg-amber-900/95 text-white border-amber-700/80 shadow-amber-950/20"
                  : isError
                  ? "bg-red-900/95 text-white border-red-700/80 shadow-red-950/20"
                  : "bg-[#191F1C]/95 text-white border-stone-700 shadow-black/20"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                {isWarning && <AlertTriangle className="h-4 w-4 text-amber-300" />}
                {isError && <AlertCircle className="h-4 w-4 text-red-300" />}
                {!isSuccess && !isWarning && !isError && <Info className="h-4 w-4 text-sky-300" />}
              </div>

              <div className="flex-1 space-y-0.5 text-xs">
                <div className="font-bold tracking-tight">{t.title}</div>
                {t.message && <p className="text-stone-300 leading-relaxed text-[11px]">{t.message}</p>}
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="text-stone-400 hover:text-white transition-colors p-0.5 rounded-lg hover:bg-white/10"
                aria-label="Close notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
    };
  }
  return context;
}
