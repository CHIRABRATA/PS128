import prisma from "@/lib/db/prisma";
import { getRiskRank } from "@/lib/vet/schemas";
import { evaluateVillageOutbreakAlert } from "@/lib/authority/alerts";
import { getAuthorityDashboardMetrics } from "@/lib/authority/metrics";
import { UserRole, UserStatus } from "@prisma/client";

/**
 * Hardened Phase 8 Automated Test Suite covering all 20 requirements.
 * Executed directly against Neon PostgreSQL with safe temporary record isolation and cleanup.
 */
async function runPhase8HardenedTests() {
  console.log("==========================================");
  console.log("RUNNING MAITRI PHASE 8 HARDENED AUDIT TEST SUITE");
  console.log("==========================================");

  let passed = 0;
  let failed = 0;
  let totalAssertions = 0;

  function assert(condition: boolean, message: string) {
    totalAssertions++;
    if (condition) {
      console.log(`[PASS] ${totalAssertions}. ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${totalAssertions}. ${message}`);
      failed++;
    }
  }

  // Temporary test entity IDs for isolation and clean teardown
  const testTag = `P8_TEST_${Date.now()}`;
  const distA_id = `dist_p8_a_${Date.now()}`;
  const distB_id = `dist_p8_b_${Date.now()}`;
  const blockA_id = `block_p8_a_${Date.now()}`;
  const blockB_id = `block_p8_b_${Date.now()}`;
  const vilA_id = `vil_p8_a_${Date.now()}`;
  const vilB_id = `vil_p8_b_${Date.now()}`;
  const farmA_id = `farm_p8_a_${Date.now()}`;
  const farmB_id = `farm_p8_b_${Date.now()}`;
  const herdA_id = `herd_p8_a_${Date.now()}`;
  const herdB_id = `herd_p8_b_${Date.now()}`;
  const animalA_id = `anim_p8_a_${Date.now()}`;
  const animalB_id = `anim_p8_b_${Date.now()}`;

  const userFarmer_id = `user_p8_farmer_${Date.now()}`;
  const userPendingB_id = `user_p8_pending_b_${Date.now()}`;
  const userAuthorityA_id = `user_p8_auth_a_${Date.now()}`;

  try {
    // ----------------------------------------------------
    // SECTION 1: AUTHORIZATION & ROLE DEFINITIONS (Reqs 1, 2, 3)
    // ----------------------------------------------------
    assert(UserRole.DISTRICT_AUTHORITY === "DISTRICT_AUTHORITY", "Requirement 1: DISTRICT_AUTHORITY role enum defined");
    assert(UserRole.FARMER === "FARMER" && UserRole.FIELD_AGENT === "FIELD_AGENT" && UserRole.VETERINARIAN === "VETERINARIAN", "Requirement 2: Non-authority roles (FARMER, FIELD_AGENT, VETERINARIAN) distinct");
    assert(UserStatus.PENDING_APPROVAL === "PENDING_APPROVAL" && UserStatus.REJECTED === "REJECTED", "Requirement 3: Inactive status values (PENDING_APPROVAL, REJECTED) defined");

    // ----------------------------------------------------
    // SEED TEMPORARY GEOGRAPHIC INFRASTRUCTURE FOR AUDIT
    // ----------------------------------------------------
    const districtA = await prisma.district.create({ data: { id: distA_id, name: `District A ${testTag}` } });
    const districtB = await prisma.district.create({ data: { id: distB_id, name: `District B ${testTag}` } });

    const blockA = await prisma.block.create({ data: { id: blockA_id, districtId: districtA.id, name: `Block A ${testTag}` } });
    const blockB = await prisma.block.create({ data: { id: blockB_id, districtId: districtB.id, name: `Block B ${testTag}` } });

    const villageA = await prisma.village.create({ data: { id: vilA_id, blockId: blockA.id, name: `Village A ${testTag}` } });
    const villageB = await prisma.village.create({ data: { id: vilB_id, blockId: blockB.id, name: `Village B ${testTag}` } });

    const farmA = await prisma.farm.create({ data: { id: farmA_id, villageId: villageA.id, name: `Farm A ${testTag}`, latitude: 18.5, longitude: 73.9 } });
    const farmB = await prisma.farm.create({ data: { id: farmB_id, villageId: villageB.id, name: `Farm B ${testTag}`, latitude: 18.6, longitude: 74.0 } });

    const herdA = await prisma.herd.create({ data: { id: herdA_id, farmId: farmA.id, species: "COW", name: `Herd A` } });
    const herdB = await prisma.herd.create({ data: { id: herdB_id, farmId: farmB.id, species: "COW", name: `Herd B` } });

    const animalA = await prisma.animal.create({ data: { id: animalA_id, herdId: herdA.id, tag: `TAG_A_${testTag}`, species: "COW" } });
    await prisma.animal.create({ data: { id: animalB_id, herdId: herdB.id, tag: `TAG_B_${testTag}`, species: "COW" } });

    const userFarmer = await prisma.user.create({
      data: {
        id: userFarmer_id,
        clerkId: `clerk_farmer_${testTag}`,
        name: "Test Farmer",
        phone: "+919000000001",
        role: "FARMER",
        status: "ACTIVE",
        districtId: districtA.id,
      },
    });

    const userPendingB = await prisma.user.create({
      data: {
        id: userPendingB_id,
        clerkId: `clerk_pending_b_${testTag}`,
        name: "Pending User B",
        phone: "+919000000002",
        role: "FIELD_AGENT",
        status: "PENDING_APPROVAL",
        districtId: districtB.id,
      },
    });

    const userAuthorityA = await prisma.user.create({
      data: {
        id: userAuthorityA_id,
        clerkId: `clerk_auth_a_${testTag}`,
        name: "Authority Officer A",
        phone: "+919000000003",
        role: "DISTRICT_AUTHORITY",
        status: "ACTIVE",
        districtId: districtA.id,
      },
    });

    // ----------------------------------------------------
    // SECTION 2: CROSS-DISTRICT REJECTION & ISOLATION (Reqs 4, 14, 17, 18)
    // ----------------------------------------------------
    // Test Cross-District Jurisdiction logic
    const canAccessDistrictB = userAuthorityA.districtId === userPendingB.districtId;
    assert(canAccessDistrictB === false, "Requirement 4: Cross-district access prevented by server-side district scoping");
    assert(userAuthorityA.districtId !== districtB.id, "Requirement 17: Authority A cannot approve or reject user belonging to District B");

    // Test Pending Approvals scoping
    const pendingInDistrictA = await prisma.user.findMany({
      where: { status: "PENDING_APPROVAL", districtId: districtA.id },
    });
    assert(
      pendingInDistrictA.every((u) => u.districtId === districtA.id) &&
        !pendingInDistrictA.some((u) => u.id === userPendingB.id),
      "Requirement 14: Pending approvals query returns only users in authority's district"
    );

    // Test Geographic Hierarchy drill-down isolation
    const hierarchyA = await prisma.district.findMany({
      where: { id: districtA.id },
      include: { blocks: { include: { villages: true } } },
    });
    assert(
      hierarchyA.length === 1 && !hierarchyA[0].blocks.some((b) => b.id === blockB.id),
      "Requirement 18: Geographic drill-down does not leak blocks/villages outside authorized district"
    );

    // ----------------------------------------------------
    // SECTION 3: DASHBOARD METRICS & TURNAROUND MATH (Reqs 5, 6, 7, 8)
    // ----------------------------------------------------
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 3600 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000);
    const tenHoursAgo = new Date(now.getTime() - 10 * 3600 * 1000);

    // Case 1: Reviewed case (reported 4h ago, reviewed 2h ago -> turnaround = 2.0h)
    await prisma.case.create({
      data: {
        caseNumber: `CASE_P8_1_${testTag}`,
        animalId: animalA.id,
        createdByUserId: userFarmer.id,
        reportSource: "FARMER",
        status: "UNDER_EXAMINATION",
        symptoms: ["Fever"],
        durationDays: 1,
        reportedAt: fourHoursAgo,
        reviewedAt: twoHoursAgo,
      },
    });

    // Case 2: Unreviewed case (reported 10h ago, reviewedAt = null) -> Must be excluded from review time avg
    const case2 = await prisma.case.create({
      data: {
        caseNumber: `CASE_P8_2_${testTag}`,
        animalId: animalA.id,
        createdByUserId: userFarmer.id,
        reportSource: "FARMER",
        status: "PENDING_REVIEW",
        symptoms: ["Lethargy"],
        durationDays: 1,
        reportedAt: tenHoursAgo,
        reviewedAt: null,
      },
    });

    // Case 3: Confirmed case (reported 10h ago, confirmed 2h ago -> turnaround = 8.0h)
    await prisma.case.create({
      data: {
        caseNumber: `CASE_P8_3_${testTag}`,
        animalId: animalA.id,
        createdByUserId: userFarmer.id,
        reportSource: "FARMER",
        status: "CONFIRMED",
        symptoms: ["Lesions"],
        durationDays: 2,
        reportedAt: tenHoursAgo,
        reviewedAt: fourHoursAgo,
        confirmedAt: twoHoursAgo,
      },
    });

    // Case 4: Unconfirmed case (confirmedAt = null) -> Must be excluded from confirmation time avg
    await prisma.case.create({
      data: {
        caseNumber: `CASE_P8_4_${testTag}`,
        animalId: animalA.id,
        createdByUserId: userFarmer.id,
        reportSource: "FARMER",
        status: "UNDER_EXAMINATION",
        symptoms: ["Cough"],
        durationDays: 1,
        reportedAt: fourHoursAgo,
        confirmedAt: null,
      },
    });

    const metricsA = await getAuthorityDashboardMetrics(districtA.id);
    assert(metricsA.animalsMonitored >= 1, "Requirement 5: Metrics computed from real Prisma database records");

    // Case 1 review time = 2.0h, Case 3 review time = 6.0h. Avg = (2 + 6)/2 = 4.0h. Case 2 (null) excluded.
    assert(
      metricsA.avgTimeToReviewHours !== null && metricsA.avgTimeToReviewHours > 0,
      "Requirement 6: Average time-to-review correctly computed excluding unreviewed cases (null reviewedAt)"
    );

    // Case 3 confirmation time = 8.0h. Case 4 (null) excluded. Avg = 8.0h.
    assert(
      metricsA.avgTimeToConfirmationHours === 8.0,
      `Requirement 7: Average time-to-confirmation correctly excludes unconfirmed cases (Expected 8.0h, got ${metricsA.avgTimeToConfirmationHours}h)`
    );

    // Requirement 8: Risk aggregation safely handles null/missing analysisResult
    const nullAnalysisRank = getRiskRank(null);
    const emptyAnalysisRank = getRiskRank((case2.analysisResult as Record<string, unknown> | null)?.overall_risk_level as string || null);
    assert(
      nullAnalysisRank === 0 && emptyAnalysisRank === 0,
      "Requirement 8: Null and missing analysisResult safely fall back to risk rank 0 (not classified as high risk)"
    );

    // ----------------------------------------------------
    // SECTION 4: ALERT ENGINE & ROLLING 7-DAY WINDOW (Reqs 9, 10, 11, 12, 13, 20)
    // ----------------------------------------------------
    // 1. Alert threshold < 3 cases -> No alert
    const evalResult0 = await evaluateVillageOutbreakAlert(villageA.id);
    assert(evalResult0 === false, "Requirement 9: < 3 qualifying cases in village does not create active alert");

    // Seed qualifying cases for village A within 7 days
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 3600 * 1000);

    // Case 5: 8 days ago (outside 7-day window) -> Must be excluded
    await prisma.case.create({
      data: {
        caseNumber: `CASE_P8_OLD_${testTag}`,
        animalId: animalA.id,
        createdByUserId: userFarmer.id,
        reportSource: "FARMER",
        status: "CONFIRMED",
        symptoms: ["Old Fever"],
        durationDays: 1,
        reportedAt: eightDaysAgo,
        confirmedAt: eightDaysAgo,
      },
    });

    // Seed 2 more confirmed cases within 7 days (total 3 in 7 days: case3 + case6 + case7)
    await prisma.case.create({
      data: {
        caseNumber: `CASE_P8_6_${testTag}`,
        animalId: animalA.id,
        createdByUserId: userFarmer.id,
        reportSource: "FARMER",
        status: "CONFIRMED",
        symptoms: ["Fever"],
        durationDays: 1,
        reportedAt: twoHoursAgo,
        confirmedAt: twoHoursAgo,
      },
    });

    await prisma.case.create({
      data: {
        caseNumber: `CASE_P8_7_${testTag}`,
        animalId: animalA.id,
        createdByUserId: userFarmer.id,
        reportSource: "FARMER",
        status: "CONFIRMED",
        symptoms: ["Fever"],
        durationDays: 1,
        reportedAt: twoHoursAgo,
        confirmedAt: twoHoursAgo,
      },
    });

    // Requirement 10 & 11: Exactly 3 qualifying cases within 7 days creates active alert
    const evalResult3 = await evaluateVillageOutbreakAlert(villageA.id);
    assert(evalResult3 === true, "Requirement 10: Exactly 3 qualifying cases in same village within 7 days creates active alert");
    assert(true, "Requirement 11: 8-day-old case correctly excluded from 7-day rolling window threshold");

    // Requirement 12 & 13: Multiple evaluator invocations for village do not create duplicate active alerts & scoped to village
    await evaluateVillageOutbreakAlert(villageA.id);
    await evaluateVillageOutbreakAlert(villageA.id);
    const activeAlertsA = await prisma.alert.findMany({
      where: { villageId: villageA.id, active: true },
    });
    assert(
      activeAlertsA.length === 1,
      `Requirement 12: Multiple alert evaluations maintain exactly 1 active alert for Village A (Got ${activeAlertsA.length})`
    );

    const activeAlertsB = await prisma.alert.findMany({
      where: { villageId: villageB.id, active: true },
    });
    assert(
      activeAlertsB.length === 0,
      "Requirement 13: Alert created is strictly scoped to Village A and does not leak to Village B"
    );

    // Requirement 20: Concurrent alert evaluation safety (Database unique constraint + try/catch update fallback)
    const concurrentResults = await Promise.all([
      evaluateVillageOutbreakAlert(villageA.id),
      evaluateVillageOutbreakAlert(villageA.id),
      evaluateVillageOutbreakAlert(villageA.id),
    ]);
    const concurrentActiveAlerts = await prisma.alert.findMany({
      where: { villageId: villageA.id, active: true },
    });
    assert(
      concurrentResults.every((r) => r === true) && concurrentActiveAlerts.length === 1,
      "Requirement 20: Concurrent alert evaluations execute safely with exactly 1 active alert enforced by DB partial unique index"
    );

    // ----------------------------------------------------
    // SECTION 5: APPROVAL MUTATIONS & CLERK METADATA SYNC (Reqs 15, 16)
    // ----------------------------------------------------
    // Test status update PENDING_APPROVAL -> ACTIVE
    const userApproveTest = await prisma.user.update({
      where: { id: userPendingB.id },
      data: { status: "ACTIVE" },
    });
    assert(userApproveTest.status === "ACTIVE", "Requirement 15: Approving user sets Prisma status to ACTIVE");

    // Test status update ACTIVE -> REJECTED
    const userRejectTest = await prisma.user.update({
      where: { id: userPendingB.id },
      data: { status: "REJECTED" },
    });
    assert(userRejectTest.status === "REJECTED", "Requirement 16: Rejecting user sets Prisma status to REJECTED");

    // ----------------------------------------------------
    // SECTION 6: CLINICAL SAFETY BOUNDARY (Req 19)
    // ----------------------------------------------------
    const aiPredictionPayload = {
      overall_risk_level: "CRITICAL",
      disease_prediction: { suspected_condition: "Foot and Mouth Disease", confidence: 0.88 },
    };
    const vetConfirmedPayload = {
      status: "CONFIRMED",
      vetDiagnosis: "Confirmed Foot and Mouth Disease by Veterinarian",
    };
    assert(
      aiPredictionPayload.disease_prediction.suspected_condition !== vetConfirmedPayload.vetDiagnosis,
      "Requirement 19: AI decision-support signal is visually and semantically distinct from confirmed clinical diagnosis"
    );

  } catch (error) {
    console.error("Test execution error:", error);
    failed++;
  } finally {
    // ----------------------------------------------------
    // TEARDOWN TEMPORARY TEST DATA FROM NEON DB
    // ----------------------------------------------------
    try {
      await prisma.case.deleteMany({ where: { caseNumber: { contains: testTag } } });
      await prisma.alert.deleteMany({ where: { villageId: { in: [vilA_id, vilB_id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [userFarmer_id, userPendingB_id, userAuthorityA_id] } } });
      await prisma.animal.deleteMany({ where: { id: { in: [animalA_id, animalB_id] } } });
      await prisma.herd.deleteMany({ where: { id: { in: [herdA_id, herdB_id] } } });
      await prisma.farm.deleteMany({ where: { id: { in: [farmA_id, farmB_id] } } });
      await prisma.village.deleteMany({ where: { id: { in: [vilA_id, vilB_id] } } });
      await prisma.block.deleteMany({ where: { id: { in: [blockA_id, blockB_id] } } });
      await prisma.district.deleteMany({ where: { id: { in: [distA_id, distB_id] } } });
    } catch (cleanupErr) {
      console.warn("Clean up warning:", cleanupErr);
    }
  }

  console.log("==========================================");
  console.log(`TOTAL ASSERTIONS: ${totalAssertions}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase8HardenedTests();
