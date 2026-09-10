import prisma from "../lib/db/prisma";

async function detailedInspection() {
  console.log("=== DETAILED VETERINARIAN & LOCATION ANALYSIS ===");

  const allVets = await prisma.user.findMany({
    where: { role: "VETERINARIAN" },
    include: {
      district: true,
      block: true,
      village: true,
    },
  });
  console.log("ALL VETS IN DB (" + allVets.length + "):");
  for (const v of allVets) {
    console.log({
      id: v.id,
      name: v.name,
      phone: v.phone,
      role: v.role,
      status: v.status,
      districtId: v.districtId,
      districtName: v.district?.name,
      blockId: v.blockId,
      blockName: v.block?.name,
      villageId: v.villageId,
      villageName: v.village?.name,
    });
  }

  const allDistricts = await prisma.district.findMany({
    include: {
      blocks: {
        include: {
          villages: true,
        },
      },
    },
  });
  console.log("ALL DISTRICTS IN DB (" + allDistricts.length + "):");
  for (const d of allDistricts) {
    console.log("District:", d.id, d.name);
    for (const b of d.blocks) {
      console.log("  Block:", b.id, b.name);
      for (const v of b.villages) {
        console.log("    Village:", v.id, v.name);
      }
    }
  }

  // Let's trace why Case cmtvoishq0004c4u23690nc7j had assignedVeterinarianUserId = null
  const problematicCase = await prisma.case.findUnique({
    where: { id: "cmtvoishq0004c4u23690nc7j" },
    include: {
      animal: {
        include: {
          herd: {
            include: {
              farm: {
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
                },
              },
            },
          },
        },
      },
    },
  });

  console.log("PROBLEMATIC CASE LOCATION:");
  const farm = problematicCase?.animal.herd.farm;
  console.log({
    farmId: farm?.id,
    farmVillageId: farm?.villageId,
    villageObject: farm?.village,
    blockObject: farm?.village?.block,
    districtObject: farm?.village?.block?.district,
  });

  const { findEligibleVeterinarians } = await import("../lib/geo/routing");
  const matchResult = await findEligibleVeterinarians({
    villageId: farm?.villageId,
    blockId: farm?.village?.blockId,
    districtId: farm?.village?.block?.districtId,
  });

  console.log("MATCH RESULT FOR THIS CASE:", JSON.stringify(matchResult, null, 2));
}

detailedInspection().catch(console.error).finally(() => prisma.$disconnect());
