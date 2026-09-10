"use client";

import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

const MapDebug = dynamic(() => import("@/components/debug/MapDebugInternal"), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full flex items-center justify-center bg-stone-100 text-stone-600 text-sm font-semibold">
      Initializing Map Debug Baseline...
    </div>
  ),
});

export default function MapDebugPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <MapDebug />;
}
