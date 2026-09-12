import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAdminDashboardMetricsAction, listAuditLogAction } from "@/lib/actions/admin";
import prisma from "@/lib/db/prisma";
import * as permissionsModule from "@/lib/auth/permissions";

vi.mock("@/lib/db/prisma", () => ({
  default: {
    user: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    district: {
      findMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import type { FullAppUser } from "@/lib/auth/session";

describe("Admin Dashboard Metrics & Audit Ledger Queries", () => {
  const mockAdmin: FullAppUser = {
    id: "admin_user_id",
    clerkId: "clerk_admin_id",
    name: "Admin Superuser",
    phone: "+919800000000",
    preferredLanguage: "en",
    telegramChatId: null,
    telegramLinkToken: null,
    telegramLinkTokenCreatedAt: null,
    role: "ADMIN" as const,
    status: "ACTIVE" as const,
    districtId: null,
    blockId: null,
    villageId: null,
    district: null,
    block: null,
    village: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(permissionsModule, "requireAdmin").mockResolvedValue(mockAdmin);
  });


  describe("getAdminDashboardMetricsAction()", () => {
    it("aggregates role/status distribution, district gaps, overdue approvals, and recent audit feed", async () => {
      // 1. Mock user.groupBy for role/status
      (prisma.user.groupBy as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
        { role: "ADMIN", status: "ACTIVE", _count: { id: 1 } },
        { role: "DISTRICT_AUTHORITY", status: "ACTIVE", _count: { id: 2 } },
        { role: "VETERINARIAN", status: "ACTIVE", _count: { id: 5 } },
        { role: "VETERINARIAN", status: "PENDING_APPROVAL", _count: { id: 2 } },
        { role: "FIELD_AGENT", status: "ACTIVE", _count: { id: 10 } },
        { role: "FARMER", status: "ACTIVE", _count: { id: 50 } },
      ]);

      // 2. Mock district.findMany with users to identify operational gaps
      (prisma.district.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: "dist_1",
          name: "Mayurbhanj",
          users: [
            { role: "DISTRICT_AUTHORITY", status: "ACTIVE" },
            { role: "VETERINARIAN", status: "ACTIVE" },
            { role: "FIELD_AGENT", status: "ACTIVE" },
            { role: "FARMER", status: "ACTIVE" },
          ],
        },
        {
          id: "dist_2",
          name: "Sundargarh",
          users: [
            // ZERO active authorities in this district!
            { role: "VETERINARIAN", status: "ACTIVE" },
            { role: "FIELD_AGENT", status: "ACTIVE" },
            { role: "FARMER", status: "ACTIVE" },
          ],
        },
      ]);

      // 3. Mock overdue pending users (>48h)
      const mockOverdueCreated = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72h ago
      (prisma.user.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: "pending_vet_1",
          name: "Dr. Overdue Vet",
          phone: "+919876543210",
          role: "VETERINARIAN",
          createdAt: mockOverdueCreated,
          district: { name: "Sundargarh" },
          block: { name: "Rourkela" },
          village: null,
        },
      ]);

      (prisma.user.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(2);

      // 4. Mock 10 most recent audit logs
      const logDate = new Date();
      (prisma.auditLog.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: "log_1",
          action: "DISTRICT_CREATED",
          actorUserId: "admin_user_id",
          actorUser: { id: "admin_user_id", name: "Admin Superuser", role: "ADMIN" },
          targetUserId: null,
          targetUser: null,
          previousValue: null,
          newValue: { id: "dist_3", name: "Keonjhar" },
          reason: "District setup",
          createdAt: logDate,
        },
      ]);

      const result = await getAdminDashboardMetricsAction();

      // Assertions
      expect(result.adminUser.id).toBe("admin_user_id");
      expect(result.userDistribution).toHaveLength(6);

      // Verify district gaps calculation
      expect(result.districtGaps).toHaveLength(2);
      expect(result.districtsWithZeroAuthorities).toHaveLength(1);
      expect(result.districtsWithZeroAuthorities[0].districtId).toBe("dist_2");
      expect(result.districtsWithZeroAuthorities[0].districtName).toBe("Sundargarh");
      expect(result.districtsWithZeroAuthorities[0].activeAuthorityCount).toBe(0);

      // Verify overdue approvals
      expect(result.pendingApprovalsOverdue).toHaveLength(1);
      expect(result.pendingApprovalsOverdue[0].name).toBe("Dr. Overdue Vet");
      expect(result.pendingApprovalsOverdue[0].hoursPending).toBeGreaterThanOrEqual(71);

      // Verify recent audit logs
      expect(result.recentAuditLogs).toHaveLength(1);
      expect(result.recentAuditLogs[0].action).toBe("DISTRICT_CREATED");
      expect(result.recentAuditLogs[0].actorName).toBe("Admin Superuser");
    });
  });

  describe("listAuditLogAction()", () => {
    it("applies filtering by action, actor, target, date range and paginates properly", async () => {
      const mockLogs = [
        {
          id: "log_101",
          action: "BLOCK_CREATED",
          actorUserId: "admin_user_id",
          actorUser: { id: "admin_user_id", name: "Admin Superuser", role: "ADMIN" },
          targetUserId: null,
          targetUser: null,
          previousValue: null,
          newValue: { name: "Betnoti" },
          reason: "New block",
          createdAt: new Date("2026-09-12T00:00:00.000Z"),
        },
      ];

      (prisma.auditLog.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      (prisma.auditLog.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockLogs);

      const result = await listAuditLogAction(
        {
          action: "BLOCK_CREATED",
          actorUserId: "admin_user_id",
          dateFrom: "2026-09-01",
          dateTo: "2026-09-12",
        },
        {
          page: 1,
          pageSize: 20,
        }
      );

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { contains: "BLOCK_CREATED", mode: "insensitive" },
            actorUserId: "admin_user_id",
            createdAt: expect.any(Object),
          }),
          skip: 0,
          take: 20,
        })
      );

      expect(result.totalCount).toBe(1);
      expect(result.page).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].action).toBe("BLOCK_CREATED");
    });
  });
});
