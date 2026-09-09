import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireActiveUser, FullAppUser } from "./session";
import prisma from "@/lib/db/prisma";

export class AuthorizationError extends Error {
  constructor(message: string = "Unauthorized access attempt") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Requires the current user to be ACTIVE and possess a specific role.
 */
export async function requireRole(role: UserRole): Promise<FullAppUser> {
  const appUser = await requireActiveUser();
  if (appUser.role !== role) {
    redirect("/dashboard");
  }
  return appUser;
}

/**
 * Requires the current user to be ACTIVE and possess one of the allowed roles.
 */
export async function requireAnyRole(roles: UserRole[]): Promise<FullAppUser> {
  const appUser = await requireActiveUser();
  if (!roles.includes(appUser.role)) {
    redirect("/dashboard");
  }
  return appUser;
}

/** Specific role helpers */
export async function requireFarmer(): Promise<FullAppUser> {
  return await requireRole("FARMER");
}

export async function requireFieldAgent(): Promise<FullAppUser> {
  return await requireRole("FIELD_AGENT");
}

export async function requireVeterinarian(): Promise<FullAppUser> {
  return await requireRole("VETERINARIAN");
}

export async function requireDistrictAuthority(): Promise<FullAppUser> {
  return await requireRole("DISTRICT_AUTHORITY");
}

/* ==================================================
 * RESOURCE-LEVEL AUTHORIZATION HELPERS
 * ================================================== */

/**
 * Verifies that the authenticated Farmer owns the specified Animal.
 */
export async function assertFarmerOwnsAnimal(animalId: string): Promise<boolean> {
  const farmer = await requireFarmer();
  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
    include: {
      herd: {
        include: {
          farm: true,
        },
      },
    },
  });

  if (!animal || animal.herd.farm.farmerUserId !== farmer.id) {
    throw new AuthorizationError("You do not have ownership access to this animal record.");
  }
  return true;
}

/**
 * Verifies that the assigned Field Agent can access the specified Farm.
 */
export async function assertFieldAgentCanAccessFarm(farmId: string): Promise<boolean> {
  const agent = await requireFieldAgent();
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
  });

  if (!farm) {
    throw new AuthorizationError("Farm not found.");
  }

  // Agent is explicitly assigned OR assigned to the same village scope
  const isAssigned = farm.fieldAgentUserId === agent.id;
  const isSameVillage = agent.villageId && farm.villageId === agent.villageId;

  if (!isAssigned && !isSameVillage) {
    throw new AuthorizationError("You are not authorized to inspect this farm.");
  }
  return true;
}

/**
 * Verifies that a Veterinarian can review a health Case within their authorized district.
 */
export async function assertVetCanReviewCase(caseId: string): Promise<boolean> {
  const vet = await requireVeterinarian();
  const healthCase = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      animal: {
        include: {
          herd: {
            include: {
              farm: {
                include: {
                  village: {
                    include: {
                      block: true,
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

  if (!healthCase) {
    throw new AuthorizationError("Health case not found.");
  }

  const caseDistrictId = healthCase.animal.herd.farm.village.block.districtId;
  if (vet.districtId && caseDistrictId !== vet.districtId) {
    throw new AuthorizationError("Health case lies outside your assigned district jurisdiction.");
  }

  return true;
}

/**
 * Verifies that a District Authority has jurisdiction over a specific District.
 */
export async function assertAuthorityCanAccessDistrict(districtId: string): Promise<boolean> {
  const authority = await requireDistrictAuthority();
  if (authority.districtId && authority.districtId !== districtId) {
    throw new AuthorizationError("Access denied for district outside assigned jurisdiction.");
  }
  return true;
}
