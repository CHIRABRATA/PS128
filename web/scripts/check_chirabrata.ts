import prisma from "../lib/db/prisma";

async function checkChirabrata() {
  const user = await prisma.user.findUnique({
    where: { id: "cmttueaxy00009cu2e6cesob5" },
    include: {
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
              animals: {
                include: {
                  cases: true,
                },
              },
            },
          },
        },
      },
    },
  });

  console.log("CHIRABRATA USER DETAIL:", JSON.stringify(user, null, 2));
}

checkChirabrata().catch(console.error).finally(() => prisma.$disconnect());
