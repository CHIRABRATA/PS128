import { z } from "zod";

export class ConcurrencyError extends Error {
  constructor(message: string = "This record was updated by another user. Please refresh and try again.") {
    super(message);
    this.name = "ConcurrencyError";
  }
}

export class StateMachineError extends Error {
  constructor(message: string = "Invalid state transition.") {
    super(message);
    this.name = "StateMachineError";
  }
}

/**
 * Calculates risk rank index for triage sorting:
 * CRITICAL (5) > HIGH (4) > ELEVATED (3) > MEDIUM (2) > LOW (1) > UNKNOWN/null (0)
 */
export function getRiskRank(level?: string | null): number {
  if (!level) return 0;
  const l = level.toUpperCase();
  if (l === "CRITICAL") return 5;
  if (l === "HIGH") return 4;
  if (l === "ELEVATED") return 3;
  if (l === "MEDIUM") return 2;
  if (l === "LOW") return 1;
  return 0;
}

export const vetFeedbackSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  expectedUpdatedAt: z.string().min(1, "Concurrency lock timestamp is required"),
  vetDiagnosis: z.string().min(2, "Diagnosis summary must be at least 2 characters"),
  vetRecommendedAction: z.enum(["ISOLATE", "TREAT", "MONITOR", "REFER_LAB", "NONE"]),
  vetFollowUpDate: z.string().optional().nullable(),
  vetNotes: z.string().optional().nullable(),
});

export const referToLabSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  expectedUpdatedAt: z.string().min(1, "Concurrency lock timestamp is required"),
  labName: z.string().min(2, "Lab name is required"),
  vetDiagnosis: z.string().optional().nullable(),
  vetNotes: z.string().optional().nullable(),
});

export const confirmCaseSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  expectedUpdatedAt: z.string().min(1, "Concurrency lock timestamp is required"),
  vetDiagnosis: z.string().min(2, "Diagnosis summary required for confirmation"),
  vetNotes: z.string().optional().nullable(),
});

export const closeCaseSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  expectedUpdatedAt: z.string().min(1, "Concurrency lock timestamp is required"),
  vetNotes: z.string().optional().nullable(),
});

export const updateSampleStatusSchema = z.object({
  sampleId: z.string().min(1, "Sample ID is required"),
  expectedUpdatedAt: z.string().min(1, "Concurrency lock timestamp is required"),
  status: z.enum(["COLLECTED", "SENT", "RESULT_PENDING", "RESULT_RECEIVED"]),
  resultSummary: z.string().optional().nullable(),
  labName: z.string().optional().nullable(),
});

export const updateVetProfileSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters").max(100, "Name is too long"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number is too long")
    .regex(/^[+0-9\s-]{10,20}$/, "Please enter a valid phone number"),
  preferredLanguage: z.enum(["en", "hi", "mr", "bn"]).default("en"),
  districtId: z.string().optional().nullable(),
  blockId: z.string().optional().nullable(),
  villageId: z.string().optional().nullable(),
});

export type VetFeedbackInput = z.infer<typeof vetFeedbackSchema>;
export type ReferToLabInput = z.infer<typeof referToLabSchema>;
export type ConfirmCaseInput = z.infer<typeof confirmCaseSchema>;
export type CloseCaseInput = z.infer<typeof closeCaseSchema>;
export type UpdateSampleStatusInput = z.infer<typeof updateSampleStatusSchema>;
export type UpdateVetProfileInput = z.infer<typeof updateVetProfileSchema>;
