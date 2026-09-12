import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getGeographyTreeAction,
  createDistrictAction,
  updateDistrictAction,
  createBlockAction,
  updateBlockAction,
  createVillageAction,
  updateVillageAction,
} from "@/lib/actions/admin";
import prisma from "@/lib/db/prisma";
import * as permissionsModule from "@/lib/auth/permissions";
import * as auditModule from "@/lib/audit/log";

vi.mock("@/lib/db/prisma", () => ({
  default: {
    district: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    block: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    village: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/audit/log", () => ({
  logAuditEvent: vi.fn().mockResolvedValue({ id: "mock_audit_log_id" }),
}));

import type { FullAppUser } from "@/lib/auth/session";

describe("Admin Geography Master Data CRUD & Tree Integrity", () => {
  const mockAdmin: FullAppUser = {
    id: "admin_superuser_id",
    clerkId: "clerk_admin_id",
    name: "Admin User",
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


  describe("getGeographyTreeAction()", () => {
    it("returns complete hierarchical tree of Districts -> Blocks -> Villages", async () => {
      const mockTree = [
        {
          id: "dist_1",
          name: "Mayurbhanj",
          blocks: [
            {
              id: "blk_1",
              name: "Baripada",
              districtId: "dist_1",
              villages: [{ id: "vil_1", name: "Nuagaon", blockId: "blk_1" }],
            },
          ],
        },
      ];

      (prisma.district.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockTree);

      const res = await getGeographyTreeAction();
      expect(res).toEqual(mockTree);
      expect(prisma.district.findMany).toHaveBeenCalledWith({
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
    });
  });

  describe("District CRUD", () => {
    it("creates district and writes audit log", async () => {
      (prisma.district.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.district.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "dist_new",
        name: "Cuttack",
      });

      const res = await createDistrictAction({ name: "Cuttack", reason: "Administrative boundary" });

      expect(res.success).toBe(true);
      expect(prisma.district.create).toHaveBeenCalledWith({
        data: { name: "Cuttack" },
      });
      expect(auditModule.logAuditEvent).toHaveBeenCalledWith(
        "admin_superuser_id",
        "DISTRICT_CREATED",
        null,
        null,
        { id: "dist_new", name: "Cuttack" },
        "Administrative boundary"
      );
    });

    it("rejects duplicate district name", async () => {
      (prisma.district.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "dist_existing",
        name: "Mayurbhanj",
      });

      const res = await createDistrictAction({ name: "Mayurbhanj" });
      expect(res.success).toBe(false);
      expect(res.error).toContain("already exists");
    });

    it("updates district and writes audit log with previous vs new state", async () => {
      (prisma.district.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "dist_1",
        name: "Mayurbhanj Old",
      });
      (prisma.district.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "dist_1",
        name: "Mayurbhanj New",
      });

      const res = await updateDistrictAction("dist_1", { name: "Mayurbhanj New", reason: "Spelling correction" });

      expect(res.success).toBe(true);
      expect(prisma.district.update).toHaveBeenCalledWith({
        where: { id: "dist_1" },
        data: { name: "Mayurbhanj New" },
      });
      expect(auditModule.logAuditEvent).toHaveBeenCalledWith(
        "admin_superuser_id",
        "DISTRICT_UPDATED",
        null,
        { id: "dist_1", name: "Mayurbhanj Old" },
        { id: "dist_1", name: "Mayurbhanj New" },
        "Spelling correction"
      );
    });
  });

  describe("Block CRUD with Parent Validation", () => {
    it("creates block under existing parent district", async () => {
      (prisma.district.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "dist_1",
        name: "Mayurbhanj",
      });
      (prisma.block.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.block.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "blk_new",
        name: "Betnoti",
        districtId: "dist_1",
      });

      const res = await createBlockAction({
        districtId: "dist_1",
        name: "Betnoti",
        reason: "New administrative block",
      });

      expect(res.success).toBe(true);
      expect(prisma.block.create).toHaveBeenCalledWith({
        data: { name: "Betnoti", districtId: "dist_1" },
      });
      expect(auditModule.logAuditEvent).toHaveBeenCalledWith(
        "admin_superuser_id",
        "BLOCK_CREATED",
        null,
        null,
        { id: "blk_new", districtId: "dist_1", districtName: "Mayurbhanj", name: "Betnoti" },
        "New administrative block"
      );
    });

    it("rejects block creation when parent district does not exist", async () => {
      (prisma.district.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const res = await createBlockAction({
        districtId: "nonexistent_dist",
        name: "Orphan Block",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("does not exist");
      expect(prisma.block.create).not.toHaveBeenCalled();
    });

    it("updates block name and writes audit log", async () => {
      (prisma.block.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "blk_1",
        name: "Old Block Name",
        districtId: "dist_1",
      });
      (prisma.block.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "blk_1",
        name: "New Block Name",
        districtId: "dist_1",
      });

      const res = await updateBlockAction("blk_1", { name: "New Block Name", reason: "Renamed block" });
      expect(res.success).toBe(true);
      expect(prisma.block.update).toHaveBeenCalledWith({
        where: { id: "blk_1" },
        data: { name: "New Block Name", districtId: "dist_1" },
      });
      expect(auditModule.logAuditEvent).toHaveBeenCalledWith(
        "admin_superuser_id",
        "BLOCK_UPDATED",
        null,
        { id: "blk_1", districtId: "dist_1", name: "Old Block Name" },
        { id: "blk_1", districtId: "dist_1", name: "New Block Name" },
        "Renamed block"
      );
    });
  });

  describe("Village CRUD with Parent Validation", () => {
    it("creates village under existing parent block", async () => {
      (prisma.block.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "blk_1",
        name: "Betnoti",
        district: { id: "dist_1", name: "Mayurbhanj" },
      });
      (prisma.village.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.village.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "vil_new",
        name: "Nuagaon",
        blockId: "blk_1",
      });

      const res = await createVillageAction({
        blockId: "blk_1",
        name: "Nuagaon",
        reason: "New census village",
      });

      expect(res.success).toBe(true);
      expect(prisma.village.create).toHaveBeenCalledWith({
        data: { name: "Nuagaon", blockId: "blk_1" },
      });
      expect(auditModule.logAuditEvent).toHaveBeenCalledWith(
        "admin_superuser_id",
        "VILLAGE_CREATED",
        null,
        null,
        {
          id: "vil_new",
          blockId: "blk_1",
          blockName: "Betnoti",
          districtName: "Mayurbhanj",
          name: "Nuagaon",
        },
        "New census village"
      );
    });

    it("rejects village creation when parent block does not exist", async () => {
      (prisma.block.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const res = await createVillageAction({
        blockId: "nonexistent_blk",
        name: "Orphan Village",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("does not exist");
      expect(prisma.village.create).not.toHaveBeenCalled();
    });

    it("updates village name and writes audit log", async () => {
      (prisma.village.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "vil_1",
        name: "Old Village Name",
        blockId: "blk_1",
      });
      (prisma.village.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "vil_1",
        name: "New Village Name",
        blockId: "blk_1",
      });

      const res = await updateVillageAction("vil_1", { name: "New Village Name", reason: "Renamed village" });
      expect(res.success).toBe(true);
      expect(prisma.village.update).toHaveBeenCalledWith({
        where: { id: "vil_1" },
        data: { name: "New Village Name", blockId: "blk_1" },
      });
      expect(auditModule.logAuditEvent).toHaveBeenCalledWith(
        "admin_superuser_id",
        "VILLAGE_UPDATED",
        null,
        { id: "vil_1", blockId: "blk_1", name: "Old Village Name" },
        { id: "vil_1", blockId: "blk_1", name: "New Village Name" },
        "Renamed village"
      );
    });
  });
});

