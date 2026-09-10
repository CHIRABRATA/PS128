"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";
import { requireFarmer } from "@/lib/auth/permissions";
import { getCurrentClerkUser } from "@/lib/auth/session";
import { clerkClient } from "@clerk/nextjs/server";

const updateFarmerProfileSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters").max(100, "Name is too long"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number is too long")
    .regex(/^[+0-9\s-]{10,20}$/, "Please enter a valid phone number"),
  preferredLanguage: z.enum(["en", "hi", "mr", "bn"]).default("en"),
  districtId: z.string().optional().nullable(),
  blockId: z.string().optional().nullable(),
  villageId: z.string().optional().nullable(),
  primaryFarmId: z.string().optional().nullable(),
  primaryFarmName: z.string().min(2, "Farm name must be at least 2 characters").max(100, "Farm name is too long").optional().nullable(),
});

export type UpdateFarmerProfileInput = z.infer<typeof updateFarmerProfileSchema>;

export interface FarmerProfileData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  imageUrl: string | null;
  preferredLanguage: string;
  telegramChatId: string | null;
  role: string;
  status: string;
  districtId: string | null;
  districtName: string | null;
  blockId: string | null;
  blockName: string | null;
  villageId: string | null;
  villageName: string | null;
  farms: Array<{
    id: string;
    name: string;
    villageId: string;
    villageName: string;
    blockName: string;
    districtName: string;
    animalCount: number;
    latitude: number;
    longitude: number;
  }>;
  createdAt: string;
}

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

/**
 * Retrieves the profile information for the authenticated farmer.
 */
export async function getFarmerProfileAction(): Promise<FarmerProfileData> {
  const farmer = await requireFarmer();
  const [clerkUser, fullUser] = await Promise.all([
    getCurrentClerkUser(),
    prisma.user.findUnique({
      where: { id: farmer.id },
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
    }),
  ]);

  if (!fullUser) {
    throw new Error("Farmer user profile not found.");
  }

  const primaryEmail = clerkUser?.emailAddresses[0]?.emailAddress || null;
  const imageUrl = clerkUser?.imageUrl || null;

  return {
    id: fullUser.id,
    name: fullUser.name,
    phone: fullUser.phone,
    email: primaryEmail,
    imageUrl,
    preferredLanguage: fullUser.preferredLanguage || "en",
    telegramChatId: fullUser.telegramChatId || null,
    role: fullUser.role,
    status: fullUser.status,
    districtId: fullUser.districtId || null,
    districtName: fullUser.district?.name || null,
    blockId: fullUser.blockId || null,
    blockName: fullUser.block?.name || null,
    villageId: fullUser.villageId || null,
    villageName: fullUser.village?.name || null,
    farms: fullUser.ownedFarms.map((f) => ({
      id: f.id,
      name: f.name,
      villageId: f.villageId,
      villageName: f.village.name,
      blockName: f.village.block.name,
      districtName: f.village.block.district.name,
      animalCount: f.herds.reduce((sum, h) => sum + h.animals.length, 0),
      latitude: f.latitude,
      longitude: f.longitude,
    })),
    createdAt: fullUser.createdAt.toISOString(),
  };
}

/**
 * Updates the authenticated farmer's profile and farm information.
 * Enforces strict authorization and location validation.
 */
export async function updateFarmerProfileAction(input: UpdateFarmerProfileInput) {
  try {
    const farmer = await requireFarmer();

    const parsed = updateFarmerProfileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid profile data.",
      };
    }

    const {
      name,
      phone,
      preferredLanguage,
      districtId,
      blockId,
      villageId,
      primaryFarmId,
      primaryFarmName,
    } = parsed.data;

    // 1. Resolve and validate administrative location hierarchy
    let resolvedDistrictId: string | null = null;
    let resolvedBlockId: string | null = null;
    let resolvedVillageId: string | null = null;

    if (villageId) {
      const villageObj = await prisma.village.findUnique({
        where: { id: villageId },
        include: { block: { include: { district: true } } },
      });
      if (!villageObj) {
        return { success: false, error: "Selected Village does not exist." };
      }
      resolvedVillageId = villageObj.id;
      resolvedBlockId = villageObj.blockId;
      resolvedDistrictId = villageObj.block.districtId;

      if (blockId && blockId !== resolvedBlockId) {
        return { success: false, error: "Selected Village does not belong to the chosen Block." };
      }
      if (districtId && districtId !== resolvedDistrictId) {
        return { success: false, error: "Selected Village does not belong to the chosen District." };
      }
    } else if (blockId) {
      const blockObj = await prisma.block.findUnique({
        where: { id: blockId },
        include: { district: true },
      });
      if (!blockObj) {
        return { success: false, error: "Selected Block does not exist." };
      }
      resolvedBlockId = blockObj.id;
      resolvedDistrictId = blockObj.districtId;
      if (districtId && districtId !== resolvedDistrictId) {
        return { success: false, error: "Selected Block does not belong to the chosen District." };
      }
    } else if (districtId) {
      const distObj = await prisma.district.findUnique({
        where: { id: districtId },
      });
      if (!distObj) {
        return { success: false, error: "Selected District does not exist." };
      }
      resolvedDistrictId = distObj.id;
    }

    // 2. Validate Farm ownership if farm update requested
    if (primaryFarmId && primaryFarmName) {
      const farm = await prisma.farm.findUnique({
        where: { id: primaryFarmId },
      });
      if (!farm || farm.farmerUserId !== farmer.id) {
        return { success: false, error: "Unauthorized: You do not own this farm." };
      }
      await prisma.farm.update({
        where: { id: primaryFarmId },
        data: { name: primaryFarmName.trim() },
      });
    }

    // 3. Update Farmer User in Prisma
    const updatedUser = await prisma.user.update({
      where: { id: farmer.id },
      data: {
        name: name.trim(),
        phone: phone.trim(),
        preferredLanguage: preferredLanguage || "en",
        districtId: resolvedDistrictId,
        blockId: resolvedBlockId,
        villageId: resolvedVillageId,
      },
    });

    // 4. Safely sync name with Clerk if possible
    try {
      if (farmer.clerkId) {
        const client = await clerkClient();
        const parts = name.trim().split(" ");
        const firstName = parts[0] || name.trim();
        const lastName = parts.slice(1).join(" ") || undefined;
        await client.users.updateUser(farmer.clerkId, {
          firstName,
          lastName,
        });
      }
    } catch (clerkErr) {
      console.warn("[Clerk Name Sync Warning]:", clerkErr);
    }

    // 5. Invalidate Next.js Server Cache
    try {
      revalidatePath("/farmer");
      revalidatePath("/farmer/profile");
      revalidatePath("/farmer/request-help");
      revalidatePath("/farmer/report");
      revalidatePath("/dashboard");
    } catch {
      // Safe fallback
    }

    return {
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        preferredLanguage: updatedUser.preferredLanguage,
      },
    };
  } catch (err: unknown) {
    console.error("[Update Farmer Profile Error]:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update profile.",
    };
  }
}

