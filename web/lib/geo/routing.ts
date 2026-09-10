import prisma from "@/lib/db/prisma";
import { FullAppUser } from "@/lib/auth/session";
import { UserRole } from "@prisma/client";

export enum LocationMatchTier {
  SAME_VILLAGE = "SAME_VILLAGE",
  SAME_BLOCK = "SAME_BLOCK",
  SAME_DISTRICT = "SAME_DISTRICT",
  NO_MATCH = "NO_MATCH",
}

export interface LocationCoordinates {
  villageId?: string | null;
  blockId?: string | null;
  districtId?: string | null;
}

/**
 * Calculates matching tier and priority score between a user and a target resource location.
 * Priority:
 * 1. Same village / locality (Score: 100)
 * 2. Same block / subdistrict / town (Score: 50)
 * 3. Same district (Score: 10)
 * 4. Cross-district / No Match (Score: 0)
 */
export function calculateLocationMatch(
  userLoc: LocationCoordinates,
  targetLoc: LocationCoordinates
): { tier: LocationMatchTier; score: number } {
  // If target has no location, no match
  if (!targetLoc.districtId && !targetLoc.blockId && !targetLoc.villageId) {
    return { tier: LocationMatchTier.NO_MATCH, score: 0 };
  }

  // 1. Same village / specific locality match (highest priority)
  if (userLoc.villageId && targetLoc.villageId && userLoc.villageId === targetLoc.villageId) {
    return { tier: LocationMatchTier.SAME_VILLAGE, score: 100 };
  }

  // 2. Same block / taluka / subdistrict / town match (medium priority)
  if (userLoc.blockId && targetLoc.blockId && userLoc.blockId === targetLoc.blockId) {
    return { tier: LocationMatchTier.SAME_BLOCK, score: 50 };
  }

  // 3. Same district fallback (broadest acceptable tier within jurisdiction)
  if (userLoc.districtId && targetLoc.districtId && userLoc.districtId === targetLoc.districtId) {
    return { tier: LocationMatchTier.SAME_DISTRICT, score: 10 };
  }

  // If user has no district assigned (global admin/super-user scenario)
  if (!userLoc.districtId && !userLoc.blockId && !userLoc.villageId) {
    return { tier: LocationMatchTier.SAME_DISTRICT, score: 5 };
  }

  return { tier: LocationMatchTier.NO_MATCH, score: 0 };
}

/**
 * Checks whether an authenticated user is authorized to view/access a resource with the given location.
 * Cross-district access is strictly denied.
 */
export function isLocationAuthorized(
  user: { role: UserRole; districtId?: string | null; blockId?: string | null; villageId?: string | null },
  targetLoc: LocationCoordinates
): boolean {
  // If user has district jurisdiction, target must match district
  if (user.districtId) {
    if (!targetLoc.districtId || user.districtId !== targetLoc.districtId) {
      return false;
    }
  }

  // For Field Agents, if they have block/village scoping, verify match
  if (user.role === "FIELD_AGENT") {
    // If agent has villageId, check if same village or same block
    if (user.villageId && targetLoc.villageId && user.villageId === targetLoc.villageId) {
      return true;
    }
    if (user.blockId && targetLoc.blockId && user.blockId === targetLoc.blockId) {
      return true;
    }
    if (user.districtId && targetLoc.districtId && user.districtId === targetLoc.districtId) {
      return true;
    }
    return !user.districtId; // If no jurisdiction set, allow default district
  }

  return true;
}

/**
 * Checks whether a user can access a specific health Case.
 * Evaluates Role + Location + Record Relationship + Authorization.
 */
export function canUserAccessCaseRecord(
  appUser: FullAppUser,
  healthCase: {
    id: string;
    createdByUserId: string;
    animal: {
      herd: {
        farm: {
          farmerUserId: string | null;
          fieldAgentUserId: string | null;
          villageId: string;
          village: {
            blockId: string;
            block: {
              districtId: string;
            };
          };
        };
      };
    };
  }
): boolean {
  const farm = healthCase.animal.herd.farm;
  const caseLocation: LocationCoordinates = {
    villageId: farm.villageId,
    blockId: farm.village.blockId,
    districtId: farm.village.block.districtId,
  };

  // 1. Farmer Access: Farmer owns the animal OR created the report
  if (appUser.role === "FARMER") {
    return healthCase.createdByUserId === appUser.id || farm.farmerUserId === appUser.id;
  }

  // 2. Field Agent Access: Agent created the report, is explicitly assigned to the farm, or farm lies in agent's scope
  if (appUser.role === "FIELD_AGENT") {
    if (healthCase.createdByUserId === appUser.id || farm.fieldAgentUserId === appUser.id) {
      return true;
    }
    return isLocationAuthorized(appUser, caseLocation);
  }

  // 3. Veterinarian Access: Case lies within Vet's assigned district jurisdiction
  if (appUser.role === "VETERINARIAN") {
    if (!appUser.districtId) return true;
    return farm.village.block.districtId === appUser.districtId;
  }

  // 4. District Authority Access: Case lies within Authority's assigned district
  if (appUser.role === "DISTRICT_AUTHORITY") {
    if (!appUser.districtId) return true;
    return farm.village.block.districtId === appUser.districtId;
  }

  return false;
}

/**
 * Checks whether a user can access an Assistance Request.
 */
export function canUserAccessAssistanceRequest(
  appUser: FullAppUser,
  request: {
    id: string;
    farmerUserId: string;
    assignedAgentUserId?: string | null;
    village: {
      id: string;
      blockId: string;
      block: {
        districtId: string;
      };
    };
  }
): boolean {
  const reqLocation: LocationCoordinates = {
    villageId: request.village.id,
    blockId: request.village.blockId,
    districtId: request.village.block.districtId,
  };

  // Farmer can only access their own requests
  if (appUser.role === "FARMER") {
    return request.farmerUserId === appUser.id;
  }

  // Field agent can access assigned requests or requests in their territory
  if (appUser.role === "FIELD_AGENT") {
    if (request.assignedAgentUserId === appUser.id) {
      return true;
    }
    return isLocationAuthorized(appUser, reqLocation);
  }

  // Vet & District Authority can inspect requests within their district
  if (appUser.role === "VETERINARIAN" || appUser.role === "DISTRICT_AUTHORITY") {
    if (!appUser.districtId) return true;
    return request.village.block.districtId === appUser.districtId;
  }

  return false;
}

/**
 * Finds eligible field agents for a given location, ordered by geographic proximity:
 * 1. Same village
 * 2. Same block
 * 3. Same district
 */
export async function findEligibleFieldAgents(
  villageId: string,
  blockId?: string | null,
  districtId?: string | null
) {
  // If blockId / districtId not provided, load from village
  let resolvedBlockId = blockId;
  let resolvedDistrictId = districtId;

  if (!resolvedBlockId || !resolvedDistrictId) {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { block: true },
    });
    if (village) {
      resolvedBlockId = village.blockId;
      resolvedDistrictId = village.block.districtId;
    }
  }

  const agents = await prisma.user.findMany({
    where: {
      role: "FIELD_AGENT",
      status: "ACTIVE",
      OR: [
        { villageId },
        { blockId: resolvedBlockId },
        { districtId: resolvedDistrictId },
        { districtId: null }, // Unassigned/roaming agent
      ],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      villageId: true,
      blockId: true,
      districtId: true,
    },
  });

  // Sort by location match priority
  return agents.sort((a, b) => {
    const targetLoc: LocationCoordinates = {
      villageId,
      blockId: resolvedBlockId,
      districtId: resolvedDistrictId,
    };
    const scoreA = calculateLocationMatch(a, targetLoc).score;
    const scoreB = calculateLocationMatch(b, targetLoc).score;
    return scoreB - scoreA;
  });
}
