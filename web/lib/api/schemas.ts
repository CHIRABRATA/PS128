import { z } from "zod";

/**
 * Zod schema for /api/analyze response payload
 */
export const DiseasePredictionSchema = z.object({
  suspected_condition: z.string().default("Unknown Condition"),
  confidence: z.number().default(0),
  animal_type: z.string().optional().default("Animal"),
  vitals_evaluated: z.record(z.string(), z.number()).optional().default({}),
  symptoms_analyzed: z.string().optional().default(""),
  epidemiology_context: z.record(z.string(), z.number()).optional().default({}),
}).passthrough();

export const IoTTelemetryAnalysisSchema = z.object({
  animal_id: z.string().optional().default("UNKNOWN"),
  temperature: z.number().optional().nullable(),
  activity_index: z.number().optional().nullable(),
  has_anomaly: z.boolean().default(false),
  anomalies: z.array(z.string()).default([]),
}).passthrough();

export const WeatherAnalysisSchema = z.object({
  temperature: z.number().optional().nullable(),
  humidity: z.number().optional().nullable(),
  precipitation: z.number().optional().nullable(),
  vector_breeding_risk: z.string().default("UNKNOWN"),
  weather_advisory: z.string().optional().default(""),
  source: z.string().optional().default("Weather API"),
}).passthrough();

export const OutbreakSurgeAnalysisSchema = z.object({
  latest_cases: z.number().default(0),
  historical_mean: z.number().default(0),
  z_score: z.number().default(0),
  is_outbreak_spike: z.boolean().default(false),
}).passthrough();

export const FarmerAdvisorySchema = z.object({
  language: z.string().default("English"),
  advisory: z.string().default("No advisory generated."),
  provider_used: z.string().optional().default("System"),
}).passthrough();

export const VisionPredictionDetailSchema = z.object({
  visual_anomaly_detected: z.boolean().default(false),
  primary_prediction: z.string().default("No prediction"),
  confidence: z.number().default(0),
  top_predictions: z
    .array(
      z.object({
        condition: z.string(),
        confidence: z.number(),
      })
    )
    .optional(),
  all_detections: z
    .array(
      z.object({
        condition: z.string(),
        confidence: z.number(),
      })
    )
    .optional(),
}).passthrough();

export const AnalyzeResponseSchema = z.object({
  overall_risk_score: z.number().min(0).max(100).default(0),
  overall_risk_level: z.string().default("UNKNOWN"),
  disease_prediction: DiseasePredictionSchema.default({
    suspected_condition: "No signal",
    confidence: 0,
    animal_type: "Animal",
    vitals_evaluated: {},
    symptoms_analyzed: "",
    epidemiology_context: {},
  }),
  yolo_vision_analysis: VisionPredictionDetailSchema.nullable().optional(),
  iot_telemetry_analysis: IoTTelemetryAnalysisSchema.optional(),
  weather_analysis: WeatherAnalysisSchema.optional(),
  outbreak_surge_analysis: OutbreakSurgeAnalysisSchema.optional(),
  farmer_advisory: FarmerAdvisorySchema.optional(),
}).passthrough();

/**
 * Zod schema for /api/predict (YOLO vision) response payload
 */
export const VisionResponseSchema = z.object({
  success: z.boolean().default(true),
  yolo_result: VisionPredictionDetailSchema.optional(),
  data: VisionPredictionDetailSchema.optional(),
  primary_prediction: z.string().optional(),
  confidence: z.number().optional(),
  visual_anomaly_detected: z.boolean().optional(),
  top_predictions: z
    .array(
      z.object({
        condition: z.string(),
        confidence: z.number(),
      })
    )
    .optional(),
  all_detections: z
    .array(
      z.object({
        condition: z.string(),
        confidence: z.number(),
      })
    )
    .optional(),
}).passthrough();

/**
 * Zod schema for /api/health response payload
 */
export const HealthCheckResponseSchema = z.object({
  status: z.string().default("unknown"),
  healthy: z.boolean().optional(),
  version: z.string().optional(),
}).passthrough();

export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
export type VisionResponse = z.infer<typeof VisionResponseSchema>;
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
