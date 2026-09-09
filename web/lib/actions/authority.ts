"use server";

import prisma from "@/lib/db/prisma";
import { requireDistrictAuthority } from "@/lib/auth/permissions";
import { syncClerkApplicationState } from "@/lib/auth/metadata";
import { getAuthorityDashboardMetrics } from "@/lib/authority/metrics";
import { revalidatePath } from "next/cache";

/**
 * Lists all users with PENDING_APPROVAL status within the authority's jurisdiction.
 */
export async function listPendingApprovals() {
  const authority = await requireDistrictAuthority();

  const whereClause: { status: "PENDING_APPROVAL"; districtId?: string } = {
    status: "PENDING_APPROVAL",
  };

  if (authority.districtId) {
    whereClause.districtId = authority.districtId;
  }

  const pendingUsers = await prisma.user.findMany({
    where: whereClause,
    include: {
      district: true,
      block: true,
      village: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return pendingUsers;
}

/**
 * Approves a pending user account (Field Agent, Vet, or District Authority).
 * Updates Prisma status to ACTIVE and syncs Clerk publicMetadata.
 */
export async function approveUserAction(targetUserId: string) {
  const authority = await requireDistrictAuthority();

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    return { success: false, error: "Target user record not found." };
  }

  if (targetUser.status !== "PENDING_APPROVAL") {
    return { success: false, error: "User is not in PENDING_APPROVAL status." };
  }

  // Geographic jurisdiction check
  if (authority.districtId && targetUser.districtId && authority.districtId !== targetUser.districtId) {
    return { success: false, error: "Unauthorized: Target user belongs to another district." };
  }

  // Update status in Prisma
  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { status: "ACTIVE" },
  });

  // Sync Clerk publicMetadata
  await syncClerkApplicationState(updatedUser.clerkId, updatedUser.role, updatedUser.status);

  revalidatePath("/authority");
  revalidatePath("/authority/approvals");
  return { success: true, message: `Approved ${updatedUser.name} successfully.` };
}

/**
 * Rejects a pending user account.
 * Updates Prisma status to REJECTED and syncs Clerk publicMetadata.
 */
export async function rejectUserAction(targetUserId: string) {
  const authority = await requireDistrictAuthority();

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    return { success: false, error: "Target user record not found." };
  }

  // Geographic jurisdiction check
  if (authority.districtId && targetUser.districtId && authority.districtId !== targetUser.districtId) {
    return { success: false, error: "Unauthorized: Target user belongs to another district." };
  }

  // Update status in Prisma
  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { status: "REJECTED" },
  });

  // Sync Clerk publicMetadata
  await syncClerkApplicationState(updatedUser.clerkId, updatedUser.role, updatedUser.status);

  revalidatePath("/authority");
  revalidatePath("/authority/approvals");
  return { success: true, message: `Rejected ${updatedUser.name}.` };
}

/**
 * Retrieves summary surveillance metrics for the authority's district.
 */
export async function getAuthorityDashboardMetricsAction() {
  const authority = await requireDistrictAuthority();
  return await getAuthorityDashboardMetrics(authority.districtId);
}

/**
 * Retrieves active and historical alerts for the authority's district.
 */
export async function getDistrictAlertsAction() {
  const authority = await requireDistrictAuthority();

  const whereClause: { village?: { block: { districtId: string } } } = {};
  if (authority.districtId) {
    whereClause.village = {
      block: {
        districtId: authority.districtId,
      },
    };
  }

  const alerts = await prisma.alert.findMany({
    where: whereClause,
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
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });

  return alerts;
}

/**
 * Retrieves geographic surveillance hierarchy data (District -> Blocks -> Villages -> Farms -> Herds).
 */
export async function getGeographicHierarchyAction() {
  const authority = await requireDistrictAuthority();

  const districtWhere = authority.districtId ? { id: authority.districtId } : {};

  const hierarchy = await prisma.district.findMany({
    where: districtWhere,
    include: {
      blocks: {
        include: {
          villages: {
            include: {
              alerts: { where: { active: true } },
              farms: {
                include: {
                  herds: {
                    include: {
                      animals: {
                        include: {
                          cases: {
                            select: { id: true, status: true, reportedAt: true },
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

  return hierarchy;
}

/**
 * Retrieves surveillance-scoped cases for authority inspection (no sensitive clinical notes).
 */
export async function getAuthorityCaseListAction() {
  const authority = await requireDistrictAuthority();

  const whereClause: { animal?: { herd: { farm: { village: { block: { districtId: string } } } } } } = {};
  if (authority.districtId) {
    whereClause.animal = {
      herd: {
        farm: {
          village: {
            block: {
              districtId: authority.districtId,
            },
          },
        },
      },
    };
  }

  const cases = await prisma.case.findMany({
    where: whereClause,
    select: {
      id: true,
      caseNumber: true,
      status: true,
      reportedAt: true,
      reviewedAt: true,
      confirmedAt: true,
      affectedCount: true,
      mortalityCount: true,
      analysisResult: true,
      vetDiagnosis: true,
      animal: {
        select: {
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
                      block: { select: { name: true } },
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
    take: 50,
  });

  return cases;
}
