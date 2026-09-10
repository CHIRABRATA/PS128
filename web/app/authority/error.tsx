"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function AuthorityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Authority Portal Error]:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[60vh] max-w-md mx-auto text-center space-y-5 text-[#191F1C]">
      <div className="h-16 w-16 rounded-3xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-center shadow-xs">
        <AlertTriangle className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-[#191F1C] tracking-tight">
          Surveillance Portal Error
        </h2>
        <p className="text-xs text-stone-600 leading-relaxed">
          An error occurred loading district outbreak metrics or geospatial clusters.
        </p>
        {error.message && (
          <p className="text-[11px] text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100 font-mono">
            {error.message}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
        <Button
          onClick={() => reset()}
          className="w-full sm:flex-1 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl min-h-[42px] gap-2 cursor-pointer shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Reload Surveillance</span>
        </Button>

        <Link href="/" className="w-full sm:flex-1">
          <Button
            variant="outline"
            className="w-full text-xs border-[#D9D3C7] text-stone-700 hover:bg-white rounded-xl min-h-[42px] gap-2 cursor-pointer"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
