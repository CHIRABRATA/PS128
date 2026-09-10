import prisma from "../lib/db/prisma";
import { Prisma } from "@prisma/client";

async function main() {
  console.log("==================================================");
  console.log("PRISMA CLIENT RELATION VERIFICATION");
  console.log("==================================================");

  // 1. Verify Prisma.CaseInclude TypeScript type definition
  const caseInclude: Prisma.CaseInclude = {
    assignedVeterinarianUser: {
      select: {
        id: true,
        name: true,
        phone: true,
      },
    },
  };
  console.log("1. Prisma.CaseInclude with assignedVeterinarianUser is valid:", Object.keys(caseInclude));

  // 2. Find a real farmer
  const farmer = await prisma.user.findFirst({
    where: { role: "FARMER" },
  });

  if (!farmer) {
    console.log("No farmer found in database to test query.");
    return;
  }
  console.log(`2. Found farmer: ${farmer.name} (${farmer.id})`);

  // 3. Execute the exact failing Farmer Dashboard query
  const farms = await prisma.farm.findMany({
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
                  assignedVeterinarianUser: {
                    select: {
                      id: true,
                      name: true,
                      phone: true,
                    },
                  },
                },
                orderBy: { reportedAt: "desc" },
              },
            },
          },
        },
      },
    },
  });

  console.log(`3. Successfully executed farmer query. Total farms: ${farms.length}`);

  const allCases = farms.flatMap((f) =>
    f.herds.flatMap((h) => h.animals.flatMap((a) => a.cases))
  );

  console.log(`4. Found ${allCases.length} total cases for farmer.`);
  for (const c of allCases.slice(0, 5)) {
    console.log(
      `   - Case ${c.caseNumber}: Assigned Vet ->`,
      c.assignedVeterinarianUser ? `${c.assignedVeterinarianUser.name} (${c.assignedVeterinarianUser.id})` : "UNASSIGNED"
    );
  }

  console.log("==================================================");
  console.log("VERIFICATION RESULT: SUCCESS");
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("VERIFICATION FAILED:", err);
    process.exit(1);
  });
