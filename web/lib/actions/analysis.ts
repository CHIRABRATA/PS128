"use server";

import prisma from "@/lib/db/prisma";
import { requireActiveUser } from "@/lib/auth/session";
import { canUserAccessCase } from "@/lib/storage/auth";
import { analyzeCase, predictAnimalImage, getBackendHealth, AnalyzeRequestPayload } from "@/lib/api/backend-client";
import { getHistoricalWeeklyCases } from "@/lib/api/historical";
import { Prisma } from "@prisma/client";

export interface AnalysisActionResult {
  success: boolean;
  error?: string;
  analysisResult?: Prisma.JsonValue | null;
  visionResult?: Prisma.JsonValue | null;
}

/**
 * Maps database Species enum or string to FastAPI backend expected animal parameters.
 */
function mapSpeciesToBackend(species?: string | null): { animal: string; category: string } {
  const sp = (species || "").toUpperCase();
  if (sp.includes("DOG")) return { animal: "Dog", category: "dog" };
  if (sp.includes("PET") || sp.includes("CAT")) return { animal: "Pet", category: "pet" };
  return { animal: "Cow", category: "cow" };
}

/**
 * Server action to execute or retry AI analysis for a specific Case.
 * Authenticates user, verifies authorization, calls /api/analyze and /api/predict,
 * and updates Case.analysisResult and Case.visionResult in PostgreSQL.
 */
export async function runCaseAnalysisAction(caseId: string): Promise<AnalysisActionResult> {
  try {
    // 1. Authenticate user
    const appUser = await requireActiveUser();

    // 2. Load Case with location & animal metadata
    const healthCase = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        animal: {
          include: {
            herd: {
              include: {
                farm: {
                  include: {
                    village: {
                      include: {
                        block: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!healthCase) {
      return { success: false, error: "Health case not found." };
    }

    // 3. Verify user authorization
    const isAuthorized = canUserAccessCase(appUser, healthCase);
    if (!isAuthorized) {
      return { success: false, error: "Unauthorized access to health case analysis." };
    }

    const farm = healthCase.animal.herd.farm;
    const districtId = farm.village.block.districtId;
    const species = healthCase.animal.herd.species;
    const { animal, category } = mapSpeciesToBackend(species);

    // 4. Calculate real historical weekly cases (zero fabricated counts)
    const historicalCases = await getHistoricalWeeklyCases(districtId);

    // 5. Extract raw IoT telemetry if present
    const iotRaw = (healthCase.iotTelemetry as Record<string, unknown> | null) || null;

    // 6. Build /api/analyze request payload
    const analyzePayload: AnalyzeRequestPayload = {
      latitude: healthCase.gpsLat ?? farm.latitude ?? 28.6139,
      longitude: healthCase.gpsLng ?? farm.longitude ?? 77.209,
      language: appUser.preferredLanguage || "English",
      health_report: {
        animal,
        symptoms: healthCase.symptoms,
        heart_rate: iotRaw?.heartRate ? Number(iotRaw.heartRate) : null,
        duration_days: healthCase.durationDays,
        affected_count: healthCase.affectedCount,
        herd_size: Math.max(healthCase.affectedCount, 10),
        mortality_count: healthCase.mortalityCount,
      },
      iot_telemetry: iotRaw
        ? {
            animal_id: (iotRaw.deviceId as string) || healthCase.animal.tag,
            temperature: iotRaw.temperature ? Number(iotRaw.temperature) : null,
            activity: iotRaw.activity ? Number(iotRaw.activity) : null,
          }
        : undefined,
      historical_weekly_cases: historicalCases,
    };

    let updatedAnalysisResult: Prisma.JsonValue | null = healthCase.analysisResult;
    let updatedVisionResult: Prisma.JsonValue | null = healthCase.visionResult;
    let analyzeSuccess = false;
    let yoloAnalysis: Record<string, unknown> | null = null;

    // 7. Execute POST /api/predict if visionResult is not already present.
    if (updatedVisionResult) {
      const visionPayload = updatedVisionResult as unknown as Record<string, unknown>;
      const extractedVision = visionPayload.yolo_result || visionPayload.data || visionPayload;
      if (extractedVision && typeof extractedVision === "object") {
        yoloAnalysis = extractedVision as Record<string, unknown>;
      }
    } else if (healthCase.photoUrl) {
      try {
        let imageBuffer: Buffer | null = null;
        let contentType = "image/jpeg";

        if (healthCase.photoUrl.startsWith("data:")) {
          const matches = healthCase.photoUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
          if (matches) {
            contentType = matches[1];
            imageBuffer = Buffer.from(matches[2], "base64");
          }
        } else if (healthCase.photoUrl.includes("mock-blob.vercel-storage.com")) {
          // Local storage has no image bytes, so continue without optional vision analysis.
          console.warn("[Case Vision] Skipping mock storage URL; unified analysis will continue without image inference.");
        } else {
          const res = await fetch(healthCase.photoUrl);
          if (res.ok) {
            contentType = res.headers.get("content-type") || "image/jpeg";
            const arrayBuffer = await res.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
          }
        }

        if (imageBuffer) {
          const visionRes = await predictAnimalImage(imageBuffer, contentType, category);
          updatedVisionResult = visionRes as unknown as Prisma.JsonValue;
          const visionPayload = visionRes as unknown as Record<string, unknown>;
          const extractedVision = visionPayload.yolo_result || visionPayload.data || visionPayload;
          if (extractedVision && typeof extractedVision === "object") {
            yoloAnalysis = extractedVision as Record<string, unknown>;
          }
        }
      } catch (err: unknown) {
        console.warn("[Case Vision Execution Warning]:", err);
      }
    }

    // 8. Execute POST /api/analyze with weather coordinates and optional YOLO output.
    try {
      const analyzeRes = await analyzeCase({
        ...analyzePayload,
        yolo_vision_analysis: yoloAnalysis,
      });
      updatedAnalysisResult = analyzeRes as unknown as Prisma.JsonValue;
      analyzeSuccess = true;
    } catch (err: unknown) {
      console.warn("[Case Analysis Execution Warning]:", err);
      // Case remains valid (status = PENDING_REVIEW, analysisResult = null/existing)
    }

    // 9. Update Prisma database record with results
    if (analyzeSuccess || updatedVisionResult) {
      await prisma.case.update({
        where: { id: caseId },
        data: {
          analysisResult: updatedAnalysisResult ?? Prisma.DbNull,
          visionResult: updatedVisionResult ?? Prisma.DbNull,
        },
      });
    }

    if (!analyzeSuccess && !updatedVisionResult) {
      return {
        success: false,
        error: "Report submitted. AI analysis is temporarily unavailable.",
        analysisResult: null,
        visionResult: null,
      };
    }

    return {
      success: true,
      analysisResult: updatedAnalysisResult,
      visionResult: updatedVisionResult,
    };
  } catch (err: unknown) {
    console.error("[Run Case Analysis Action Error]:", err);
    const msg = err instanceof Error ? err.message : "Failed to execute case analysis.";
    return { success: false, error: msg };
  }
}

/**
 * Protected server action to retry AI analysis for a case.
 */
export async function retryCaseAnalysisAction(caseId: string): Promise<AnalysisActionResult> {
  return await runCaseAnalysisAction(caseId);
}

/**
 * Server action to check AI engine backend health.
 */
export async function checkBackendHealthAction(): Promise<{ healthy: boolean; status: string }> {
  try {
    const health = await getBackendHealth();
    return {
      healthy: Boolean(health.healthy ?? (health.status === "healthy" || health.status === "ok")),
      status: health.status || "unknown",
    };
  } catch {
    return { healthy: false, status: "offline" };
  }
}
