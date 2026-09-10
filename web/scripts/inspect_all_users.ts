import prisma from "../lib/db/prisma";

async function main() {
  const users = await prisma.user.findMany({
    include: {
      district: true,
      block: true,
      village: true,
      ownedFarms: {
        include: {
          village: true,
        },
      },
    },
  });

  console.log("=== ALL USERS IN DB ===");
  for (const u of users) {
    console.log({
      id: u.id,
      clerkId: u.clerkId,
      name: u.name,
      phone: u.phone,
      role: u.role,
      status: u.status,
      district: u.district?.name,
      block: u.block?.name,
      village: u.village?.name,
      ownedFarms: u.ownedFarms.map((f) => f.name),
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
