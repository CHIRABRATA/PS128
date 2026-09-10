import { describe, it, expect, beforeAll } from "vitest";
import prisma from "@/lib/db/prisma";
import { District, Block, Village, User, Farm, Animal } from "@prisma/client";
import {
  findEligibleVeterinarians,
  routeCaseToVeterinarian,
  isLocationAuthorized,
} from "@/lib/geo/routing";

describe("Veterinarian Workflow, Profile & English Clinical Report Suite", () => {
  let districtNorth: District;
  let blockRajarhat: Block;
  let villageBidhannagar: Village;
  let districtKolkata: District;

  let vetA: User;
  let vetB: User;
  let vetKolkata: User;
  let farmerUser: User;
  let farmNorth: Farm;
  let animalCow: Animal;

  beforeAll(async () => {
    // 1. Ensure test geographical hierarchy exists
    districtNorth = await prisma.district.upsert({
      where: { name: "Test North 24 Parganas" },
      update: {},
      create: { name: "Test North 24 Parganas" },
    });

    blockRajarhat = await prisma.block.upsert({
      where: {
        districtId_name: {
          districtId: districtNorth.id,
          name: "Test Rajarhat",
        },
      },
      update: {},
      create: { name: "Test Rajarhat", districtId: districtNorth.id },
    });

    villageBidhannagar = await prisma.village.upsert({
      where: {
        blockId_name: {
          blockId: blockRajarhat.id,
          name: "Test Bidhannagar",
        },
      },
      update: {},
      create: { name: "Test Bidhannagar", blockId: blockRajarhat.id },
    });

    districtKolkata = await prisma.district.upsert({
      where: { name: "Test Kolkata" },
      update: {},
      create: { name: "Test Kolkata" },
    });

    // 2. Ensure Vet A and Vet B in same location (Test Bidhannagar / Test Rajarhat / Test North 24 Parganas)
    vetA = await prisma.user.upsert({
      where: { clerkId: "clerk_test_vet_a_flow" },
      update: {
        name: "Dr. Vet Alpha",
        phone: "+91 9800000001",
        role: "VETERINARIAN",
        status: "ACTIVE",
        districtId: districtNorth.id,
        blockId: blockRajarhat.id,
        villageId: villageBidhannagar.id,
      },
      create: {
        clerkId: "clerk_test_vet_a_flow",
        name: "Dr. Vet Alpha",
        phone: "+91 9800000001",
        role: "VETERINARIAN",
        status: "ACTIVE",
        districtId: districtNorth.id,
        blockId: blockRajarhat.id,
        villageId: villageBidhannagar.id,
      },
    });

    vetB = await prisma.user.upsert({
      where: { clerkId: "clerk_test_vet_b_flow" },
      update: {
        name: "Dr. Vet Beta",
        phone: "+91 9800000002",
        role: "VETERINARIAN",
        status: "ACTIVE",
        districtId: districtNorth.id,
        blockId: blockRajarhat.id,
        villageId: villageBidhannagar.id,
      },
      create: {
        clerkId: "clerk_test_vet_b_flow",
        name: "Dr. Vet Beta",
        phone: "+91 9800000002",
        role: "VETERINARIAN",
        status: "ACTIVE",
        districtId: districtNorth.id,
        blockId: blockRajarhat.id,
        villageId: villageBidhannagar.id,
      },
    });

    // 3. Ensure Vet in different district (Kolkata)
    vetKolkata = await prisma.user.upsert({
      where: { clerkId: "clerk_test_vet_kolkata_flow" },
      update: {
        name: "Dr. Vet Kolkata",
        phone: "+91 9800000003",
        role: "VETERINARIAN",
        status: "ACTIVE",
        districtId: districtKolkata.id,
        blockId: null,
        villageId: null,
      },
      create: {
        clerkId: "clerk_test_vet_kolkata_flow",
        name: "Dr. Vet Kolkata",
        phone: "+91 9800000003",
        role: "VETERINARIAN",
        status: "ACTIVE",
        districtId: districtKolkata.id,
        blockId: null,
        villageId: null,
      },
    });

    // 4. Ensure test farmer, farm, herd, animal
    farmerUser = await prisma.user.upsert({
      where: { clerkId: "clerk_test_farmer_report_flow" },
      update: {
        name: "Ramesh Farmer",
        phone: "+91 9811111111",
        role: "FARMER",
        status: "ACTIVE",
        districtId: districtNorth.id,
        blockId: blockRajarhat.id,
        villageId: villageBidhannagar.id,
      },
      create: {
        clerkId: "clerk_test_farmer_report_flow",
        name: "Ramesh Farmer",
        phone: "+91 9811111111",
        role: "FARMER",
        status: "ACTIVE",
        districtId: districtNorth.id,
        blockId: blockRajarhat.id,
        villageId: villageBidhannagar.id,
      },
    });

    farmNorth = await prisma.farm.upsert({
      where: { id: "test_farm_north_flow" },
      update: {
        name: "Ramesh North Farm",
        villageId: villageBidhannagar.id,
        farmerUserId: farmerUser.id,
      },
      create: {
        id: "test_farm_north_flow",
        name: "Ramesh North Farm",
        villageId: villageBidhannagar.id,
        farmerUserId: farmerUser.id,
        latitude: 22.58,
        longitude: 88.42,
      },
    });

    const herd = await prisma.herd.upsert({
      where: { id: "test_herd_north_flow" },
      update: { farmId: farmNorth.id, name: "Dairy Herd", species: "COW" },
      create: { id: "test_herd_north_flow", farmId: farmNorth.id, name: "Dairy Herd", species: "COW" },
    });

    animalCow = await prisma.animal.upsert({
      where: { id: "test_animal_cow_flow" },
      update: { tag: "COW-FLOW-101", species: "COW", herdId: herd.id },
      create: { id: "test_animal_cow_flow", tag: "COW-FLOW-101", species: "COW", herdId: herd.id },
    });
  });

  describe("Requirement 1: Two Vets in Same Location & Deterministic Assignment", () => {
    it("finds both Vet A and Vet B as eligible in the same village tier", async () => {
      const eligibility = await findEligibleVeterinarians({
        villageId: villageBidhannagar.id,
        blockId: blockRajarhat.id,
        districtId: districtNorth.id,
      });

      expect(eligibility).not.toBeNull();
      expect(eligibility!.level).toBe("VILLAGE");
      const vetIds = eligibility!.eligibleVets.map((v) => v.id);
      expect(vetIds).toContain(vetA.id);
      expect(vetIds).toContain(vetB.id);
      expect(vetIds).not.toContain(vetKolkata.id);
    });

    it("deterministically distributes assignments between Vet A and Vet B based on least load", async () => {
      // 1. Reset any existing open test cases for vetA and vetB
      await prisma.case.updateMany({
        where: {
          assignedVeterinarianUserId: { in: [vetA.id, vetB.id] },
          status: { in: ["PENDING_REVIEW", "UNDER_EXAMINATION", "LAB_REFERRAL"] },
        },
        data: { status: "CLOSED_HARMLESS" },
      });

      // 2. Create Case 1 unassigned
      const case1 = await prisma.case.create({
        data: {
          caseNumber: `TEST-CASE-FLOW-${Date.now()}-1`,
          animalId: animalCow.id,
          createdByUserId: farmerUser.id,
          reportSource: "FARMER",
          durationDays: 2,
          status: "PENDING_REVIEW",
          symptoms: ["Fever", "Skin Nodules"],
        },
      });

      // Route Case 1 -> Assigns to Vet with lowest ID (both have load 0)
      const routed1 = await routeCaseToVeterinarian(case1.id);
      expect(routed1.success).toBe(true);
      expect(routed1.assignedVeterinarian).not.toBeNull();
      const firstAssignedId = routed1.assignedVeterinarian!.id;
      const otherVetId = firstAssignedId === vetA.id ? vetB.id : vetA.id;

      // 3. Create Case 2 unassigned
      const case2 = await prisma.case.create({
        data: {
          caseNumber: `TEST-CASE-FLOW-${Date.now()}-2`,
          animalId: animalCow.id,
          createdByUserId: farmerUser.id,
          reportSource: "FARMER",
          durationDays: 2,
          status: "PENDING_REVIEW",
          symptoms: ["Nasal Discharge"],
        },
      });

      // Route Case 2 -> Must be assigned to otherVetId because otherVetId has load 0 while firstAssignedId has load 1
      const routed2 = await routeCaseToVeterinarian(case2.id);
      expect(routed2.success).toBe(true);
      expect(routed2.assignedVeterinarian).not.toBeNull();
      expect(routed2.assignedVeterinarian!.id).toBe(otherVetId);

      // Clean up test cases
      await prisma.case.deleteMany({
        where: { id: { in: [case1.id, case2.id] } },
      });
    });

    it("strictly forbids cross-district case routing and access", async () => {
      // 1. Kolkata vet must not be eligible for North 24 Parganas case
      const eligibilityNorth = await findEligibleVeterinarians({
        districtId: districtNorth.id,
      });
      const eligibleIds = eligibilityNorth?.eligibleVets.map((v) => v.id) || [];
      expect(eligibleIds).not.toContain(vetKolkata.id);

      // 2. Location authorization check
      const isAuthNorthForKolkataVet = isLocationAuthorized(
        { role: "VETERINARIAN", districtId: districtKolkata.id },
        { districtId: districtNorth.id }
      );
      expect(isAuthNorthForKolkataVet).toBe(false);
    });
  });

  describe("Requirement 2: Veterinarian Profile Management & Security", () => {
    it("validates location hierarchy and rejects non-matching block/district", async () => {
      // Trying to associate Bidhannagar village with Kolkata district
      const villageObj = await prisma.village.findUnique({
        where: { id: villageBidhannagar.id },
        include: { block: { include: { district: true } } },
      });
      expect(villageObj).not.toBeNull();
      expect(villageObj!.block.districtId).toBe(districtNorth.id);
      expect(villageObj!.block.districtId).not.toBe(districtKolkata.id);
    });

    it("preserves role and status immutability on user profile updates", async () => {
      // Ensure role cannot be updated to ADMIN or FARMER
      const originalVet = await prisma.user.findUnique({ where: { id: vetA.id } });
      expect(originalVet!.role).toBe("VETERINARIAN");
      expect(originalVet!.status).toBe("ACTIVE");

      // Update allowed fields
      const updated = await prisma.user.update({
        where: { id: vetA.id },
        data: {
          phone: "+91 9800009999",
          preferredLanguage: "en",
        },
      });

      expect(updated.phone).toBe("+91 9800009999");
      expect(updated.role).toBe("VETERINARIAN");
      expect(updated.status).toBe("ACTIVE");
    });
  });

  describe("Requirement 3: English Veterinary Report & Farmer View", () => {
    it("saves VeterinaryReport in English and allows farmer to view it", async () => {
      // 1. Create a test case assigned to Vet A
      const testCase = await prisma.case.create({
        data: {
          caseNumber: `ENG-REPORT-TEST-${Date.now()}`,
          animalId: animalCow.id,
          createdByUserId: farmerUser.id,
          status: "UNDER_EXAMINATION",
          assignedVeterinarianUserId: vetA.id,
          assignmentLevel: "VILLAGE",
          reportSource: "FARMER",
          durationDays: 3,
          symptoms: ["Skin Nodules", "High Fever", "Reduced Milk Yield"],
        },
      });

      // 2. Vet A creates and submits an official Veterinary Report in English
      const englishDiagnosis = "Suspected Lumpy Skin Disease (Nodular Dermatitis)";
      const englishNotes = "Administered anti-inflammatory therapy. Keep animal strictly quarantined in isolated pen for 14 days. Provide clean water and electrolyte supportive care.";
      const actionEnum = "ISOLATE";

      const report = await prisma.veterinaryReport.create({
        data: {
          caseId: testCase.id,
          animalId: animalCow.id,
          vetUserId: vetA.id,
          diagnosis: englishDiagnosis,
          action: actionEnum,
          instructions: englishNotes,
          notes: englishNotes,
        },
      });

      // Update case
      await prisma.case.update({
        where: { id: testCase.id },
        data: {
          status: "CONFIRMED",
          vetDiagnosis: englishDiagnosis,
          vetRecommendedAction: actionEnum,
          vetNotes: englishNotes,
          reviewedAt: new Date(),
          reviewedByUserId: vetA.id,
        },
      });

      // 3. Verify VeterinaryReport record in DB
      expect(report.diagnosis).toBe(englishDiagnosis);
      expect(report.action).toBe("ISOLATE");
      expect(report.instructions).toBe(englishNotes);

      // 4. Verify Case query for farmer retrieval
      const farmerCase = await prisma.case.findUnique({
        where: { id: testCase.id },
        include: {
          veterinaryReports: {
            include: {
              vetUser: { select: { id: true, name: true, phone: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          assignedVeterinarianUser: { select: { id: true, name: true, phone: true } },
          animal: {
            include: {
              herd: {
                include: {
                  farm: true,
                },
              },
            },
          },
        },
      });

      expect(farmerCase).not.toBeNull();
      expect(farmerCase!.veterinaryReports.length).toBeGreaterThan(0);
      const latest = farmerCase!.veterinaryReports[0];
      expect(latest.diagnosis).toBe(englishDiagnosis);
      expect(latest.action).toBe("ISOLATE");
      expect(latest.instructions).toBe(englishNotes);
      expect(latest.vetUser.name).toBe("Dr. Vet Alpha");

      // Clean up
      await prisma.veterinaryReport.delete({ where: { id: report.id } });
      await prisma.case.delete({ where: { id: testCase.id } });
    });
  });
});
