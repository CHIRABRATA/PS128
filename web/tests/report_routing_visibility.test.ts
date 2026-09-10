import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/auth/permissions", () => ({
  requireFarmer: vi.fn().mockResolvedValue({
    id: "farmer_1",
    name: "Farmer Ramesh",
    phone: "9876543210",
    role: "FARMER",
    status: "ACTIVE",
  }),
  requireFieldAgent: vi.fn().mockResolvedValue({
    id: "agent_a",
    name: "Field Agent Anita",
    phone: "9876543211",
    role: "FIELD_AGENT",
    status: "ACTIVE",
    districtId: "dist_pune",
  }),
}));

vi.mock("@/lib/auth/session", () => ({
  requireActiveUser: vi.fn().mockResolvedValue({
    id: "farmer_1",
    name: "Farmer Ramesh",
    phone: "9876543210",
    role: "FARMER",
    status: "ACTIVE",
  }),
}));

vi.mock("@/lib/actions/notifications", () => ({
  createInAppNotification: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/actions/analysis", () => ({
  runCaseAnalysisAction: vi.fn().mockResolvedValue({ success: true }),
}));

const mockFindUniqueUser = vi.fn();
const mockFindManyUsers = vi.fn();
const mockFindUniqueCase = vi.fn();
const mockFindFirstCase = vi.fn();
const mockFindManyCases = vi.fn();
const mockCreateCase = vi.fn();
const mockUpdateCase = vi.fn();
const mockGroupByCase = vi.fn();

const mockFindUniqueRequest = vi.fn();
const mockFindFirstRequest = vi.fn();
const mockFindManyRequests = vi.fn();
const mockCreateRequest = vi.fn();
const mockUpdateRequest = vi.fn();
const mockGroupByRequest = vi.fn();

const mockUpsertVisit = vi.fn();
const mockFindUniqueFarm = vi.fn();
const mockFindUniqueAnimal = vi.fn();
const mockFindUniqueVillage = vi.fn();
const mockFindUniqueBlock = vi.fn();
const mockCreateNotification = vi.fn();
const mockFindFirstNotification = vi.fn();

vi.mock("@/lib/db/prisma", () => {
  const prismaMock = {
    user: {
      findUnique: (...args: unknown[]) => mockFindUniqueUser(...args),
      findMany: (...args: unknown[]) => mockFindManyUsers(...args),
    },
    case: {
      findUnique: (...args: unknown[]) => mockFindUniqueCase(...args),
      findFirst: (...args: unknown[]) => mockFindFirstCase(...args),
      findMany: (...args: unknown[]) => mockFindManyCases(...args),
      create: (...args: unknown[]) => mockCreateCase(...args),
      update: (...args: unknown[]) => mockUpdateCase(...args),
      groupBy: (...args: unknown[]) => mockGroupByCase(...args),
    },
    assistanceRequest: {
      findUnique: (...args: unknown[]) => mockFindUniqueRequest(...args),
      findFirst: (...args: unknown[]) => mockFindFirstRequest(...args),
      findMany: (...args: unknown[]) => mockFindManyRequests(...args),
      create: (...args: unknown[]) => mockCreateRequest(...args),
      update: (...args: unknown[]) => mockUpdateRequest(...args),
      groupBy: (...args: unknown[]) => mockGroupByRequest(...args),
    },
    fieldVisit: {
      upsert: (...args: unknown[]) => mockUpsertVisit(...args),
    },
    farm: {
      findUnique: (...args: unknown[]) => mockFindUniqueFarm(...args),
    },
    animal: {
      findUnique: (...args: unknown[]) => mockFindUniqueAnimal(...args),
    },
    village: {
      findUnique: (...args: unknown[]) => mockFindUniqueVillage(...args),
    },
    block: {
      findUnique: (...args: unknown[]) => mockFindUniqueBlock(...args),
    },
    inAppNotification: {
      create: (...args: unknown[]) => mockCreateNotification(...args),
      findFirst: (...args: unknown[]) => mockFindFirstNotification(...args),
    },
    $transaction: (arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (tx: typeof prismaMock) => unknown)(prismaMock);
      }
      return Array.isArray(arg) ? Promise.all(arg) : arg;
    },
  };
  return { default: prismaMock };
});

import {
  findEligibleVeterinarians,
  findEligibleFieldAgents,
  routeCaseToVeterinarian,
  routeAssistanceRequestToFieldAgent,
  calculateLocationMatch,
  LocationMatchTier,
} from "@/lib/geo/routing";
import {
  createCaseReportAction,
} from "@/lib/actions/cases";
import {
  createAssistanceRequestAction,
  acceptAssistanceRequestAction,
  startVisitAssistanceRequestAction,
  completeAssistanceWithReportAction,
} from "@/lib/actions/assistance";

describe("Comprehensive Report Routing & Visibility End-to-End Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Location Match Hierarchy Calculations", () => {
    it("should calculate correct match tiers based on village, block, and district", () => {
      // Village match (highest priority score 100)
      const villageMatch = calculateLocationMatch(
        { villageId: "v1", blockId: "b1", districtId: "d1" },
        { villageId: "v1", blockId: "b1", districtId: "d1" }
      );
      expect(villageMatch.tier).toBe(LocationMatchTier.SAME_VILLAGE);
      expect(villageMatch.score).toBe(100);

      // Block match (score 50)
      const blockMatch = calculateLocationMatch(
        { villageId: "v2", blockId: "b1", districtId: "d1" },
        { villageId: "v1", blockId: "b1", districtId: "d1" }
      );
      expect(blockMatch.tier).toBe(LocationMatchTier.SAME_BLOCK);
      expect(blockMatch.score).toBe(50);

      // District match (score 10)
      const districtMatch = calculateLocationMatch(
        { villageId: "v3", blockId: "b2", districtId: "d1" },
        { villageId: "v1", blockId: "b1", districtId: "d1" }
      );
      expect(districtMatch.tier).toBe(LocationMatchTier.SAME_DISTRICT);
      expect(districtMatch.score).toBe(10);

      // Cross-district match (score 0, NO_MATCH)
      const crossDistrictMatch = calculateLocationMatch(
        { villageId: "v4", blockId: "b3", districtId: "d2" },
        { villageId: "v1", blockId: "b1", districtId: "d1" }
      );
      expect(crossDistrictMatch.tier).toBe(LocationMatchTier.NO_MATCH);
      expect(crossDistrictMatch.score).toBe(0);
    });
  });

  describe("2. Deterministic Least-Loaded Routing & Tie-Breaking", () => {
    it("should pick lowest loaded veterinarian in winning tier and break ties by user ID ascending", async () => {
      mockFindManyUsers.mockResolvedValue([
        { id: "vet_c", name: "Dr. Charlie", phone: "111", villageId: "v1", blockId: "b1", districtId: "d1" },
        { id: "vet_a", name: "Dr. Alice", phone: "222", villageId: "v1", blockId: "b1", districtId: "d1" },
        { id: "vet_b", name: "Dr. Bob", phone: "333", villageId: "v1", blockId: "b1", districtId: "d1" },
      ]);

      // vet_a has 3 active cases, vet_b has 1 active case, vet_c has 1 active case
      mockGroupByCase.mockResolvedValue([
        { assignedVeterinarianUserId: "vet_a", _count: { id: 3 } },
        { assignedVeterinarianUserId: "vet_b", _count: { id: 1 } },
        { assignedVeterinarianUserId: "vet_c", _count: { id: 1 } },
      ]);

      const result = await findEligibleVeterinarians({
        villageId: "v1",
        blockId: "b1",
        districtId: "d1",
      });

      expect(result).not.toBeNull();
      expect(result?.level).toBe("VILLAGE");
      expect(result?.eligibleVets.length).toBe(3);

      // Both vet_b and vet_c have load 1, but "vet_b" < "vet_c" alphabetically
      expect(result?.eligibleVets[0].id).toBe("vet_b");
      expect(result?.eligibleVets[1].id).toBe("vet_c");
      expect(result?.eligibleVets[2].id).toBe("vet_a");
    });

    it("should pick lowest loaded field agent in winning tier", async () => {
      mockFindManyUsers.mockResolvedValue([
        { id: "agent_2", name: "Agent Two", phone: "222", villageId: "v1", blockId: "b1", districtId: "d1" },
        { id: "agent_1", name: "Agent One", phone: "111", villageId: "v1", blockId: "b1", districtId: "d1" },
      ]);

      mockGroupByRequest.mockResolvedValue([
        { assignedFieldAgentUserId: "agent_1", _count: { id: 2 } },
        { assignedFieldAgentUserId: "agent_2", _count: { id: 0 } },
      ]);

      const result = await findEligibleFieldAgents("v1", "b1", "d1");
      expect(result).not.toBeNull();
      expect(result?.level).toBe("VILLAGE");
      expect(result?.eligibleAgents[0].id).toBe("agent_2");
    });
  });

  describe("3. Path 1: Farmer Self-Report Routing", () => {
    it("should create Case in PENDING_REVIEW and deterministically route to eligible Veterinarian", async () => {
      mockFindUniqueAnimal.mockResolvedValue({
        id: "animal_101",
        tag: "TAG-101",
        species: "Cattle",
        herd: {
          farmId: "farm_1",
          farm: {
            farmerUserId: "farmer_1",
            villageId: "v1",
            village: {
              name: "Shivaji Nagar",
              blockId: "b1",
              block: {
                name: "Haveli",
                districtId: "d1",
                district: { name: "Pune" },
              },
            },
          },
        },
      });

      mockCreateCase.mockResolvedValue({
        id: "case_001",
        caseNumber: "CASE-2026-1001",
        status: "PENDING_REVIEW",
        reportedAt: new Date(),
        assignedVeterinarianUserId: null,
      });

      mockFindFirstCase.mockResolvedValue(null);
      mockFindUniqueCase.mockImplementation(({ where }: { where: { id?: string; submissionId?: string } }) => {
        if (where.submissionId) return null;
        if (where.id === "case_001") {
          return {
            id: "case_001",
            caseNumber: "CASE-2026-1001",
            assignedVeterinarianUserId: null,
            assignedVeterinarianUser: null,
            animal: {
              species: "Cattle",
              herd: {
                farm: {
                  villageId: "v1",
                  village: {
                    name: "Shivaji Nagar",
                    blockId: "b1",
                    block: {
                      name: "Haveli",
                      districtId: "d1",
                      district: { name: "Pune" },
                    },
                  },
                },
              },
            },
          };
        }
        return null;
      });

      mockFindManyUsers.mockResolvedValue([
        { id: "vet_pune_1", name: "Dr. Deshmukh", phone: "9876543219", villageId: "v1", blockId: "b1", districtId: "d1" },
      ]);
      mockGroupByCase.mockResolvedValue([]);

      mockUpdateCase.mockResolvedValue({
        id: "case_001",
        caseNumber: "CASE-2026-1001",
        assignedVeterinarianUserId: "vet_pune_1",
        assignmentLevel: "VILLAGE",
        assignedVeterinarianUser: { id: "vet_pune_1", name: "Dr. Deshmukh", phone: "9876543219" },
      });

      mockFindFirstNotification.mockResolvedValue(null);
      mockCreateNotification.mockResolvedValue({ id: "notif_1" });

      const res = await createCaseReportAction({
        submissionId: "sub_001",
        animalId: "animal_101",
        symptoms: ["High Fever", "Mouth Blisters"],
        durationDays: 2,
        affectedCount: 1,
        herdSize: 10,
        mortalityCount: 0,
      });

      expect(res.success).toBe(true);
      expect(res.caseNumber).toBe("CASE-2026-1001");
      expect(res.assignedVeterinarian?.name).toBe("Dr. Deshmukh");
      expect(res.assignmentLevel).toBe("VILLAGE");
      expect(res.location?.villageName).toBe("Shivaji Nagar");
      expect(mockCreateNotification).toHaveBeenCalled();
    });

    it("should handle awaiting veterinarian state when no vet is found in territory", async () => {
      mockFindUniqueCase.mockResolvedValue({
        id: "case_empty",
        caseNumber: "CASE-2026-9999",
        assignedVeterinarianUserId: null,
        assignedVeterinarianUser: null,
        animal: {
          species: "Goat",
          herd: {
            farm: {
              villageId: "v_remote",
              village: {
                name: "Remote Village",
                blockId: "b_remote",
                block: {
                  name: "Remote Block",
                  districtId: "d_remote",
                  district: { name: "Remote District" },
                },
              },
            },
          },
        },
      });

      mockFindManyUsers.mockResolvedValue([]); // No vets

      const routeRes = await routeCaseToVeterinarian("case_empty");
      expect(routeRes.success).toBe(true);
      expect(routeRes.assignedVeterinarian).toBeNull();
      expect(routeRes.assignmentLevel).toBeNull();
    });
  });

  describe("4. Path 2: Field Assistance Request & Lifecycle", () => {
    it("should create AssistanceRequest without Case and route to Field Agent", async () => {
      mockFindUniqueFarm.mockResolvedValue({
        id: "farm_1",
        farmerUserId: "farmer_1",
        villageId: "v1",
        village: {
          name: "Shivaji Nagar",
          blockId: "b1",
          block: {
            districtId: "d1",
            district: { name: "Pune" },
          },
        },
      });

      mockCreateRequest.mockResolvedValue({
        id: "req_001",
        status: "REQUESTED",
        farmerUserId: "farmer_1",
        caseId: null,
      });

      mockFindUniqueRequest.mockResolvedValue({
        id: "req_001",
        villageId: "v1",
        blockId: "b1",
        districtId: "d1",
        reason: "Suspected FMD symptoms",
        farmerUser: { id: "farmer_1", name: "Farmer Ramesh", phone: "123" },
        farm: { name: "Ramesh Farm", village: { name: "Shivaji Nagar" } },
        assignedFieldAgentUserId: null,
        assignedFieldAgentUser: null,
      });

      mockFindManyUsers.mockResolvedValue([
        { id: "agent_a", name: "Field Agent Anita", phone: "987", villageId: "v1", blockId: "b1", districtId: "d1" },
      ]);
      mockGroupByRequest.mockResolvedValue([]);

      mockUpdateRequest.mockResolvedValue({
        id: "req_001",
        status: "ASSIGNED",
        assignedFieldAgentUserId: "agent_a",
        assignedFieldAgentUser: { id: "agent_a", name: "Field Agent Anita", phone: "987" },
      });

      const res = await createAssistanceRequestAction({
        farmId: "farm_1",
        reason: "Suspected FMD symptoms requiring on-site inspection",
      });

      expect(res.success).toBe(true);
      expect(res.requestId).toBe("req_001");
      expect(res.assignedFieldAgent?.name).toBe("Field Agent Anita");
      expect(res.assignmentLevel).toBe("VILLAGE");
    });

    it("should strictly reject non-assigned agent from accepting, starting or completing", async () => {
      // Mock request assigned to agent_other
      mockFindUniqueRequest.mockResolvedValue({
        id: "req_assigned_to_other",
        status: "ASSIGNED",
        farmerUserId: "farmer_1",
        assignedFieldAgentUserId: "agent_other",
        updatedAt: new Date(),
        village: {
          id: "v1",
          blockId: "b1",
          block: { districtId: "d1" },
        },
      });

      // requireFieldAgent returns "agent_a"
      const acceptRes = await acceptAssistanceRequestAction("req_assigned_to_other");
      expect(acceptRes.success).toBe(false);
      expect(acceptRes.error).toContain("assigned to another field agent");

      const startRes = await startVisitAssistanceRequestAction("req_assigned_to_other");
      expect(startRes.success).toBe(false);
      expect(startRes.error).toContain("not the assigned field agent");

      const completeRes = await completeAssistanceWithReportAction({
        requestId: "req_assigned_to_other",
        submissionId: "sub_hack",
        animalId: "animal_101",
        symptoms: ["Fever"],
        durationDays: 1,
        affectedCount: 1,
        herdSize: 5,
        mortalityCount: 0,
      });
      expect(completeRes.success).toBe(false);
      expect(completeRes.error).toContain("not the assigned field agent");
    });

    it("should allow assigned agent to complete report, atomically creating exactly ONE Case and routing to Vet", async () => {
      const mockDate = new Date();
      mockFindUniqueRequest.mockResolvedValue({
        id: "req_authorized",
        status: "IN_PROGRESS",
        farmerUserId: "farmer_1",
        assignedFieldAgentUserId: "agent_a", // Matches authenticated agent
        assignedAt: mockDate,
        assignmentLevel: "VILLAGE",
        updatedAt: mockDate,
        farm: { id: "farm_1" },
        village: { id: "v1", block: { districtId: "d1" } },
      });

      mockFindUniqueAnimal.mockResolvedValue({
        id: "animal_101",
        tag: "TAG-101",
        species: "Cattle",
        herd: { farm: { id: "farm_1" } },
      });

      mockCreateCase.mockResolvedValue({
        id: "case_created_by_agent",
        caseNumber: "CASE-2026-5555",
        status: "PENDING_REVIEW",
      });

      mockUpsertVisit.mockResolvedValue({
        id: "visit_completed",
      });

      mockUpdateRequest.mockResolvedValue({
        id: "req_authorized",
        status: "COMPLETED",
        assignedFieldAgentUserId: "agent_a",
        assignedAt: mockDate,
        assignmentLevel: "VILLAGE",
      });

      // Mock routeCaseToVeterinarian
      mockFindUniqueCase.mockResolvedValue({
        id: "case_created_by_agent",
        caseNumber: "CASE-2026-5555",
        assignedVeterinarianUserId: null,
        assignedVeterinarianUser: null,
        animal: {
          species: "Cattle",
          herd: {
            farm: {
              villageId: "v1",
              village: {
                name: "Shivaji Nagar",
                blockId: "b1",
                block: {
                  name: "Haveli",
                  districtId: "d1",
                  district: { name: "Pune" },
                },
              },
            },
          },
        },
      });

      mockFindManyUsers.mockResolvedValue([
        { id: "vet_pune_1", name: "Dr. Deshmukh", phone: "9876543219", villageId: "v1", blockId: "b1", districtId: "d1" },
      ]);
      mockGroupByCase.mockResolvedValue([]);

      mockUpdateCase.mockResolvedValue({
        id: "case_created_by_agent",
        caseNumber: "CASE-2026-5555",
        assignedVeterinarianUserId: "vet_pune_1",
        assignmentLevel: "VILLAGE",
        assignedVeterinarianUser: { id: "vet_pune_1", name: "Dr. Deshmukh", phone: "9876543219" },
      });

      const res = await completeAssistanceWithReportAction({
        requestId: "req_authorized",
        submissionId: "sub_field_authorized",
        animalId: "animal_101",
        symptoms: ["Nodules on skin", "Loss of appetite"],
        durationDays: 3,
        affectedCount: 2,
        herdSize: 8,
        mortalityCount: 0,
      });

      expect(res.success).toBe(true);
      expect(res.caseNumber).toBe("CASE-2026-5555");
      expect(res.assignedVeterinarian?.name).toBe("Dr. Deshmukh");
      expect(mockCreateCase).toHaveBeenCalledTimes(1);
      expect(mockUpsertVisit).toHaveBeenCalledTimes(1);
    });
  });

  describe("5. Idempotent Routing Execution", () => {
    it("should return existing assignment without reassigning or duplicating notifications on repeated calls", async () => {
      mockFindUniqueCase.mockResolvedValue({
        id: "case_already_assigned",
        caseNumber: "CASE-2026-1234",
        assignedVeterinarianUserId: "vet_existing",
        assignmentLevel: "VILLAGE",
        assignedVeterinarianUser: {
          id: "vet_existing",
          name: "Dr. Existing",
          phone: "999",
        },
        animal: {
          herd: {
            farm: {
              village: {
                name: "Village A",
                block: { name: "Block B", district: { name: "District C" } },
              },
            },
          },
        },
      });

      const res = await routeCaseToVeterinarian("case_already_assigned");
      expect(res.success).toBe(true);
      expect(res.assignedVeterinarian?.name).toBe("Dr. Existing");
      expect(res.assignmentLevel).toBe("VILLAGE");
      expect(mockUpdateCase).not.toHaveBeenCalled();
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it("should return existing assistance request assignment without reassigning", async () => {
      mockFindUniqueRequest.mockResolvedValue({
        id: "req_already_assigned",
        assignedFieldAgentUserId: "agent_existing",
        assignmentLevel: "BLOCK",
        assignedFieldAgentUser: {
          id: "agent_existing",
          name: "Agent Existing",
          phone: "888",
        },
        village: { name: "Village X", block: { name: "Block Y", district: { name: "District Z" } } },
        farm: { name: "Farm X" },
      });

      const res = await routeAssistanceRequestToFieldAgent("req_already_assigned");
      expect(res.success).toBe(true);
      expect(res.assignedFieldAgent?.name).toBe("Agent Existing");
      expect(res.assignmentLevel).toBe("BLOCK");
      expect(mockUpdateRequest).not.toHaveBeenCalled();
    });
  });
});
