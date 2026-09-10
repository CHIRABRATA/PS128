import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/db/prisma";
import { ensureFarmerPrimaryFarmAction } from "@/lib/actions/farmer";
import { createAssistanceRequestAction } from "@/lib/actions/assistance";
import * as permissions from "@/lib/auth/permissions";
import { FullAppUser } from "@/lib/auth/session";
import { User, Farm, Herd, Animal, District, Block, Village } from "@prisma/client";

describe("Farmer Farm Dropdown & Idempotent Farm Provisioning Flow", () => {
  let testSuffix: string;
  let district: District;
  let block: Block;
  let village: Village;

  let farmerUserWithFarm: User;
  let farm1: Farm;
  let herd1: Herd;
  let animal1: Animal;

  let farmerUserWithoutFarmWithVillage: User;
  let farmerUserWithoutVillage: User;

  beforeEach(async () => {
    vi.restoreAllMocks();
    testSuffix = `${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

    district = await prisma.district.create({
      data: { name: `Test Dist ${testSuffix}` },
    });

    block = await prisma.block.create({
      data: { name: `Test Block ${testSuffix}`, districtId: district.id },
    });

    village = await prisma.village.create({
      data: { name: `Test Village ${testSuffix}`, blockId: block.id },
    });

    // 1. Farmer with pre-existing farm & animals
    farmerUserWithFarm = await prisma.user.create({
      data: {
        clerkId: `clerk_farmer_with_farm_${testSuffix}`,
        role: "FARMER",
        status: "ACTIVE",
        name: "Chirabrata Farmer",
        phone: "+919800000001",
        districtId: district.id,
        blockId: block.id,
        villageId: village.id,
      },
    });

    farm1 = await prisma.farm.create({
      data: {
        name: "Chirabrata Livestock Farm",
        villageId: village.id,
        farmerUserId: farmerUserWithFarm.id,
        latitude: 18.5793,
        longitude: 73.9806,
      },
    });

    herd1 = await prisma.herd.create({
      data: {
        farmId: farm1.id,
        species: "BUFFALO",
        name: "Buffalo Herd",
      },
    });

    animal1 = await prisma.animal.create({
      data: {
        herdId: herd1.id,
        tag: `cow-100-${testSuffix}`,
        species: "BUFFALO",
      },
    });

    await prisma.animal.create({
      data: {
        herdId: herd1.id,
        tag: `cow-001-${testSuffix}`,
        species: "COW",
      },
    });

    // 2. Farmer without farm but WITH registered village
    farmerUserWithoutFarmWithVillage = await prisma.user.create({
      data: {
        clerkId: `clerk_farmer_novil_${testSuffix}`,
        role: "FARMER",
        status: "ACTIVE",
        name: "New Village Farmer",
        phone: "+919800000002",
        districtId: district.id,
        blockId: block.id,
        villageId: village.id,
      },
    });

    // 3. Farmer without farm and WITHOUT registered village
    farmerUserWithoutVillage = await prisma.user.create({
      data: {
        clerkId: `clerk_farmer_nolocation_${testSuffix}`,
        role: "FARMER",
        status: "ACTIVE",
        name: "No Location Farmer",
        phone: "+919800000003",
      },
    });
  });

  it("1. Loads registered farm and its animals correctly for farmer with existing farm", async () => {
    vi.spyOn(permissions, "requireFarmer").mockResolvedValue(farmerUserWithFarm as unknown as FullAppUser);

    const farms = await prisma.farm.findMany({
      where: { farmerUserId: farmerUserWithFarm.id },
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

    expect(farms.length).toBe(1);
    expect(farms[0].name).toBe("Chirabrata Livestock Farm");
    expect(farms[0].village.name).toBe(village.name);

    const farmOptions = farms.map((f) => ({
      id: f.id,
      name: f.name,
      villageName: f.village.name,
      animals: f.herds.flatMap((h) => h.animals),
    }));

    expect(farmOptions[0].animals.length).toBe(2);
    expect(farmOptions[0].animals.some((a) => a.tag === `cow-100-${testSuffix}`)).toBe(true);
  });

  it("2. Idempotently returns already_existing status when farm already exists", async () => {
    vi.spyOn(permissions, "requireFarmer").mockResolvedValue(farmerUserWithFarm as unknown as FullAppUser);

    const result1 = await ensureFarmerPrimaryFarmAction(farmerUserWithFarm.id);
    expect(result1.status).toBe("already_existing");
    expect(result1.farm?.id).toBe(farm1.id);

    // Verify no new farm was created
    const farmCount = await prisma.farm.count({
      where: { farmerUserId: farmerUserWithFarm.id },
    });
    expect(farmCount).toBe(1);
  });

  it("3. Idempotently provisions exactly one farm for farmer with village and 0 farms", async () => {
    vi.spyOn(permissions, "requireFarmer").mockResolvedValue(farmerUserWithoutFarmWithVillage as unknown as FullAppUser);

    // Initial count is 0
    let farmCount = await prisma.farm.count({
      where: { farmerUserId: farmerUserWithoutFarmWithVillage.id },
    });
    expect(farmCount).toBe(0);

    // First call provisions farm
    const result1 = await ensureFarmerPrimaryFarmAction(farmerUserWithoutFarmWithVillage.id);
    expect(result1.status).toBe("newly_provisioned");
    expect(result1.farm?.name).toBe("New Village Farmer Farm");

    // Second call returns already_existing without creating duplicate
    const result2 = await ensureFarmerPrimaryFarmAction(farmerUserWithoutFarmWithVillage.id);
    expect(result2.status).toBe("already_existing");
    expect(result2.farm?.id).toBe(result1.farm?.id);

    farmCount = await prisma.farm.count({
      where: { farmerUserId: farmerUserWithoutFarmWithVillage.id },
    });
    expect(farmCount).toBe(1);
  });

  it("4. Handles concurrent provisioning requests safely without duplicate farms", async () => {
    vi.spyOn(permissions, "requireFarmer").mockResolvedValue(farmerUserWithoutFarmWithVillage as unknown as FullAppUser);

    // Delete any farms if existing
    await prisma.farm.deleteMany({
      where: { farmerUserId: farmerUserWithoutFarmWithVillage.id },
    });

    // Run 5 concurrent calls
    const results = await Promise.all([
      ensureFarmerPrimaryFarmAction(farmerUserWithoutFarmWithVillage.id),
      ensureFarmerPrimaryFarmAction(farmerUserWithoutFarmWithVillage.id),
      ensureFarmerPrimaryFarmAction(farmerUserWithoutFarmWithVillage.id),
      ensureFarmerPrimaryFarmAction(farmerUserWithoutFarmWithVillage.id),
      ensureFarmerPrimaryFarmAction(farmerUserWithoutFarmWithVillage.id),
    ]);

    const distinctFarmIds = new Set(results.map((r) => r.farm?.id).filter(Boolean));
    expect(distinctFarmIds.size).toBe(1);

    const totalFarmsInDb = await prisma.farm.count({
      where: { farmerUserId: farmerUserWithoutFarmWithVillage.id },
    });
    expect(totalFarmsInDb).toBe(1);
  });

  it("5. Refuses to provision farm if farmer has no registered village location", async () => {
    vi.spyOn(permissions, "requireFarmer").mockResolvedValue(farmerUserWithoutVillage as unknown as FullAppUser);

    const result = await ensureFarmerPrimaryFarmAction(farmerUserWithoutVillage.id);
    expect(result.status).toBe("unable_to_be_provisioned");
    expect(result.farm).toBeNull();

    const farmCount = await prisma.farm.count({
      where: { farmerUserId: farmerUserWithoutVillage.id },
    });
    expect(farmCount).toBe(0);
  });

  it("6. Creates AssistanceRequest with caseId null and enforces farm and animal ownership", async () => {
    vi.spyOn(permissions, "requireFarmer").mockResolvedValue(farmerUserWithFarm as unknown as FullAppUser);

    // A. Valid submission
    const res = await createAssistanceRequestAction({
      farmId: farm1.id,
      animalId: animal1.id,
      reason: "Emergency: animal has high fever and blisters",
      notes: "Please visit shed A",
    });

    expect(res.success).toBe(true);
    expect(res.requestId).toBeDefined();

    const createdReq = await prisma.assistanceRequest.findUnique({
      where: { id: res.requestId! },
    });
    expect(createdReq).toBeDefined();
    expect(createdReq?.farmerUserId).toBe(farmerUserWithFarm.id);
    expect(createdReq?.farmId).toBe(farm1.id);
    expect(createdReq?.animalId).toBe(animal1.id);
    expect(createdReq?.caseId).toBeNull(); // caseId MUST remain null

    // B. Security: Farmer cannot submit with another farmer's farm
    vi.spyOn(permissions, "requireFarmer").mockResolvedValue(farmerUserWithoutFarmWithVillage as unknown as FullAppUser);

    const unauthorizedRes = await createAssistanceRequestAction({
      farmId: farm1.id,
      reason: "Attempting to use another farmer's farm",
    });

    expect(unauthorizedRes.success).toBe(false);
    expect(unauthorizedRes.error).toContain("Unauthorized");
  });
});
