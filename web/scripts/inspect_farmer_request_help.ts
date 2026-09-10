import prisma from "../lib/db/prisma";

async function main() {
  const farmers = await prisma.user.findMany({
    where: { role: "FARMER" },
    include: {
      ownedFarms: {
        include: {
          village: true,
          herds: {
            include: {
              animals: true,
            },
          },
        },
      },
    },
  });

  console.log("=== ALL FARMERS ===");
  for (const f of farmers) {
    console.log({
      id: f.id,
      clerkId: f.clerkId,
      name: f.name,
      phone: f.phone,
      ownedFarmsCount: f.ownedFarms.length,
      ownedFarms: f.ownedFarms.map((farm) => ({
        id: farm.id,
        name: farm.name,
        village: farm.village.name,
        animals: farm.herds.flatMap((h) => h.animals.map((a) => ({ id: a.id, tag: a.tag, species: a.species }))),
      })),
    });
  }

  // Also check if there are any farms without farmerUserId or mismatched farmerUserId
  const allFarms = await prisma.farm.findMany({
    include: {
      farmerUser: true,
      village: true,
      herds: {
        include: {
          animals: true,
        },
      },
    },
  });
  console.log("=== ALL FARMS AND THEIR LINKED FARMER ===");
  for (const farm of allFarms) {
    console.log({
      farmId: farm.id,
      farmName: farm.name,
      farmerUserId: farm.farmerUserId,
      farmerUserName: farm.farmerUser?.name,
      farmerUserClerkId: farm.farmerUser?.clerkId,
      village: farm.village.name,
      animals: farm.herds.flatMap((h) => h.animals.map((a) => `${a.tag} (${a.species})`)),
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
