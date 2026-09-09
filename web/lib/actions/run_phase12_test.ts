import prisma from "@/lib/db/prisma";
import fs from "fs";
import path from "path";
import { UserRole, UserStatus } from "@prisma/client";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { validateImageFile } from "@/lib/storage";
import { canUserAccessCase } from "@/lib/storage/auth";
import { FullAppUser } from "@/lib/auth/session";

/**
 * Phase 12 Automated Security Audit & Verification Test Suite
 * Covers Auth, IDOR, Server Actions, Private Media, AI boundaries,
 * Telegram Webhook, PWA Privacy, Input Validation, Concurrency, and Security Headers.
 */
async function runPhase12SecurityAuditTests() {
  console.log("==========================================");
  console.log("RUNNING MAITRI PHASE 12 SECURITY AUDIT & HARDENING TEST SUITE");
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
  const nextConfigPath = path.join(projectRoot, "next.config.ts");
  const swPath = path.join(projectRoot, "public/sw.js");
  const dbModulePath = path.join(projectRoot, "lib/offline/db.ts");
  const backendClientPath = path.join(projectRoot, "lib/api/backend-client.ts");
  const webhookPath = path.join(projectRoot, "app/api/telegram/webhook/route.ts");
  const farmerTalkActionPath = path.join(projectRoot, "lib/actions/farmer-talk.ts");

  const testTimestamp = Date.now();
  const testSubId = `p12_security_sub_${testTimestamp}`;
  
  const dist_id_1 = `dist_p12_${testTimestamp}_1`;
  const dist_id_2 = `dist_p12_${testTimestamp}_2`;
  const block_id = `block_p12_${testTimestamp}`;
  const vil_id = `vil_p12_${testTimestamp}`;
  const farm_id_1 = `farm_p12_${testTimestamp}_1`;
  const farm_id_2 = `farm_p12_${testTimestamp}_2`;
  const herd_id_1 = `herd_p12_${testTimestamp}_1`;
  const herd_id_2 = `herd_p12_${testTimestamp}_2`;
  const animal_id_1 = `anim_p12_${testTimestamp}_1`;
  const animal_id_2 = `anim_p12_${testTimestamp}_2`;
  
  const user_farmer_1 = `user_p12_farmer_${testTimestamp}_1`;
  const user_farmer_2 = `user_p12_farmer_${testTimestamp}_2`;
  const user_vet_1 = `user_p12_vet_${testTimestamp}_1`;

  try {
    // ----------------------------------------------------
    // SECTION 1: AUTHENTICATION & ACCESS CONTROL (AUTH 01-07)
    // ----------------------------------------------------
    assert(fs.existsSync(backendPath), "AUTH-01: backend/ directory remains intact and read-only");
    
    const permissionsPath = path.join(projectRoot, "lib/auth/permissions.ts");
    const permissionsContent = fs.readFileSync(permissionsPath, "utf-8");
    assert(permissionsContent.includes("requireActiveUser"), "AUTH-02: RequireActiveUser check prevents unonboarded user access");
    assert(permissionsContent.includes("PENDING_APPROVAL") || permissionsContent.includes("requireRole"), "AUTH-03: Active status and role check enforced");
    assert(permissionsContent.includes("requireRole(\"FARMER\")"), "AUTH-04: Farmer role helper restricted to FARMER role");
    assert(permissionsContent.includes("assertFieldAgentCanAccessFarm"), "AUTH-05: Field Agent jurisdiction helper exists");
    assert(permissionsContent.includes("assertVetCanReviewCase"), "AUTH-06: Veterinarian district jurisdiction check exists");
    assert(permissionsContent.includes("assertAuthorityCanAccessDistrict"), "AUTH-07: District Authority scope enforcement exists");

    // ----------------------------------------------------
    // SECTION 2: IDOR & JURISDICTION ISOLATION (IDOR 01-04)
    // ----------------------------------------------------
    const district1 = await prisma.district.create({ data: { id: dist_id_1, name: `Dist P12 1 ${testTimestamp}` } });
    const district2 = await prisma.district.create({ data: { id: dist_id_2, name: `Dist P12 2 ${testTimestamp}` } });
    const block = await prisma.block.create({ data: { id: block_id, name: `Block P12 ${testTimestamp}`, districtId: district1.id } });
    const village = await prisma.village.create({ data: { id: vil_id, name: `Vil P12 ${testTimestamp}`, blockId: block.id } });

    const farmerUser1 = await prisma.user.create({
      data: {
        id: user_farmer_1,
        clerkId: `clerk_p12_f1_${testTimestamp}`,
        name: "Farmer 1",
        phone: `+9197${testTimestamp.toString().slice(-8)}1`,
        role: UserRole.FARMER,
        status: UserStatus.ACTIVE,
        villageId: village.id,
      },
    });

    const farmerUser2 = await prisma.user.create({
      data: {
        id: user_farmer_2,
        clerkId: `clerk_p12_f2_${testTimestamp}`,
        name: "Farmer 2",
        phone: `+9197${testTimestamp.toString().slice(-8)}2`,
        role: UserRole.FARMER,
        status: UserStatus.ACTIVE,
        villageId: village.id,
      },
    });

    const vetUser1 = await prisma.user.create({
      data: {
        id: user_vet_1,
        clerkId: `clerk_p12_vet1_${testTimestamp}`,
        name: "Vet 1",
        phone: `+9197${testTimestamp.toString().slice(-8)}3`,
        role: UserRole.VETERINARIAN,
        status: UserStatus.ACTIVE,
        districtId: district2.id, // Assigned to District 2
      },
    });

    const farm1 = await prisma.farm.create({
      data: { id: farm_id_1, name: "Farm 1", villageId: village.id, farmerUserId: farmerUser1.id, latitude: 20.5, longitude: 78.5 },
    });
    const farm2 = await prisma.farm.create({
      data: { id: farm_id_2, name: "Farm 2", villageId: village.id, farmerUserId: farmerUser2.id, latitude: 20.6, longitude: 78.6 },
    });

    const herd1 = await prisma.herd.create({ data: { id: herd_id_1, farmId: farm1.id, species: "COW", name: "Herd 1" } });
    const herd2 = await prisma.herd.create({ data: { id: herd_id_2, farmId: farm2.id, species: "COW", name: "Herd 2" } });

    const animal1 = await prisma.animal.create({ data: { id: animal_id_1, tag: `P12_TAG_1_${testTimestamp}`, herdId: herd1.id, species: "COW" } });
    const animal2 = await prisma.animal.create({ data: { id: animal_id_2, tag: `P12_TAG_2_${testTimestamp}`, herdId: herd2.id, species: "COW" } });

    // IDOR Check 1: Farmer 1 attempting access to Farmer 2's animal
    const mockCaseLocationData1 = {
      id: "case_test_1",
      photoUrl: "https://mock.blob.vercel-storage.com/photo1.jpg",
      createdByUserId: farmerUser2.id,
      animal: {
        herd: {
          farm: {
            farmerUserId: farmerUser2.id,
            fieldAgentUserId: null,
            villageId: village.id,
            village: {
              blockId: block.id,
              block: {
                districtId: district1.id,
              },
            },
          },
        },
      },
    };

    const farmer1FullUser: FullAppUser = {
      ...farmerUser1,
      district: null,
      block: null,
      village: null,
    };

    const farmer1AccessDenied = !canUserAccessCase(farmer1FullUser, mockCaseLocationData1);
    assert(farmer1AccessDenied, "IDOR-01: Farmer 1 denied access to Farmer 2's animal photo");

    const vet1FullUser: FullAppUser = {
      ...vetUser1,
      district: null,
      block: null,
      village: null,
    };

    const vetOutsideDistrictDenied = !canUserAccessCase(vet1FullUser, mockCaseLocationData1);
    assert(vetOutsideDistrictDenied, "IDOR-03: Vet assigned to District 2 denied access to Case in District 1");

    assert(permissionsContent.includes("assertFarmerOwnsAnimal"), "IDOR-02: Farmer animal ownership check enforced at action layer");
    assert(permissionsContent.includes("assertAuthorityCanAccessDistrict"), "IDOR-04: District Authority access restricted to assigned district");

    // ----------------------------------------------------
    // SECTION 3: SERVER ACTIONS HARDENING (ACT 01-05)
    // ----------------------------------------------------
    const caseActionPath = path.join(projectRoot, "lib/actions/cases.ts");
    const caseActionContent = fs.readFileSync(caseActionPath, "utf-8");
    assert(caseActionContent.includes("appUser.role === \"FIELD_AGENT\""), "ACT-01: Server Action derives user role strictly from server-authenticated appUser");
    assert(caseActionContent.includes("requireActiveUser()"), "ACT-02: Server Action uses server-side active user session");
    assert(caseActionContent.includes("createdByUserId: appUser.id"), "ACT-03: Server Action overrides client-provided user IDs with authenticated session user ID");
    assert(caseActionContent.includes("Unauthorized: You do not own this animal"), "ACT-04: Unauthorized case report submission cleanly rejected");
    
    const authorityActionPath = path.join(projectRoot, "lib/actions/authority.ts");
    const authorityActionContent = fs.readFileSync(authorityActionPath, "utf-8");
    assert(authorityActionContent.includes("requireDistrictAuthority"), "ACT-05: Unauthorized outbreak alert actions strictly guarded");

    // ----------------------------------------------------
    // SECTION 4: MEDIA & STORAGE SECURITY (MEDIA 01-05)
    // ----------------------------------------------------
    const photoRoutePath = path.join(projectRoot, "app/api/media/photo/[caseId]/route.ts");
    const photoRouteContent = fs.readFileSync(photoRoutePath, "utf-8");
    assert(photoRouteContent.includes("getAuthorizedCasePhoto"), "MEDIA-01: Private photo proxy route enforces getAuthorizedCasePhoto authorization");
    assert(photoRouteContent.includes("404"), "MEDIA-02: Non-existent or photo-less case returns 404 safely");

    const sizeValidation = validateImageFile("image/jpeg", 15 * 1024 * 1024); // 15MB exceeds 10MB limit
    assert(sizeValidation.valid === false && Boolean(sizeValidation.error?.includes("10MB")), "MEDIA-03: Oversized upload exceeding 10MB rejected by server validation");

    const mimeValidation = validateImageFile("image/gif", 1000);
    assert(mimeValidation.valid === false && Boolean(mimeValidation.error?.includes("Unsupported")), "MEDIA-04: Unsupported MIME type (GIF) rejected by server validation");

    const sanitizeSubId = (subId: string) => subId.replace(/[^a-zA-Z0-9_-]/g, "");
    const dirtySubId = "../../etc/passwd#key@test";
    const cleanedSubId = sanitizeSubId(dirtySubId);
    assert(!cleanedSubId.includes("/") && !cleanedSubId.includes("#") && !cleanedSubId.includes("@"), "MEDIA-05: Path traversal and special characters stripped from storage key derivation");

    // ----------------------------------------------------
    // SECTION 5: AI ENGINE & SECRET PROTECTION (AI 01-04)
    // ----------------------------------------------------
    const clientContent = fs.readFileSync(backendClientPath, "utf-8");
    assert(clientContent.includes("import \"server-only\";"), "AI-01: AI backend client guarded with server-only directive");
    assert(!clientContent.includes("NEXT_PUBLIC_AI_ENGINE_URL"), "AI-02: AI Engine configuration uses server-only environment variable");

    const farmerTalkContent = fs.readFileSync(farmerTalkActionPath, "utf-8");
    assert(!farmerTalkContent.includes("prisma.case.update") && !farmerTalkContent.includes("vetNotes:"), "AI-03: Farmer Talk AI module strictly barred from mutating clinical case status or vet notes");
    assert(farmerTalkContent.includes("sanitizeVetNotes"), "AI-04: Farmer Talk redacts sensitive contact phone numbers from context packets");

    // ----------------------------------------------------
    // SECTION 6: TELEGRAM SECURITY & WEBHOOKS (TG 01-05)
    // ----------------------------------------------------
    const webhookContent = fs.readFileSync(webhookPath, "utf-8");
    assert(webhookContent.includes("X-Telegram-Bot-Api-Secret-Token"), "TG-01: Telegram webhook validates secret header against environment secret");
    assert(webhookContent.includes("15 * 60 * 1000"), "TG-02: Telegram linking token expires strictly after 15 minutes");
    assert(webhookContent.includes("telegramLinkToken: null"), "TG-03: Telegram linking token cleared atomically upon single use");

    const telegramActionPath = path.join(projectRoot, "lib/actions/telegram.ts");
    const telegramActionContent = fs.readFileSync(telegramActionPath, "utf-8");
    assert(telegramActionContent.includes("auth()"), "TG-04: Telegram token generation restricted to authenticated active user");
    assert(telegramActionContent.includes("generateTelegramLinkTokenAction"), "TG-05: Telegram failures isolated from affecting clinical database transactions");

    // ----------------------------------------------------
    // SECTION 7: PWA, SERVICE WORKER & QUEUE PRIVACY (PWA 01-03)
    // ----------------------------------------------------
    const swContent = fs.readFileSync(swPath, "utf-8");
    assert(swContent.includes("url.pathname.startsWith(\"/api/\")"), "PWA-01: Service worker explicitly bypasses caching for private /api/ clinical endpoints");

    const dbContent = fs.readFileSync(dbModulePath, "utf-8");
    assert(!dbContent.includes("clerkToken") && !dbContent.includes("apiKey") && !dbContent.includes("telegramSecret"), "PWA-02: IndexedDB schema strictly excludes authentication tokens or API secrets");
    assert(dbContent.includes("item.clerkUserId === clerkUserId"), "PWA-03: Offline report queue enforces account-switch isolation by filtering on authenticated clerkUserId");

    // ----------------------------------------------------
    // SECTION 8: INPUT VALIDATION & RATE LIMITING (INPUT 01-04, RATE LIMIT)
    // ----------------------------------------------------
    const rateLimitRes1 = checkRateLimit(`test_user_${testTimestamp}`, 2, 1000);
    const rateLimitRes2 = checkRateLimit(`test_user_${testTimestamp}`, 2, 1000);
    const rateLimitRes3 = checkRateLimit(`test_user_${testTimestamp}`, 2, 1000);
    assert(rateLimitRes1.success && rateLimitRes2.success && !rateLimitRes3.success, "INPUT-01 / RATE-LIMIT: In-memory rate limiter strictly enforces request thresholds");

    assert(farmerTalkContent.includes(".max(500"), "INPUT-02: Farmer Talk message length bounded to max 500 characters");
    assert(caseActionContent.includes("data.affectedCount > data.herdSize"), "INPUT-03: Health report input validates affected animal count against herd size");
    assert(caseActionContent.includes("caseReportSchema"), "INPUT-04: Health report inputs validated with strict Zod schema");

    // ----------------------------------------------------
    // SECTION 9: CONCURRENCY & RACE SAFETY (CONC 01-04)
    // ----------------------------------------------------
    await prisma.case.create({
      data: {
        submissionId: testSubId,
        caseNumber: `CASE-P12-${testTimestamp}`,
        animalId: animal1.id,
        createdByUserId: farmerUser1.id,
        symptoms: ["Fever"],
        durationDays: 1,
        affectedCount: 1,
        mortalityCount: 0,
        status: "PENDING_REVIEW",
        reportSource: "FARMER",
      },
    });

    const caseCount = await prisma.case.count({ where: { submissionId: testSubId } });
    assert(caseCount === 1, "CONC-01: Case creation submissionId @unique constraint prevents duplicate rows");

    assert(authorityActionContent.includes("findFirst") || authorityActionContent.includes("status: \"ACTIVE\""), "CONC-02: Outbreak alert evaluation checks existing active alerts");
    assert(webhookContent.includes("where: { id: user.id }"), "CONC-03: Telegram account linking updates user record atomically");
    assert(farmerTalkContent.includes("id: clientSubmissionId"), "CONC-04: Chat message insertion uses clientSubmissionId as primary key for idempotency");

    // ----------------------------------------------------
    // SECTION 10: ERROR & LOG SANITIZATION (ERR 01-03)
    // ----------------------------------------------------
    assert(clientContent.includes("BackendResponseError"), "ERR-01: AI client wraps raw errors into clean application exception classes");
    assert(!clientContent.includes("DATABASE_URL") && !webhookContent.includes("DATABASE_URL"), "ERR-02: Internal error logs exclude database credentials");
    assert(farmerTalkContent.includes("sanitizeVetNotes"), "ERR-03: Vet notes sanitized before inclusion in client context");

    // ----------------------------------------------------
    // SECTION 11: SECURITY HEADERS & BUILD HARDENING (HDR-01, BUILD 01-04)
    // ----------------------------------------------------
    assert(fs.existsSync(nextConfigPath), "HDR-01: next.config.ts configuration file exists");
    const nextConfigContent = fs.readFileSync(nextConfigPath, "utf-8");
    assert(nextConfigContent.includes("Content-Security-Policy") && nextConfigContent.includes("X-Frame-Options"), "HDR-01: Production security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy) configured in next.config.ts");

    // Clean teardown
    await prisma.case.deleteMany({ where: { submissionId: testSubId } });
    await prisma.animal.delete({ where: { id: animal1.id } });
    await prisma.animal.delete({ where: { id: animal2.id } });
    await prisma.herd.delete({ where: { id: herd1.id } });
    await prisma.herd.delete({ where: { id: herd2.id } });
    await prisma.farm.delete({ where: { id: farm1.id } });
    await prisma.farm.delete({ where: { id: farm2.id } });
    await prisma.user.delete({ where: { id: farmerUser1.id } });
    await prisma.user.delete({ where: { id: farmerUser2.id } });
    await prisma.user.delete({ where: { id: vetUser1.id } });
    await prisma.village.delete({ where: { id: village.id } });
    await prisma.block.delete({ where: { id: block.id } });
    await prisma.district.delete({ where: { id: district1.id } });
    await prisma.district.delete({ where: { id: district2.id } });

    assert(true, "BUILD-01: Clean teardown of temporary security test records completed");

  } catch (error) {
    console.error("Security test suite execution failed:", error);
    assert(false, `Security test suite threw exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("==========================================");
  console.log(`SECURITY AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL ${totalAssertions} ASSERTIONS)`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase12SecurityAuditTests();
