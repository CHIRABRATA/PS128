import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock dependencies of assistance.ts
vi.mock("@/lib/auth/permissions", () => ({
  requireFarmer: vi.fn().mockResolvedValue({ id: "farmer_1", name: "Farmer Ramesh", role: "FARMER" }),
  requireFieldAgent: vi.fn().mockResolvedValue({ id: "agent_1", name: "Agent Suresh", phone: "9876543210", role: "FIELD_AGENT" }),
}));

vi.mock("@/lib/geo/routing", () => ({
  findEligibleFieldAgents: vi.fn().mockResolvedValue([]),
  canUserAccessAssistanceRequest: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/actions/notifications", () => ({
  createInAppNotification: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/actions/analysis", () => ({
  runCaseAnalysisAction: vi.fn().mockResolvedValue({ success: true }),
}));

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockUpsertVisit = vi.fn();
const mockFindAnimal = vi.fn();
const mockCreateCase = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/db/prisma", () => {
  const prismaMock = {
    assistanceRequest: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    fieldVisit: {
      upsert: (...args: unknown[]) => mockUpsertVisit(...args),
    },
    animal: {
      findUnique: (...args: unknown[]) => mockFindAnimal(...args),
    },
    case: {
      create: (...args: unknown[]) => mockCreateCase(...args),
    },
    $transaction: (arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (tx: typeof prismaMock) => unknown)(prismaMock);
      }
      return mockTransaction(arg);
    },
  };
  return { default: prismaMock };
});

import {
  acceptAssistanceRequestAction,
  startVisitAssistanceRequestAction,
  completeAssistanceWithReportAction,
} from "@/lib/actions/assistance";

describe("Batch 1 (F-03): Assistance Optimistic Concurrency Controls", () => {
  const mockDate = new Date("2026-09-10T10:00:00.000Z");
  const staleDateString = new Date("2026-09-10T09:00:00.000Z").toISOString();
  const validDateString = mockDate.toISOString();

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((arg) => (Array.isArray(arg) ? Promise.all(arg) : arg));
  });

  it("should reject acceptAssistanceRequestAction when expectedUpdatedAt is stale", async () => {
    mockFindUnique.mockResolvedValue({
      id: "req_001",
      farmerUserId: "farmer_1",
      status: "REQUESTED",
      updatedAt: mockDate,
      village: null,
    });

    const result = await acceptAssistanceRequestAction("req_001", staleDateString);

    expect(result.success).toBe(false);
    expect(result.error).toContain("updated by another field agent");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("should succeed acceptAssistanceRequestAction when expectedUpdatedAt matches current updatedAt", async () => {
    mockFindUnique.mockResolvedValue({
      id: "req_001",
      farmerUserId: "farmer_1",
      status: "REQUESTED",
      updatedAt: mockDate,
      village: null,
    });

    mockUpdate.mockResolvedValue({
      id: "req_001",
      status: "ACCEPTED",
    });

    mockUpsertVisit.mockResolvedValue({
      id: "visit_001",
    });

    const result = await acceptAssistanceRequestAction("req_001", validDateString);

    expect(result.success).toBe(true);
    expect(result.status).toBe("ACCEPTED");
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpsertVisit).toHaveBeenCalled();
  });

  it("should reject startVisitAssistanceRequestAction when expectedUpdatedAt is stale", async () => {
    mockFindUnique.mockResolvedValue({
      id: "req_002",
      farmerUserId: "farmer_1",
      assignedAgentUserId: "agent_1",
      status: "ACCEPTED",
      updatedAt: mockDate,
      village: null,
    });

    const result = await startVisitAssistanceRequestAction("req_002", staleDateString);

    expect(result.success).toBe(false);
    expect(result.error).toContain("updated by another field agent");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("should succeed startVisitAssistanceRequestAction when expectedUpdatedAt matches current updatedAt", async () => {
    mockFindUnique.mockResolvedValue({
      id: "req_002",
      farmerUserId: "farmer_1",
      assignedAgentUserId: "agent_1",
      status: "ACCEPTED",
      updatedAt: mockDate,
      village: null,
    });

    mockUpdate.mockResolvedValue({
      id: "req_002",
      status: "IN_PROGRESS",
    });

    mockUpsertVisit.mockResolvedValue({
      id: "visit_002",
    });

    const result = await startVisitAssistanceRequestAction("req_002", validDateString);

    expect(result.success).toBe(true);
    expect(result.status).toBe("IN_PROGRESS");
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpsertVisit).toHaveBeenCalled();
  });

  it("should reject completeAssistanceWithReportAction when expectedUpdatedAt is stale", async () => {
    mockFindUnique.mockResolvedValue({
      id: "req_003",
      farmerUserId: "farmer_1",
      status: "IN_PROGRESS",
      updatedAt: mockDate,
      farm: { id: "farm_1" },
      village: null,
    });

    const result = await completeAssistanceWithReportAction({
      requestId: "req_003",
      expectedUpdatedAt: staleDateString,
      submissionId: "sub_field_001",
      animalId: "animal_001",
      symptoms: ["Fever"],
      durationDays: 2,
      affectedCount: 1,
      herdSize: 5,
      mortalityCount: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("updated by another field agent");
    expect(mockCreateCase).not.toHaveBeenCalled();
  });

  it("should succeed completeAssistanceWithReportAction when expectedUpdatedAt matches current updatedAt", async () => {
    mockFindUnique.mockResolvedValue({
      id: "req_003",
      farmerUserId: "farmer_1",
      status: "IN_PROGRESS",
      updatedAt: mockDate,
      farm: { id: "farm_1" },
      village: null,
    });

    mockFindAnimal.mockResolvedValue({
      id: "animal_001",
      tag: "TAG-999",
      species: "Cattle",
      iotDeviceId: null,
      herd: {
        farm: { id: "farm_1" },
      },
    });

    mockCreateCase.mockResolvedValue({
      id: "case_created_123",
      caseNumber: "CASE-2026-123456",
      status: "PENDING_REVIEW",
    });

    mockUpsertVisit.mockResolvedValue({
      id: "visit_003",
    });

    mockUpdate.mockResolvedValue({
      id: "req_003",
      status: "COMPLETED",
    });

    const result = await completeAssistanceWithReportAction({
      requestId: "req_003",
      expectedUpdatedAt: validDateString,
      submissionId: "sub_field_001",
      animalId: "animal_001",
      symptoms: ["Fever", "Salivation"],
      durationDays: 2,
      affectedCount: 1,
      herdSize: 5,
      mortalityCount: 0,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("PENDING_REVIEW");
    expect(result.caseNumber).toBe("CASE-2026-123456");
    expect(mockCreateCase).toHaveBeenCalled();
    expect(mockUpsertVisit).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
  });
});
