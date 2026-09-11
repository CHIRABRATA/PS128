import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import prisma from "@/lib/db/prisma";
import { NotificationStatus, Species, CaseStatus, AssistanceRequestStatus } from "@prisma/client";
import {
  escapeHtml,
  formatTelegramNotification,
  getActionButtonLabel,
} from "@/lib/telegram/messages";
import {
  dispatchTelegramNotification,
  sanitizeTelegramError,
} from "@/lib/telegram/delivery";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { createInAppNotification } from "@/lib/actions/notifications";
import {
  routeCaseToVeterinarian,
  routeAssistanceRequestToFieldAgent,
} from "@/lib/geo/routing";

describe("Phase 3: Telegram Notification Delivery & Business Integration", () => {
  const testFarmerClerkId = "clerk_p3_farmer_1";
  const testVetClerkId = "clerk_p3_vet_1";
  const testAgentClerkId = "clerk_p3_agent_1";
  const testInactiveClerkId = "clerk_p3_inactive_1";
  const testUnconnectedClerkId = "clerk_p3_unconnected_1";

  let farmerUserId: string;
  let vetUserId: string;
  let agentUserId: string;
  let inactiveUserId: string;

  const farmerChatId = "111000111";
  const vetChatId = "222000222";
  const agentChatId = "333000333";
  const inactiveChatId = "444000444";

  let district: { id: string };
  let block: { id: string };
  let village: { id: string };
  let farm: { id: string };
  let herd: { id: string };
  let animal: { id: string };

  beforeEach(async () => {
    vi.restoreAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = "123456789:AAFakeTokenForTestingMaitriBotToken12345";
    process.env.NEXT_PUBLIC_APP_URL = "https://maitri.gov.in";

    // Clean up test data
    await prisma.telegramNotificationDelivery.deleteMany();
    await prisma.telegramConnection.deleteMany();
    await prisma.inAppNotification.deleteMany();
    await prisma.assistanceRequest.deleteMany({
      where: { reason: { contains: "Phase3Test" } },
    });
    await prisma.case.deleteMany({
      where: { caseNumber: { startsWith: "P3TEST-" } },
    });
    await prisma.user.deleteMany({
      where: {
        clerkId: {
          in: [
            testFarmerClerkId,
            testVetClerkId,
            testAgentClerkId,
            testInactiveClerkId,
            testUnconnectedClerkId,
          ],
        },
      },
    });

    // Setup Geo Hierarchy
    district = await prisma.district.upsert({
      where: { name: "P3 Test District" },
      update: {},
      create: { name: "P3 Test District" },
    });

    block = await prisma.block.upsert({
      where: {
        districtId_name: {
          districtId: district.id,
          name: "P3 Test Block",
        },
      },
      update: {},
      create: {
        name: "P3 Test Block",
        districtId: district.id,
      },
    });

    village = await prisma.village.upsert({
      where: {
        blockId_name: {
          blockId: block.id,
          name: "P3 Test Village",
        },
      },
      update: {},
      create: {
        name: "P3 Test Village",
        blockId: block.id,
      },
    });

    // Create test Farmer
    const farmer = await prisma.user.create({
      data: {
        clerkId: testFarmerClerkId,
        role: "FARMER",
        status: "ACTIVE",
        name: "Ramesh Farmer",
        phone: "+919876500001",
        villageId: village.id,
        blockId: block.id,
        districtId: district.id,
      },
    });
    farmerUserId = farmer.id;

    // Create test Vet
    const vet = await prisma.user.create({
      data: {
        clerkId: testVetClerkId,
        role: "VETERINARIAN",
        status: "ACTIVE",
        name: "Dr. Sharma",
        phone: "+919876500002",
        villageId: village.id,
        blockId: block.id,
        districtId: district.id,
      },
    });
    vetUserId = vet.id;

    // Create test Field Agent
    const agent = await prisma.user.create({
      data: {
        clerkId: testAgentClerkId,
        role: "FIELD_AGENT",
        status: "ACTIVE",
        name: "Sunita Agent",
        phone: "+919876500003",
        villageId: village.id,
        blockId: block.id,
        districtId: district.id,
      },
    });
    agentUserId = agent.id;

    // Create test user with inactive connection
    const inactiveUser = await prisma.user.create({
      data: {
        clerkId: testInactiveClerkId,
        role: "FARMER",
        status: "ACTIVE",
        name: "Inactive Connection User",
        phone: "+919876500004",
      },
    });
    inactiveUserId = inactiveUser.id;

    // Create Farm, Herd, Animal
    farm = await prisma.farm.create({
      data: {
        farmerUserId: farmerUserId,
        name: "P3 Test Farm",
        villageId: village.id,
        latitude: 22.5726,
        longitude: 88.3639,
      },
    });

    herd = await prisma.herd.create({
      data: {
        farmId: farm.id,
        species: Species.COW,
      },
    });

    animal = await prisma.animal.create({
      data: {
        herdId: herd.id,
        tag: "P3-COW-01",
        species: Species.COW,
        breed: "Gir",
      },
    });

    // Create active Telegram Connections for farmer, vet, agent
    await prisma.telegramConnection.create({
      data: {
        userId: farmerUserId,
        telegramChatId: farmerChatId,
        telegramUsername: "farmer_ramesh",
        isActive: true,
      },
    });

    await prisma.telegramConnection.create({
      data: {
        userId: vetUserId,
        telegramChatId: vetChatId,
        telegramUsername: "dr_sharma_vet",
        isActive: true,
      },
    });

    await prisma.telegramConnection.create({
      data: {
        userId: agentUserId,
        telegramChatId: agentChatId,
        telegramUsername: "sunita_pashusakh",
        isActive: true,
      },
    });

    // Create inactive Telegram Connection
    await prisma.telegramConnection.create({
      data: {
        userId: inactiveUserId,
        telegramChatId: inactiveChatId,
        telegramUsername: "inactive_user",
        isActive: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.telegramNotificationDelivery.deleteMany();
    await prisma.telegramConnection.deleteMany();
    await prisma.inAppNotification.deleteMany();
    await prisma.assistanceRequest.deleteMany({
      where: { reason: { contains: "Phase3Test" } },
    });
    await prisma.case.deleteMany({
      where: { caseNumber: { startsWith: "P3TEST-" } },
    });
    await prisma.user.deleteMany({
      where: {
        clerkId: {
          in: [
            testFarmerClerkId,
            testVetClerkId,
            testAgentClerkId,
            testInactiveClerkId,
            testUnconnectedClerkId,
          ],
        },
      },
    });
  });

  describe("1. Message Formatting & Security", () => {
    it("escapes dynamic text to prevent HTML injection in Telegram mode", () => {
      const dangerousInput = '<script>alert("hack")</script> & "special" \'symbols\' <tag>';
      const escaped = escapeHtml(dangerousInput);
      expect(escaped).toBe(
        '&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt; &amp; &quot;special&quot; \'symbols\' &lt;tag&gt;'
      );
      expect(escaped).not.toContain("<script>");
      expect(escaped).not.toContain("<tag>");
    });

    it("formats notification with correct HTML tags and role-specific action button", () => {
      const formatted = formatTelegramNotification({
        title: "New Case in Village A",
        message: 'Case #101 (Bovine) requires <urgent> review & attention.',
        type: "CASE_ASSIGNED",
        link: "/vet/cases/case_123",
      });

      expect(formatted.text).toBe(
        "<b>New Case in Village A</b>\n\nCase #101 (Bovine) requires &lt;urgent&gt; review &amp; attention."
      );
      expect(formatted.replyMarkup).toBeDefined();
      expect(formatted.replyMarkup?.inline_keyboard[0][0].text).toBe("📋 Open Case");
      expect(formatted.replyMarkup?.inline_keyboard[0][0].url).toBe(
        "https://maitri.gov.in/vet/cases/case_123"
      );
    });

    it("assigns appropriate button labels for all supported notification types", () => {
      expect(getActionButtonLabel("CASE_ASSIGNED")).toBe("📋 Open Case");
      expect(getActionButtonLabel("ASSISTANCE_ASSIGNED")).toBe("🧑‍🌾 Open Request");
      expect(getActionButtonLabel("ASSISTANCE_ACCEPTED")).toBe("🔍 View Request");
      expect(getActionButtonLabel("VISIT_IN_PROGRESS")).toBe("🔍 View Status");
      expect(getActionButtonLabel("VISIT_COMPLETED")).toBe("📄 View Report");
      expect(getActionButtonLabel("VET_REPORT_SUBMITTED")).toBe("📄 View Vet Report");
      expect(getActionButtonLabel("DIAGNOSIS_CONFIRMED")).toBe("🩺 View Diagnosis");
      expect(getActionButtonLabel("LAB_REFERRAL")).toBe("🔬 View Lab Referral");
      expect(getActionButtonLabel("CASE_CLOSED")).toBe("📋 View Case Details");
      expect(getActionButtonLabel("FOLLOW_UP_COMPLETED")).toBe("🩺 View Follow-Up");
      expect(getActionButtonLabel("OUTBREAK_ALERT")).toBe("⚠️ View Outbreak Alert");
      expect(getActionButtonLabel("UNKNOWN_CUSTOM_TYPE")).toBe("🔗 Open in Maitri");
    });

    it("redacts bot tokens from error strings during sanitization", () => {
      const rawErrorWithToken =
        "Telegram API error 404 at https://api.telegram.org/bot123456789:AAFakeTokenForTestingMaitriBotToken12345/sendMessage";
      const sanitized = sanitizeTelegramError(rawErrorWithToken);
      expect(sanitized).not.toContain("123456789:AAFakeTokenForTestingMaitriBotToken12345");
      expect(sanitized).toContain("[REDACTED_BOT_TOKEN]");
    });
  });

  describe("2. Telegram Client", () => {
    it("successfully sends message when Telegram API returns 200 ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            message_id: 998877,
            chat: { id: 111000111 },
            date: Math.floor(Date.now() / 1000),
          },
        }),
      });

      const res = await sendTelegramMessage(111000111, "Hello from Maitri");
      expect(res.success).toBe(true);
      expect(res.messageId).toBe(998877);
    });

    it("handles Telegram API errors without throwing", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          ok: false,
          error_code: 403,
          description: "Forbidden: bot was blocked by the user",
        }),
      });

      const res = await sendTelegramMessage(111000111, "Hello from Maitri");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Forbidden: bot was blocked by the user");
    });
  });

  describe("3. Telegram Notification Delivery Service", () => {
    it("delivers notification successfully to user with active Telegram connection and records delivery state", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            message_id: 54321,
            chat: { id: Number(farmerChatId) },
            date: Math.floor(Date.now() / 1000),
          },
        }),
      });

      // Create an in-app notification for the farmer
      const notif = await prisma.inAppNotification.create({
        data: {
          userId: farmerUserId,
          title: "Veterinary Report Available",
          message: "Dr. Sharma submitted a clinical assessment for Animal TAG-001.",
          type: "VET_REPORT_SUBMITTED",
          link: "/farmer/cases/case_abc",
        },
      });

      const result = await dispatchTelegramNotification(notif.id);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe(54321);

      // Verify delivery record in database
      const delivery = await prisma.telegramNotificationDelivery.findFirst({
        where: { notificationId: notif.id },
      });

      expect(delivery).toBeDefined();
      expect(delivery?.status).toBe(NotificationStatus.SENT);
      expect(delivery?.telegramMessageId).toBe(54321);
      expect(delivery?.sentAt).toBeInstanceOf(Date);
      expect(delivery?.errorMessage).toBeNull();
    });

    it("skips delivery cleanly when user has no Telegram connection", async () => {
      // Create user without Telegram connection
      const unconnectedUser = await prisma.user.create({
        data: {
          clerkId: testUnconnectedClerkId,
          role: "FARMER",
          status: "ACTIVE",
          name: "Unconnected Farmer",
          phone: "+919876599999",
        },
      });

      const notif = await prisma.inAppNotification.create({
        data: {
          userId: unconnectedUser.id,
          title: "Test Title",
          message: "Test Message",
          type: "GENERAL",
        },
      });

      const result = await dispatchTelegramNotification(notif.id);
      expect(result.success).toBe(false);
      expect(result.reason).toBe("NO_ACTIVE_CONNECTION");

      const deliveryCount = await prisma.telegramNotificationDelivery.count({
        where: { notificationId: notif.id },
      });
      expect(deliveryCount).toBe(0);
    });

    it("skips delivery cleanly when user's Telegram connection is inactive", async () => {
      const notif = await prisma.inAppNotification.create({
        data: {
          userId: inactiveUserId,
          title: "Test Inactive",
          message: "Should not dispatch",
          type: "GENERAL",
        },
      });

      const result = await dispatchTelegramNotification(notif.id);
      expect(result.success).toBe(false);
      expect(result.reason).toBe("NO_ACTIVE_CONNECTION");

      const deliveryCount = await prisma.telegramNotificationDelivery.count({
        where: { notificationId: notif.id },
      });
      expect(deliveryCount).toBe(0);
    });

    it("enforces idempotency: does not send duplicate messages for already SENT delivery", async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            message_id: 112233,
            chat: { id: Number(vetChatId) },
            date: Math.floor(Date.now() / 1000),
          },
        }),
      });
      global.fetch = fetchSpy;

      const notif = await prisma.inAppNotification.create({
        data: {
          userId: vetUserId,
          title: "New Case in Jurisdiction",
          message: "Case #404 requires review",
          type: "CASE_ASSIGNED",
          link: "/vet/cases/case_404",
        },
      });

      // First dispatch attempt
      const result1 = await dispatchTelegramNotification(notif.id);
      expect(result1.success).toBe(true);
      expect(result1.messageId).toBe(112233);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second dispatch attempt for the exact same notification
      const result2 = await dispatchTelegramNotification(notif.id);
      expect(result2.success).toBe(true);
      expect(result2.skipped).toBe(true);
      // Fetch should NOT be called again
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Verify only 1 delivery record exists in database
      const deliveries = await prisma.telegramNotificationDelivery.findMany({
        where: { notificationId: notif.id },
      });
      expect(deliveries.length).toBe(1);
    });

    it("handles concurrent/repeated delivery attempts safely and atomically", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            result: {
              message_id: 70000 + callCount,
              chat: { id: Number(agentChatId) },
              date: Math.floor(Date.now() / 1000),
            },
          }),
        };
      });

      const notif = await prisma.inAppNotification.create({
        data: {
          userId: agentUserId,
          title: "New Field Request",
          message: "Farmer requested assistance",
          type: "ASSISTANCE_ASSIGNED",
          link: "/agent?requestId=req_1",
        },
      });

      // Execute 3 concurrent dispatches for the same notification
      const results = await Promise.all([
        dispatchTelegramNotification(notif.id),
        dispatchTelegramNotification(notif.id),
        dispatchTelegramNotification(notif.id),
      ]);

      // All returned successfully
      results.forEach((r) => expect(r.success).toBe(true));

      // Database has exactly 1 delivery record with SENT status
      const deliveries = await prisma.telegramNotificationDelivery.findMany({
        where: { notificationId: notif.id },
      });
      expect(deliveries.length).toBe(1);
      expect(deliveries[0].status).toBe(NotificationStatus.SENT);
    });

    it("records FAILED status and sanitized error when Telegram API rejects the request", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          ok: false,
          error_code: 400,
          description: "Bad Request: chat not found",
        }),
      });

      const notif = await prisma.inAppNotification.create({
        data: {
          userId: farmerUserId,
          title: "Test Failure",
          message: "Failure scenario",
          type: "GENERAL",
        },
      });

      const result = await dispatchTelegramNotification(notif.id);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Bad Request: chat not found");

      const delivery = await prisma.telegramNotificationDelivery.findFirst({
        where: { notificationId: notif.id },
      });
      expect(delivery).toBeDefined();
      expect(delivery?.status).toBe(NotificationStatus.FAILED);
      expect(delivery?.errorMessage).toBe("Bad Request: chat not found");
      expect(delivery?.sentAt).toBeNull();
    });
  });

  describe("4. Business Flows & Failure Isolation", () => {
    it("createInAppNotification successfully creates database record even if Telegram dispatch fails or throws", async () => {
      // Mock fetch to simulate network timeout / crash
      global.fetch = vi.fn().mockRejectedValue(new Error("Telegram network timeout"));

      const notif = await createInAppNotification({
        userId: farmerUserId,
        title: "Assistance Request Accepted",
        message: "Field agent has accepted your request.",
        type: "ASSISTANCE_ACCEPTED",
        link: "/farmer",
      });

      // Business notification MUST still succeed and be returned
      expect(notif).toBeDefined();
      expect(notif?.id).toBeDefined();
      expect(notif?.userId).toBe(farmerUserId);
      expect(notif?.title).toBe("Assistance Request Accepted");

      // Verify in-app notification exists in DB
      const dbNotif = await prisma.inAppNotification.findUnique({
        where: { id: notif?.id },
      });
      expect(dbNotif).toBeDefined();
      expect(dbNotif?.type).toBe("ASSISTANCE_ACCEPTED");
    });

    it("Veterinarian Case Assignment: routes case to vet and creates in-app + Telegram notification", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            message_id: 881122,
            chat: { id: Number(vetChatId) },
            date: Math.floor(Date.now() / 1000),
          },
        }),
      });

      const testCase = await prisma.case.create({
        data: {
          caseNumber: "P3TEST-CASE-001",
          animalId: animal.id,
          createdByUserId: farmerUserId,
          reportSource: "FARMER",
          status: CaseStatus.PENDING_REVIEW,
          durationDays: 2,
          symptoms: ["Fever", "Lethargy"],
          reportedAt: new Date(),
        },
      });

      const routeResult = await routeCaseToVeterinarian(testCase.id);
      expect(routeResult.success).toBe(true);

      // Verify in-app notification was created for vet
      const notif = await prisma.inAppNotification.findFirst({
        where: {
          userId: vetUserId,
          type: "CASE_ASSIGNED",
          link: `/vet/cases/${testCase.id}`,
        },
      });
      expect(notif).toBeDefined();

      // Dispatch delivery for this notification
      const deliveryResult = await dispatchTelegramNotification(notif!.id);
      expect(deliveryResult.success).toBe(true);

      const delivery = await prisma.telegramNotificationDelivery.findFirst({
        where: { notificationId: notif?.id },
      });
      expect(delivery).toBeDefined();
      expect(delivery?.status).toBe(NotificationStatus.SENT);
      expect(delivery?.telegramMessageId).toBe(881122);
    });

    it("Field Agent Assistance Request Assignment: routes request to agent and creates in-app + Telegram notification", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            message_id: 881133,
            chat: { id: Number(agentChatId) },
            date: Math.floor(Date.now() / 1000),
          },
        }),
      });

      const request = await prisma.assistanceRequest.create({
        data: {
          farmerUserId: farmerUserId,
          farmId: farm.id,
          animalId: animal.id,
          reason: "Phase3Test Assistance for bovine inspection",
          status: AssistanceRequestStatus.REQUESTED,
        },
      });

      const routeResult = await routeAssistanceRequestToFieldAgent(request.id);
      expect(routeResult.success).toBe(true);

      // Verify in-app notification was created for field agent
      const notif = await prisma.inAppNotification.findFirst({
        where: {
          userId: agentUserId,
          type: "ASSISTANCE_ASSIGNED",
          link: `/agent?requestId=${request.id}`,
        },
      });
      expect(notif).toBeDefined();

      // Dispatch delivery for this notification
      const deliveryResult = await dispatchTelegramNotification(notif!.id);
      expect(deliveryResult.success).toBe(true);

      const delivery = await prisma.telegramNotificationDelivery.findFirst({
        where: { notificationId: notif?.id },
      });
      expect(delivery).toBeDefined();
      expect(delivery?.status).toBe(NotificationStatus.SENT);
      expect(delivery?.telegramMessageId).toBe(881133);
    });

    it("Telegram network failure during Case routing does not prevent Case assignment from succeeding", async () => {
      // Simulate network timeout from Telegram API
      global.fetch = vi.fn().mockRejectedValue(new Error("Telegram API network timeout"));

      const testCase = await prisma.case.create({
        data: {
          caseNumber: "P3TEST-CASE-002",
          animalId: animal.id,
          createdByUserId: farmerUserId,
          reportSource: "FARMER",
          status: CaseStatus.PENDING_REVIEW,
          durationDays: 1,
          symptoms: ["Coughing"],
          reportedAt: new Date(),
        },
      });

      // Route case to vet
      const routeResult = await routeCaseToVeterinarian(testCase.id);
      expect(routeResult.success).toBe(true);

      // Case assigned veterinarian MUST be set in DB
      const updatedCase = await prisma.case.findUnique({
        where: { id: testCase.id },
      });
      expect(updatedCase?.assignedVeterinarianUserId).toBe(vetUserId);

      // InAppNotification still created
      const notif = await prisma.inAppNotification.findFirst({
        where: {
          userId: vetUserId,
          type: "CASE_ASSIGNED",
          link: `/vet/cases/${testCase.id}`,
        },
      });
      expect(notif).toBeDefined();
    });
  });
});
