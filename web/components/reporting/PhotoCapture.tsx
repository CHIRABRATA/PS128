"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Trash2, Image as ImageIcon, Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface PhotoCaptureProps {
  photoUrl: string | null;
  onChangePhotoUrl: (url: string | null) => void;
  submissionId: string;
}

export function PhotoCapture({ photoUrl, onChangePhotoUrl, submissionId }: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  const processFile = async (file: File) => {
    setError(null);

    // 1. Client-side UX Validation
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setError(`Unsupported image format (${file.type || "unknown"}). Please upload a JPEG, PNG, or WebP photo.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`File size (${sizeMb} MB) exceeds the 10 MB maximum limit. Please select a smaller photo.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. Set immediate local preview for smooth UX
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    setUploading(true);

    try {
      // 3. Upload to secure endpoint
      const formData = new FormData();
      formData.append("file", file);
      formData.append("submissionId", submissionId);

      const response = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to upload image to secure storage.");
      }

      // 4. Update parent state with authorized storage reference
      onChangePhotoUrl(data.url);
    } catch (err: unknown) {
      console.error("[Client Photo Upload Error]:", err);
      const msg = err instanceof Error ? err.message : "Image upload failed.";
      setError(`${msg} You can retry or submit the report without a photo.`);
      onChangePhotoUrl(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemovePhoto = () => {
    setLocalPreview(null);
    setError(null);
    onChangePhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const displayImage = localPreview || photoUrl;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
          <Camera className="h-4 w-4 text-emerald-700" />
          <span>Lesion Inspection Photo</span>
        </label>
        <span className="text-[11px] text-stone-500 font-medium">Optional</span>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2 animate-fade-in">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-7 text-[11px] border-red-300 bg-white text-red-800 hover:bg-red-50 rounded-xl hover-lift-sm"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Try again
            </Button>
          </div>
        </div>
      )}

      {/* Preview or Upload Box */}
      {displayImage ? (
        <div className="relative rounded-2xl overflow-hidden border border-[#E5E0D8] bg-[#FAF8F3] max-h-64 flex flex-col items-center justify-center p-2 shadow-2xs animate-fade-in group">
          {uploading && (
            <div className="absolute inset-0 bg-white/85 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 text-emerald-700 animate-spin" />
              <span className="text-xs text-stone-700 font-medium">Uploading image securely...</span>
            </div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayImage}
            alt="Animal Health Inspection Preview"
            className="max-h-56 object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
          />

          <div className="absolute top-3 right-3 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleRemovePhoto}
              disabled={uploading}
              className="h-8 w-8 p-0 rounded-full bg-red-700 hover:bg-red-800 text-white shadow-md cursor-pointer hover-lift-sm"
              title="Remove photo"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center text-center gap-3 min-h-[140px] hover-lift-sm ${
            isDragging
              ? "border-emerald-600 bg-emerald-50/60 scale-[1.01]"
              : "border-[#D9D3C7] bg-[#FAF8F3]/70 hover:border-emerald-600 hover:bg-emerald-50/40"
          }`}
        >
          <div className="h-12 w-12 rounded-2xl bg-white border border-[#E5E0D8] flex items-center justify-center text-emerald-700 shadow-2xs transition-transform duration-200 group-hover:scale-110">
            <ImageIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-900">Take a photo or drag and drop a file here</p>
            <p className="text-[11px] text-stone-500 max-w-xs mt-0.5">
              Clear photos of skin lesions, saliva, eyes, or hooves help the veterinary team review the report.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button type="button" size="sm" variant="outline" className="text-xs gap-1.5 border-[#D9D3C7] bg-white text-stone-800 min-h-[36px] rounded-xl shadow-2xs hover-lift-sm">
              <Camera className="h-3.5 w-3.5 text-emerald-700" />
              <span>Camera</span>
            </Button>
            <Button type="button" size="sm" variant="outline" className="text-xs gap-1.5 border-[#D9D3C7] bg-white text-stone-800 min-h-[36px] rounded-xl shadow-2xs hover-lift-sm">
              <Upload className="h-3.5 w-3.5" />
              <span>Gallery</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

