import prisma from "../lib/db/prisma";

async function inspectDb() {
  console.log("=== INSPECTING CURRENT DATABASE ===");

  const vets = await prisma.user.findMany({
    where: { role: "VETERINARIAN" },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      districtId: true,
      blockId: true,
      villageId: true,
      district: { select: { id: true, name: true } },
      block: { select: { id: true, name: true } },
      village: { select: { id: true, name: true } },
    },
  });
  console.log("VETERINARIANS IN DB:", JSON.stringify(vets, null, 2));

  const farmers = await prisma.user.findMany({
    where: { role: "FARMER" },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      districtId: true,
      blockId: true,
      villageId: true,
      ownedFarms: {
        select: {
          id: true,
          name: true,
          villageId: true,
          village: {
            select: {
              id: true,
              name: true,
              blockId: true,
              block: {
                select: {
                  id: true,
                  name: true,
                  districtId: true,
                  district: { select: { id: true, name: true } },
                },
              },
            },
          },
          herds: {
            select: {
              id: true,
              species: true,
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
      },
    },
  });
  console.log("FARMERS IN DB (with farms & animals):", JSON.stringify(farmers, null, 2));

  const recentCases = await prisma.case.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      caseNumber: true,
      submissionId: true,
      status: true,
      createdByUserId: true,
      assignedVeterinarianUserId: true,
      assignedAt: true,
      assignmentLevel: true,
      createdAt: true,
      animal: {
        select: {
          id: true,
          tag: true,
          species: true,
          herd: {
            select: {
              farm: {
                select: {
                  id: true,
                  villageId: true,
                  village: {
                    select: {
                      id: true,
                      blockId: true,
                      block: {
                        select: {
                          id: true,
                          districtId: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  console.log("RECENT CASES IN DB:", JSON.stringify(recentCases, null, 2));
}

inspectDb().catch(console.error).finally(() => prisma.$disconnect());
