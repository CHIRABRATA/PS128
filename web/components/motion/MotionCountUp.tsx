"use client";

import React, { useEffect, useRef, useState } from "react";

interface MotionCountUpProps {
  value: number;
  duration?: number; // ms
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function MotionCountUp({
  value,
  duration = 1400,
  prefix = "",
  suffix = "",
  className = "",
}: MotionCountUpProps) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return value;
    }
    return 0;
  });
  const [hasAnimated, setHasAnimated] = useState(false);
  const elemRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          const startTime = performance.now();
          const startValue = 0;
          const targetValue = value;

          const step = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out quad
            const easeOutProgress = 1 - (1 - progress) * (1 - progress);
            const current = Math.round(startValue + (targetValue - startValue) * easeOutProgress);

            setDisplayValue(current);

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              setDisplayValue(targetValue);
            }
          };

          requestAnimationFrame(step);
          if (elemRef.current) {
            observer.unobserve(elemRef.current);
          }
        }
      },
      { threshold: 0.2 }
    );

    const elem = elemRef.current;
    if (elem) {
      observer.observe(elem);
    }

    return () => {
      if (elem) {
        observer.unobserve(elem);
      }
    };
  }, [value, duration, hasAnimated]);

  return (
    <span ref={elemRef} className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}
