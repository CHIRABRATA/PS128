"use server";

import prisma, { hasField, hasModel, isRelation } from "@/lib/db/prisma";
import { requireFarmer } from "@/lib/auth/permissions";

/**
 * Retrieves real database counts and recent activity for the Farmer Portal dashboard.
 */
export async function getFarmerDashboardMetricsAction() {
  const farmer = await requireFarmer();

  // Dynamically build Case include to prevent crashes on stale Prisma clients
  const caseInclude: any = {};
  
  if (isRelation("Case", "createdByUser")) {
    caseInclude.createdByUser = { select: { id: true, name: true, phone: true } };
  }
  if (isRelation("Case", "reviewedByUser")) {
    caseInclude.reviewedByUser = { select: { id: true, name: true, phone: true } };
  }
  if (isRelation("Case", "treatments")) {
    caseInclude.treatments = {
      include: {
        administeredByUser: { select: { id: true, name: true, role: true } },
      },
      orderBy: { dateGiven: "desc" },
    };
  }
  if (isRelation("Case", "samples")) {
    caseInclude.samples = {
      include: {
        collectedByUser: { select: { id: true, name: true } },
      },
      orderBy: { collectedAt: "desc" },
    };
  }
  if (isRelation("Case", "assignedVeterinarianUser")) {
    caseInclude.assignedVeterinarianUser = { select: { id: true, name: true, phone: true } };
  }
  if (isRelation("Case", "veterinaryReports")) {
    caseInclude.veterinaryReports = {
      include: {
        vetUser: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    };
  }
  if (isRelation("Case", "animal")) {
    caseInclude.animal = {
      select: {
        id: true,
        tag: true,
        species: true,
        herd: {
          select: {
            farm: {
              select: {
                name: true,
                village: {
                  select: {
                    name: true,
                    block: {
                      select: {
                        name: true,
                        district: {
                          select: {
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
    };
  }

  const [farms, assistanceRequests, unreadNotificationsCount] = await Promise.all([
    prisma.farm.findMany({
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
                cases: {
                  include: caseInclude,
                  orderBy: { reportedAt: "desc" },
                },
                veterinaryReports: isRelation("Animal", "veterinaryReports")
                  ? {
                      include: {
                        vetUser: { select: { name: true, phone: true } },
                      },
                      orderBy: { createdAt: "desc" },
                    }
                  : undefined,
                vaccinations: {
                  orderBy: { dateGiven: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    }),
    hasModel("AssistanceRequest")
      ? prisma.assistanceRequest.findMany({
          where: { farmerUserId: farmer.id },
          include: {
            animal: true,
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
            village: {
              include: {
                block: {
                  include: {
                    district: true,
                  },
                },
              },
            },
            assignedFieldAgentUser: { select: { id: true, name: true, phone: true } },
          },
          orderBy: { requestedAt: "desc" },
        })
      : Promise.resolve([]),
    hasModel("InAppNotification")
      ? prisma.inAppNotification.count({
          where: { userId: farmer.id, read: false },
        })
      : Promise.resolve(0),
  ]);

  const allAnimals = farms.flatMap((f) => f.herds.flatMap((h) => h.animals));
  const allCases = allAnimals.flatMap((a) => a.cases);
  const activeCases = allCases.filter((c) => c.status !== "CLOSED_HARMLESS");
  const allVetReports = allAnimals.flatMap((a) => a.veterinaryReports);
  const upcomingFollowUps = allCases.filter(
    (c) => c.vetFollowUpDate && c.status !== "CLOSED_HARMLESS"
  );

  return {
    metrics: {
      myAnimalsCount: allAnimals.length,
      activeCasesCount: activeCases.length,
      assistanceRequestsCount: assistanceRequests.length,
      vetReportsCount: allVetReports.length,
      upcomingFollowUpsCount: upcomingFollowUps.length,
      unreadNotificationsCount,
    },
    allAnimals,
    activeCases,
    assistanceRequests,
    allVetReports,
    upcomingFollowUps,
    farms,
  };
}

/**
 * Retrieves a full Case detail and associated Veterinary Reports for the authenticated farmer.
 * Strictly verifies that the authenticated farmer owns the animal/farm or created the report.
 */
export async function getFarmerCaseDetailAction(caseId: string) {
  const farmer = await requireFarmer();

  // Dynamically build Case include to prevent crashes on stale Prisma clients
  const detailInclude: any = {};

  if (isRelation("Case", "animal")) {
    detailInclude.animal = {
      include: {
        herd: {
          include: {
            farm: {
              include: {
                farmerUser: { select: { id: true, name: true, phone: true } },
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
    };
  }

  if (isRelation("Case", "createdByUser")) {
    detailInclude.createdByUser = {
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
      },
    };
  }

  if (isRelation("Case", "reviewedByUser")) {
    detailInclude.reviewedByUser = {
      select: {
        id: true,
        name: true,
        phone: true,
      },
    };
  }

  if (isRelation("Case", "treatments")) {
    detailInclude.treatments = {
      include: {
        administeredByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { dateGiven: "desc" },
    };
  }

  if (isRelation("Case", "samples")) {
    detailInclude.samples = {
      include: {
        collectedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { collectedAt: "desc" },
    };
  }

  if (isRelation("Case", "assignedVeterinarianUser")) {
    detailInclude.assignedVeterinarianUser = {
      select: {
        id: true,
        name: true,
        phone: true,
      },
    };
  }

  if (isRelation("Case", "veterinaryReports")) {
    detailInclude.veterinaryReports = {
      include: {
        vetUser: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    };
  }

  if (isRelation("Case", "fieldVisit")) {
    detailInclude.fieldVisit = {
      include: {
        fieldVisit: {
          include: {
            fieldAgentUser: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    };
  }

  if (isRelation("Case", "assistanceRequest")) {
    detailInclude.assistanceRequest = {
      include: {
        assignedFieldAgentUser: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    };
  }

  const healthCase = await prisma.case.findUnique({
    where: { id: caseId },
    include: detailInclude,
  });

  if (!healthCase) {
    throw new Error("Case record not found.");
  }

  const farm = healthCase.animal.herd.farm;
  const isOwner = farm.farmerUserId === farmer.id;
  const isCreator = healthCase.createdByUserId === farmer.id;

  if (!isOwner && !isCreator) {
    throw new Error("Unauthorized: You do not have permission to view this case.");
  }

  return healthCase;
}
