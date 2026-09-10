import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteFarmerAnimal } from "@/lib/actions/reporting_data";
import prisma from "@/lib/db/prisma";
import * as authPermissions from "@/lib/auth/permissions";

vi.mock("@/lib/db/prisma", () => ({
  default: {
    animal: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/permissions", () => ({
  requireFarmer: vi.fn(),
  requireFieldAgent: vi.fn(),
}));

describe("Batch 3 (F-10): Animal Deletion Cascading & Relational Integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authPermissions.requireFarmer).mockResolvedValue({
      id: "farmer_123",
      clerkId: "clerk_farmer_123",
      role: "FARMER",
      status: "ACTIVE",
      name: "Ramesh Farmer",
      phone: "9876543210",
      telegramChatId: null,
      telegramLinkToken: null,
      telegramLinkTokenCreatedAt: null,
      districtId: null,
      blockId: null,
      villageId: null,
      district: null,
      block: null,
      village: null,
      preferredLanguage: "mr",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("should block deletion when animal has linked assistanceRequests", async () => {
    vi.mocked(prisma.animal.findUnique).mockResolvedValueOnce({
      id: "animal_with_assistance",
      herd: {
        farm: {
          farmerUserId: "farmer_123",
        },
      },
      _count: {
        cases: 0,
        vaccinations: 0,
        treatments: 0,
        conversations: 0,
        assistanceRequests: 1, // Has pending/completed assistance request
        veterinaryReports: 0,
      },
    } as unknown as Awaited<ReturnType<typeof prisma.animal.findUnique>>);

    const res = await deleteFarmerAnimal("animal_with_assistance");
    expect(res.success).toBe(false);
    expect(res.error).toContain("This animal cannot be deleted because it has linked clinical, assistance");
    expect(prisma.animal.delete).not.toHaveBeenCalled();
  });

  it("should block deletion when animal has linked veterinaryReports", async () => {
    vi.mocked(prisma.animal.findUnique).mockResolvedValueOnce({
      id: "animal_with_vet_report",
      herd: {
        farm: {
          farmerUserId: "farmer_123",
        },
      },
      _count: {
        cases: 0,
        vaccinations: 0,
        treatments: 0,
        conversations: 0,
        assistanceRequests: 0,
        veterinaryReports: 2, // Has formal veterinary reports
      },
    } as unknown as Awaited<ReturnType<typeof prisma.animal.findUnique>>);

    const res = await deleteFarmerAnimal("animal_with_vet_report");
    expect(res.success).toBe(false);
    expect(res.error).toContain("This animal cannot be deleted because it has linked clinical, assistance");
    expect(prisma.animal.delete).not.toHaveBeenCalled();
  });

  it("should block deletion when animal belongs to another farmer", async () => {
    vi.mocked(prisma.animal.findUnique).mockResolvedValueOnce({
      id: "animal_other_farmer",
      herd: {
        farm: {
          farmerUserId: "farmer_OTHER", // Mismatched farmer
        },
      },
      _count: {
        cases: 0,
        vaccinations: 0,
        treatments: 0,
        conversations: 0,
        assistanceRequests: 0,
        veterinaryReports: 0,
      },
    } as unknown as Awaited<ReturnType<typeof prisma.animal.findUnique>>);

    const res = await deleteFarmerAnimal("animal_other_farmer");
    expect(res.success).toBe(false);
    expect(res.error).toBe("You can only delete animals registered under your account.");
    expect(prisma.animal.delete).not.toHaveBeenCalled();
  });

  it("should successfully delete animal when all linked record counts are 0", async () => {
    vi.mocked(prisma.animal.findUnique).mockResolvedValueOnce({
      id: "clean_animal",
      herd: {
        farm: {
          farmerUserId: "farmer_123",
        },
      },
      _count: {
        cases: 0,
        vaccinations: 0,
        treatments: 0,
        conversations: 0,
        assistanceRequests: 0,
        veterinaryReports: 0,
      },
    } as unknown as Awaited<ReturnType<typeof prisma.animal.findUnique>>);

    vi.mocked(prisma.animal.delete).mockResolvedValueOnce({
      id: "clean_animal",
    } as unknown as Awaited<ReturnType<typeof prisma.animal.delete>>);

    const res = await deleteFarmerAnimal("clean_animal");
    expect(res.success).toBe(true);
    expect(prisma.animal.delete).toHaveBeenCalledWith({
      where: { id: "clean_animal" },
    });
  });
});
