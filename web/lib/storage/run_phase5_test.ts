import { validateImageFile, MAX_FILE_SIZE_BYTES } from "./index";
import { canUserAccessCase } from "./auth";
import { FullAppUser } from "@/lib/auth/session";

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
  const validMime = validateImageFile("image/jpeg", 1024 * 1024);
  assert(validMime.valid, "Accept valid JPEG MIME type");

  const validPng = validateImageFile("image/png", 2 * 1024 * 1024);
  assert(validPng.valid, "Accept valid PNG MIME type");

  const validWebp = validateImageFile("image/webp", 500 * 1024);
  assert(validWebp.valid, "Accept valid WebP MIME type");

  const invalidMime = validateImageFile("application/pdf", 1024);
  assert(!invalidMime.valid && Boolean(invalidMime.error), "Reject invalid MIME type (application/pdf)");

  const exeMime = validateImageFile("image/gif", 1024);
  assert(!exeMime.valid && Boolean(exeMime.error), "Reject unapproved image type (GIF)");

  // 2. Validation Tests: File Size
  const smallFile = validateImageFile("image/jpeg", 5 * 1024 * 1024);
  assert(smallFile.valid, "Accept 5MB photo size");

  const maxFile = validateImageFile("image/jpeg", MAX_FILE_SIZE_BYTES);
  assert(maxFile.valid, "Accept exactly 10MB photo size");

  const oversizedFile = validateImageFile("image/jpeg", MAX_FILE_SIZE_BYTES + 1);
  assert(!oversizedFile.valid && Boolean(oversizedFile.error), "Reject oversized photo (>10MB)");

  // 3. Authorization Tests: User Roles & Cases
  const mockFarmer1 = {
    id: "user_farmer_1",
    clerkId: "clerk_1",
    phone: "9990001111",
    role: "FARMER",
    status: "ACTIVE",
    name: "Ramesh Farmer",
    preferredLanguage: "en",
    telegramChatId: null,
    telegramLinkToken: null,
    villageId: "v1",
    blockId: "b1",
    districtId: "d1",
    createdAt: new Date(),
    updatedAt: new Date(),
    village: null,
    block: null,
    district: null,
  } as unknown as FullAppUser;

  const mockFarmer2 = {
    id: "user_farmer_2",
    clerkId: "clerk_2",
    phone: "9990002222",
    role: "FARMER",
    status: "ACTIVE",
    name: "Suresh Farmer",
    preferredLanguage: "en",
    telegramChatId: null,
    telegramLinkToken: null,
    villageId: "v2",
    blockId: "b1",
    districtId: "d1",
    createdAt: new Date(),
    updatedAt: new Date(),
    village: null,
    block: null,
    district: null,
  } as unknown as FullAppUser;

  const mockAgentDistrict1 = {
    id: "user_agent_1",
    clerkId: "clerk_agent_1",
    phone: "9990003333",
    role: "FIELD_AGENT",
    status: "ACTIVE",
    name: "Agent Verma",
    preferredLanguage: "en",
    telegramChatId: null,
    telegramLinkToken: null,
    villageId: "v1",
    blockId: "b1",
    districtId: "d1",
    createdAt: new Date(),
    updatedAt: new Date(),
    village: null,
    block: null,
    district: null,
  } as unknown as FullAppUser;

  const mockAgentDistrict2 = {
    id: "user_agent_2",
    clerkId: "clerk_agent_2",
    phone: "9990004444",
    role: "FIELD_AGENT",
    status: "ACTIVE",
    name: "Agent Sharma",
    preferredLanguage: "en",
    telegramChatId: null,
    telegramLinkToken: null,
    villageId: "v99",
    blockId: "b99",
    districtId: "d99",
    createdAt: new Date(),
    updatedAt: new Date(),
    village: null,
    block: null,
    district: null,
  } as unknown as FullAppUser;

  const mockVetDistrict1 = {
    id: "user_vet_1",
    clerkId: "clerk_vet_1",
    phone: "9990005555",
    role: "VETERINARIAN",
    status: "ACTIVE",
    name: "Dr. Singh",
    preferredLanguage: "en",
    telegramChatId: null,
    telegramLinkToken: null,
    villageId: null,
    blockId: null,
    districtId: "d1",
    createdAt: new Date(),
    updatedAt: new Date(),
    village: null,
    block: null,
    district: null,
  } as unknown as FullAppUser;

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

  // Farmer 1 can access own case
  const farmerOwnAccess = canUserAccessCase(mockFarmer1, mockCaseFarmer1);
  assert(farmerOwnAccess, "Farmer 1 can access own animal photo");

  // Farmer 2 CANNOT access Farmer 1 case photo
  const farmerOtherAccess = canUserAccessCase(mockFarmer2, mockCaseFarmer1);
  assert(!farmerOtherAccess, "Farmer 2 CANNOT access Farmer 1 photo (IDOR prevented)");

  // Agent in District 1 can access Case in District 1
  const agentDistrict1Access = canUserAccessCase(mockAgentDistrict1, mockCaseFarmer1);
  assert(agentDistrict1Access, "Field Agent in District 1 can access photo in assigned District 1");

  // Agent in District 99 CANNOT access Case in District 1
  const agentDistrict2Access = canUserAccessCase(mockAgentDistrict2, mockCaseFarmer1);
  assert(!agentDistrict2Access, "Field Agent outside jurisdiction CANNOT access photo");

  // Vet in District 1 can access Case in District 1
  const vetDistrict1Access = canUserAccessCase(mockVetDistrict1, mockCaseFarmer1);
  assert(vetDistrict1Access, "Veterinarian in District 1 can access photo");

  console.log("==========================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
