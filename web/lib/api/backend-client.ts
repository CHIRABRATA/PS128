import "server-only";
import {
  AnalyzeResponseSchema,
  VisionResponseSchema,
  HealthCheckResponseSchema,
  AnalyzeResponse,
  VisionResponse,
  HealthCheckResponse,
} from "./schemas";

export class BackendUnavailableError extends Error {
  constructor(message: string = "AI engine backend service is unavailable.") {
    super(message);
    this.name = "BackendUnavailableError";
  }
}

export class BackendTimeoutError extends Error {
  constructor(message: string = "AI engine request timed out.") {
    super(message);
    this.name = "BackendTimeoutError";
  }
}

export class BackendValidationError extends Error {
  constructor(message: string = "Invalid backend payload schema.") {
    super(message);
    this.name = "BackendValidationError";
  }
}

export class BackendResponseError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "BackendResponseError";
    this.statusCode = statusCode;
  }
}

export interface HealthReportPayload {
  animal: string;
  symptoms: string[];
  heart_rate?: number | null;
  duration_days?: number;
  affected_count?: number;
  herd_size?: number;
  mortality_count?: number;
}

export interface IoTTelemetryPayload {
  animal_id?: string | null;
  temperature?: number | null;
  activity?: number | null;
  simulate_fever?: boolean;
}

export interface AnalyzeRequestPayload {
  latitude?: number | null;
  longitude?: number | null;
  language?: string;
  health_report?: HealthReportPayload;
  iot_telemetry?: IoTTelemetryPayload;
  yolo_vision_analysis?: Record<string, unknown> | null;
  historical_weekly_cases?: number[];
}

const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds timeout

function getBackendBaseUrl(): string {
  const url = process.env.AI_ENGINE_URL || "http://localhost:8000";
  return url.replace(/\/$/, "");
}

/**
 * Executes fetch with timeout protection.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new BackendTimeoutError(`Request to AI Engine timed out after ${timeoutMs}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sends health report and telemetry to POST /api/analyze.
 * Retries up to 2 times for transient 5xx errors or network drops.
 */
export async function analyzeCase(payload: AnalyzeRequestPayload): Promise<AnalyzeResponse> {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/analyze`;

  const requestOptions: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  };

  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const response = await fetchWithTimeout(endpoint, requestOptions);

      if (!response.ok) {
        // Do NOT retry 4xx client validation errors
        if (response.status >= 400 && response.status < 500) {
          const errText = await response.text().catch(() => "");
          throw new BackendResponseError(
            `Backend returned HTTP ${response.status}: ${errText}`,
            response.status
          );
        }

        // Retry 5xx if attempts remain
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        throw new BackendResponseError(
          `Backend returned HTTP ${response.status}`,
          response.status
        );
      }

      const rawJson = await response.json();

      // Runtime schema validation
      const parseResult = AnalyzeResponseSchema.safeParse(rawJson);
      if (!parseResult.success) {
        console.warn("[Backend Analysis Schema Warning]:", parseResult.error.format());
        // Passthrough best effort fallback if core fields present
        return rawJson as AnalyzeResponse;
      }

      return parseResult.data;
    } catch (err: unknown) {
      if (err instanceof BackendResponseError || err instanceof BackendTimeoutError) {
        throw err;
      }
      if (attempts >= maxAttempts) {
        console.error("[AI Engine Analysis Error]:", err);
        throw new BackendUnavailableError(
          err instanceof Error ? err.message : "Failed to connect to AI engine."
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new BackendUnavailableError("AI Engine service unreachable.");
}

/**
 * Sends animal clinical photograph to POST /api/predict (YOLO vision engine).
 */
export async function predictAnimalImage(
  imageBuffer: Buffer,
  contentType: string,
  category: string
): Promise<VisionResponse> {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/predict`;

  const formData = new FormData();
  const uint8 = new Uint8Array(imageBuffer);
  const blob = new Blob([uint8], { type: contentType });
  formData.append("file", blob, "image.jpg");
  formData.append("category", category);

  try {
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      body: formData,
      cache: "no-store",
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new BackendResponseError(
        `Backend /api/predict HTTP ${response.status}: ${errText}`,
        response.status
      );
    }

    const rawJson = await response.json();
    const parseResult = VisionResponseSchema.safeParse(rawJson);

    if (!parseResult.success) {
      console.warn("[Backend Vision Schema Warning]:", parseResult.error.format());
      return rawJson as VisionResponse;
    }

    return parseResult.data;
  } catch (err: unknown) {
    if (err instanceof BackendResponseError || err instanceof BackendTimeoutError) {
      throw err;
    }
    console.error("[AI Engine Vision Error]:", err);
    throw new BackendUnavailableError(
      err instanceof Error ? err.message : "Failed to run visual prediction."
    );
  }
}

/**
 * Checks FastAPI backend health status via GET /api/health.
 */
export async function getBackendHealth(): Promise<HealthCheckResponse> {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/health`;

  try {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
      3000 // 3 seconds health timeout
    );

    if (!response.ok) {
      return { status: "unhealthy", healthy: false };
    }

    const rawJson = await response.json();
    const parseResult = HealthCheckResponseSchema.safeParse(rawJson);
    return parseResult.success ? parseResult.data : { status: "healthy", healthy: true };
  } catch (err) {
    console.warn("[AI Engine Health Check Failed]:", err);
    return { status: "offline", healthy: false };
  }
}
