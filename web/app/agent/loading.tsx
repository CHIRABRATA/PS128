import React from "react";
import { Loader2 } from "lucide-react";

export default function AgentLoading() {
  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-6xl mx-auto w-full gap-6 animate-pulse text-[#191F1C]">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-5">
        <div className="space-y-2">
          <div className="h-7 w-52 bg-stone-200 rounded-xl" />
          <div className="h-4 w-80 bg-stone-100 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-36 bg-stone-200 rounded-xl" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 bg-white border border-[#E5E0D8] rounded-3xl space-y-3 shadow-xs">
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 bg-stone-200 rounded" />
              <div className="h-6 w-6 bg-stone-100 rounded-lg" />
            </div>
            <div className="h-8 w-16 bg-stone-200 rounded-lg" />
            <div className="h-3 w-28 bg-stone-100 rounded" />
          </div>
        ))}
      </div>

      {/* Queue Area Skeleton */}
      <div className="p-6 bg-white border border-[#E5E0D8] rounded-3xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 bg-stone-200 rounded-lg" />
          <div className="h-6 w-20 bg-stone-100 rounded-full" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#FAF8F3] border border-[#E5E0D8] rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-48 bg-stone-200 rounded" />
                <div className="h-3 w-64 bg-stone-100 rounded" />
              </div>
              <div className="h-9 w-28 bg-stone-200 rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center pt-4">
        <Loader2 className="w-6 h-6 text-emerald-700 animate-spin opacity-50" />
      </div>
    </div>
  );
}
