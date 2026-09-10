import React from "react";
import { Loader2 } from "lucide-react";

export default function FarmerLoading() {
  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-6xl mx-auto w-full gap-6 animate-pulse text-[#191F1C]">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-5">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-stone-200 rounded-xl" />
          <div className="h-4 w-72 bg-stone-100 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-stone-200 rounded-xl" />
          <div className="h-10 w-28 bg-stone-200 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 bg-white border border-[#E5E0D8] rounded-3xl space-y-3 shadow-xs">
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 bg-stone-200 rounded" />
              <div className="h-6 w-6 bg-stone-100 rounded-lg" />
            </div>
            <div className="h-8 w-16 bg-stone-200 rounded-lg" />
            <div className="h-3 w-32 bg-stone-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-white border border-[#E5E0D8] rounded-3xl space-y-4 shadow-xs">
          <div className="h-5 w-40 bg-stone-200 rounded-lg" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-[#FAF8F3] border border-[#E5E0D8] rounded-2xl" />
            ))}
          </div>
        </div>

        <div className="p-6 bg-white border border-[#E5E0D8] rounded-3xl space-y-4 shadow-xs flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 text-emerald-700 animate-spin opacity-50" />
          <span className="text-xs text-stone-500 font-medium">Loading farmer portal data...</span>
        </div>
      </div>
    </div>
  );
}
