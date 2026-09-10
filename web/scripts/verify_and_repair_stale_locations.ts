import prisma from "../lib/db/prisma";

async function verifyAndRepairStaleLocations() {
  console.log("=== PART 9 — VERIFY OLD ACCOUNT LOCATION DATA ===");

  // 1. Inspect all Users with missing districtId but having villageId or blockId
  const usersWithMissingDistrict = await prisma.user.findMany({
    where: {
      districtId: null,
      OR: [
        { villageId: { not: null } },
        { blockId: { not: null } },
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
      block: {
        include: {
          district: true,
        },
      },
    },
  });

  console.log(`Found ${usersWithMissingDistrict.length} users with missing districtId but valid villageId/blockId:`);
  let repairedUsersCount = 0;

  for (const u of usersWithMissingDistrict) {
    let resolvableDistrictId: string | null = null;
    let resolvableBlockId: string | null = u.blockId;

    if (u.village?.block?.districtId) {
      resolvableDistrictId = u.village.block.districtId;
      resolvableBlockId = resolvableBlockId || u.village.blockId;
    } else if (u.block?.districtId) {
      resolvableDistrictId = u.block.districtId;
    }

    if (resolvableDistrictId) {
      console.log(`Repairing User ${u.id} (${u.name}, ${u.role}) -> districtId: ${resolvableDistrictId}, blockId: ${resolvableBlockId}`);
      await prisma.user.update({
        where: { id: u.id },
        data: {
          districtId: resolvableDistrictId,
          blockId: resolvableBlockId,
        },
      });
      repairedUsersCount++;
    } else {
      console.log(`User ${u.id} (${u.name}) has unresolvable village/block (orphaned entity). Left untouched.`);
    }
  }

  // 2. Inspect all Farms
  const allFarms = await prisma.farm.findMany({
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
  });

  console.log(`\nTotal farms inspected: ${allFarms.length}`);
  let farmsWithOrphanVillage = 0;
  for (const f of allFarms) {
    if (!f.village || !f.village.block || !f.village.block.district) {
      console.log(`Warning: Farm ${f.id} (${f.name}) has unresolvable district.`);
      farmsWithOrphanVillage++;
    }
  }

  console.log(`Farms with complete authoritative hierarchy: ${allFarms.length - farmsWithOrphanVillage}/${allFarms.length}`);
  console.log(`Stale User records repaired: ${repairedUsersCount}`);

  return {
    staleUsersFound: usersWithMissingDistrict.length,
    staleUsersRepaired: repairedUsersCount,
    totalFarms: allFarms.length,
    farmsWithCompleteHierarchy: allFarms.length - farmsWithOrphanVillage,
  };
}

verifyAndRepairStaleLocations()
  .then((res) => {
    console.log("\nSummary Result:", JSON.stringify(res, null, 2));
  })
  .catch(console.error)
  .finally(() => prisma.$disconnect());
