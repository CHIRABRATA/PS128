import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAdmin } from "@/lib/auth/permissions";
import { logAuditEvent, serializeAuditValue } from "@/lib/audit/log";
import prisma from "@/lib/db/prisma";
import * as navigation from "next/navigation";
import * as sessionModule from "@/lib/auth/session";

vi.mock("@/lib/db/prisma", () => ({
  default: {
    auditLog: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

describe("Admin Role Authorization & Audit Log Foundation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAdmin() Guard", () => {
    it("allows access when user is ACTIVE with role ADMIN", async () => {
      const mockAdminUser: sessionModule.FullAppUser = {
        id: "user_admin_1",
        clerkId: "clerk_admin_1",
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

      vi.spyOn(sessionModule, "requireActiveUser").mockResolvedValue(mockAdminUser);

      const user = await requireAdmin();
      expect(user.role).toBe("ADMIN");
      expect(user.status).toBe("ACTIVE");
      expect(user.id).toBe("user_admin_1");
    });

    it("redirects to /dashboard when user is ACTIVE but role is FARMER", async () => {
      const mockFarmerUser: sessionModule.FullAppUser = {
        id: "user_farmer_1",
        clerkId: "clerk_farmer_1",
        name: "Farmer User",
        phone: "+919800000001",
        preferredLanguage: "en",
        telegramChatId: null,
        telegramLinkToken: null,
        telegramLinkTokenCreatedAt: null,
        role: "FARMER" as const,
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

      vi.spyOn(sessionModule, "requireActiveUser").mockResolvedValue(mockFarmerUser);

      await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
      expect(navigation.redirect).toHaveBeenCalledWith("/dashboard");
    });

    it("redirects to /dashboard when user is ACTIVE but role is DISTRICT_AUTHORITY", async () => {
      const mockAuthorityUser: sessionModule.FullAppUser = {
        id: "user_authority_1",
        clerkId: "clerk_auth_1",
        name: "District Officer",
        phone: "+919800000002",
        preferredLanguage: "en",
        telegramChatId: null,
        telegramLinkToken: null,
        telegramLinkTokenCreatedAt: null,
        role: "DISTRICT_AUTHORITY" as const,
        status: "ACTIVE" as const,
        districtId: "dist_1",
        blockId: null,
        villageId: null,
        district: null,
        block: null,
        village: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(sessionModule, "requireActiveUser").mockResolvedValue(mockAuthorityUser);

      await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
      expect(navigation.redirect).toHaveBeenCalledWith("/dashboard");
    });

    it("redirects to /dashboard when user is ACTIVE but role is VETERINARIAN", async () => {
      const mockVetUser: sessionModule.FullAppUser = {
        id: "user_vet_1",
        clerkId: "clerk_vet_1",
        name: "Dr. Vet",
        phone: "+919800000003",
        preferredLanguage: "en",
        telegramChatId: null,
        telegramLinkToken: null,
        telegramLinkTokenCreatedAt: null,
        role: "VETERINARIAN" as const,
        status: "ACTIVE" as const,
        districtId: "dist_1",
        blockId: null,
        villageId: null,
        district: null,
        block: null,
        village: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(sessionModule, "requireActiveUser").mockResolvedValue(mockVetUser);

      await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
      expect(navigation.redirect).toHaveBeenCalledWith("/dashboard");
    });

    it("redirects to /pending-approval when user status is PENDING_APPROVAL", async () => {
      vi.spyOn(sessionModule, "requireAuthenticatedUser").mockResolvedValue("clerk_pending_1");
      vi.spyOn(sessionModule, "getCurrentAppUser").mockResolvedValue({
        id: "user_pending_1",
        clerkId: "clerk_pending_1",
        name: "Pending User",
        phone: "+919800000004",
        preferredLanguage: "en",
        telegramChatId: null,
        telegramLinkToken: null,
        telegramLinkTokenCreatedAt: null,
        role: "ADMIN" as const,
        status: "PENDING_APPROVAL" as const,
        districtId: null,
        blockId: null,
        villageId: null,
        district: null,
        block: null,
        village: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(sessionModule, "requireActiveUser").mockImplementation(async () => {
        navigation.redirect("/pending-approval");
        throw new Error("NEXT_REDIRECT:/pending-approval");
      });


      await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/pending-approval");
      expect(navigation.redirect).toHaveBeenCalledWith("/pending-approval");
    });
  });

  describe("logAuditEvent() & Secret Redaction", () => {
    it("redacts sensitive keys in JSON payloads before creating audit record", async () => {
      const mockCreatedLog = {
        id: "audit_log_1",
        action: "TEST_ACTION",
        actorUserId: "user_admin_1",
        targetUserId: "user_target_1",
        previousValue: { name: "Old Name", passwordHash: "[REDACTED]" },
        newValue: { name: "New Name", apiKey: "[REDACTED]", token: "[REDACTED]" },
        reason: "Testing redaction",
        createdAt: new Date(),
      };

      (prisma.auditLog.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockCreatedLog);

      const res = await logAuditEvent(
        "user_admin_1",
        "TEST_ACTION",
        "user_target_1",
        { name: "Old Name", passwordHash: "supersecret123" },
        { name: "New Name", apiKey: "sk-proj-xyz987", token: "bearer-token-123" },
        "Testing redaction"
      );

      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      const callArgs = (prisma.auditLog.create as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];

      expect(callArgs.data.action).toBe("TEST_ACTION");
      expect(callArgs.data.actorUserId).toBe("user_admin_1");
      expect(callArgs.data.targetUserId).toBe("user_target_1");
      expect(callArgs.data.reason).toBe("Testing redaction");

      // Verify secrets were redacted in serialized JSON string
      expect(JSON.parse(callArgs.data.previousValue)).toEqual({
        name: "Old Name",
        passwordHash: "[REDACTED]",
      });
      expect(JSON.parse(callArgs.data.newValue)).toEqual({
        name: "New Name",
        apiKey: "[REDACTED]",
        token: "[REDACTED]",
      });
      expect(res).toEqual(mockCreatedLog);
    });

    it("serializeAuditValue handles primitives, objects, and arrays safely", () => {
      expect(serializeAuditValue(null)).toBeNull();
      expect(serializeAuditValue(undefined)).toBeNull();
      expect(serializeAuditValue(42)).toBe("42");
      expect(serializeAuditValue("string value")).toBe("string value");

      const nestedObj = {
        district: "Mayurbhanj",
        metadata: {
          secretKey: "hidden",
          publicCode: "PUB123",
        },
      };

      const serialized = serializeAuditValue(nestedObj);
      expect(JSON.parse(serialized!)).toEqual({
        district: "Mayurbhanj",
        metadata: {
          secretKey: "[REDACTED]",
          publicCode: "PUB123",
        },
      });
    });
  });
});


