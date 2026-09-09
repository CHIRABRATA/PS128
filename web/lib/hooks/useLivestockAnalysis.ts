"use client";

import { useState } from "react";
import {
  analyzeLivestockHealth,
  LivestockApiError,
  predictYoloImage,
} from "@/lib/api/livestock";
import {
  MasterAnalysisPayload,
  UnifiedAnalysisResponse,
  UserFormInputs,
} from "@/lib/types/livestock";

interface UseLivestockAnalysisResult {
  loading: boolean;
  uploadingImage: boolean;
  error: string | null;
  result: UnifiedAnalysisResponse | null;
  executeAnalysis: (formData: UserFormInputs, imageFile?: File) => Promise<UnifiedAnalysisResponse | null>;
  reset: () => void;
}

function getVisionCategory(animal: string) {
  const normalizedAnimal = animal.toLowerCase();
  return normalizedAnimal.includes("dog") || normalizedAnimal.includes("cat") || normalizedAnimal.includes("pet")
    ? "pet"
    : "cow";
}

export function useLivestockAnalysis(): UseLivestockAnalysisResult {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UnifiedAnalysisResponse | null>(null);

  const executeAnalysis = async (formData: UserFormInputs, imageFile?: File) => {
    setLoading(true);
    setError(null);

    try {
      let visionResult = null;
      if (imageFile) {
        setUploadingImage(true);
        try {
          visionResult = await predictYoloImage(imageFile, getVisionCategory(formData.animal));
        } finally {
          setUploadingImage(false);
        }
      }

      const payload: MasterAnalysisPayload = {
        latitude: formData.latitude,
        longitude: formData.longitude,
        language: formData.language,
        health_report: {
          animal: formData.animal,
          symptoms: formData.symptoms,
          heart_rate: formData.heartRate,
          duration_days: formData.durationDays,
          affected_count: formData.affectedCount,
          herd_size: formData.herdSize,
          mortality_count: formData.mortalityCount,
        },
        iot_telemetry: {
          animal_id: formData.animalId,
          ...(formData.temperature !== undefined ? { temperature: formData.temperature } : {}),
          ...(formData.activity !== undefined ? { activity: formData.activity } : {}),
        },
        yolo_vision_analysis: visionResult,
        historical_weekly_cases: formData.historicalWeeklyCases,
      };

      const analysis = await analyzeLivestockHealth(payload);
      setResult(analysis);
      return analysis;
    } catch (caughtError) {
      const message = caughtError instanceof LivestockApiError
        ? caughtError.message
        : "Unable to complete the health analysis. Please try again.";
      setError(message);
      setResult(null);
      return null;
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setUploadingImage(false);
    setError(null);
    setResult(null);
  };

  return { loading, uploadingImage, error, result, executeAnalysis, reset };
}
