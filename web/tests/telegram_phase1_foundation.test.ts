import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateSecureLinkToken,
  hashLinkToken,
  verifyWebhookSecret,
} from "@/lib/telegram/security";
import {
  generateTelegramLinkTokenAction,
  getTelegramStatusAction,
  unlinkTelegramAccountAction,
} from "@/lib/actions/telegram";
import prisma from "@/lib/db/prisma";
import * as clerkNextjs from "@clerk/nextjs/server";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

describe("Phase 1: Telegram Security & Account Linking Foundation", () => {
  const testClerkId1 = "clerk_test_user_farmer_1";
  const testClerkId2 = "clerk_test_user_vet_2";
  let user1Id: string;
  let user2Id: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Clean up previous test records
    await prisma.telegramNotificationDelivery.deleteMany();
    await prisma.telegramLinkToken.deleteMany();
    await prisma.telegramConnection.deleteMany();
    await prisma.inAppNotification.deleteMany();
    await prisma.user.deleteMany({
      where: {
        clerkId: { in: [testClerkId1, testClerkId2] },
      },
    });

    // Create test users
    const u1 = await prisma.user.create({
      data: {
        clerkId: testClerkId1,
        role: "FARMER",
        status: "ACTIVE",
        name: "Test Farmer 1",
        phone: "+919876543210",
      },
    });
    user1Id = u1.id;

    const u2 = await prisma.user.create({
      data: {
        clerkId: testClerkId2,
        role: "VETERINARIAN",
        status: "ACTIVE",
        name: "Test Vet 2",
        phone: "+919876543211",
      },
    });
    user2Id = u2.id;
  });

  describe("1. Secure Token Generation & Cryptography", () => {
    it("generates a cryptographically secure token of at least 32 random bytes (64 hex characters)", () => {
      const token = generateSecureLinkToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThanOrEqual(64);
      // Hex character validation
      expect(/^[0-9a-f]+$/i.test(token)).toBe(true);
    });

    it("ensures generated tokens are sufficiently random and collision-free", () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const token = generateSecureLinkToken();
        expect(tokens.has(token)).toBe(false);
        tokens.add(token);
      }
      expect(tokens.size).toBe(100);
    });

    it("correctly computes deterministic SHA-256 hash", () => {
      const token = "sample_raw_token_1234567890abcdef";
      const hash1 = hashLinkToken(token);
      const hash2 = hashLinkToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
      expect(hash1).not.toBe(token);
    });
  });

  describe("2. Webhook Secret Validation", () => {
    it("validates secret header against configured environment secret", () => {
      process.env.TELEGRAM_WEBHOOK_SECRET = "super_secret_webhook_phrase_123";

      expect(verifyWebhookSecret("super_secret_webhook_phrase_123")).toBe(true);
      expect(verifyWebhookSecret("wrong_secret_header")).toBe(false);
      expect(verifyWebhookSecret(null)).toBe(false);
      expect(verifyWebhookSecret(undefined)).toBe(false);
    });
  });

  describe("3. Server Action: generateTelegramLinkTokenAction", () => {
    it("rejects unauthenticated requests", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      const res = await generateTelegramLinkTokenAction();
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/unauthenticated/i);
    });

    it("generates a single-use token, stores ONLY hash in database, and sets 10-minute expiry", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: testClerkId1 } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      const beforeTime = Date.now();
      const res = await generateTelegramLinkTokenAction();

      expect(res.success).toBe(true);
      expect(res.token).toBeDefined();
      expect(res.linkUrl).toBeDefined();
      expect(res.linkUrl).toContain(res.token!);
      expect(res.expiresAt).toBeDefined();

      const expiresTime = new Date(res.expiresAt!).getTime();
      const diffMinutes = (expiresTime - beforeTime) / (60 * 1000);
      expect(diffMinutes).toBeGreaterThanOrEqual(9.9);
      expect(diffMinutes).toBeLessThanOrEqual(10.1);

      // Verify that database record contains ONLY the hash, NEVER the raw token
      const linkRecord = await prisma.telegramLinkToken.findFirst({
        where: { userId: user1Id },
      });

      expect(linkRecord).not.toBeNull();
      expect(linkRecord!.tokenHash).toBe(hashLinkToken(res.token!));
      expect(linkRecord!.tokenHash).not.toBe(res.token);
      expect(linkRecord!.usedAt).toBeNull();
    });

    it("invalidates previous unused tokens when a new one is requested", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: testClerkId1 } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      const res1 = await generateTelegramLinkTokenAction();
      expect(res1.success).toBe(true);

      const count1 = await prisma.telegramLinkToken.count({
        where: { userId: user1Id, usedAt: null },
      });
      expect(count1).toBe(1);

      const res2 = await generateTelegramLinkTokenAction();
      expect(res2.success).toBe(true);
      expect(res2.token).not.toBe(res1.token);

      // Only the newest token should remain active
      const count2 = await prisma.telegramLinkToken.count({
        where: { userId: user1Id, usedAt: null },
      });
      expect(count2).toBe(1);

      const activeRecord = await prisma.telegramLinkToken.findFirst({
        where: { userId: user1Id, usedAt: null },
      });
      expect(activeRecord!.tokenHash).toBe(hashLinkToken(res2.token!));
    });
  });

  describe("4. Server Action: getTelegramStatusAction", () => {
    it("returns isLinked: false when user has no active connection", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: testClerkId1 } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      const res = await getTelegramStatusAction();
      expect(res.success).toBe(true);
      expect(res.isLinked).toBe(false);
      expect(res.username).toBeUndefined();
    });

    it("returns isLinked: true and safe metadata when connected", async () => {
      // Connect user 1
      await prisma.telegramConnection.create({
        data: {
          userId: user1Id,
          telegramChatId: "987654321",
          telegramUsername: "farmer_john",
          isActive: true,
        },
      });

      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: testClerkId1 } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      const res = await getTelegramStatusAction();
      expect(res.success).toBe(true);
      expect(res.isLinked).toBe(true);
      expect(res.username).toBe("farmer_john");
      expect(res.connectedAt).toBeDefined();

      // Ensure no internal credentials/IDs are leaked
      expect((res as unknown as Record<string, unknown>).telegramChatId).toBeUndefined();
      expect((res as unknown as Record<string, unknown>).botToken).toBeUndefined();
    });

    it("enforces strict user isolation: User 2 cannot see User 1 connection status", async () => {
      await prisma.telegramConnection.create({
        data: {
          userId: user1Id,
          telegramChatId: "987654321",
          telegramUsername: "farmer_john",
          isActive: true,
        },
      });

      // Authenticate as User 2
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: testClerkId2 } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      const res2 = await getTelegramStatusAction();
      expect(res2.success).toBe(true);
      expect(res2.isLinked).toBe(false);
      expect(res2.username).toBeUndefined();
    });
  });

  describe("5. Server Action: unlinkTelegramAccountAction", () => {
    it("deactivates the authenticated user connection without affecting other users", async () => {
      // Connect User 1 and User 2
      await prisma.telegramConnection.create({
        data: {
          userId: user1Id,
          telegramChatId: "111111111",
          telegramUsername: "farmer_1",
          isActive: true,
        },
      });

      await prisma.telegramConnection.create({
        data: {
          userId: user2Id,
          telegramChatId: "222222222",
          telegramUsername: "vet_2",
          isActive: true,
        },
      });

      // User 1 unlinks
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: testClerkId1 } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);
      const unlinkRes = await unlinkTelegramAccountAction();
      expect(unlinkRes.success).toBe(true);

      // Verify User 1 is deactivated
      const u1Conn = await prisma.telegramConnection.findUnique({
        where: { userId: user1Id },
      });
      expect(u1Conn?.isActive).toBe(false);

      // Verify User 2 remains untouched and active
      const u2Conn = await prisma.telegramConnection.findUnique({
        where: { userId: user2Id },
      });
      expect(u2Conn?.isActive).toBe(true);
      expect(u2Conn?.telegramChatId).toBe("222222222");
    });
  });

  describe("6. Database Model Constraints", () => {
    it("enforces uniqueness on TelegramConnection.userId", async () => {
      await prisma.telegramConnection.create({
        data: {
          userId: user1Id,
          telegramChatId: "1001",
          isActive: true,
        },
      });

      await expect(
        prisma.telegramConnection.create({
          data: {
            userId: user1Id,
            telegramChatId: "1002",
            isActive: true,
          },
        })
      ).rejects.toThrow();
    });

    it("enforces uniqueness on TelegramConnection.telegramChatId", async () => {
      await prisma.telegramConnection.create({
        data: {
          userId: user1Id,
          telegramChatId: "shared_chat_id",
          isActive: true,
        },
      });

      await expect(
        prisma.telegramConnection.create({
          data: {
            userId: user2Id,
            telegramChatId: "shared_chat_id",
            isActive: true,
          },
        })
      ).rejects.toThrow();
    });

    it("enforces uniqueness on TelegramLinkToken.tokenHash", async () => {
      const duplicateHash = hashLinkToken("token_duplicate_test");

      await prisma.telegramLinkToken.create({
        data: {
          userId: user1Id,
          tokenHash: duplicateHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      await expect(
        prisma.telegramLinkToken.create({
          data: {
            userId: user2Id,
            tokenHash: duplicateHash,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        })
      ).rejects.toThrow();
    });
  });
});
