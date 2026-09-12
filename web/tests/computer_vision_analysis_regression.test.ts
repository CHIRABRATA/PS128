import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  predictAnimalImage,
  getBackendBaseUrl,
  logSafeBackendDiagnostics,
  BackendResponseError,
} from "@/lib/api/backend-client";
import {
  getCasePhotoBuffer,
  runCasePhotoVisionAction,
} from "@/lib/actions/analysis";
import prisma from "@/lib/db/prisma";
import * as sessionModule from "@/lib/auth/session";

describe("Computer Vision / YOLO Photo Analysis Pipeline & Regression Test Suite", () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  const mockUser = {
    id: "vet_user_01",
    clerkId: "clerk_vet_01",
    role: "VETERINARIAN",
    status: "ACTIVE",
    name: "Dr. Sharma",
    phone: "+919876543210",
    preferredLanguage: "en",
    districtId: "d1",
    blockId: "b1",
    villageId: "v1",
    district: null,
    block: null,
    village: null,
    telegramChatId: null,
    telegramLinkToken: null,
    telegramLinkTokenCreatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockHealthCase = {
    id: "case_test_cv_01",
    caseNumber: "CASE-2026-0001",
    submissionId: "sub_cv_001",
    animalId: "animal_01",
    createdByUserId: "vet_user_01",
    reportSource: "VET",
    status: "UNDER_EXAMINATION",
    symptoms: ["fever", "skin nodules"],
    durationDays: 3,
    affectedCount: 2,
    herdSize: 10,
    mortalityCount: 0,
    photoUrl: "/images/clinical/cattle_skin_lesions.jpg",
    gpsLat: 18.5204,
    gpsLng: 73.8567,
    iotTelemetry: {
      temperature: 39.8,
      activity: 40,
      heartRate: 88,
    },
    analysisResult: null,
    visionResult: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    animal: {
      id: "animal_01",
      tag: "COW-101",
      species: "COW",
      herd: {
        id: "herd_01",
        species: "COW",
        farm: {
          id: "farm_01",
          name: "Pune Dairy",
          villageId: "v1",
          latitude: 18.5204,
          longitude: 73.8567,
          village: {
            id: "v1",
            name: "Koregaon",
            blockId: "b1",
            block: {
              id: "b1",
              name: "Haveli",
              districtId: "d1",
            },
          },
        },
      },
    },
  };

  beforeEach(() => {
    process.env.AI_ENGINE_URL = "http://localhost:8000";
    vi.spyOn(sessionModule, "requireActiveUser").mockResolvedValue(mockUser as sessionModule.FullAppUser);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Backend URL resolution & normalization
  // ---------------------------------------------------------------------------
  it("1. getBackendBaseUrl normalizes URLs, strips trailing slashes, and removes duplicate /api", () => {
    process.env.AI_ENGINE_URL = "https://ps128-ai.onrender.com/";
    expect(getBackendBaseUrl()).toBe("https://ps128-ai.onrender.com");

    process.env.AI_ENGINE_URL = "https://ps128-ai.onrender.com/api";
    expect(getBackendBaseUrl()).toBe("https://ps128-ai.onrender.com");

    process.env.AI_ENGINE_URL = "https://ps128-ai.onrender.com/api/";
    expect(getBackendBaseUrl()).toBe("https://ps128-ai.onrender.com");

    delete process.env.AI_ENGINE_URL;
    process.env.NEXT_PUBLIC_API_URL = "http://127.0.0.1:8000";
    expect(getBackendBaseUrl()).toBe("http://127.0.0.1:8000");
  });

  // ---------------------------------------------------------------------------
  // 2. Safe Diagnostics Logging (No secrets / tokens leaked)
  // ---------------------------------------------------------------------------
  it("2. logSafeBackendDiagnostics logs only sanitized URL paths and metadata without secrets", () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    logSafeBackendDiagnostics(
      "Test YOLO Inference",
      "https://ps128-ai.onrender.com/api/predict?secret_key=xyz",
      { status: 200, contentType: "application/json", byteSize: 54321 }
    );

    expect(consoleSpy).toHaveBeenCalled();
    const loggedMessage = consoleSpy.mock.calls[0][0];
    expect(loggedMessage).toContain("Test YOLO Inference");
    expect(loggedMessage).toContain("https://ps128-ai.onrender.com/api/predict");
    expect(loggedMessage).toContain("status: 200");
    expect(loggedMessage).toContain("bytes: 54321");
    expect(loggedMessage).not.toContain("secret_key");
  });

  // ---------------------------------------------------------------------------
  // 3. predictAnimalImage sends multipart/form-data with file and category
  // ---------------------------------------------------------------------------
  it("3. predictAnimalImage sends file and category to POST /api/predict", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedBody: FormData | null = null;

    global.fetch = vi.fn().mockImplementation(async (url: string, opts: RequestInit) => {
      capturedUrl = String(url);
      capturedMethod = opts.method || "GET";
      capturedBody = opts.body as FormData;

      return new Response(
        JSON.stringify({
          success: true,
          yolo_result: {
            primary_prediction: "Lumpy Skin Disease",
            confidence: 96.8,
            visual_anomaly_detected: true,
            severity: "HIGH",
            top_predictions: [
              { condition: "Lumpy Skin Disease", confidence: 96.8 },
              { condition: "Foot and Mouth Disease", confidence: 2.1 },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const dummyBuffer = Buffer.from("fake_jpeg_binary_data");
    const result = await predictAnimalImage(dummyBuffer, "image/jpeg", "cow");

    expect(capturedUrl).toBe("http://localhost:8000/api/predict");
    expect(capturedMethod).toBe("POST");
    expect(capturedBody).toBeInstanceOf(FormData);
    const fd = capturedBody as unknown as FormData;
    expect(fd.get("category")).toBe("cow");
    expect(fd.get("file")).toBeDefined();

    expect(result.success).toBe(true);
    expect(result.yolo_result?.primary_prediction).toBe("Lumpy Skin Disease");
    expect(result.yolo_result?.confidence).toBe(96.8);
    expect(result.yolo_result?.visual_anomaly_detected).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 4. predictAnimalImage handles HTTP errors and rejects with BackendResponseError
  // ---------------------------------------------------------------------------
  it("4. predictAnimalImage throws BackendResponseError on HTTP error status", async () => {
    global.fetch = vi.fn().mockImplementation(async () => {
      return new Response(JSON.stringify({ detail: "Model inference failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    });

    const dummyBuffer = Buffer.from("fake_jpeg_binary_data");
    await expect(predictAnimalImage(dummyBuffer, "image/jpeg", "cow")).rejects.toThrow(
      BackendResponseError
    );
  });

  // ---------------------------------------------------------------------------
  // 5. getCasePhotoBuffer handles data URI, relative files, and mock fallbacks
  // ---------------------------------------------------------------------------
  it("5. getCasePhotoBuffer extracts buffers from data URIs and local clinical paths", async () => {
    // Data URI
    const dataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const resData = await getCasePhotoBuffer(dataUri);
    expect(resData).not.toBeNull();
    expect(resData?.contentType).toBe("image/png");
    expect(resData?.buffer.length).toBeGreaterThan(0);

    // Mock dev URL fallback
    const mockBlobUrl = "https://mock-blob.vercel-storage.com/cases/case_01.jpg";
    const resMock = await getCasePhotoBuffer(mockBlobUrl);
    expect(resMock).not.toBeNull();
    expect(resMock?.contentType).toBe("image/jpeg");
    expect(resMock?.buffer.length).toBeGreaterThan(0);

    // Relative clinical path
    const relPath = "/images/clinical/cattle_skin_lesions.jpg";
    const resRel = await getCasePhotoBuffer(relPath);
    expect(resRel).not.toBeNull();
    expect(resRel?.buffer.length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 6. runCasePhotoVisionAction executes YOLO inference and updates Prisma DB
  // ---------------------------------------------------------------------------
  it("6. runCasePhotoVisionAction executes YOLO, updates DB, and returns structured results", async () => {
    vi.spyOn(prisma.case, "findUnique").mockResolvedValue(
      mockHealthCase as unknown as Awaited<ReturnType<typeof prisma.case.findUnique>>
    );
    const updateSpy = vi.spyOn(prisma.case, "update").mockResolvedValue(
      mockHealthCase as unknown as Awaited<ReturnType<typeof prisma.case.update>>
    );

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/predict")) {
        return new Response(
          JSON.stringify({
            success: true,
            yolo_result: {
              primary_prediction: "Lumpy Skin Disease",
              confidence: 94.2,
              visual_anomaly_detected: true,
              severity: "HIGH",
              top_predictions: [
                { condition: "Lumpy Skin Disease", confidence: 94.2 },
                { condition: "Foot and Mouth Disease", confidence: 3.5 },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (urlStr.includes("/api/analyze")) {
        return new Response(
          JSON.stringify({
            overall_risk_score: 85,
            overall_risk_level: "CRITICAL",
            disease_prediction: {
              suspected_condition: "Lumpy Skin Disease",
              confidence: 0.94,
              animal_type: "Cow",
            },
            yolo_vision_analysis: {
              primary_prediction: "Lumpy Skin Disease",
              confidence: 94.2,
              visual_anomaly_detected: true,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    });

    const result = await runCasePhotoVisionAction("case_test_cv_01");

    expect(result.success).toBe(true);
    expect(result.visionResult).toBeDefined();
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "case_test_cv_01" },
        data: expect.objectContaining({
          visionResult: expect.objectContaining({
            yolo_result: expect.objectContaining({
              primary_prediction: "Lumpy Skin Disease",
            }),
          }),
        }),
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 7. runCasePhotoVisionAction returns controlled error when case has no photo
  // ---------------------------------------------------------------------------
  it("7. runCasePhotoVisionAction returns controlled error when case has no photo", async () => {
    const caseWithoutPhoto = { ...mockHealthCase, photoUrl: null };
    vi.spyOn(prisma.case, "findUnique").mockResolvedValue(
      caseWithoutPhoto as unknown as Awaited<ReturnType<typeof prisma.case.findUnique>>
    );

    const result = await runCasePhotoVisionAction("case_test_cv_01");
    expect(result.success).toBe(false);
    expect(result.error).toContain("No clinical photograph attached");
  });

  // ---------------------------------------------------------------------------
  // 8. runCasePhotoVisionAction returns controlled error when AI backend is offline
  // ---------------------------------------------------------------------------
  it("8. runCasePhotoVisionAction returns friendly controlled error when AI engine is offline", async () => {
    vi.spyOn(prisma.case, "findUnique").mockResolvedValue(
      mockHealthCase as unknown as Awaited<ReturnType<typeof prisma.case.findUnique>>
    );

    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED: Connection refused"));

    const result = await runCasePhotoVisionAction("case_test_cv_01");
    expect(result.success).toBe(false);
    expect(result.error).toContain("AI vision service is temporarily unavailable");
  });
});
