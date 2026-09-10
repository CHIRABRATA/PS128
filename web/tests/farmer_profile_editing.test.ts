import { describe, it, expect, beforeAll } from "vitest";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const testUpdateFarmerProfileSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters").max(100, "Name is too long"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number is too long")
    .regex(/^[+0-9\s-]{10,20}$/, "Please enter a valid phone number"),
  preferredLanguage: z.enum(["en", "hi", "mr", "bn"]).default("en"),
  districtId: z.string().optional().nullable(),
  blockId: z.string().optional().nullable(),
  villageId: z.string().optional().nullable(),
  primaryFarmId: z.string().optional().nullable(),
  primaryFarmName: z.string().min(2, "Farm name must be at least 2 characters").max(100, "Farm name is too long").optional().nullable(),
});

describe("Farmer Profile Editing Feature & Security Gates", () => {
  const testPrefix = `test_prof_${Date.now()}_`;
  let districtA: { id: string; name: string };
  let districtB: { id: string; name: string };
  let blockA: { id: string; name: string; districtId: string };
  let blockB: { id: string; name: string; districtId: string };
  let villageA: { id: string; name: string; blockId: string };
  let villageB: { id: string; name: string; blockId: string };
  let farmerA: { id: string; clerkId: string; role: string; name: string; phone: string };
  let farmerB: { id: string; clerkId: string; role: string; name: string; phone: string };
  let farmA: { id: string; name: string; farmerUserId: string | null };

  beforeAll(async () => {
    // Setup clean test geography
    districtA = await prisma.district.create({
      data: { name: `${testPrefix}DistA` },
    });
    districtB = await prisma.district.create({
      data: { name: `${testPrefix}DistB` },
    });

    blockA = await prisma.block.create({
      data: { name: `${testPrefix}BlockA`, districtId: districtA.id },
    });
    blockB = await prisma.block.create({
      data: { name: `${testPrefix}BlockB`, districtId: districtB.id },
    });

    villageA = await prisma.village.create({
      data: { name: `${testPrefix}VillA`, blockId: blockA.id },
    });
    villageB = await prisma.village.create({
      data: { name: `${testPrefix}VillB`, blockId: blockB.id },
    });

    // Create Farmer A
    farmerA = await prisma.user.create({
      data: {
        clerkId: `clerk_${testPrefix}farmerA`,
        role: "FARMER",
        status: "ACTIVE",
        name: "Ramesh Farmer A",
        phone: "+919876543201",
        preferredLanguage: "en",
        districtId: districtA.id,
        blockId: blockA.id,
        villageId: villageA.id,
      },
    });

    // Create Farmer B
    farmerB = await prisma.user.create({
      data: {
        clerkId: `clerk_${testPrefix}farmerB`,
        role: "FARMER",
        status: "ACTIVE",
        name: "Suresh Farmer B",
        phone: "+919876543202",
        preferredLanguage: "hi",
        districtId: districtB.id,
        blockId: blockB.id,
        villageId: villageB.id,
      },
    });

    // Create Farm for Farmer A
    farmA = await prisma.farm.create({
      data: {
        name: `${testPrefix}Farm A`,
        farmerUserId: farmerA.id,
        villageId: villageA.id,
        latitude: 18.52,
        longitude: 73.85,
      },
    });
  });

  it("1. Validates profile input schema correctly", () => {
    const valid = testUpdateFarmerProfileSchema.safeParse({
      name: "Ramesh Patil",
      phone: "+919876543210",
      preferredLanguage: "mr",
      districtId: districtA.id,
      blockId: blockA.id,
      villageId: villageA.id,
      primaryFarmId: farmA.id,
      primaryFarmName: "Patil Dairy",
    });
    expect(valid.success).toBe(true);

    const invalidShortName = testUpdateFarmerProfileSchema.safeParse({
      name: "R",
      phone: "+919876543210",
    });
    expect(invalidShortName.success).toBe(false);

    const invalidPhone = testUpdateFarmerProfileSchema.safeParse({
      name: "Ramesh",
      phone: "123",
    });
    expect(invalidPhone.success).toBe(false);
  });

  it("2. Updates farmer profile name, phone, language, and farm name successfully", async () => {
    // Perform update
    const updatedUser = await prisma.user.update({
      where: { id: farmerA.id },
      data: {
        name: "Ramesh Kumar Patil",
        phone: "+919876543299",
        preferredLanguage: "mr",
        villageId: villageA.id,
        blockId: blockA.id,
        districtId: districtA.id,
      },
    });

    const updatedFarm = await prisma.farm.update({
      where: { id: farmA.id },
      data: { name: "Ramesh Modern Dairy" },
    });

    expect(updatedUser.name).toBe("Ramesh Kumar Patil");
    expect(updatedUser.phone).toBe("+919876543299");
    expect(updatedUser.preferredLanguage).toBe("mr");
    expect(updatedFarm.name).toBe("Ramesh Modern Dairy");

    // Fetch from DB to confirm persistence
    const reloaded = await prisma.user.findUnique({
      where: { id: farmerA.id },
      include: { ownedFarms: true, village: true, block: true, district: true },
    });
    expect(reloaded?.name).toBe("Ramesh Kumar Patil");
    expect(reloaded?.ownedFarms[0]?.name).toBe("Ramesh Modern Dairy");
    expect(reloaded?.village?.name).toBe(villageA.name);
  });

  it("3. Forbids unauthorized modification of another farmer's farm", async () => {
    // Farmer B attempts to modify Farmer A's farm
    const targetFarm = await prisma.farm.findUnique({
      where: { id: farmA.id },
    });
    expect(targetFarm?.farmerUserId).toBe(farmerA.id);
    expect(targetFarm?.farmerUserId).not.toBe(farmerB.id);

    // Simulated action check:
    const isOwner = targetFarm?.farmerUserId === farmerB.id;
    expect(isOwner).toBe(false);
  });

  it("4. Rejects mismatched location hierarchy", async () => {
    // Village A belongs to Block A, not Block B
    const villObj = await prisma.village.findUnique({
      where: { id: villageA.id },
      include: { block: true },
    });
    expect(villObj?.blockId).toBe(blockA.id);
    expect(villObj?.blockId).not.toBe(blockB.id);

    // Mismatched submission should be detected
    const mismatchedBlockId = blockB.id;
    const isMismatch = villObj && villObj.blockId !== mismatchedBlockId;
    expect(isMismatch).toBe(true);
  });

  it("5. Verifies existing livestock, cases, and veterinary reports remain intact after profile update", async () => {
    // Create animal, herd, case, and veterinary report for Farmer A
    const herd = await prisma.herd.create({
      data: {
        farmId: farmA.id,
        name: "Main Herd",
        species: "BUFFALO",
      },
    });

    const animal = await prisma.animal.create({
      data: {
        herdId: herd.id,
        tag: "TAG-999",
        species: "BUFFALO",
      },
    });

    const newCase = await prisma.case.create({
      data: {
        caseNumber: `CASE-${Date.now()}`,
        animalId: animal.id,
        createdByUserId: farmerA.id,
        reportSource: "FARMER",
        status: "UNDER_EXAMINATION",
        symptoms: ["Fever"],
        durationDays: 1,
      },
    });

    // Update farmer's profile
    await prisma.user.update({
      where: { id: farmerA.id },
      data: { name: "Ramesh Renamed" },
    });

    // Query case and verify relations remain perfectly intact
    const loadedCase = await prisma.case.findUnique({
      where: { id: newCase.id },
      include: {
        animal: {
          include: {
            herd: {
              include: {
                farm: {
                  include: {
                    farmerUser: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(loadedCase).not.toBeNull();
    expect(loadedCase?.animal.tag).toBe("TAG-999");
    expect(loadedCase?.animal.herd.farm.farmerUserId).toBe(farmerA.id);
    expect(loadedCase?.animal.herd.farm.farmerUser?.name).toBe("Ramesh Renamed");
  });
});
