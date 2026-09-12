"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/permissions";
import { logAuditEvent } from "@/lib/audit/log";
import { UserRole, UserStatus } from "@prisma/client";

/* =========================================================================
 * 1. ADMIN DASHBOARD METRICS & AUDIT QUERIES
 * ========================================================================= */

export interface RoleStatusMetric {
  role: UserRole;
  status: UserStatus;
  count: number;
}

export interface DistrictOperationalGap {
  districtId: string;
  districtName: string;
  activeAuthorityCount: number;
  totalVets: number;
  totalAgents: number;
  totalFarmers: number;
}

export interface PendingApprovalItem {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  createdAt: string;
  hoursPending: number;
  districtName: string | null;
  blockName: string | null;
  villageName: string | null;
}

export async function getAdminDashboardMetricsAction() {
  const admin = await requireAdmin();

  // A. User counts grouped by role and status
  const roleStatusGroups = await prisma.user.groupBy({
    by: ["role", "status"],
    _count: {
      id: true,
    },
  });

  const userDistribution: RoleStatusMetric[] = roleStatusGroups.map((g) => ({
    role: g.role,
    status: g.status,
    count: g._count.id,
  }));

  // B. District Operational Gaps (Districts with ZERO active District Authorities)
  const allDistricts = await prisma.district.findMany({
    orderBy: { name: "asc" },
    include: {
      users: {
        select: {
          role: true,
          status: true,
        },
      },
    },
  });

  const districtGaps: DistrictOperationalGap[] = allDistricts.map((d) => {
    const activeAuthorities = d.users.filter(
      (u) => u.role === "DISTRICT_AUTHORITY" && u.status === "ACTIVE"
    ).length;
    const totalVets = d.users.filter((u) => u.role === "VETERINARIAN" && u.status === "ACTIVE").length;
    const totalAgents = d.users.filter((u) => u.role === "FIELD_AGENT" && u.status === "ACTIVE").length;
    const totalFarmers = d.users.filter((u) => u.role === "FARMER" && u.status === "ACTIVE").length;

    return {
      districtId: d.id,
      districtName: d.name,
      activeAuthorityCount: activeAuthorities,
      totalVets,
      totalAgents,
      totalFarmers,
    };
  });

  const districtsWithZeroAuthorities = districtGaps.filter((d) => d.activeAuthorityCount === 0);

  // C. Pending Approvals older than 48 hours
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const overduePendingUsers = await prisma.user.findMany({
    where: {
      status: "PENDING_APPROVAL",
      createdAt: {
        lte: fortyEightHoursAgo,
      },
    },
    include: {
      district: true,
      block: true,
      village: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const pendingApprovalsOverdue: PendingApprovalItem[] = overduePendingUsers.map((u) => {
    const diffMs = Date.now() - new Date(u.createdAt).getTime();
    const hoursPending = Math.floor(diffMs / (1000 * 60 * 60));
    return {
      id: u.id,
      name: u.name,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      hoursPending,
      districtName: u.district?.name || null,
      blockName: u.block?.name || null,
      villageName: u.village?.name || null,
    };
  });

  // Total pending count (all pending)
  const totalPendingApprovals = await prisma.user.count({
    where: { status: "PENDING_APPROVAL" },
  });

  // D. 10 Most Recent Audit Logs
  const recentAuditLogs = await prisma.auditLog.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      actorUser: {
        select: { id: true, name: true, role: true },
      },
      targetUser: {
        select: { id: true, name: true, role: true },
      },
    },
  });

  return {
    adminUser: {
      id: admin.id,
      name: admin.name,
    },
    userDistribution,
    districtGaps,
    districtsWithZeroAuthorities,
    pendingApprovalsOverdue,
    totalPendingApprovals,
    recentAuditLogs: recentAuditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      actorUserId: log.actorUserId,
      actorName: log.actorUser?.name || "System",
      actorRole: log.actorUser?.role || null,
      targetUserId: log.targetUserId,
      targetName: log.targetUser?.name || null,
      targetRole: log.targetUser?.role || null,
      previousValue: log.previousValue,
      newValue: log.newValue,
      reason: log.reason,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

/* =========================================================================
 * 2. SEARCHABLE AUDIT LOG (READ-ONLY, PAGINATED)
 * ========================================================================= */

export interface AuditLogFilters {
  action?: string;
  actorUserId?: string;
  targetUserId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditLogPagination {
  page?: number;
  pageSize?: number;
}

export async function listAuditLogAction(
  filters: AuditLogFilters = {},
  pagination: AuditLogPagination = {}
) {
  await requireAdmin();

  const page = Math.max(1, pagination.page || 1);
  const pageSize = Math.min(100, Math.max(1, pagination.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const whereClause: Record<string, unknown> = {};

  if (filters.action && filters.action.trim() !== "") {
    whereClause.action = { contains: filters.action.trim(), mode: "insensitive" };
  }

  if (filters.actorUserId && filters.actorUserId.trim() !== "") {
    whereClause.actorUserId = filters.actorUserId.trim();
  }

  if (filters.targetUserId && filters.targetUserId.trim() !== "") {
    whereClause.targetUserId = filters.targetUserId.trim();
  }

  if (filters.dateFrom || filters.dateTo) {
    const createdAtFilter: Record<string, Date> = {};
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      if (!isNaN(fromDate.getTime())) {
        fromDate.setHours(0, 0, 0, 0);
        createdAtFilter.gte = fromDate;
      }
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        createdAtFilter.lte = toDate;
      }
    }
    if (Object.keys(createdAtFilter).length > 0) {
      whereClause.createdAt = createdAtFilter;
    }
  }

  const [totalCount, items] = await Promise.all([
    prisma.auditLog.count({ where: whereClause }),
    prisma.auditLog.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        actorUser: {
          select: { id: true, name: true, role: true },
        },
        targetUser: {
          select: { id: true, name: true, role: true },
        },
      },
    }),
  ]);

  return {
    items: items.map((log) => ({
      id: log.id,
      action: log.action,
      actorUserId: log.actorUserId,
      actorName: log.actorUser?.name || "System",
      actorRole: log.actorUser?.role || null,
      targetUserId: log.targetUserId,
      targetName: log.targetUser?.name || null,
      targetRole: log.targetUser?.role || null,
      previousValue: log.previousValue,
      newValue: log.newValue,
      reason: log.reason,
      createdAt: log.createdAt.toISOString(),
    })),
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize) || 1,
  };
}

/* =========================================================================
 * 3. READ-ONLY GEOGRAPHY TREE HIERARCHY
 * ========================================================================= */

export async function getGeographyTreeAction() {
  await requireAdmin();

  const districts = await prisma.district.findMany({
    orderBy: { name: "asc" },
    include: {
      blocks: {
        orderBy: { name: "asc" },
        include: {
          villages: {
            orderBy: { name: "asc" },
          },
        },
      },
    },
  });

  return districts;
}

/* =========================================================================
 * 4. GEOGRAPHY MASTER DATA CRUD WITH AUDIT LOGGING
 * ========================================================================= */

/**
 * Creates a new District.
 */
export async function createDistrictAction(data: { name: string; reason?: string }) {
  const admin = await requireAdmin();

  const cleanName = data.name.trim();
  if (!cleanName) {
    return { success: false, error: "District name cannot be empty." };
  }

  // Check for uniqueness
  const existing = await prisma.district.findUnique({
    where: { name: cleanName },
  });
  if (existing) {
    return { success: false, error: `District "${cleanName}" already exists.` };
  }

  const district = await prisma.district.create({
    data: { name: cleanName },
  });

  await logAuditEvent(
    admin.id,
    "DISTRICT_CREATED",
    null,
    null,
    { id: district.id, name: district.name },
    data.reason || "Admin created new district"
  );

  revalidatePath("/admin/geography");
  revalidatePath("/authority/locations");
  return { success: true, district };
}

/**
 * Updates an existing District.
 */
export async function updateDistrictAction(districtId: string, data: { name: string; reason?: string }) {
  const admin = await requireAdmin();

  const cleanName = data.name.trim();
  if (!cleanName) {
    return { success: false, error: "District name cannot be empty." };
  }

  const existing = await prisma.district.findUnique({
    where: { id: districtId },
  });
  if (!existing) {
    return { success: false, error: "District not found." };
  }

  const updated = await prisma.district.update({
    where: { id: districtId },
    data: { name: cleanName },
  });

  await logAuditEvent(
    admin.id,
    "DISTRICT_UPDATED",
    null,
    { id: existing.id, name: existing.name },
    { id: updated.id, name: updated.name },
    data.reason || "Admin updated district"
  );

  revalidatePath("/admin/geography");
  revalidatePath("/authority/locations");
  return { success: true, district: updated };
}

/**
 * Creates a new Block under a validated parent District.
 */
export async function createBlockAction(data: { districtId: string; name: string; reason?: string }) {
  const admin = await requireAdmin();

  const cleanName = data.name.trim();
  if (!cleanName) {
    return { success: false, error: "Block name cannot be empty." };
  }

  if (!data.districtId) {
    return { success: false, error: "Parent district ID is required." };
  }

  // Parent validation: Ensure district exists
  const parentDistrict = await prisma.district.findUnique({
    where: { id: data.districtId },
  });
  if (!parentDistrict) {
    return { success: false, error: `Parent district with ID "${data.districtId}" does not exist.` };
  }

  // Ensure unique block name within this district
  const existing = await prisma.block.findUnique({
    where: {
      districtId_name: {
        districtId: data.districtId,
        name: cleanName,
      },
    },
  });
  if (existing) {
    return { success: false, error: `Block "${cleanName}" already exists in ${parentDistrict.name}.` };
  }

  const block = await prisma.block.create({
    data: {
      name: cleanName,
      districtId: data.districtId,
    },
  });

  await logAuditEvent(
    admin.id,
    "BLOCK_CREATED",
    null,
    null,
    { id: block.id, districtId: block.districtId, districtName: parentDistrict.name, name: block.name },
    data.reason || "Admin created new block"
  );

  revalidatePath("/admin/geography");
  revalidatePath("/authority/locations");
  return { success: true, block };
}

/**
 * Updates an existing Block.
 */
export async function updateBlockAction(
  blockId: string,
  data: { name: string; districtId?: string; reason?: string }
) {
  const admin = await requireAdmin();

  const cleanName = data.name.trim();
  if (!cleanName) {
    return { success: false, error: "Block name cannot be empty." };
  }

  const existing = await prisma.block.findUnique({
    where: { id: blockId },
    include: { district: true },
  });
  if (!existing) {
    return { success: false, error: "Block not found." };
  }

  const targetDistrictId = data.districtId || existing.districtId;

  // If districtId is being changed, validate new parent district exists
  if (data.districtId && data.districtId !== existing.districtId) {
    const parentDistrict = await prisma.district.findUnique({
      where: { id: data.districtId },
    });
    if (!parentDistrict) {
      return { success: false, error: `Target district with ID "${data.districtId}" does not exist.` };
    }
  }

  const updated = await prisma.block.update({
    where: { id: blockId },
    data: {
      name: cleanName,
      districtId: targetDistrictId,
    },
  });

  await logAuditEvent(
    admin.id,
    "BLOCK_UPDATED",
    null,
    { id: existing.id, districtId: existing.districtId, name: existing.name },
    { id: updated.id, districtId: updated.districtId, name: updated.name },
    data.reason || "Admin updated block"
  );

  revalidatePath("/admin/geography");
  revalidatePath("/authority/locations");
  return { success: true, block: updated };
}

/**
 * Creates a new Village under a validated parent Block.
 */
export async function createVillageAction(data: { blockId: string; name: string; reason?: string }) {
  const admin = await requireAdmin();

  const cleanName = data.name.trim();
  if (!cleanName) {
    return { success: false, error: "Village name cannot be empty." };
  }

  if (!data.blockId) {
    return { success: false, error: "Parent block ID is required." };
  }

  // Parent validation: Ensure block exists
  const parentBlock = await prisma.block.findUnique({
    where: { id: data.blockId },
    include: { district: true },
  });
  if (!parentBlock) {
    return { success: false, error: `Parent block with ID "${data.blockId}" does not exist.` };
  }

  // Ensure unique village name within this block
  const existing = await prisma.village.findUnique({
    where: {
      blockId_name: {
        blockId: data.blockId,
        name: cleanName,
      },
    },
  });
  if (existing) {
    return { success: false, error: `Village "${cleanName}" already exists in ${parentBlock.name}.` };
  }

  const village = await prisma.village.create({
    data: {
      name: cleanName,
      blockId: data.blockId,
    },
  });

  await logAuditEvent(
    admin.id,
    "VILLAGE_CREATED",
    null,
    null,
    {
      id: village.id,
      blockId: village.blockId,
      blockName: parentBlock.name,
      districtName: parentBlock.district.name,
      name: village.name,
    },
    data.reason || "Admin created new village"
  );

  revalidatePath("/admin/geography");
  revalidatePath("/authority/locations");
  return { success: true, village };
}

/**
 * Updates an existing Village.
 */
export async function updateVillageAction(
  villageId: string,
  data: { name: string; blockId?: string; reason?: string }
) {
  const admin = await requireAdmin();

  const cleanName = data.name.trim();
  if (!cleanName) {
    return { success: false, error: "Village name cannot be empty." };
  }

  const existing = await prisma.village.findUnique({
    where: { id: villageId },
    include: { block: true },
  });
  if (!existing) {
    return { success: false, error: "Village not found." };
  }

  const targetBlockId = data.blockId || existing.blockId;

  // If blockId changed, validate parent block exists
  if (data.blockId && data.blockId !== existing.blockId) {
    const parentBlock = await prisma.block.findUnique({
      where: { id: data.blockId },
    });
    if (!parentBlock) {
      return { success: false, error: `Target block with ID "${data.blockId}" does not exist.` };
    }
  }

  const updated = await prisma.village.update({
    where: { id: villageId },
    data: {
      name: cleanName,
      blockId: targetBlockId,
    },
  });

  await logAuditEvent(
    admin.id,
    "VILLAGE_UPDATED",
    null,
    { id: existing.id, blockId: existing.blockId, name: existing.name },
    { id: updated.id, blockId: updated.blockId, name: updated.name },
    data.reason || "Admin updated village"
  );

  revalidatePath("/admin/geography");
  revalidatePath("/authority/locations");
  return { success: true, village: updated };
}
