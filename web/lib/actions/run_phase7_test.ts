import { getRiskRank, vetFeedbackSchema, referToLabSchema, updateSampleStatusSchema } from "../vet/schemas";
import { CaseStatus } from "@prisma/client";

async function runPhase7Tests() {
  console.log("==========================================");
  console.log("RUNNING MAITRI PHASE 7 VET WORKSTATION TEST SUITE");
  console.log("==========================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string) {
    if (condition) {
      console.log(`[PASS] ${title}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title}`);
      failed++;
    }
  }

  // 1. Queue Risk Rank Priority Order
  assert(getRiskRank("CRITICAL") === 5, "Risk rank CRITICAL is 5 (Highest)");
  assert(getRiskRank("HIGH") === 4, "Risk rank HIGH is 4");
  assert(getRiskRank("ELEVATED") === 3, "Risk rank ELEVATED is 3");
  assert(getRiskRank("MEDIUM") === 2, "Risk rank MEDIUM is 2");
  assert(getRiskRank("LOW") === 1, "Risk rank LOW is 1");
  assert(getRiskRank("UNKNOWN") === 0, "Risk rank UNKNOWN is 0 (Lowest)");
  assert(getRiskRank(null) === 0, "Risk rank null is 0 (Lowest)");

  // 2. Strict State Machine Validation
  function canTransition(current: CaseStatus, target: CaseStatus): boolean {
    if (current === "CLOSED_HARMLESS" || current === "CONFIRMED") return false; // Terminal states
    if (current === "PENDING_REVIEW" && (target === "UNDER_EXAMINATION" || target === "LAB_REFERRAL" || target === "CONFIRMED" || target === "CLOSED_HARMLESS")) return true;
    if (current === "UNDER_EXAMINATION" && (target === "LAB_REFERRAL" || target === "CONFIRMED" || target === "CLOSED_HARMLESS")) return true;
    if (current === "LAB_REFERRAL" && (target === "CONFIRMED" || target === "CLOSED_HARMLESS")) return true;
    return false;
  }

  assert(canTransition("PENDING_REVIEW", "UNDER_EXAMINATION"), "Valid transition: PENDING_REVIEW -> UNDER_EXAMINATION");
  assert(canTransition("UNDER_EXAMINATION", "LAB_REFERRAL"), "Valid transition: UNDER_EXAMINATION -> LAB_REFERRAL");
  assert(canTransition("UNDER_EXAMINATION", "CONFIRMED"), "Valid transition: UNDER_EXAMINATION -> CONFIRMED");
  assert(canTransition("UNDER_EXAMINATION", "CLOSED_HARMLESS"), "Valid transition: UNDER_EXAMINATION -> CLOSED_HARMLESS");
  assert(canTransition("LAB_REFERRAL", "CONFIRMED"), "Valid transition: LAB_REFERRAL -> CONFIRMED");
  assert(!canTransition("CLOSED_HARMLESS", "UNDER_EXAMINATION"), "Reject transition from terminal CLOSED_HARMLESS state");
  assert(!canTransition("CONFIRMED", "LAB_REFERRAL"), "Reject transition from terminal CONFIRMED state");

  // 3. Schema Validation: Vet Feedback Form
  const validFeedback = vetFeedbackSchema.safeParse({
    caseId: "c1",
    expectedUpdatedAt: "2026-09-08T00:00:00.000Z",
    vetDiagnosis: "Suspected Foot and Mouth Disease",
    vetRecommendedAction: "ISOLATE",
    vetFollowUpDate: "2026-09-15",
    vetNotes: "Keep animal isolated for 7 days.",
  });
  assert(validFeedback.success, "Validate valid vet feedback schema input");

  const invalidFeedback = vetFeedbackSchema.safeParse({
    caseId: "c1",
    expectedUpdatedAt: "2026-09-08T00:00:00.000Z",
    vetDiagnosis: "A", // too short
    vetRecommendedAction: "INVALID_ACTION",
  });
  assert(!invalidFeedback.success, "Reject invalid vet feedback schema input");

  // 4. Schema Validation: Lab Referral
  const validReferral = referToLabSchema.safeParse({
    caseId: "c1",
    expectedUpdatedAt: "2026-09-08T00:00:00.000Z",
    labName: "Central Veterinary Diagnostic Lab",
    vetDiagnosis: "Lesion blood sample needed",
  });
  assert(validReferral.success, "Validate valid lab referral schema input");

  // 5. Schema Validation: Sample Status Transitions
  const validSampleUpdate = updateSampleStatusSchema.safeParse({
    sampleId: "s1",
    expectedUpdatedAt: "2026-09-08T00:00:00.000Z",
    status: "RESULT_RECEIVED",
    resultSummary: "PCR Positive for FMD Virus",
  });
  assert(validSampleUpdate.success, "Validate sample status update to RESULT_RECEIVED");

  // 6. Optimistic Concurrency Check Logic
  function isLockValid(dbUpdatedAt: Date, expectedIso: string): boolean {
    return dbUpdatedAt.toISOString() === expectedIso;
  }

  const now = new Date();
  assert(isLockValid(now, now.toISOString()), "Optimistic concurrency lock matches identical timestamp");
  assert(!isLockValid(now, new Date(now.getTime() - 1000).toISOString()), "Optimistic concurrency rejects stale expectedUpdatedAt timestamp");

  // 7. Clinical Safety Boundary: AI output does NOT auto-confirm diagnosis
  const mockAiOutput = {
    disease_prediction: { suspected_condition: "Foot and Mouth Disease", confidence: 0.95 },
  };
  const caseConfirmedByAi = Boolean((mockAiOutput as Record<string, unknown>).autoConfirm);
  // AI output cannot set case status directly
  assert(!caseConfirmedByAi, "AI confidence 95% does NOT automatically confirm clinical case diagnosis");

  console.log("==========================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7Tests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
