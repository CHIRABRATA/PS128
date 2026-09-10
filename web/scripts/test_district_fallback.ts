import prisma from "../lib/db/prisma";
import { routeCaseToVeterinarian } from "../lib/geo/routing";

async function main() {
  console.log("=== RE-ROUTING PENDING CASES & TESTING DISTRICT FALLBACK ===");

  // 1. Find all pending unassigned cases in the database and re-route them
  const unassignedCases = await prisma.case.findMany({
    where: {
      assignedVeterinarianUserId: null,
      status: { in: ["PENDING_REVIEW", "UNDER_EXAMINATION", "LAB_REFERRAL"] },
    },
    include: {
      animal: {
        include: {
          herd: {
            include: {
              farm: {
                include: {
                  village: {
                    include: {
                      block: {
                        include: {
                          district: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  console.log(`Found ${unassignedCases.length} unassigned active cases in DB.`);
  for (const c of unassignedCases) {
    const res = await routeCaseToVeterinarian(c.id);
    console.log(`Case ${c.id} (${c.caseNumber}): assigned to ${res.assignedVeterinarian?.name || "UNASSIGNED"} at level ${res.assignmentLevel || "NONE"}`);
  }

  // 2. Test District-Level Fallback specifically
  console.log("\n=== TESTING DISTRICT FALLBACK ROUTING ===");
  // Create test district, 2 different blocks, 2 different villages
  const testDistrict = await prisma.district.create({
    data: { name: `Fallback Test District ${Date.now()}` },
  });
  const block1 = await prisma.block.create({
    data: { name: "Block 1", districtId: testDistrict.id },
  });
  const block2 = await prisma.block.create({
    data: { name: "Block 2", districtId: testDistrict.id },
  });
  const village1 = await prisma.village.create({
    data: { name: "Village 1", blockId: block1.id },
  });
  const village2 = await prisma.village.create({
    data: { name: "Village 2", blockId: block2.id },
  });

  // Create Vet in Block 1 / Village 1
  const vetFallback = await prisma.user.create({
    data: {
      clerkId: `clerk_vet_fb_${Date.now()}`,
      name: "Dr. District Fallback Vet",
      phone: "+919999888877",
      role: "VETERINARIAN",
      status: "ACTIVE",
      districtId: testDistrict.id,
      blockId: block1.id,
      villageId: village1.id,
    },
  });

  // Create Farmer in Block 2 / Village 2 (different block & village, same district)
  const farmerFallback = await prisma.user.create({
    data: {
      clerkId: `clerk_farmer_fb_${Date.now()}`,
      name: "Fallback Farmer",
      phone: "+919999888866",
      role: "FARMER",
      status: "ACTIVE",
      districtId: testDistrict.id,
      blockId: block2.id,
      villageId: village2.id,
    },
  });

  const farmFallback = await prisma.farm.create({
    data: {
      name: "Fallback Farm",
      farmerUserId: farmerFallback.id,
      villageId: village2.id,
      latitude: 18.5,
      longitude: 73.8,
    },
  });

  const herdFallback = await prisma.herd.create({
    data: {
      farmId: farmFallback.id,
      species: "BUFFALO",
      name: "Buffalo Herd",
    },
  });

  const animalFallback = await prisma.animal.create({
    data: {
      herdId: herdFallback.id,
      tag: `BUF-FB-${Date.now()}`,
      species: "BUFFALO",
    },
  });

  const fbCase = await prisma.case.create({
    data: {
      caseNumber: `CASE-FB-${Date.now()}`,
      submissionId: `sub_fb_${Date.now()}`,
      animalId: animalFallback.id,
      createdByUserId: farmerFallback.id,
      reportSource: "FARMER",
      status: "PENDING_REVIEW",
      symptoms: ["High Fever", "Nasal Discharge"],
      durationDays: 1,
      affectedCount: 1,
      mortalityCount: 0,
    },
  });

  console.log("Routing case with farm in Village 2 (Block 2) to vet in Village 1 (Block 1)...");
  const fbRouteResult = await routeCaseToVeterinarian(fbCase.id);

  console.log("FALLBACK ROUTING RESULT:", {
    caseId: fbRouteResult.caseId,
    assignedVetId: fbRouteResult.assignedVeterinarian?.id,
    expectedVetId: vetFallback.id,
    assignmentLevel: fbRouteResult.assignmentLevel,
    expectedLevel: "DISTRICT",
    success: fbRouteResult.assignedVeterinarian?.id === vetFallback.id && fbRouteResult.assignmentLevel === "DISTRICT",
  });

  // Cleanup test fallback data
  await prisma.inAppNotification.deleteMany({ where: { userId: vetFallback.id } });
  await prisma.case.delete({ where: { id: fbCase.id } });
  await prisma.animal.delete({ where: { id: animalFallback.id } });
  await prisma.herd.delete({ where: { id: herdFallback.id } });
  await prisma.farm.delete({ where: { id: farmFallback.id } });
  await prisma.user.delete({ where: { id: farmerFallback.id } });
  await prisma.user.delete({ where: { id: vetFallback.id } });
  await prisma.village.deleteMany({ where: { id: { in: [village1.id, village2.id] } } });
  await prisma.block.deleteMany({ where: { id: { in: [block1.id, block2.id] } } });
  await prisma.district.delete({ where: { id: testDistrict.id } });

  console.log("Fallback test completed & cleaned up successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
