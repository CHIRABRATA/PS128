import prisma from "../lib/db/prisma";

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: "CHIRABRATA", mode: "insensitive" } },
        { name: { contains: "Ghosal", mode: "insensitive" } },
        { name: { contains: "Arnab", mode: "insensitive" } },
        { role: "FARMER" },
      ],
    },
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
      block: true,
      district: true,
      ownedFarms: {
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
          herds: {
            include: {
              animals: true,
            },
          },
        },
      },
    },
  });

  console.log("=== FARMERS / TARGET USERS ===");
  for (const u of users) {
    console.log(`User: ${u.id} | ClerkId: ${u.clerkId} | Name: ${u.name} | Role: ${u.role} | Status: ${u.status}`);
    console.log(`  Location: Village=${u.village?.name} (${u.villageId}), Block=${u.block?.name}, District=${u.district?.name}`);
    console.log(`  Owned Farms (${u.ownedFarms.length}):`);
    for (const f of u.ownedFarms) {
      console.log(`    Farm: ${f.id} | Name: "${f.name}" | Village: ${f.village?.name} (${f.villageId})`);
      const animals = f.herds.flatMap((h) => h.animals);
      console.log(`    Animals (${animals.length}): ${animals.map((a) => `${a.tag} (${a.species})`).join(", ")}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
