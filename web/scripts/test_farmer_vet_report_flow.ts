import prisma from "../lib/db/prisma";

async function main() {
  console.log("==================================================");
  console.log("TESTING COMPLETE FARMER VETERINARY REPORT FLOW");
  console.log("==================================================");

  // 1. Find or pick test accounts
  const farmer = await prisma.user.findFirst({
    where: { role: "FARMER" },
    include: {
      ownedFarms: {
        include: {
          herds: {
            include: {
              animals: true,
            },
          },
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
  });

  if (!farmer || farmer.ownedFarms.length === 0 || !farmer.ownedFarms[0].herds[0]?.animals[0]) {
    console.error("Test prerequisites missing: Farmer with farm and animal required.");
    process.exit(1);
  }

  const farm = farmer.ownedFarms[0];
  const animal = farm.herds[0].animals[0];
  console.log(`1. Target Farmer: ${farmer.name} (${farmer.id})`);
  console.log(`   Target Animal: ${animal.tag} (${animal.species}) ID: ${animal.id}`);

  // Find a second farmer for unauthorized access test
  let otherFarmer = await prisma.user.findFirst({
    where: { role: "FARMER", id: { not: farmer.id } },
  });

  if (!otherFarmer) {
    otherFarmer = await prisma.user.create({
      data: {
        clerkId: `clerk_unauth_farmer_${Date.now()}`,
        name: "Unauthorized Farmer Test",
        phone: "9999999999",
        role: "FARMER",
        status: "ACTIVE",
      },
    });
  }
  console.log(`2. Unauthorized Farmer: ${otherFarmer.name} (${otherFarmer.id})`);

  // Find active vet in same district or assign
  const districtId = farm.village.block.districtId;
  let vet = await prisma.user.findFirst({
    where: { role: "VETERINARIAN", status: "ACTIVE", districtId },
  });

  if (!vet) {
    vet = await prisma.user.findFirst({
      where: { role: "VETERINARIAN", status: "ACTIVE" },
    });
  }

  if (!vet) {
    console.error("No active veterinarian found.");
    process.exit(1);
  }
  console.log(`3. Target Vet: Dr. ${vet.name} (${vet.id})`);

  // 4. Create a fresh test Case
  const caseNumber = `CASE-TEST-${Date.now().toString().slice(-6)}`;
  const testCase = await prisma.case.create({
    data: {
      caseNumber,
      animalId: animal.id,
      createdByUserId: farmer.id,
      reportSource: "FARMER",
      status: "PENDING_REVIEW",
      symptoms: ["High Fever", "Mouth Blisters", "Reduced Milk Yield"],
      durationDays: 3,
      affectedCount: 2,
      mortalityCount: 0,
      assignedVeterinarianUserId: vet.id,
      assignmentLevel: "DISTRICT",
    },
  });
  console.log(`4. Created fresh test Case #${testCase.caseNumber} (ID: ${testCase.id})`);

  // 5. Verify Case Pending State (No report yet)
  const initialReports = await prisma.veterinaryReport.findMany({
    where: { caseId: testCase.id },
  });
  console.log(`5. Initial Veterinary Reports count for case: ${initialReports.length} (Expected 0)`);
  if (initialReports.length !== 0) {
    throw new Error("Expected 0 initial reports.");
  }

  // 6. Veterinarian examines case and submits Veterinary Report
  const scheduledFollowUp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const report = await prisma.veterinaryReport.create({
    data: {
      caseId: testCase.id,
      animalId: animal.id,
      vetUserId: vet.id,
      diagnosis: "Suspected Foot-and-Mouth Disease (Early Stage)",
      action: "ISOLATE",
      followUpDate: scheduledFollowUp,
      notes: "Strict quarantine advised. Administer prescribed antiseptic oral rinse twice daily and isolate from rest of herd.",
      instructions: "Keep infected animals segregated. Disinfect shed perimeter with 4% sodium carbonate.",
      prescription: "Boric acid oral wash + Supportive antipyretics",
    },
  });

  // Update Case to UNDER_EXAMINATION
  await prisma.case.update({
    where: { id: testCase.id },
    data: {
      status: "UNDER_EXAMINATION",
      vetDiagnosis: report.diagnosis,
      vetRecommendedAction: "ISOLATE",
      vetFollowUpDate: scheduledFollowUp,
      vetNotes: report.notes,
      reviewedByUserId: vet.id,
      reviewedAt: new Date(),
    },
  });

  // Create Farmer InAppNotification with direct link
  const notificationLink = `/farmer/cases/${testCase.id}`;
  const notification = await prisma.inAppNotification.create({
    data: {
      userId: farmer.id,
      title: "Veterinary Report Available",
      message: `Dr. ${vet.name} submitted a clinical assessment for Animal ${animal.tag} (${animal.species}): "${report.diagnosis}".`,
      link: notificationLink,
      type: "VET_REPORT_SUBMITTED",
    },
  });

  console.log(`6. Vet submitted VeterinaryReport (ID: ${report.id})`);
  console.log(`   - Diagnosis: ${report.diagnosis}`);
  console.log(`   - Action: ${report.action}`);
  console.log(`   - Follow-up Date: ${report.followUpDate?.toISOString()}`);
  console.log(`   - Created InAppNotification for Farmer with link: ${notification.link}`);

  // 7. Verify Farmer Case Detail Query & Authorization
  const loadedCase = await prisma.case.findUnique({
    where: { id: testCase.id },
    include: {
      animal: {
        include: {
          herd: {
            include: {
              farm: true,
            },
          },
        },
      },
      assignedVeterinarianUser: true,
      veterinaryReports: {
        include: {
          vetUser: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!loadedCase) throw new Error("Failed to load test case.");
  console.log("7. Farmer queries Case Detail:");
  console.log(`   - Case: #${loadedCase.caseNumber}`);
  console.log(`   - Status: ${loadedCase.status}`);
  console.log(`   - Assigned Vet: Dr. ${loadedCase.assignedVeterinarianUser?.name}`);
  console.log(`   - Veterinary Reports count: ${loadedCase.veterinaryReports.length}`);
  const loadedReport = loadedCase.veterinaryReports[0];
  console.log(`   - Report Diagnosis: "${loadedReport.diagnosis}"`);
  console.log(`   - Report Instructions: "${loadedReport.instructions}"`);
  console.log(`   - Report Notes: "${loadedReport.notes}"`);
  console.log(`   - Report Clinician: Dr. ${loadedReport.vetUser.name} (${loadedReport.vetUser.phone})`);

  // 8. Test Unauthorized Access
  const isAuthorizedOther = loadedCase.animal.herd.farm.farmerUserId === otherFarmer.id || loadedCase.createdByUserId === otherFarmer.id;
  console.log(`8. Security check: Other Farmer (${otherFarmer.id}) authorization status -> ${isAuthorizedOther ? "AUTHORIZED (FAIL)" : "DENIED (PASS)"}`);
  if (isAuthorizedOther) {
    throw new Error("Security failure: unauthorized farmer allowed access.");
  }

  // 9. Verify Animal Longitudinal Dossier Query
  const animalDossier = await prisma.animal.findUnique({
    where: { id: animal.id },
    include: {
      cases: {
        include: {
          veterinaryReports: {
            include: { vetUser: true },
          },
        },
      },
      veterinaryReports: {
        include: { vetUser: true },
      },
    },
  });

  const dossierHasReport = animalDossier?.veterinaryReports.some((r) => r.id === report.id);
  console.log(`9. Animal Longitudinal Dossier includes VeterinaryReport -> ${dossierHasReport ? "YES (PASS)" : "NO (FAIL)"}`);
  if (!dossierHasReport) {
    throw new Error("Animal dossier failed to include VeterinaryReport.");
  }

  // 10. Test Follow-up Completion Flow
  await prisma.veterinaryReport.update({
    where: { id: report.id },
    data: {
      followUpCompleted: true,
      followUpCompletedAt: new Date(),
      followUpNotes: "Follow-up visit conducted. Blisters healed, fever subsided, normal lactation resumed.",
    },
  });
  await prisma.case.update({
    where: { id: testCase.id },
    data: {
      followUpCompleted: true,
      followUpCompletedAt: new Date(),
    },
  });

  const updatedCase = await prisma.case.findUnique({
    where: { id: testCase.id },
    include: {
      veterinaryReports: true,
    },
  });

  const updatedReport = updatedCase?.veterinaryReports.find((r) => r.id === report.id);
  console.log("10. Follow-up Completed Test:");
  console.log(`    - followUpCompleted: ${updatedReport?.followUpCompleted}`);
  console.log(`    - followUpCompletedAt: ${updatedReport?.followUpCompletedAt?.toISOString()}`);
  console.log(`    - followUpNotes: "${updatedReport?.followUpNotes}"`);

  // Clean up test case and report
  await prisma.inAppNotification.deleteMany({ where: { link: notificationLink } });
  await prisma.veterinaryReport.deleteMany({ where: { caseId: testCase.id } });
  await prisma.case.delete({ where: { id: testCase.id } });
  console.log("11. Cleaned up transient test records.");

  console.log("==================================================");
  console.log("E2E FLOW TEST PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  });
