"use client";

import React from "react";

interface MotionCardProps {
  children: React.ReactNode;
  className?: string;
  hoverElevation?: boolean;
  interactiveBorder?: string; // Border color on hover (e.g., "hover:border-emerald-600")
}

export function MotionCard({
  children,
  className = "",
  hoverElevation = true,
  interactiveBorder = "hover:border-emerald-600/70",
}: MotionCardProps) {
  return (
    <div
      className={`relative transition-all duration-300 ease-out ${
        hoverElevation
          ? "hover-lift hover:shadow-md"
          : ""
      } ${interactiveBorder} ${className}`}
    >
      {children}
    </div>
  );
}
