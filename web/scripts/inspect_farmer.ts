import prisma from "../lib/db/prisma";

async function inspectFarmerUser() {
  const user = await prisma.user.findUnique({
    where: { id: "cmttueaxy00009cu2e6cesob5" },
    include: {
      district: true,
      block: true,
      village: true,
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

  console.log("FARMER USER:", JSON.stringify(user, null, 2));

  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      clerkId: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      districtId: true,
      district: { select: { name: true } },
      blockId: true,
      block: { select: { name: true } },
      villageId: true,
      village: { select: { name: true } },
    },
  });
  console.log("ALL USERS IN DB:", JSON.stringify(allUsers, null, 2));
}

inspectFarmerUser().catch(console.error).finally(() => prisma.$disconnect());
