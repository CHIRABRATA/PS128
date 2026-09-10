import prisma from "../lib/db/prisma";

async function inspectAllFarms() {
  const farms = await prisma.farm.findMany({
    include: {
      farmerUser: true,
      village: {
        include: {
          block: {
            include: {
              district: true,
            },
          },
        },
      },
      herds: {
        include: {
          animals: true,
        },
      },
    },
  });

  console.log("=== ALL FARMS IN DB ===");
  for (const f of farms) {
    console.log({
      farmId: f.id,
      farmName: f.name,
      farmerId: f.farmerUserId,
      farmerName: f.farmerUser?.name,
      farmerClerkId: f.farmerUser?.clerkId,
      farmerPhone: f.farmerUser?.phone,
      farmerDistrictId: f.farmerUser?.districtId,
      villageId: f.villageId,
      villageName: f.village?.name,
      blockId: f.village?.blockId,
      blockName: f.village?.block?.name,
      districtId: f.village?.block?.districtId,
      districtName: f.village?.block?.district?.name,
      animalsCount: f.herds.reduce((acc, h) => acc + h.animals.length, 0),
    });
  }
}

inspectAllFarms().catch(console.error).finally(() => prisma.$disconnect());
