"use client";

import React, { useState, useEffect } from "react";
import { Image as ImageIcon, AlertCircle, Loader2, Maximize2, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CasePhotoViewerProps {
  caseId?: string;
  photoUrl?: string | null;
  alt?: string;
  className?: string;
  aspectRatio?: "square" | "video" | "auto";
}

export function CasePhotoViewer({
  caseId,
  photoUrl,
  alt = "Clinical animal health photo",
  className = "",
  aspectRatio = "auto",
}: CasePhotoViewerProps) {
  const [src, setSrc] = useState<string | null>(photoUrl || null);
  const [loading, setLoading] = useState<boolean>(Boolean(caseId));
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!caseId) return;

    let isMounted = true;
    const proxyUrl = `/api/media/photo/${caseId}`;
    fetch(proxyUrl)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to load photo (Status ${res.status})`);
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        if (isMounted) {
          setSrc(objectUrl);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Unauthorized or missing photo.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [caseId]);

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "min-h-[160px] max-h-[360px]",
  }[aspectRatio];

  // 1. Missing Photo State
  if (!loading && !src && !error) {
    return (
      <div
        className={`w-full rounded-2xl border border-[#E5E0D8] bg-[#FAF8F3] p-6 flex flex-col items-center justify-center text-center gap-2 ${aspectClasses} ${className}`}
      >
        <div className="h-10 w-10 rounded-xl bg-white border border-[#E5E0D8] flex items-center justify-center text-stone-400">
          <ImageIcon className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold text-stone-600">कोणतेही छायाचित्र जोडलेले नाही</p>
        <p className="text-[11px] text-stone-500">या तक्रारीसोबत तपासणी छायाचित्र जोडले नव्हते.</p>
      </div>
    );
  }

  // 2. Error / Unauthorized State
  if (!loading && error) {
    return (
      <div
        className={`w-full rounded-2xl border border-red-200 bg-red-50/50 p-6 flex flex-col items-center justify-center text-center gap-2 ${aspectClasses} ${className}`}
      >
        <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
          <AlertCircle className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold text-red-800">छायाचित्र पाहण्यास निर्बंध</p>
        <p className="text-[11px] text-red-700/80 max-w-xs">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div
        className={`relative group w-full rounded-2xl overflow-hidden border border-[#E5E0D8] bg-[#FAF8F3] flex items-center justify-center ${aspectClasses} ${className}`}
      >
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 bg-[#FAF8F3]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
            <Loader2 className="h-6 w-6 text-emerald-700 animate-spin" />
            <span className="text-[11px] text-stone-600 font-medium">छायाचित्र सुरक्षितपणे लोड होत आहे...</span>
          </div>
        )}

        {/* Loaded Image */}
        {src && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="w-full h-full object-contain max-h-[360px] rounded-xl transition-transform duration-300 group-hover:scale-[1.01]"
              loading="lazy"
            />

            {/* Privacy Badge */}
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#E5E0D8] text-[10px] font-medium text-emerald-800 shadow-xs">
              <ShieldCheck className="h-3 w-3 text-emerald-700" />
              <span>सुरक्षित वैद्यकीय मीडिया</span>
            </div>

            {/* Lightbox Trigger Button */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setLightboxOpen(true)}
              className="absolute top-2.5 right-2.5 h-8 w-8 p-0 rounded-full bg-white/90 border-[#D9D3C7] text-stone-700 hover:text-stone-900 hover:bg-stone-100 shadow-xs backdrop-blur-sm cursor-pointer"
              title="Expand photo view"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && src && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-12 right-0 text-white hover:text-white hover:bg-white/20 rounded-full h-9 w-9 p-0 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </Button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/20 shadow-2xl"
            />

            <div className="mt-3 flex items-center justify-between w-full text-xs text-stone-300 px-2">
              <span className="truncate max-w-xs">{alt}</span>
              <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Maitri Private Stream
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
