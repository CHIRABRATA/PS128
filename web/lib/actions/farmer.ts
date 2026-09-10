"use server";

import prisma from "@/lib/db/prisma";
import { requireFarmer } from "@/lib/auth/permissions";

/**
 * Retrieves real database counts and recent activity for the Farmer Portal dashboard.
 */
export async function getFarmerDashboardMetricsAction() {
  const farmer = await requireFarmer();

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
                  include: {
                    assignedVeterinarianUser: { select: { id: true, name: true, phone: true } },
                    veterinaryReports: {
                      include: {
                        vetUser: { select: { id: true, name: true, phone: true } },
                      },
                      orderBy: { createdAt: "desc" },
                    },
                    animal: {
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
                    },
                  },
                  orderBy: { reportedAt: "desc" },
                },
                veterinaryReports: {
                  include: {
                    vetUser: { select: { name: true, phone: true } },
                  },
                  orderBy: { createdAt: "desc" },
                },
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
    prisma.assistanceRequest
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
    prisma.inAppNotification
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

  const healthCase = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      animal: {
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
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
        },
      },
      reviewedByUser: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      assignedVeterinarianUser: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      veterinaryReports: {
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
      },
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
      assistanceRequest: {
        include: {
          assignedFieldAgentUser: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      },
      treatments: {
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
      },
      samples: {
        include: {
          collectedByUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { collectedAt: "desc" },
      },
    },
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
