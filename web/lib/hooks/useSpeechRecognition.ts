"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type SpeechRecognitionErrorType =
  | "not-allowed"
  | "no-speech"
  | "audio-capture"
  | "network"
  | "service-not-allowed"
  | "unsupported"
  | "unknown";

export interface StartListeningOptions {
  locale: string;
  onTranscript: (text: string) => void;
  baseText?: string;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  error: SpeechRecognitionErrorType | null;
  clearError: () => void;
  startListening: (options: StartListeningOptions) => void;
  stopListening: () => void;
  abortListening: () => void;
}

/**
 * Maps application locale code to BCP-47 speech recognition locale.
 * Maitri supports en, hi, mr, bn.
 */
export function mapAppLocaleToSpeechLang(locale?: string): string {
  if (!locale) return "en-IN";
  const normalized = locale.toLowerCase().trim();

  if (normalized === "hi" || normalized.startsWith("hi-")) {
    return "hi-IN";
  }
  if (normalized === "mr" || normalized.startsWith("mr-")) {
    return "mr-IN";
  }
  if (normalized === "bn" || normalized.startsWith("bn-")) {
    return "bn-IN";
  }
  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en-IN";
  }

  return "en-IN";
}

/**
 * Cleanly combines existing typed text (baseText) with transcribed speech
 * avoiding duplicate whitespace or awkward spacing.
 */
export function formatCombinedTranscript(baseText?: string, speechText?: string): string {
  const cleanBase = (baseText ?? "").trim();
  const cleanSpeech = (speechText ?? "").trim();

  if (!cleanBase) return cleanSpeech;
  if (!cleanSpeech) return cleanBase;

  return `${cleanBase} ${cleanSpeech}`;
}

// Global browser SpeechRecognition type helpers
export interface SpeechRecognitionResultItem {
  transcript: string;
  confidence?: number;
}

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

export interface SpeechRecognitionInstanceLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionInstanceLike;

function getSpeechRecognitionClass(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;

  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isSupported, setIsSupported] = useState<boolean>(() => {
    return typeof window !== "undefined" && getSpeechRecognitionClass() !== null;
  });
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [error, setError] = useState<SpeechRecognitionErrorType | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const baseTextRef = useRef<string>("");
  const onTranscriptRef = useRef<((text: string) => void) | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const cleanupInstance = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onstart = null;
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.abort();
      } catch {
        // Safe ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Safe ignore
      }
    }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const abortListening = useCallback(() => {
    cleanupInstance();
    setIsListening(false);
    setInterimTranscript("");
  }, [cleanupInstance]);

  const startListening = useCallback(
    ({ locale, onTranscript, baseText = "" }: StartListeningOptions) => {
      const SpeechClass = getSpeechRecognitionClass();

      if (!SpeechClass) {
        setError("unsupported");
        setIsSupported(false);
        setIsListening(false);
        return;
      }

      // Cleanup any previous running session
      cleanupInstance();
      setError(null);
      setInterimTranscript("");

      baseTextRef.current = baseText;
      onTranscriptRef.current = onTranscript;

      try {
        const recognition = new SpeechClass();
        recognition.lang = mapAppLocaleToSpeechLang(locale);
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let accumulatedFinal = "";
          let currentInterim = "";

          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              accumulatedFinal += res[0].transcript;
            } else {
              currentInterim += res[0].transcript;
            }
          }

          setInterimTranscript(currentInterim.trim());

          if (accumulatedFinal.trim() && onTranscriptRef.current) {
            const combined = formatCombinedTranscript(baseTextRef.current, accumulatedFinal);
            onTranscriptRef.current(combined);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
          const rawError = event.error;
          let mappedError: SpeechRecognitionErrorType = "unknown";

          if (rawError === "not-allowed") {
            mappedError = "not-allowed";
          } else if (rawError === "no-speech") {
            mappedError = "no-speech";
          } else if (rawError === "audio-capture") {
            mappedError = "audio-capture";
          } else if (rawError === "network") {
            mappedError = "network";
          } else if (rawError === "service-not-allowed") {
            mappedError = "service-not-allowed";
          }

          setError(mappedError);
          setIsListening(false);
          setInterimTranscript("");
          cleanupInstance();
        };

        recognition.onend = () => {
          setIsListening(false);
          setInterimTranscript("");
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch {
        setError("unknown");
        setIsListening(false);
        setInterimTranscript("");
        cleanupInstance();
      }
    },
    [cleanupInstance]
  );

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanupInstance();
    };
  }, [cleanupInstance]);

  return {
    isSupported,
    isListening,
    interimTranscript,
    error,
    clearError,
    startListening,
    stopListening,
    abortListening,
  };
}
