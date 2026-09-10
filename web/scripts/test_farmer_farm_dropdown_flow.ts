import prisma from "../lib/db/prisma";
import { routeAssistanceRequestToFieldAgent } from "../lib/geo/routing";

async function testFarmerDropdownAndSubmission() {
  console.log("=== 1. VERIFY EXACT FARMER: CHIRABRATA GHOSAL ===");
  const farmer = await prisma.user.findFirst({
    where: {
      role: "FARMER",
      clerkId: "user_3J5F5W8zR12dVPtemaO5TYMiLAq",
    },
    include: {
      village: true,
      block: true,
      district: true,
    },
  });

  if (!farmer) {
    throw new Error("Farmer CHIRABRATA GHOSAL not found in DB.");
  }

  console.log("Found farmer:", {
    id: farmer.id,
    clerkId: farmer.clerkId,
    name: farmer.name,
    phone: farmer.phone,
    village: farmer.village?.name,
    district: farmer.district?.name,
  });

  console.log("\n=== 2. RUN EXACT FARM QUERY FROM request-help/page.tsx ===");
  const farms = await prisma.farm.findMany({
    where: { farmerUserId: farmer.id },
    include: {
      village: true,
      herds: {
        include: {
          animals: {
            select: {
              id: true,
              tag: true,
              species: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Farms count for farmer ${farmer.name}: ${farms.length}`);
  const farmOptions = farms.map((f) => ({
    id: f.id,
    name: f.name,
    villageName: f.village.name,
    animals: f.herds.flatMap((h) => h.animals),
  }));

  console.log("Farm options passed to client component:", JSON.stringify(farmOptions, null, 2));

  if (farmOptions.length === 0) {
    throw new Error("FAIL: farmOptions is empty for CHIRABRATA GHOSAL!");
  }

  const primaryFarm = farmOptions[0];
  console.log(`Primary farm option: "${primaryFarm.name} (${primaryFarm.villageName})" [ID: ${primaryFarm.id}]`);
  console.log(`Animals in primary farm: ${primaryFarm.animals.map((a) => `${a.tag} (${a.species})`).join(", ")}`);

  const buffaloAnimal = primaryFarm.animals.find((a) => a.tag === "cow-100" || a.species === "BUFFALO") || primaryFarm.animals[0];
  console.log("Selected animal for assistance request:", buffaloAnimal);

  console.log("\n=== 3. TEST ASSISTANCE REQUEST CREATION IN DB ===");
  const createdRequest = await prisma.assistanceRequest.create({
    data: {
      farmerUserId: farmer.id,
      farmId: primaryFarm.id,
      animalId: buffaloAnimal ? buffaloAnimal.id : null,
      villageId: farms[0].villageId,
      blockId: farms[0].village.blockId,
      districtId: farms[0].village.blockId ? (await prisma.block.findUnique({ where: { id: farms[0].village.blockId } }))?.districtId : null,
      reason: "vry urgent - animal unable to stand, suspected foot and mouth infection",
      notes: "Farm located near Bidhannagar main market",
      status: "REQUESTED",
      caseId: null,
    },
  });

  console.log("Created AssistanceRequest:", {
    id: createdRequest.id,
    farmerUserId: createdRequest.farmerUserId,
    farmId: createdRequest.farmId,
    animalId: createdRequest.animalId,
    status: createdRequest.status,
    caseId: createdRequest.caseId,
    reason: createdRequest.reason,
  });

  if (createdRequest.caseId !== null) {
    throw new Error("FAIL: caseId MUST be null upon initial AssistanceRequest creation!");
  }

  console.log("\n=== 4. TEST FIELD AGENT ROUTING ===");
  const routeRes = await routeAssistanceRequestToFieldAgent(createdRequest.id);
  console.log("Routing result:", routeRes);

  const updatedRequest = await prisma.assistanceRequest.findUnique({
    where: { id: createdRequest.id },
    include: {
      assignedFieldAgentUser: true,
      farm: true,
      animal: true,
    },
  });

  console.log("Updated request state after routing:", {
    id: updatedRequest?.id,
    status: updatedRequest?.status,
    assignedAgent: updatedRequest?.assignedFieldAgentUser?.name,
    assignedLevel: updatedRequest?.assignmentLevel,
    caseId: updatedRequest?.caseId,
  });

  // Clean up test request
  await prisma.assistanceRequest.delete({ where: { id: createdRequest.id } });
  console.log("Cleaned up test request successfully.");

  console.log("\n=== ALL DIRECT DATABASE CHECKS PASSED ===");
}

testFarmerDropdownAndSubmission().catch(console.error).finally(() => prisma.$disconnect());
