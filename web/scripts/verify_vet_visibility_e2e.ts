import prisma from "../lib/db/prisma";

async function verifyFarmerReportToVetDashboard() {
  console.log("=== STEP 1: VERIFY LIVE REPORT ROUTING TO VET QUEUE ===");

  try {
    // 1. Ensure District, Block, Village exist
    let district = await prisma.district.findFirst({
      where: { name: "Pune E2E District" },
    });
    if (!district) {
      district = await prisma.district.create({
        data: { name: "Pune E2E District" },
      });
    }

    let block = await prisma.block.findFirst({
      where: { name: "Haveli E2E Block", districtId: district.id },
    });
    if (!block) {
      block = await prisma.block.create({
        data: { name: "Haveli E2E Block", districtId: district.id },
      });
    }

    let village = await prisma.village.findFirst({
      where: { name: "Wagholi E2E Village", blockId: block.id },
    });
    if (!village) {
      village = await prisma.village.create({
        data: { name: "Wagholi E2E Village", blockId: block.id },
      });
    }

    // 2. Ensure Farmer User & Active Veterinarian User exist
    let farmer = await prisma.user.findFirst({
      where: { role: "FARMER", phone: "9900000001" },
    });
    if (!farmer) {
      farmer = await prisma.user.create({
        data: {
          clerkId: "clerk_farmer_e2e_" + Date.now(),
          name: "Ramesh Farmer",
          phone: "9900000001",
          role: "FARMER",
          status: "ACTIVE",
          districtId: district.id,
          blockId: block.id,
          villageId: village.id,
        },
      });
    }

    let vet = await prisma.user.findFirst({
      where: { role: "VETERINARIAN", phone: "9900000002" },
    });
    if (!vet) {
      vet = await prisma.user.create({
        data: {
          clerkId: "clerk_vet_e2e_" + Date.now(),
          name: "Dr. Kulkarni",
          phone: "9900000002",
          role: "VETERINARIAN",
          status: "ACTIVE",
          districtId: district.id,
          blockId: block.id,
          villageId: village.id,
        },
      });
    } else {
      // Ensure vet is active and in the village
      vet = await prisma.user.update({
        where: { id: vet.id },
        data: {
          status: "ACTIVE",
          districtId: district.id,
          blockId: block.id,
          villageId: village.id,
        },
      });
    }

    // 3. Ensure Farm and Animal exist
    let farm = await prisma.farm.findFirst({
      where: { farmerUserId: farmer.id, villageId: village.id },
    });
    if (!farm) {
      farm = await prisma.farm.create({
        data: {
          name: "Kulkarni Dairy Farm",
          farmerUserId: farmer.id,
          villageId: village.id,
          latitude: 18.5204,
          longitude: 73.8567,
        },
      });
    }

    let herd = await prisma.herd.findFirst({
      where: { farmId: farm.id },
    });
    if (!herd) {
      herd = await prisma.herd.create({
        data: {
          farmId: farm.id,
          species: "COW",
          name: "Milking Herd",
        },
      });
    }

    const tag = "ANIMAL-E2E-" + Math.floor(1000 + Math.random() * 9000);
    const animal = await prisma.animal.create({
      data: {
        herdId: herd.id,
        tag,
        species: "COW",
        breed: "Gir",
        ageMonths: 36,
      },
    });

    // 4. Create Case (Simulate Farmer Report Submission)
    const submissionId = "sub_e2e_" + Date.now();
    const caseNumber = `CASE-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        submissionId,
        animalId: animal.id,
        createdByUserId: farmer.id,
        reportSource: "FARMER",
        status: "PENDING_REVIEW",
        symptoms: ["High fever", "Blisters on mouth"],
        durationDays: 2,
        affectedCount: 1,
        mortalityCount: 0,
      },
    });

    // 5. Execute Routing
    const { routeCaseToVeterinarian } = await import("../lib/geo/routing");
    const routeResult = await routeCaseToVeterinarian(newCase.id);
    console.log("Routing completed:", routeResult.assignmentLevel, "Level");

    // 6. Query Case immediately after submission from database
    const savedCase = await prisma.case.findUnique({
      where: { id: newCase.id },
      select: {
        id: true,
        caseNumber: true,
        createdByUserId: true,
        animalId: true,
        status: true,
        assignedVeterinarianUserId: true,
        assignmentLevel: true,
        assignedAt: true,
        animal: {
          select: {
            herd: {
              select: {
                farm: {
                  select: {
                    villageId: true,
                    village: {
                      select: {
                        blockId: true,
                        block: {
                          select: {
                            districtId: true,
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

    // SAFE DEBUG OBJECT
    const safeDebugObject = {
      caseId: savedCase?.id,
      caseNumber: savedCase?.caseNumber,
      farmerUserId: savedCase?.createdByUserId,
      animalId: savedCase?.animalId,
      caseVillageId: savedCase?.animal.herd.farm.villageId,
      caseBlockId: savedCase?.animal.herd.farm.village.blockId,
      caseDistrictId: savedCase?.animal.herd.farm.village.block.districtId,
      caseStatus: savedCase?.status,
      assignedVeterinarianUserId: savedCase?.assignedVeterinarianUserId,
      assignmentLevel: savedCase?.assignmentLevel,
      targetVetId: vet.id,
    };

    console.log("SAFE DEBUG OBJECT:", JSON.stringify(safeDebugObject, null, 2));

    if (savedCase?.status !== "PENDING_REVIEW") {
      throw new Error(`Expected Case.status to be PENDING_REVIEW, got: ${savedCase?.status}`);
    }

    if (savedCase?.assignedVeterinarianUserId !== vet.id) {
      throw new Error(
        `Expected assignedVeterinarianUserId to be ${vet.id}, got: ${savedCase?.assignedVeterinarianUserId}`
      );
    }

    if (savedCase?.assignmentLevel !== "VILLAGE") {
      throw new Error(`Expected assignmentLevel to be VILLAGE, got: ${savedCase?.assignmentLevel}`);
    }

    // 7. Verify InAppNotification for Vet
    const notif = await prisma.inAppNotification.findFirst({
      where: {
        userId: vet.id,
        link: `/vet/cases/${savedCase.id}`,
      },
    });

    if (!notif) {
      throw new Error(`Missing InAppNotification for assigned veterinarian ${vet.id}`);
    }
    console.log("✓ InAppNotification verified for assigned vet:", notif.title);

    // 8. Verify Assigned Scope Query (Simulating getVetQueueAction for authenticated vet)
    const assignedCases = await prisma.case.findMany({
      where: {
        assignedVeterinarianUserId: vet.id,
        status: {
          in: ["PENDING_REVIEW", "UNDER_EXAMINATION", "LAB_REFERRAL"],
        },
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
        assignedVeterinarianUser: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    const foundInQueue = assignedCases.some((c) => c.id === savedCase.id);
    if (!foundInQueue) {
      throw new Error(`Newly assigned Case ${savedCase.id} was NOT found in getVetQueueAction('assigned') query!`);
    }

    console.log(`✓ Case #${savedCase.caseNumber} successfully retrieved in /vet assigned queue!`);
    console.log("=== STEP 1 VERIFICATION COMPLETED SUCCESSFULLY ===");
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFarmerReportToVetDashboard();
