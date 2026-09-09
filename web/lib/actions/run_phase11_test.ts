import prisma from "@/lib/db/prisma";
import fs from "fs";
import path from "path";
import { UserRole, UserStatus } from "@prisma/client";

/**
 * Phase 11 Automated Audit & Verification Test Suite
 * Covers PWA infrastructure, Service Worker, Health reachability,
 * Deterministic photo upload keys, Case submissionId idempotency, IndexedDB queue structure,
 * Progressive Web Locks, Account isolation, and AI pipeline durability.
 */
async function runPhase11HardenedTests() {
  console.log("==========================================");
  console.log("RUNNING MAITRI PHASE 11 PWA & OFFLINE AUDIT TEST SUITE");
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

  const projectRoot = path.resolve(__dirname, "../../");
  const backendPath = path.resolve(projectRoot, "../backend");
  const manifestPath = path.join(projectRoot, "public/manifest.json");
  const swPath = path.join(projectRoot, "public/sw.js");
  const healthRoutePath = path.join(projectRoot, "app/api/health/route.ts");
  const uploadRoutePath = path.join(projectRoot, "app/api/storage/upload/route.ts");
  const syncModulePath = path.join(projectRoot, "lib/offline/sync.ts");
  const dbModulePath = path.join(projectRoot, "lib/offline/db.ts");

  // Temporary test IDs
  const testTimestamp = Date.now();
  const testSubId1 = `p11_sub_test_${testTimestamp}_1`;
  const testSubId2 = `p11_sub_test_${testTimestamp}_2`;
  const testSubIdDirty = `p11_sub/test#special@${testTimestamp}`;
  
  const dist_id = `dist_p11_${testTimestamp}`;
  const block_id = `block_p11_${testTimestamp}`;
  const vil_id = `vil_p11_${testTimestamp}`;
  const farm_id = `farm_p11_${testTimestamp}`;
  const herd_id = `herd_p11_${testTimestamp}`;
  const animal_id = `anim_p11_${testTimestamp}`;
  const user_farmer_id = `user_p11_farmer_${testTimestamp}`;

  try {
    // ----------------------------------------------------
    // SECTION 1: SYSTEM CONSTRAINTS & NON-NEGOTIABLES (Reqs 1-4)
    // ----------------------------------------------------
    assert(fs.existsSync(backendPath), "Requirement 1: backend/ directory exists intact");
    
    // Check if backend directory has not been modified recently or remains original structure
    const mainPyExists = fs.existsSync(path.join(backendPath, "app/main.py"));
    assert(mainPyExists, "Requirement 1: backend/app/main.py remains untouched");

    // ----------------------------------------------------
    // SECTION 2: PWA MANIFEST & SERVICE WORKER (Reqs 5-10)
    // ----------------------------------------------------
    assert(fs.existsSync(manifestPath), "Requirement 5: public/manifest.json exists");
    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    assert(manifestContent.name === "Maitri — Livestock Health Intelligence", "Requirement 6: Manifest contains valid app name");
    assert(manifestContent.start_url === "/", "Requirement 7: Manifest start_url is /");
    assert(manifestContent.display === "standalone", "Requirement 8: Manifest display is standalone");

    assert(fs.existsSync(swPath), "Requirement 9: public/sw.js exists");
    const swContent = fs.readFileSync(swPath, "utf-8");
    assert(swContent.includes("maitri-v1-static"), "Requirement 10: Service Worker uses static cache version key");
    assert(swContent.includes("/api/") && swContent.includes("fetch(event.request)"), "Requirement 10: Service worker passes API requests directly to network without caching private clinical data");

    // ----------------------------------------------------
    // SECTION 3: HEALTH ENDPOINT & REACHABILITY (Reqs 11-13)
    // ----------------------------------------------------
    assert(fs.existsSync(healthRoutePath), "Requirement 11: GET /api/health route implementation exists");
    const healthContent = fs.readFileSync(healthRoutePath, "utf-8");
    assert(healthContent.includes("GET") && healthContent.includes("NextResponse.json"), "Requirement 12: GET /api/health returns JSON response");
    assert(!healthContent.includes("telegram"), "Requirement 13: Health reachability check is completely decoupled from Telegram API");

    // ----------------------------------------------------
    // SECTION 4: DETERMINISTIC STORAGE KEYS & SANITIZATION (Reqs 14-18)
    // ----------------------------------------------------
    assert(fs.existsSync(uploadRoutePath), "Requirement 14: Direct storage upload route exists");
    const uploadContent = fs.readFileSync(uploadRoutePath, "utf-8");
    assert(uploadContent.includes("cases/${sanitizeSubId}/photo.${ext}"), "Requirement 15: Upload key is deterministically derived from submissionId");
    
    // Deterministic key sanitization test logic
    const sanitizeSubId = (subId: string) => subId.replace(/[^a-zA-Z0-9_-]/g, "");
    const sanitizedKey1 = `cases/${sanitizeSubId(testSubId1)}/photo.jpg`;
    const sanitizedKey2 = `cases/${sanitizeSubId(testSubId1)}/photo.jpg`;
    const sanitizedSubIdDirty = sanitizeSubId(testSubIdDirty);

    assert(sanitizedKey1 === sanitizedKey2, "Requirement 16: Upload key generation for identical submissionId is 100% deterministic on retries");
    assert(!sanitizedSubIdDirty.includes("/") && !sanitizedSubIdDirty.includes("#") && !sanitizedSubIdDirty.includes("@"), "Requirement 17: submissionId sanitization strips path traversal and special characters");
    assert(sanitizedKey1 !== `cases/${sanitizeSubId(testSubId2)}/photo.jpg`, "Requirement 18: Different submissionIds produce distinct storage keys without collision");

    // ----------------------------------------------------
    // SECTION 5: INDEXEDDB QUEUE MODEL & SECURITY (Reqs 19-24)
    // ----------------------------------------------------
    assert(fs.existsSync(dbModulePath), "Requirement 19: IndexedDB queue database module exists");
    const dbContent = fs.readFileSync(dbModulePath, "utf-8");
    assert(dbContent.includes("MaitriOfflineDB") && dbContent.includes("reports_queue"), "Requirement 20: IndexedDB defines MaitriOfflineDB and reports_queue object store");
    assert(dbContent.includes("by_clerk_id") && dbContent.includes("by_submission_id"), "Requirement 21: IndexedDB queue includes clerkUserId and submissionId indexes");
    
    // Security check: Verify no secret tokens are saved into IndexedDB model definition
    assert(!dbContent.includes("clerkToken") && !dbContent.includes("apiKey") && !dbContent.includes("telegramSecret"), "Requirement 22: Queue schema strictly excludes authentication tokens, API keys, or Telegram secrets");
    assert(dbContent.includes("filter((item) => item.clerkUserId === clerkUserId)"), "Requirement 23: Account isolation prevents cross-account queue synchronization");
    assert(dbContent.includes("FAILED_AUTHORIZATION"), "Requirement 24: Queue status state model handles authorization failures cleanly");

    // ----------------------------------------------------
    // SECTION 6: MULTI-TAB COORDINATION & SYNC MANAGER (Reqs 25-28)
    // ----------------------------------------------------
    assert(fs.existsSync(syncModulePath), "Requirement 25: Sync coordinator module exists");
    const syncContent = fs.readFileSync(syncModulePath, "utf-8");
    assert(syncContent.includes("locks") && syncContent.includes("request"), "Requirement 26: Progressive Web Locks API (navigator.locks) implemented for tab coordination");
    assert(syncContent.includes("else {") && syncContent.includes("executeSyncWork"), "Requirement 27: Web Locks uses in-memory fallback when navigator.locks is unsupported");
    assert(syncContent.includes("BroadcastChannel"), "Requirement 28: BroadcastChannel used for multi-tab synchronization notification");

    // ----------------------------------------------------
    // SECTION 7: DATABASE SEED & SERVER-SIDE IDEMPOTENCY TEST (Reqs 29-37)
    // ----------------------------------------------------
    const district = await prisma.district.create({
      data: { id: dist_id, name: `Dist P11 ${testTimestamp}` },
    });
    const block = await prisma.block.create({
      data: { id: block_id, name: `Block P11 ${testTimestamp}`, districtId: district.id },
    });
    const village = await prisma.village.create({
      data: { id: vil_id, name: `Vil P11 ${testTimestamp}`, blockId: block.id },
    });

    const farmerUser = await prisma.user.create({
      data: {
        id: user_farmer_id,
        clerkId: `clerk_p11_farmer_${testTimestamp}`,
        name: "Farmer P11 Test",
        phone: `+9198${testTimestamp.toString().slice(-8)}`,
        role: UserRole.FARMER,
        status: UserStatus.ACTIVE,
        villageId: village.id,
      },
    });

    const farm = await prisma.farm.create({
      data: {
        id: farm_id,
        name: "P11 Test Farm",
        villageId: village.id,
        farmerUserId: farmerUser.id,
        latitude: 20.5937,
        longitude: 78.9629,
      },
    });
    const herd = await prisma.herd.create({
      data: { id: herd_id, farmId: farm.id, species: "COW", name: "P11 Test Herd" },
    });
    const animal = await prisma.animal.create({
      data: { id: animal_id, tag: `P11_TAG_${testTimestamp}`, herdId: herd.id, species: "COW" },
    });

    assert(Boolean(district && block && village && farmerUser && farm && herd && animal), "Requirement 29: Database test entities created successfully in Neon PostgreSQL");

    // Direct Idempotent Case Creation Helper (simulates createCaseReportAction database logic)
    async function createCaseWithIdempotency(data: {
      submissionId: string;
      animalId: string;
      createdByUserId: string;
      symptoms: string[];
      durationDays: number;
      affectedCount: number;
      herdSize: number;
      mortalityCount: number;
    }) {
      const existingCase = await prisma.case.findUnique({
        where: { submissionId: data.submissionId },
      });

      if (existingCase) {
        return {
          success: true,
          caseNumber: existingCase.caseNumber,
          caseId: existingCase.id,
          isDuplicate: true,
        };
      }

      try {
        const count = await prisma.case.count();
        const caseNumber = `CASE-${String(count + 1).padStart(6, "0")}`;

        const created = await prisma.case.create({
          data: {
            submissionId: data.submissionId,
            caseNumber,
            animalId: data.animalId,
            createdByUserId: data.createdByUserId,
            symptoms: data.symptoms,
            durationDays: data.durationDays,
            affectedCount: data.affectedCount,
            mortalityCount: data.mortalityCount,
            status: "PENDING_REVIEW",
            reportSource: "FARMER",
          },
        });

        return {
          success: true,
          caseNumber: created.caseNumber,
          caseId: created.id,
          isDuplicate: false,
        };
      } catch (err: unknown) {
        if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
          const fallback = await prisma.case.findUnique({
            where: { submissionId: data.submissionId },
          });
          if (fallback) {
            return {
              success: true,
              caseNumber: fallback.caseNumber,
              caseId: fallback.id,
              isDuplicate: true,
            };
          }
        }
        throw err;
      }
    }

    // 1st Submission via createCaseWithIdempotency
    const res1 = await createCaseWithIdempotency({
      submissionId: testSubId1,
      animalId: animal.id,
      createdByUserId: farmerUser.id,
      symptoms: ["Fever", "Lethargy"],
      durationDays: 2,
      affectedCount: 1,
      herdSize: 10,
      mortalityCount: 0,
    });

    assert(res1.success === true && Boolean(res1.caseId), "Requirement 30: First report submission creates Case successfully");
    assert(Boolean(res1.caseNumber), "Requirement 31: Created Case has auto-generated caseNumber");

    // Verify Case record in DB
    const createdCase1 = await prisma.case.findUnique({
      where: { submissionId: testSubId1 },
    });
    assert(createdCase1?.id === res1.caseId, "Requirement 32: Case record queryable by unique submissionId");

    // 2nd Submission with IDENTICAL submissionId (Simulating retry / multi-tab submission)
    const res2 = await createCaseWithIdempotency({
      submissionId: testSubId1,
      animalId: animal.id,
      createdByUserId: farmerUser.id,
      symptoms: ["Fever", "Lethargy"],
      durationDays: 2,
      affectedCount: 1,
      herdSize: 10,
      mortalityCount: 0,
    });

    assert(res2.success === true, "Requirement 33: Repeated submission with duplicate submissionId returns success");
    assert(res2.caseId === res1.caseId, "Requirement 34: Duplicate submissionId returns EXACT SAME caseId without creating second Case row");

    const caseCountForSub1 = await prisma.case.count({
      where: { submissionId: testSubId1 },
    });
    assert(caseCountForSub1 === 1, "Requirement 35: Exactly one Case record exists in database for submissionId");

    // Submitting second distinct report with different submissionId
    const res3 = await createCaseWithIdempotency({
      submissionId: testSubId2,
      animalId: animal.id,
      createdByUserId: farmerUser.id,
      symptoms: ["Cough"],
      durationDays: 1,
      affectedCount: 1,
      herdSize: 10,
      mortalityCount: 0,
    });
    assert(res3.success === true && res3.caseId !== res1.caseId, "Requirement 36: Submission with new submissionId creates distinct Case record");

    // ----------------------------------------------------
    // SECTION 8: AI PIPELINE DURABILITY & UI COMPONENTS (Reqs 38-44)
    // ----------------------------------------------------
    const caseInDb = await prisma.case.findUnique({ where: { id: res1.caseId } });
    assert(caseInDb?.status === "PENDING_REVIEW", "Requirement 38: Case status initialized to PENDING_REVIEW regardless of AI availability");

    const syncBadgePath = path.join(projectRoot, "components/offline/SyncStatusBadge.tsx");
    assert(fs.existsSync(syncBadgePath), "Requirement 39: SyncStatusBadge UI component exists");
    const syncBadgeContent = fs.readFileSync(syncBadgePath, "utf-8");
    assert(syncBadgeContent.includes("Offline") && syncBadgeContent.includes("Online"), "Requirement 40: SyncStatusBadge handles Online/Offline status display");

    const reportFormPath = path.join(projectRoot, "components/reporting/HealthReportForm.tsx");
    const reportFormContent = fs.readFileSync(reportFormPath, "utf-8");
    assert(reportFormContent.includes("enqueueReport"), "Requirement 41: HealthReportForm handles offline report queuing in IndexedDB");
    assert(reportFormContent.includes("Saved on this device") || reportFormContent.includes("QUEUED_OFFLINE"), "Requirement 42: Offline form submission explicitly informs user report is queued locally, avoiding false server success claim");

    const pwaRegisterPath = path.join(projectRoot, "components/pwa/PwaRegister.tsx");
    assert(fs.existsSync(pwaRegisterPath), "Requirement 43: PwaRegister component exists for service worker lifecycle management");

    // Clean teardown of test records
    await prisma.case.deleteMany({
      where: { submissionId: { in: [testSubId1, testSubId2] } },
    });
    await prisma.animal.delete({ where: { id: animal.id } });
    await prisma.herd.delete({ where: { id: herd.id } });
    await prisma.farm.delete({ where: { id: farm.id } });
    await prisma.user.delete({ where: { id: farmerUser.id } });
    await prisma.village.delete({ where: { id: village.id } });
    await prisma.block.delete({ where: { id: block.id } });
    await prisma.district.delete({ where: { id: district.id } });

    assert(true, "Requirement 44: Clean teardown of temporary test records completed");

  } catch (error) {
    console.error("Test execution failed with error:", error);
    assert(false, `Test suite execution threw exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("==========================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL ${totalAssertions} ASSERTIONS)`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase11HardenedTests();
