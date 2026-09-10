import prisma from "../lib/db/prisma";
import { Prisma } from "@prisma/client";

async function main() {
  console.log("==================================================");
  console.log("VERIFYING VET AND FARMER PRISMA QUERIES");
  console.log("==================================================");

  // 1. Verify Prisma.CaseWhereInput recognizes assignedVeterinarianUserId
  const caseWhere: Prisma.CaseWhereInput = {
    status: { in: ["PENDING_REVIEW", "UNDER_EXAMINATION", "LAB_REFERRAL"] },
    assignedVeterinarianUserId: "dummy_vet_id",
  };
  console.log("1. Prisma.CaseWhereInput with assignedVeterinarianUserId is valid:", Object.keys(caseWhere));

  // 2. Verify Prisma.CaseInclude recognizes assignedVeterinarianUser
  const caseInclude: Prisma.CaseInclude = {
    assignedVeterinarianUser: {
      select: {
        id: true,
        name: true,
        phone: true,
      },
    },
    createdByUser: {
      select: {
        id: true,
        name: true,
        phone: true,
      },
    },
    animal: {
      include: {
        herd: {
          include: {
            farm: {
              include: {
                village: true,
              },
            },
          },
        },
      },
    },
  };
  console.log("2. Prisma.CaseInclude with assignedVeterinarianUser is valid:", Object.keys(caseInclude));

  // 3. Find active veterinarian
  const vet = await prisma.user.findFirst({
    where: { role: "VETERINARIAN", status: "ACTIVE" },
  });

  if (!vet) {
    console.log("No active veterinarian found.");
    return;
  }
  console.log(`3. Found active vet: Dr. ${vet.name} (${vet.id})`);

  // 4. Execute exact Vet Queue query
  const vetCases = await prisma.case.findMany({
    where: {
      status: {
        in: ["PENDING_REVIEW", "UNDER_EXAMINATION", "LAB_REFERRAL"],
      },
      assignedVeterinarianUserId: vet.id,
    },
    include: caseInclude,
  });

  console.log(`4. Successfully executed exact Vet Queue query! Cases assigned to Dr. ${vet.name}: ${vetCases.length}`);
  for (const c of vetCases) {
    console.log(`   - Case #${c.caseNumber}: Status = ${c.status}, Assigned Vet = ${c.assignedVeterinarianUser?.name} (${c.assignedVeterinarianUserId})`);
  }

  // 5. Find active farmer and execute exact Farmer query
  const farmer = await prisma.user.findFirst({
    where: { role: "FARMER" },
  });

  if (farmer) {
    console.log(`5. Found farmer: ${farmer.name} (${farmer.id})`);
    const farmerFarms = await prisma.farm.findMany({
      where: { farmerUserId: farmer.id },
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
                cases: {
                  include: {
                    assignedVeterinarianUser: { select: { id: true, name: true, phone: true } },
                  },
                  orderBy: { reportedAt: "desc" },
                },
              },
            },
          },
        },
      },
    });

    console.log(`6. Successfully executed exact Farmer query! Farms: ${farmerFarms.length}`);
    const farmerCases = farmerFarms.flatMap((f) => f.herds.flatMap((h) => h.animals.flatMap((a) => a.cases)));
    console.log(`   Total farmer cases loaded: ${farmerCases.length}`);
  }

  // 6. Verify real cases in DB with assignedVeterinarianUserId != null
  const anyAssignedCase = await prisma.case.findFirst({
    where: {
      assignedVeterinarianUserId: { not: null },
    },
    include: {
      assignedVeterinarianUser: true,
    },
  });

  if (anyAssignedCase) {
    console.log(`7. Verified assigned Case record #${anyAssignedCase.caseNumber}:`);
    console.log(`   - assignedVeterinarianUserId: ${anyAssignedCase.assignedVeterinarianUserId}`);
    console.log(`   - assignedAt: ${anyAssignedCase.assignedAt}`);
    console.log(`   - assignmentLevel: ${anyAssignedCase.assignmentLevel}`);
    console.log(`   - assignedVeterinarianUser: ${anyAssignedCase.assignedVeterinarianUser?.name} (${anyAssignedCase.assignedVeterinarianUser?.phone})`);
  } else {
    console.log("7. No assigned cases found yet in DB.");
  }

  console.log("==================================================");
  console.log("ALL VET & FARMER PRISMA QUERIES VERIFIED CLEANLY");
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("VERIFICATION FAILED:", err);
    process.exit(1);
  });
