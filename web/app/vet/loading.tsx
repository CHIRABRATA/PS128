import React from "react";
import { Loader2 } from "lucide-react";

export default function VetLoading() {
  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full gap-6 animate-pulse text-[#191F1C]">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-5">
        <div className="space-y-2">
          <div className="h-7 w-60 bg-stone-200 rounded-xl" />
          <div className="h-4 w-96 bg-stone-100 rounded-lg" />
        </div>
        <div className="h-10 w-40 bg-stone-200 rounded-xl" />
      </div>

      {/* Vet Metrics Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-4 bg-white border border-[#E5E0D8] rounded-2xl space-y-2 shadow-xs">
            <div className="h-3 w-16 bg-stone-200 rounded" />
            <div className="h-7 w-12 bg-stone-200 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Clinical Queue Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-white border border-[#E5E0D8] rounded-3xl space-y-4 shadow-xs">
          <div className="h-5 w-44 bg-stone-200 rounded-lg" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-[#FAF8F3] border border-[#E5E0D8] rounded-2xl p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-36 bg-stone-200 rounded" />
                  <div className="h-3 w-56 bg-stone-100 rounded" />
                </div>
                <div className="h-8 w-24 bg-stone-200 rounded-xl" />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-white border border-[#E5E0D8] rounded-3xl space-y-4 shadow-xs flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 text-emerald-700 animate-spin opacity-50" />
          <span className="text-xs text-stone-500 font-medium">Loading clinical triage queue...</span>
        </div>
      </div>
    </div>
  );
}
