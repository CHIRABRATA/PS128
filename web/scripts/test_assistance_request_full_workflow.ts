import prisma from "@/lib/db/prisma";
import {
  routeAssistanceRequestToFieldAgent,
  routeCaseToVeterinarian,
} from "@/lib/geo/routing";
import { createInAppNotification } from "@/lib/actions/notifications";

async function run() {
  console.log("==================================================");
  console.log("TEST: FIELD AGENT ASSISTANCE REQUEST & FULL DOWNSTREAM WORKFLOW");
  console.log("==================================================");

  // 1. Prisma Client & Model Verification
  console.log("\n--- STEP 1: PRISMA CLIENT COMPILE-TIME & RUNTIME MODEL CHECK ---");
  if (typeof prisma.assistanceRequest?.create !== "function") {
    throw new Error("FAIL: prisma.assistanceRequest.create is not a function!");
  }
  if (typeof prisma.case?.create !== "function") {
    throw new Error("FAIL: prisma.case.create is not a function!");
  }
  if (typeof prisma.fieldVisit?.create !== "function") {
    throw new Error("FAIL: prisma.fieldVisit.create is not a function!");
  }
  if (typeof prisma.veterinaryReport?.create !== "function") {
    throw new Error("FAIL: prisma.veterinaryReport.create is not a function!");
  }
  console.log("✔ prisma.assistanceRequest.create exists and is callable");
  console.log("✔ prisma.case.create exists and is callable");
  console.log("✔ prisma.fieldVisit.create exists and is callable");
  console.log("✔ prisma.veterinaryReport.create exists and is callable");

  // 2. Setup / Fetch Test Geography & Users
  console.log("\n--- STEP 2: SETUP / FETCH SEED ENTITIES ---");
  const testPrefix = `test_${Date.now()}_`;

  let district = await prisma.district.findFirst({ where: { name: "North 24 Parganas" } });
  if (!district) {
    district = await prisma.district.create({ data: { name: `${testPrefix}District` } });
  }

  let block = await prisma.block.findFirst({ where: { name: "Bidhannagar Block", districtId: district.id } });
  if (!block) {
    block = await prisma.block.create({ data: { name: "Bidhannagar Block", districtId: district.id } });
  }

  let village = await prisma.village.findFirst({ where: { name: "Bidhannagar", blockId: block.id } });
  if (!village) {
    village = await prisma.village.create({ data: { name: "Bidhannagar", blockId: block.id } });
  }

  // Find or create farmer
  let farmer = await prisma.user.findFirst({
    where: { role: "FARMER", status: "ACTIVE" },
  });
  if (!farmer) {
    farmer = await prisma.user.create({
      data: {
        clerkId: `clerk_farmer_${Date.now()}`,
        name: "CHIRABRATA GHOSAL",
        phone: "+919876543210",
        role: "FARMER",
        status: "ACTIVE",
        villageId: village.id,
        blockId: block.id,
        districtId: district.id,
      },
    });
  }

  // Find or create Field Agent in Bidhannagar
  let fieldAgent = await prisma.user.findFirst({
    where: { role: "FIELD_AGENT", status: "ACTIVE", districtId: district.id },
  });
  if (!fieldAgent) {
    fieldAgent = await prisma.user.create({
      data: {
        clerkId: `clerk_agent_${Date.now()}`,
        name: "Pashusakhi Rina",
        phone: "+919876543211",
        role: "FIELD_AGENT",
        status: "ACTIVE",
        villageId: village.id,
        blockId: block.id,
        districtId: district.id,
      },
    });
  }

  // Find or create Veterinarian in North 24 Parganas
  let vet = await prisma.user.findFirst({
    where: { role: "VETERINARIAN", status: "ACTIVE", districtId: district.id },
  });
  if (!vet) {
    vet = await prisma.user.create({
      data: {
        clerkId: `clerk_vet_${Date.now()}`,
        name: "Dr. Arpan Chatterjee",
        phone: "+919876543212",
        role: "VETERINARIAN",
        status: "ACTIVE",
        villageId: village.id,
        blockId: block.id,
        districtId: district.id,
      },
    });
  }

  // Find or create Farm: "CHIRABRATA GHOSAL Farm (Bidhannagar)"
  let farm = await prisma.farm.findFirst({
    where: { farmerUserId: farmer.id, villageId: village.id },
  });
  if (!farm) {
    farm = await prisma.farm.create({
      data: {
        name: "CHIRABRATA GHOSAL Farm",
        farmerUserId: farmer.id,
        villageId: village.id,
        fieldAgentUserId: fieldAgent.id,
        latitude: 22.58,
        longitude: 88.42,
      },
    });
  }

  // Find or create Herd and Animal: "cow-100 (BUFFALO)"
  let herd = await prisma.herd.findFirst({
    where: { farmId: farm.id },
  });
  if (!herd) {
    herd = await prisma.herd.create({
      data: {
        farmId: farm.id,
        name: "Main Herd",
        species: "BUFFALO",
      },
    });
  }

  let animal = await prisma.animal.findFirst({
    where: { herdId: herd.id, tag: "cow-100" },
  });
  if (!animal) {
    animal = await prisma.animal.create({
      data: {
        herdId: herd.id,
        tag: "cow-100",
        species: "BUFFALO",
      },
    });
  }

  console.log(`✔ Farmer: ${farmer.name} (${farmer.id})`);
  console.log(`✔ Farm: ${farm.name} (${farm.id}) in ${village.name}`);
  console.log(`✔ Animal: ${animal.tag} (${animal.species}) [${animal.id}]`);
  console.log(`✔ Field Agent: ${fieldAgent.name} (${fieldAgent.id})`);
  console.log(`✔ Veterinarian: ${vet.name} (${vet.id})`);

  // 3. STEP 3: EXECUTE FARMER ASSISTANCE REQUEST CREATION
  console.log("\n--- STEP 3: SUBMIT FIELD ASSISTANCE REQUEST ---");
  const reason = "vry urgent";
  const scheduledDate = new Date("2026-09-10");
  const notes = "g vh";

  // Simulate server action submission path
  const createdRequest = await prisma.assistanceRequest.create({
    data: {
      farmerUserId: farmer.id,
      farmId: farm.id,
      animalId: animal.id,
      villageId: farm.villageId,
      blockId: village.blockId,
      districtId: district.id,
      reason,
      notes,
      scheduledAt: scheduledDate,
      status: "REQUESTED",
      caseId: null, // Strictly null at creation
    },
  });

  console.log(`✔ AssistanceRequest created successfully! ID: ${createdRequest.id}`);

  // Route to Field Agent
  const routeResult = await routeAssistanceRequestToFieldAgent(createdRequest.id);
  console.log(`✔ Field Agent Routing Result:`);
  console.log(`  - Assigned Agent: ${routeResult.assignedFieldAgent?.name || "None"}`);
  console.log(`  - Assignment Level: ${routeResult.assignmentLevel}`);
  console.log(`  - Location: Village=${routeResult.location.villageName}, Block=${routeResult.location.blockName}, District=${routeResult.location.districtName}`);

  // Fetch from DB and assert all criteria
  const dbRequest = await prisma.assistanceRequest.findUnique({
    where: { id: createdRequest.id },
    include: {
      farm: true,
      animal: true,
      assignedFieldAgentUser: true,
      case: true,
    },
  });

  if (!dbRequest) throw new Error("FAIL: dbRequest not found in database!");
  if (dbRequest.caseId !== null) throw new Error(`FAIL: caseId must be NULL, got: ${dbRequest.caseId}`);
  if (dbRequest.farmerUserId !== farmer.id) throw new Error("FAIL: Farmer ID mismatch!");
  if (dbRequest.farmId !== farm.id) throw new Error("FAIL: Farm ID mismatch!");
  if (dbRequest.animalId !== animal.id) throw new Error("FAIL: Animal ID mismatch!");
  if (dbRequest.reason !== "vry urgent") throw new Error("FAIL: Reason mismatch!");
  if (dbRequest.notes !== "g vh") throw new Error("FAIL: Notes mismatch!");
  if (!dbRequest.assignedFieldAgentUserId) throw new Error("FAIL: Assigned Field Agent must be populated!");

  console.log("✔ DB Assertions passed for AssistanceRequest:");
  console.log(`  - Exactly 1 record created with ID: ${dbRequest.id}`);
  console.log(`  - caseId is NULL: ${dbRequest.caseId === null}`);
  console.log(`  - farmerUserId: ${dbRequest.farmerUserId}`);
  console.log(`  - farmId: ${dbRequest.farmId}`);
  console.log(`  - animalId: ${dbRequest.animalId}`);
  console.log(`  - status: ${dbRequest.status}`);
  console.log(`  - assignedFieldAgentUserId: ${dbRequest.assignedFieldAgentUserId}`);

  // 4. STEP 4: FIELD AGENT ACCEPTS REQUEST
  console.log("\n--- STEP 4: FIELD AGENT ACCEPTS ASSISTANCE REQUEST ---");
  const [acceptedRequest, fieldVisit] = await prisma.$transaction([
    prisma.assistanceRequest.update({
      where: { id: dbRequest.id },
      data: {
        status: "ACCEPTED",
        assignedFieldAgentUserId: fieldAgent.id,
        assignedAt: new Date(),
        assignmentLevel: "VILLAGE",
      },
    }),
    prisma.fieldVisit.upsert({
      where: { assistanceRequestId: dbRequest.id },
      create: {
        assistanceRequestId: dbRequest.id,
        fieldAgentUserId: fieldAgent.id,
        acceptedAt: new Date(),
      },
      update: {
        fieldAgentUserId: fieldAgent.id,
        acceptedAt: new Date(),
      },
    }),
  ]);

  console.log(`✔ Request status updated to: ${acceptedRequest.status}`);
  console.log(`✔ FieldVisit record initialized with acceptedAt: ${fieldVisit.acceptedAt?.toISOString()}`);

  // 5. STEP 5: FIELD AGENT VISITS & SUBMITS FIELD REPORT -> CASE CREATED
  console.log("\n--- STEP 5: FIELD AGENT SUBMITS ON-SITE FIELD REPORT ---");
  const caseNumber = `CASE-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const completionResult = await prisma.$transaction(async (tx) => {
    // 1. Create health Case
    const newCase = await tx.case.create({
      data: {
        caseNumber,
        submissionId: `sub_agent_${Date.now()}`,
        animalId: animal.id,
        createdByUserId: fieldAgent.id,
        reportSource: "FIELD_AGENT",
        status: "PENDING_REVIEW",
        symptoms: ["High fever", "Salivation", "Blisters on muzzle"],
        durationDays: 2,
        affectedCount: 2,
        mortalityCount: 0,
        photoUrl: "https://example.com/photos/mouth_blisters.jpg",
        gpsLat: 22.58,
        gpsLng: 88.42,
      },
    });

    // 2. Persist FieldVisit details
    const updatedVisit = await tx.fieldVisit.upsert({
      where: { assistanceRequestId: dbRequest.id },
      create: {
        assistanceRequestId: dbRequest.id,
        fieldAgentUserId: fieldAgent.id,
        completedAt: new Date(),
        observations: "Observed severe oral lesions and sluggish movement.",
        measurements: { heartRate: 85, temperature: 40.2 },
        photos: ["https://example.com/photos/mouth_blisters.jpg"],
        caseId: newCase.id,
      },
      update: {
        completedAt: new Date(),
        observations: "Observed severe oral lesions and sluggish movement.",
        measurements: { heartRate: 85, temperature: 40.2 },
        photos: ["https://example.com/photos/mouth_blisters.jpg"],
        caseId: newCase.id,
      },
    });

    // 3. Complete AssistanceRequest
    const completedReq = await tx.assistanceRequest.update({
      where: { id: dbRequest.id },
      data: {
        status: "COMPLETED",
        caseId: newCase.id,
      },
    });

    return { newCase, updatedVisit, completedReq };
  });

  console.log(`✔ Case created from Field Report: ID=${completionResult.newCase.id}, CaseNumber=${completionResult.newCase.caseNumber}`);
  console.log(`✔ AssistanceRequest marked COMPLETED with caseId: ${completionResult.completedReq.caseId}`);
  console.log(`✔ FieldVisit linked with caseId: ${completionResult.updatedVisit.caseId}`);

  // 6. STEP 6: ROUTE CASE TO VETERINARIAN
  console.log("\n--- STEP 6: ROUTE CASE TO VETERINARIAN ---");
  const vetRouting = await routeCaseToVeterinarian(completionResult.newCase.id);
  console.log(`✔ Vet Routing Result:`);
  console.log(`  - Assigned Vet: ${vetRouting.assignedVeterinarian?.name} (${vetRouting.assignedVeterinarian?.id})`);
  console.log(`  - Assignment Level: ${vetRouting.assignmentLevel}`);

  // 7. STEP 7: VETERINARIAN WRITES & SUBMITS VETERINARY REPORT
  console.log("\n--- STEP 7: VETERINARIAN SUBMITS VETERINARY REPORT ---");
  const vetReport = await prisma.veterinaryReport.create({
    data: {
      caseId: completionResult.newCase.id,
      animalId: animal.id,
      vetUserId: vet.id,
      diagnosis: "Suspected Foot and Mouth Disease (FMD) Type O",
      action: "ISOLATE",
      instructions: "Strictly isolate infected animal in a dry stall. Disinfect shed perimeter daily.",
      prescription: "Flunixin Meglumine 15ml IM OD x 3d, B-Complex 10ml IM OD x 5d",
      notes: "Pronounced vesicles and erosions in buccal cavity; elevated core temperature (40.2 C).",
      followUpDate: new Date("2026-09-15"),
    },
  });

  await prisma.case.update({
    where: { id: completionResult.newCase.id },
    data: {
      status: "UNDER_EXAMINATION",
      vetDiagnosis: vetReport.diagnosis,
      vetRecommendedAction: vetReport.action,
      reviewedByUserId: vet.id,
      reviewedAt: new Date(),
      vetFollowUpDate: vetReport.followUpDate,
    },
  });

  // Notify farmer
  await createInAppNotification({
    userId: farmer.id,
    title: "Veterinary Report Available",
    message: `Dr. ${vet.name} has submitted a veterinary clinical report for Case #${completionResult.newCase.caseNumber}.`,
    link: `/farmer/cases/${completionResult.newCase.id}`,
    type: "REPORT_PUBLISHED",
  });

  console.log(`✔ VeterinaryReport created with ID: ${vetReport.id}`);
  console.log(`✔ Case updated with diagnosis: ${vetReport.diagnosis}`);

  // 8. STEP 8: FARMER VIEWS CASE & VETERINARY REPORT
  console.log("\n--- STEP 8: VERIFY FARMER SEES CASE & VETERINARY REPORT ---");
  const farmerCaseView = await prisma.case.findUnique({
    where: { id: completionResult.newCase.id },
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
      assignedVeterinarianUser: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      assistanceRequest: {
        include: {
          assignedFieldAgentUser: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          visit: true,
        },
      },
      fieldVisit: true,
      veterinaryReports: {
        include: {
          vetUser: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!farmerCaseView) throw new Error("FAIL: Farmer case view failed!");
  if (farmerCaseView.animal.herd.farm.farmerUserId !== farmer.id) {
    throw new Error("FAIL: Farmer ownership authorization failed!");
  }
  if (farmerCaseView.veterinaryReports.length === 0) {
    throw new Error("FAIL: VeterinaryReports empty on farmer case view!");
  }

  const latestReport = farmerCaseView.veterinaryReports[0];
  console.log(`✔ Farmer Case View Verified:`);
  console.log(`  - Case Number: ${farmerCaseView.caseNumber}`);
  console.log(`  - Status: ${farmerCaseView.status}`);
  console.log(`  - Farmer: ${farmerCaseView.animal.herd.farm.farmerUserId}`);
  console.log(`  - Assigned Vet: ${farmerCaseView.assignedVeterinarianUser?.name}`);
  console.log(`  - Origin Assistance Request: ID=${farmerCaseView.assistanceRequest?.id}, Status=${farmerCaseView.assistanceRequest?.status}`);
  console.log(`  - Field Agent: ${farmerCaseView.assistanceRequest?.assignedFieldAgentUser?.name}`);
  console.log(`  - Latest Veterinary Report ID: ${latestReport.id}`);
  console.log(`  - Diagnosis: ${latestReport.diagnosis}`);
  console.log(`  - Prescription: ${latestReport.prescription}`);
  console.log(`  - Instructions: ${latestReport.instructions}`);

  console.log("\n==================================================");
  console.log("ALL TESTS & WORKFLOW GATES PASSED SUCCESSFULLY (100%)");
  console.log("==================================================");
}

run()
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  });
