import prisma from "../lib/db/prisma";
import { routeCaseToVeterinarian, findEligibleVeterinarians } from "../lib/geo/routing";

async function main() {
  console.log("==================================================");
  console.log("HARMONIZATION & STEP 1-8 TRACE VERIFICATION");
  console.log("==================================================");

  // 1. Harmonize farmer CHIRABRATA GHOSAL's farm and user to North 24 Parganas
  const farmer = await prisma.user.findUnique({
    where: { id: "cmttueaxy00009cu2e6cesob5" },
  });

  const north24Village = await prisma.village.findUnique({
    where: { id: "cmtubnne00003y0u2x0hoxfrm" }, // Bidhannagar
    include: {
      block: {
        include: {
          district: true,
        },
      },
    },
  });

  if (farmer && north24Village) {
    console.log("Syncing farmer CHIRABRATA GHOSAL to North 24 Parganas / Rajarhat / Bidhannagar...");
    await prisma.user.update({
      where: { id: farmer.id },
      data: {
        districtId: north24Village.block.districtId,
        blockId: north24Village.blockId,
        villageId: north24Village.id,
      },
    });

    // Update farm
    await prisma.farm.updateMany({
      where: { farmerUserId: farmer.id },
      data: {
        villageId: north24Village.id,
      },
    });
    console.log("Farmer and Farm synchronized successfully.");
  }

  // 2. Fetch veterinarian Arnab
  const vet = await prisma.user.findFirst({
    where: {
      role: "VETERINARIAN",
      status: "ACTIVE",
      name: "Arnab",
    },
    include: {
      district: true,
      block: true,
      village: true,
    },
  });

  console.log("\n==================================================");
  console.log("STEP 4 — VERIFY THE VETERINARIAN ACCOUNT");
  console.log("==================================================");
  console.log({
    vetId: vet?.id,
    vetName: vet?.name,
    role: vet?.role,
    status: vet?.status,
    districtId: vet?.districtId,
    districtName: vet?.district?.name,
    blockId: vet?.blockId,
    blockName: vet?.block?.name,
    villageId: vet?.villageId,
    villageName: vet?.village?.name,
  });

  // 3. Find an animal belonging to the farmer
  const animal = await prisma.animal.findFirst({
    where: {
      herd: {
        farm: {
          farmerUserId: "cmttueaxy00009cu2e6cesob5",
        },
      },
    },
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
  });

  if (!animal) {
    throw new Error("No animal found for farmer.");
  }

  console.log("\n==================================================");
  console.log("STEP 1 — REPRODUCE ONE FRESH CASE");
  console.log("==================================================");
  const testSubmissionId = `sub_trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const caseNumber = `CASE-2026-${Math.floor(100000 + Math.random() * 900000)}`;

  const freshCase = await prisma.case.create({
    data: {
      caseNumber,
      submissionId: testSubmissionId,
      animalId: animal.id,
      createdByUserId: "cmttueaxy00009cu2e6cesob5",
      reportSource: "FARMER",
      status: "PENDING_REVIEW",
      symptoms: ["Lethargy", "Fever", "Reduced Milk Yield"],
      durationDays: 2,
      affectedCount: 1,
      mortalityCount: 0,
    },
  });

  console.log("FRESH CASE CREATED IN PRISMA:");
  console.log("Case:", {
    id: freshCase.id,
    status: freshCase.status,
    createdByUserId: freshCase.createdByUserId,
    assignedVeterinarianUserId: freshCase.assignedVeterinarianUserId,
    assignedAt: freshCase.assignedAt,
    assignmentLevel: freshCase.assignmentLevel,
    animalId: freshCase.animalId,
    createdAt: freshCase.createdAt,
  });

  console.log("Animal -> Herd -> Farm:", {
    animalId: animal.id,
    farmId: animal.herd.farmId,
    villageId: animal.herd.farm.villageId,
    blockId: animal.herd.farm.village?.blockId,
    districtId: animal.herd.farm.village?.block?.districtId,
  });

  console.log("\n==================================================");
  console.log("STEP 2 & 3 — TRACE routeCaseToVeterinarian()");
  console.log("==================================================");
  console.log("CASE ID:", freshCase.id);
  console.log("CASE DISTRICT ID:", animal.herd.farm.village?.block?.districtId);
  console.log("CASE BLOCK ID:", animal.herd.farm.village?.blockId);
  console.log("CASE VILLAGE ID:", animal.herd.farm.villageId);

  // Trace eligible candidates
  const candidatesResult = await findEligibleVeterinarians({
    villageId: animal.herd.farm.villageId,
    blockId: animal.herd.farm.village?.blockId,
    districtId: animal.herd.farm.village?.block?.districtId,
  });

  console.log("Eligible Candidates Found:", candidatesResult?.eligibleVets.length);
  console.log("Calculated Winning Tier Level:", candidatesResult?.level);
  for (const c of candidatesResult?.eligibleVets || []) {
    console.log("Candidate:", {
      id: c.id,
      name: c.name,
      activeLoad: c.activeLoad,
    });
  }

  // Execute routing
  const routeResult = await routeCaseToVeterinarian(freshCase.id);
  console.log("ROUTING RESULT:", {
    selectedVetId: routeResult.assignedVeterinarian?.id,
    selectedVetName: routeResult.assignedVeterinarian?.name,
    assignmentLevel: routeResult.assignmentLevel,
    location: routeResult.location,
  });

  console.log("\n==================================================");
  console.log("STEP 6 — VERIFY ASSIGNMENT PERSISTENCE");
  console.log("==================================================");
  const reloadedCase = await prisma.case.findUnique({
    where: { id: freshCase.id },
    include: {
      assignedVeterinarianUser: {
        select: { id: true, name: true, phone: true },
      },
    },
  });

  console.log("RELOADED CASE FROM PRISMA:", {
    id: reloadedCase?.id,
    caseNumber: reloadedCase?.caseNumber,
    assignedVeterinarianUserId: reloadedCase?.assignedVeterinarianUserId,
    assignedVetName: reloadedCase?.assignedVeterinarianUser?.name,
    assignedAt: reloadedCase?.assignedAt,
    assignmentLevel: reloadedCase?.assignmentLevel,
  });

  console.log("\n==================================================");
  console.log("STEP 7 — VERIFY VET QUEUE");
  console.log("==================================================");
  
  // Directly query the queue query logic for this authenticated vet
  const vetQueueCases = await prisma.case.findMany({
    where: {
      assignedVeterinarianUserId: vet?.id,
      status: { in: ["PENDING_REVIEW", "UNDER_EXAMINATION", "LAB_REFERRAL"] },
    },
    include: {
      animal: {
        include: {
          herd: {
            include: {
              farm: {
                include: {
                  village: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const freshCaseInVetQueue = vetQueueCases.some((c) => c.id === freshCase.id);
  console.log("Vet Assigned Queue Total Cases:", vetQueueCases.length);
  console.log("Fresh Case Present in Vet Queue:", freshCaseInVetQueue ? "YES" : "NO");

  console.log("\n==================================================");
  console.log("STEP 8 — VERIFY NOTIFICATION");
  console.log("==================================================");
  const notification = await prisma.inAppNotification.findFirst({
    where: {
      userId: vet?.id,
      link: `/vet/cases/${freshCase.id}`,
    },
  });

  console.log("NOTIFICATION IN DB:", {
    id: notification?.id,
    userId: notification?.userId,
    title: notification?.title,
    message: notification?.message,
    link: notification?.link,
    type: notification?.type,
    read: notification?.read,
  });

  console.log("\n==================================================");
  console.log("STEP 10 — FINAL VERIFICATION SUMMARY");
  console.log("==================================================");
  console.log("NEW CASE ID:", freshCase.id);
  console.log("ASSIGNED VET ID:", reloadedCase?.assignedVeterinarianUserId);
  console.log("ASSIGNMENT LEVEL:", reloadedCase?.assignmentLevel);
  console.log("CASE ASSIGNMENT SUCCESS:", reloadedCase?.assignedVeterinarianUserId === vet?.id ? "YES" : "NO");
  console.log("VET QUEUE VISIBILITY:", freshCaseInVetQueue ? "YES" : "NO");
  console.log("NOTIFICATION CREATED:", notification ? "YES" : "NO");
}

main().catch(console.error).finally(() => prisma.$disconnect());
