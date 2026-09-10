import prisma from "../lib/db/prisma";

async function auditVets() {
  const vets = await prisma.user.findMany({
    where: { role: "VETERINARIAN" },
    include: {
      district: true,
      block: true,
      village: true,
      assignedCases: {
        select: {
          id: true,
          caseNumber: true,
          status: true,
          reportedAt: true,
          animal: {
            select: {
              tag: true,
              species: true,
              herd: {
                select: {
                  farm: {
                    select: {
                      id: true,
                      name: true,
                      village: {
                        select: {
                          id: true,
                          name: true,
                          block: {
                            select: {
                              id: true,
                              name: true,
                              district: {
                                select: {
                                  id: true,
                                  name: true,
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
          },
        },
      },
    },
  });

  console.log("=== VETERINARIANS IN DB ===");
  for (const v of vets) {
    console.log({
      id: v.id,
      clerkId: v.clerkId,
      name: v.name,
      phone: v.phone,
      status: v.status,
      districtId: v.districtId,
      districtName: v.district?.name,
      blockId: v.blockId,
      blockName: v.block?.name,
      villageId: v.villageId,
      villageName: v.village?.name,
      assignedCasesCount: v.assignedCases.length,
      assignedCases: v.assignedCases.map((c) => ({
        caseNumber: c.caseNumber,
        status: c.status,
        farmName: c.animal.herd.farm.name,
        villageName: c.animal.herd.farm.village.name,
        blockName: c.animal.herd.farm.village.block.name,
        districtName: c.animal.herd.farm.village.block.district.name,
      })),
    });
  }
}

auditVets().catch(console.error).finally(() => prisma.$disconnect());
