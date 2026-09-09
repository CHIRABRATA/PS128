import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from "./blob";
import { UserRole } from "@prisma/client";

export function validateImageFileTest(mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported image format (${mimeType}). Allowed formats: JPEG, PNG, WebP.`,
    };
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 10MB maximum limit.`,
    };
  }

  return { valid: true };
}

export function canUserAccessCaseTest(
  appUser: { id: string; role: UserRole; villageId?: string | null; blockId?: string | null; districtId?: string | null },
  healthCase: { createdByUserId: string; animal: { herd: { farm: { farmerUserId: string | null; fieldAgentUserId: string | null; villageId: string; village: { blockId: string; block: { districtId: string } } } } } }
): boolean {
  if (appUser.role === "FARMER") {
    return (
      healthCase.createdByUserId === appUser.id ||
      healthCase.animal.herd.farm.farmerUserId === appUser.id
    );
  }

  if (appUser.role === "FIELD_AGENT") {
    const farm = healthCase.animal.herd.farm;
    const isReporter = healthCase.createdByUserId === appUser.id;
    const isAssigned = farm.fieldAgentUserId === appUser.id;
    const isSameVillage = Boolean(appUser.villageId && farm.villageId === appUser.villageId);
    const isSameBlock = Boolean(appUser.blockId && farm.village.blockId === appUser.blockId);
    const isSameDistrict = Boolean(
      appUser.districtId && farm.village.block.districtId === appUser.districtId
    );

    return isReporter || isAssigned || isSameVillage || isSameBlock || isSameDistrict;
  }

  if (appUser.role === "VETERINARIAN") {
    if (!appUser.districtId) return true;
    return healthCase.animal.herd.farm.village.block.districtId === appUser.districtId;
  }

  if (appUser.role === "DISTRICT_AUTHORITY") {
    if (!appUser.districtId) return true;
    return healthCase.animal.herd.farm.village.block.districtId === appUser.districtId;
  }

  return false;
}

async function runPhase5Tests() {
  console.log("==========================================");
  console.log("RUNNING MAITRI PHASE 5 STORAGE TEST SUITE");
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

  // 1. Validation Tests: MIME Type
  const validMime = validateImageFileTest("image/jpeg", 1024 * 1024);
  assert(validMime.valid, "Accept valid JPEG MIME type");

  const validPng = validateImageFileTest("image/png", 2 * 1024 * 1024);
  assert(validPng.valid, "Accept valid PNG MIME type");

  const validWebp = validateImageFileTest("image/webp", 500 * 1024);
  assert(validWebp.valid, "Accept valid WebP MIME type");

  const invalidMime = validateImageFileTest("application/pdf", 1024);
  assert(!invalidMime.valid && Boolean(invalidMime.error), "Reject invalid MIME type (application/pdf)");

  const exeMime = validateImageFileTest("image/gif", 1024);
  assert(!exeMime.valid && Boolean(exeMime.error), "Reject unapproved image type (GIF)");

  // 2. Validation Tests: File Size
  const smallFile = validateImageFileTest("image/jpeg", 5 * 1024 * 1024);
  assert(smallFile.valid, "Accept 5MB photo size");

  const maxFile = validateImageFileTest("image/jpeg", MAX_FILE_SIZE_BYTES);
  assert(maxFile.valid, "Accept exactly 10MB photo size");

  const oversizedFile = validateImageFileTest("image/jpeg", MAX_FILE_SIZE_BYTES + 1);
  assert(!oversizedFile.valid && Boolean(oversizedFile.error), "Reject oversized photo (>10MB)");

  // 3. Authorization Tests
  const mockFarmer1 = {
    id: "user_farmer_1",
    role: "FARMER" as UserRole,
  };

  const mockFarmer2 = {
    id: "user_farmer_2",
    role: "FARMER" as UserRole,
  };

  const mockAgentDistrict1 = {
    id: "user_agent_1",
    role: "FIELD_AGENT" as UserRole,
    districtId: "d1",
  };

  const mockAgentDistrict2 = {
    id: "user_agent_2",
    role: "FIELD_AGENT" as UserRole,
    districtId: "d99",
  };

  const mockVetDistrict1 = {
    id: "user_vet_1",
    role: "VETERINARIAN" as UserRole,
    districtId: "d1",
  };

  const mockCaseFarmer1 = {
    id: "case_101",
    photoUrl: "https://blob.vercel-storage.com/cases/case_101/uuid1.jpg",
    createdByUserId: "user_farmer_1",
    animal: {
      herd: {
        farm: {
          farmerUserId: "user_farmer_1",
          fieldAgentUserId: "user_agent_1",
          villageId: "v1",
          village: {
            blockId: "b1",
            block: {
              districtId: "d1",
            },
          },
        },
      },
    },
  };

  assert(canUserAccessCaseTest(mockFarmer1, mockCaseFarmer1), "Farmer 1 can access own animal photo");
  assert(!canUserAccessCaseTest(mockFarmer2, mockCaseFarmer1), "Farmer 2 CANNOT access Farmer 1 photo (IDOR prevented)");
  assert(canUserAccessCaseTest(mockAgentDistrict1, mockCaseFarmer1), "Field Agent in District 1 can access photo in assigned District 1");
  assert(!canUserAccessCaseTest(mockAgentDistrict2, mockCaseFarmer1), "Field Agent outside jurisdiction CANNOT access photo");
  assert(canUserAccessCaseTest(mockVetDistrict1, mockCaseFarmer1), "Veterinarian in District 1 can access photo");

  console.log("==========================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests();
