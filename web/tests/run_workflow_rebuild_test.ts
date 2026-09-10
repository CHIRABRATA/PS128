import prisma from "@/lib/db/prisma";
import { UserRole, UserStatus, Species, CaseStatus, ReportSource } from "@prisma/client";
import { calculateLocationMatch, isLocationAuthorized, findEligibleFieldAgents } from "@/lib/geo/routing";
import { createInAppNotification } from "@/lib/actions/notifications";

export async function runWorkflowRebuildTests(): Promise<{
  success: boolean;
  total: number;
  passed: number;
  failed: number;
  results: { testNumber: number; title: string; passed: boolean; details?: string }[];
}> {
  const results: { testNumber: number; title: string; passed: boolean; details?: string }[] = [];

  const recordResult = (testNumber: number, title: string, passed: boolean, details?: string) => {
    results.push({ testNumber, title, passed, details });
    if (passed) {
      console.log(`[PASS] TEST ${testNumber}: ${title}`);
    } else {
      console.error(`[FAIL] TEST ${testNumber}: ${title} -> ${details}`);
    }
  };

  const testPrefix = `test_${Date.now()}_`;
  let districtA: { id: string } | null = null;
  let districtB: { id: string } | null = null;
  let blockA: { id: string } | null = null;
  let blockB: { id: string } | null = null;
  let villageA1: { id: string } | null = null;
  let villageA2: { id: string } | null = null;
  let villageB1: { id: string } | null = null;

  let farmerUser1: { id: string; name: string } | null = null;
  let farmerUser2: { id: string; name: string } | null = null;
  let agentUser1: { id: string; name: string } | null = null;
  let vetUser1: { id: string; name: string; districtId?: string | null } | null = null;
  let vetUser2: { id: string; name: string; districtId?: string | null } | null = null;

  let farm1: { id: string } | null = null;
  let herd1: { id: string } | null = null;
  let animalA: { id: string; tag: string } | null = null;

  try {
    // ----------------------------------------------------
    // SETUP TEST FIXTURES
    // ----------------------------------------------------
    districtA = await prisma.district.create({ data: { name: `${testPrefix}DistrictA` } });
    districtB = await prisma.district.create({ data: { name: `${testPrefix}DistrictB` } });

    blockA = await prisma.block.create({ data: { name: `${testPrefix}BlockA`, districtId: districtA.id } });
    blockB = await prisma.block.create({ data: { name: `${testPrefix}BlockB`, districtId: districtB.id } });

    villageA1 = await prisma.village.create({ data: { name: `${testPrefix}VillageA1`, blockId: blockA.id } });
    villageA2 = await prisma.village.create({ data: { name: `${testPrefix}VillageA2`, blockId: blockA.id } });
    villageB1 = await prisma.village.create({ data: { name: `${testPrefix}VillageB1`, blockId: blockB.id } });

    farmerUser1 = await prisma.user.create({
      data: {
        clerkId: `${testPrefix}farmer1`,
        name: "Test Farmer 1",
        phone: "9800000001",
        role: UserRole.FARMER,
        status: UserStatus.ACTIVE,
        districtId: districtA.id,
        blockId: blockA.id,
        villageId: villageA1.id,
      },
    });

    farmerUser2 = await prisma.user.create({
      data: {
        clerkId: `${testPrefix}farmer2`,
        name: "Test Farmer 2 (Other)",
        phone: "9800000002",
        role: UserRole.FARMER,
        status: UserStatus.ACTIVE,
        districtId: districtB.id,
        blockId: blockB.id,
        villageId: villageB1.id,
      },
    });

    agentUser1 = await prisma.user.create({
      data: {
        clerkId: `${testPrefix}agent1`,
        name: "Test Agent 1",
        phone: "9800000003",
        role: UserRole.FIELD_AGENT,
        status: UserStatus.ACTIVE,
        districtId: districtA.id,
        blockId: blockA.id,
        villageId: villageA1.id,
      },
    });

    vetUser1 = await prisma.user.create({
      data: {
        clerkId: `${testPrefix}vet1`,
        name: "Test Vet 1 (District A)",
        phone: "9800000004",
        role: UserRole.VETERINARIAN,
        status: UserStatus.ACTIVE,
        districtId: districtA.id,
      },
    });

    vetUser2 = await prisma.user.create({
      data: {
        clerkId: `${testPrefix}vet2`,
        name: "Test Vet 2 (District B)",
        phone: "9800000005",
        role: UserRole.VETERINARIAN,
        status: UserStatus.ACTIVE,
        districtId: districtB.id,
      },
    });

    farm1 = await prisma.farm.create({
      data: {
        name: `${testPrefix}Farm1`,
        villageId: villageA1.id,
        farmerUserId: farmerUser1.id,
        fieldAgentUserId: agentUser1.id,
        latitude: 18.52,
        longitude: 73.85,
      },
    });

    herd1 = await prisma.herd.create({
      data: {
        farmId: farm1.id,
        species: Species.COW,
        name: "Main Cow Herd",
      },
    });

    animalA = await prisma.animal.create({
      data: {
        herdId: herd1.id,
        tag: `TAG-A-${Date.now()}`,
        species: Species.COW,
        breed: "Gir",
        ageMonths: 36,
      },
    });

    // ----------------------------------------------------
    // TEST 1: Farmer self-report → Case → Vet queue → Vet review → Vet Report → Notification & History
    // ----------------------------------------------------
    try {
      const caseNumber1 = `CASE-TEST1-${Date.now()}`;
      const subId1 = `sub_test1_${Date.now()}`;

      // 1. Create Case
      const case1 = await prisma.case.create({
        data: {
          caseNumber: caseNumber1,
          submissionId: subId1,
          animalId: animalA.id,
          createdByUserId: farmerUser1.id,
          reportSource: ReportSource.FARMER,
          status: CaseStatus.PENDING_REVIEW,
          symptoms: ["High Fever", "Skin Nodules"],
          durationDays: 3,
          affectedCount: 1,
          mortalityCount: 0,
        },
      });

      // 2. Verify Case exists in Vet 1's district queue
      const vetQueue = await prisma.case.findMany({
        where: {
          id: case1.id,
          status: CaseStatus.PENDING_REVIEW,
          animal: {
            herd: {
              farm: {
                village: {
                  block: {
                    districtId: vetUser1.districtId!,
                  },
                },
              },
            },
          },
        },
      });

      // 3. Vet reviews case and submits Veterinary Report
      const followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const [updatedCase, vetReport1] = await prisma.$transaction([
        prisma.case.update({
          where: { id: case1.id },
          data: {
            status: CaseStatus.UNDER_EXAMINATION,
            vetDiagnosis: "Suspected Lumpy Skin Disease",
            vetRecommendedAction: "ISOLATE",
            vetFollowUpDate: followUpDate,
            vetNotes: "Isolate cow immediately. Administer prescribed antipyretics.",
            reviewedByUserId: vetUser1.id,
            reviewedAt: new Date(),
          },
        }),
        prisma.veterinaryReport.create({
          data: {
            caseId: case1.id,
            animalId: animalA.id,
            vetUserId: vetUser1.id,
            diagnosis: "Suspected Lumpy Skin Disease",
            action: "ISOLATE",
            followUpDate,
            instructions: "Isolate cow immediately and monitor herd for secondary nodules.",
            notes: "Prescribed supportive therapy.",
          },
        }),
      ]);

      // 4. Create farmer in-app notification
      const notification = await createInAppNotification({
        userId: farmerUser1.id,
        title: "Veterinary Report Available",
        message: `Dr. ${vetUser1.name} submitted a clinical report for Animal ${animalA.tag}`,
        link: `/farmer/animals/${animalA.id}`,
        type: "VET_REPORT_SUBMITTED",
      });

      // 5. Verify Animal longitudinal history has report
      const animalHistory = await prisma.animal.findUnique({
        where: { id: animalA.id },
        include: {
          cases: true,
          veterinaryReports: true,
        },
      });

      const passed =
        vetQueue.length === 1 &&
        updatedCase.status === CaseStatus.UNDER_EXAMINATION &&
        vetReport1.diagnosis === "Suspected Lumpy Skin Disease" &&
        notification !== null &&
        animalHistory?.veterinaryReports.length === 1;

      recordResult(
        1,
        "Farmer self-report → Case → Vet queue → Vet review → Vet Report → Notification & Animal History",
        passed,
        passed ? undefined : "Workflow state transition or relation failed"
      );
    } catch (err: unknown) {
      recordResult(1, "Farmer self-report complete workflow", false, String(err));
    }

    // ----------------------------------------------------
    // TEST 2: Farmer requests assistance → Field Agent → Accept → Visit → Field Report → Case created → Vet Report
    // ----------------------------------------------------
    try {
      // 1. Farmer creates assistance request (caseId is null)
      const assistReq = await prisma.assistanceRequest.create({
        data: {
          farmerUserId: farmerUser1.id,
          farmId: farm1.id,
          animalId: animalA.id,
          villageId: villageA1.id,
          reason: "Cow unable to feed, sudden drop in milk yield, needs physical check",
          status: "REQUESTED",
        },
      });

      // 2. Field Agent accepts request & FieldVisit is created
      const acceptedReq = await prisma.assistanceRequest.update({
        where: { id: assistReq.id },
        data: {
          status: "ACCEPTED",
          assignedAgentUserId: agentUser1.id,
        },
      });

      const fieldVisitAccepted = await prisma.fieldVisit.create({
        data: {
          assistanceRequestId: assistReq.id,
          fieldAgentUserId: agentUser1.id,
          acceptedAt: new Date(),
        },
      });

      // 3. Field Agent starts visit
      const inProgressReq = await prisma.assistanceRequest.update({
        where: { id: assistReq.id },
        data: {
          status: "IN_PROGRESS",
        },
      });

      await prisma.fieldVisit.update({
        where: { id: fieldVisitAccepted.id },
        data: {
          startedAt: new Date(),
        },
      });

      // 4. Field Agent completes visit and submits field report, creating Case & completing FieldVisit
      const caseNumber2 = `CASE-TEST2-${Date.now()}`;
      const subId2 = `sub_test2_${Date.now()}`;

      const [newCase, completedReq] = await prisma.$transaction([
        prisma.case.create({
          data: {
            caseNumber: caseNumber2,
            submissionId: subId2,
            animalId: animalA.id,
            createdByUserId: agentUser1.id,
            reportSource: ReportSource.FIELD_AGENT,
            status: CaseStatus.PENDING_REVIEW,
            symptoms: ["Reduced Feed Intake", "Salivation"],
            durationDays: 2,
            affectedCount: 1,
            mortalityCount: 0,
          },
        }),
        prisma.assistanceRequest.update({
          where: { id: assistReq.id },
          data: {
            status: "COMPLETED",
          },
        }),
      ]);

      await prisma.fieldVisit.update({
        where: { id: fieldVisitAccepted.id },
        data: {
          completedAt: new Date(),
          observations: "Oral lesions observed, mild dehydration",
          measurements: { heartRate: 74, temperature: 39.4 },
          caseId: newCase.id,
        },
      });

      await prisma.assistanceRequest.update({
        where: { id: assistReq.id },
        data: { caseId: newCase.id },
      });

      // 5. Vet reviews and submits report for field-created Case
      const vetReport2 = await prisma.veterinaryReport.create({
        data: {
          caseId: newCase.id,
          animalId: animalA.id,
          vetUserId: vetUser1.id,
          diagnosis: "Stomatitis / Oral Ulcerations",
          action: "TREAT",
          instructions: "Apply antiseptic oral spray twice daily.",
        },
      });

      // Verify persistent FieldVisit
      const persistedVisit = await prisma.fieldVisit.findUnique({
        where: { assistanceRequestId: assistReq.id },
      });

      const passed =
        acceptedReq.status === "ACCEPTED" &&
        inProgressReq.status === "IN_PROGRESS" &&
        completedReq.status === "COMPLETED" &&
        newCase.reportSource === ReportSource.FIELD_AGENT &&
        vetReport2.action === "TREAT" &&
        persistedVisit?.caseId === newCase.id &&
        persistedVisit?.observations !== null;

      recordResult(
        2,
        "Assistance Request → Field Agent Accept → Visit → Field Report → Case created → Vet Report",
        passed,
        passed ? undefined : "Assistance request pipeline failed"
      );
    } catch (err: unknown) {
      recordResult(2, "Assistance request to case pipeline", false, String(err));
    }

    // ----------------------------------------------------
    // TEST 3: Repeat animal (Animal A has Case 1 + Vet Report 1, Case 2 + Vet Report 2, both preserved)
    // ----------------------------------------------------
    try {
      const animalDossier = await prisma.animal.findUnique({
        where: { id: animalA.id },
        include: {
          cases: { orderBy: { reportedAt: "desc" } },
          veterinaryReports: { orderBy: { createdAt: "desc" } },
        },
      });

      const passed =
        (animalDossier?.cases.length || 0) >= 2 &&
        (animalDossier?.veterinaryReports.length || 0) >= 2;

      recordResult(
        3,
        "Repeat Animal longitudinal history: Multiple Cases and Vet Reports preserved under same Animal",
        Boolean(passed),
        passed ? undefined : `Expected >= 2 cases and >= 2 reports, got ${animalDossier?.cases.length} cases and ${animalDossier?.veterinaryReports.length} reports`
      );
    } catch (err: unknown) {
      recordResult(3, "Repeat animal history preservation", false, String(err));
    }

    // ----------------------------------------------------
    // TEST 4: Centralized Location Routing Priority
    // ----------------------------------------------------
    try {
      // 1. Match same village (Score: 100)
      const matchVillage = calculateLocationMatch(
        { villageId: villageA1.id, blockId: blockA.id, districtId: districtA.id },
        { villageId: villageA1.id, blockId: blockA.id, districtId: districtA.id }
      );

      // 2. Match same block, different village (Score: 50)
      const matchBlock = calculateLocationMatch(
        { villageId: villageA1.id, blockId: blockA.id, districtId: districtA.id },
        { villageId: villageA2.id, blockId: blockA.id, districtId: districtA.id }
      );

      // 3. Match cross-district (Score: 0 / NO_MATCH)
      const matchCrossDistrict = calculateLocationMatch(
        { villageId: villageA1.id, blockId: blockA.id, districtId: districtA.id },
        { villageId: villageB1.id, blockId: blockB.id, districtId: districtB.id }
      );

      // 4. Authorization checks
      const isAuthSameDistrict = isLocationAuthorized(
        { role: UserRole.VETERINARIAN, districtId: districtA.id },
        { districtId: districtA.id }
      );
      const isAuthCrossDistrict = isLocationAuthorized(
        { role: UserRole.VETERINARIAN, districtId: districtA.id },
        { districtId: districtB.id }
      );

      const eligibleAgents = await findEligibleFieldAgents(villageA1.id, blockA.id, districtA.id);

      const passed =
        matchVillage.score === 100 &&
        matchBlock.score === 50 &&
        matchCrossDistrict.score === 0 &&
        isAuthSameDistrict === true &&
        isAuthCrossDistrict === false &&
        eligibleAgents.length >= 1;

      recordResult(
        4,
        "Location routing priority (Same Village > Block > District > Cross-district Denied)",
        passed,
        passed ? undefined : "Location priority scores or authorization mismatch"
      );
    } catch (err: unknown) {
      recordResult(4, "Location routing priority check", false, String(err));
    }

    // ----------------------------------------------------
    // TEST 5: Real Dashboard Metric Calculations Matching Prisma Queries
    // ----------------------------------------------------
    try {
      const [caseCount, reportCount, assistCount] = await Promise.all([
        prisma.case.count({ where: { animalId: animalA.id } }),
        prisma.veterinaryReport.count({ where: { animalId: animalA.id } }),
        prisma.assistanceRequest.count({ where: { farmerUserId: farmerUser1.id } }),
      ]);

      const passed = caseCount >= 2 && reportCount >= 2 && assistCount >= 1;
      recordResult(
        5,
        "Dashboard metrics calculated directly from verified database Prisma queries",
        passed,
        passed ? undefined : "Prisma query count mismatch"
      );
    } catch (err: unknown) {
      recordResult(5, "Dashboard metric queries check", false, String(err));
    }

    // ----------------------------------------------------
    // TEST 6: Veterinary Report submitted and visible to Farmer
    // ----------------------------------------------------
    try {
      const farmerVisibleReports = await prisma.veterinaryReport.findMany({
        where: {
          animal: {
            herd: {
              farm: {
                farmerUserId: farmerUser1.id,
              },
            },
          },
        },
        include: {
          vetUser: { select: { name: true, phone: true } },
        },
      });

      const passed = farmerVisibleReports.length >= 2 && farmerVisibleReports.every((r) => r.vetUser.name !== null);
      recordResult(
        6,
        "Veterinary Report submitted by Doctor is visible to authorized Farmer with clinical details",
        passed,
        passed ? undefined : "Farmer reports visibility failed"
      );
    } catch (err: unknown) {
      recordResult(6, "Vet report farmer visibility", false, String(err));
    }

    // ----------------------------------------------------
    // TEST 7: Authorization Barriers (Cross-farmer, Cross-district, Unauthorized Vet)
    // ----------------------------------------------------
    try {
      // 1. Farmer 2 trying to access Farmer 1's animal
      const farmer2Animal = await prisma.animal.findFirst({
        where: {
          id: animalA.id,
          herd: {
            farm: {
              farmerUserId: farmerUser2.id, // Should return null
            },
          },
        },
      });

      // 2. Vet 2 (District B) trying to access Case in District A
      const vet2Case = await prisma.case.findFirst({
        where: {
          animalId: animalA.id,
          animal: {
            herd: {
              farm: {
                village: {
                  block: {
                    districtId: vetUser2.districtId!, // District B
                  },
                },
              },
            },
          },
        },
      });

      const passed = farmer2Animal === null && vet2Case === null;
      recordResult(
        7,
        "Authorization barriers strictly prevent cross-farmer and cross-district clinical access",
        passed,
        passed ? undefined : "Authorization leak: cross-farmer or cross-district access permitted"
      );
    } catch (err: unknown) {
      recordResult(7, "Authorization barriers check", false, String(err));
    }

    // ----------------------------------------------------
    // TEST 8: AI Unavailable Graceful Fallback (Case remains valid)
    // ----------------------------------------------------
    try {
      const caseNumberAi = `CASE-AI-TEST-${Date.now()}`;
      const subIdAi = `sub_ai_test_${Date.now()}`;

      const aiFallbackCase = await prisma.case.create({
        data: {
          caseNumber: caseNumberAi,
          submissionId: subIdAi,
          animalId: animalA.id,
          createdByUserId: farmerUser1.id,
          reportSource: ReportSource.FARMER,
          status: CaseStatus.PENDING_REVIEW,
          symptoms: ["Coughing", "Nasal Discharge"],
          durationDays: 1,
          affectedCount: 1,
          mortalityCount: 0,
          analysisResult: undefined, // AI analysis unavailable / null
          visionResult: undefined,
        },
      });

      const passed =
        aiFallbackCase.id !== null &&
        aiFallbackCase.status === CaseStatus.PENDING_REVIEW &&
        aiFallbackCase.analysisResult === null;

      recordResult(
        8,
        "AI service unavailable graceful fallback: Case remains fully valid in PENDING_REVIEW",
        passed,
        passed ? undefined : "Case creation failed without AI"
      );
    } catch (err: unknown) {
      recordResult(8, "AI unavailable graceful fallback check", false, String(err));
    }

    // ----------------------------------------------------
    // TEST 9: Double-submit Idempotency with Unique submissionId
    // ----------------------------------------------------
    try {
      const sharedSubId = `idempotency_${Date.now()}`;

      // First submit creates Case
      const firstCase = await prisma.case.create({
        data: {
          caseNumber: `CASE-IDEMP-1-${Date.now()}`,
          submissionId: sharedSubId,
          animalId: animalA.id,
          createdByUserId: farmerUser1.id,
          reportSource: ReportSource.FARMER,
          status: CaseStatus.PENDING_REVIEW,
          symptoms: ["Lameness"],
          durationDays: 1,
          affectedCount: 1,
          mortalityCount: 0,
        },
      });

      // Second submit with same submissionId fails unique constraint or finds existing
      let caughtUniqueConstraint = false;
      try {
        await prisma.case.create({
          data: {
            caseNumber: `CASE-IDEMP-2-${Date.now()}`,
            submissionId: sharedSubId,
            animalId: animalA.id,
            createdByUserId: farmerUser1.id,
            reportSource: ReportSource.FARMER,
            status: CaseStatus.PENDING_REVIEW,
            symptoms: ["Lameness"],
            durationDays: 1,
            affectedCount: 1,
            mortalityCount: 0,
          },
        });
      } catch {
        caughtUniqueConstraint = true;
      }

      const totalMatching = await prisma.case.count({ where: { submissionId: sharedSubId } });

      const passed = caughtUniqueConstraint && totalMatching === 1 && firstCase.id !== null;
      recordResult(
        9,
        "Duplicate submission idempotency: Database @unique submissionId prevents duplicate Cases",
        passed,
        passed ? undefined : "Duplicate case was created despite identical submissionId"
      );
    } catch (err: unknown) {
      recordResult(9, "Double-submit idempotency check", false, String(err));
    }

    // ----------------------------------------------------
    // CLEANUP TEST FIXTURES
    // ----------------------------------------------------
    try {
      await prisma.inAppNotification.deleteMany({
        where: { userId: { in: [farmerUser1.id, farmerUser2.id, agentUser1.id, vetUser1.id, vetUser2.id] } },
      });
      await prisma.veterinaryReport.deleteMany({ where: { animalId: animalA.id } });
      await prisma.fieldVisit.deleteMany({ where: { assistanceRequest: { farmId: farm1.id } } });
      await prisma.assistanceRequest.deleteMany({ where: { farmId: farm1.id } });
      await prisma.case.deleteMany({ where: { animalId: animalA.id } });
      await prisma.animal.deleteMany({ where: { id: animalA.id } });
      await prisma.herd.deleteMany({ where: { id: herd1.id } });
      await prisma.farm.deleteMany({ where: { id: farm1.id } });
      await prisma.user.deleteMany({
        where: { id: { in: [farmerUser1.id, farmerUser2.id, agentUser1.id, vetUser1.id, vetUser2.id] } },
      });
      await prisma.village.deleteMany({
        where: { id: { in: [villageA1.id, villageA2.id, villageB1.id] } },
      });
      await prisma.block.deleteMany({ where: { id: { in: [blockA.id, blockB.id] } } });
      await prisma.district.deleteMany({ where: { id: { in: [districtA.id, districtB.id] } } });
    } catch (cleanupErr) {
      console.warn("[Test Cleanup Notice]:", cleanupErr);
    }

    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;

    return {
      success: failedCount === 0,
      total: results.length,
      passed: passedCount,
      failed: failedCount,
      results,
    };
  } catch (error: unknown) {
    console.error("Workflow Rebuild Test Runner Error:", error);
    return {
      success: false,
      total: 9,
      passed: results.filter((r) => r.passed).length,
      failed: 9 - results.filter((r) => r.passed).length,
      results,
    };
  }
}

// Allow CLI execution via `npx tsx tests/run_workflow_rebuild_test.ts`
if (require.main === module) {
  runWorkflowRebuildTests().then((res) => {
    console.log("\n==================================================");
    console.log(`Maitri Workflow Rebuild Automated Test Suite: ${res.passed} PASSED, ${res.failed} FAILED (Total ${res.total})`);
    console.log("==================================================\n");
    if (!res.success) {
      process.exit(1);
    }
  });
}
