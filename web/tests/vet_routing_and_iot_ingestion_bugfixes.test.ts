import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/db/prisma";
import { findEligibleVeterinarians } from "@/lib/geo/routing";
import { ingestIoTTelemetryAction } from "@/lib/actions/iot";
import * as backendClient from "@/lib/api/backend-client";
import * as sessionAuth from "@/lib/auth/session";
import * as permissions from "@/lib/auth/permissions";

describe("Bug Fix Verification: Vet Assignment Tie-Breaker & IoT Ingestion Cold Starts", () => {
  describe("BUG 1: Vet Assignment Workload Tie Randomization", () => {
    const villageId = "village_test_101";
    const blockId = "block_test_101";
    const districtId = "district_test_101";

    const vet1 = {
      id: "vet_aaa_1",
      name: "Dr. Alpha",
      phone: "+919876543210",
      villageId,
      blockId,
      districtId,
    };
    const vet2 = {
      id: "vet_bbb_2",
      name: "Dr. Beta",
      phone: "+919876543211",
      villageId,
      blockId,
      districtId,
    };
    const vet3 = {
      id: "vet_ccc_3",
      name: "Dr. Gamma",
      phone: "+919876543212",
      villageId,
      blockId,
      districtId,
    };

    beforeEach(() => {
      vi.restoreAllMocks();
      vi.spyOn(prisma.village, "findUnique").mockResolvedValue({
        id: villageId,
        blockId,
        block: {
          id: blockId,
          districtId,
        },
      } as any);

      vi.spyOn(prisma.user, "findMany").mockResolvedValue([vet1, vet2, vet3] as any);
    });

    it("fairly randomizes top selection among vets tied at 0 active cases across 200 iterations", async () => {
      // All 3 vets have 0 active cases
      vi.spyOn(prisma.case, "groupBy").mockResolvedValue([] as any);

      const selectedCounts: Record<string, number> = {
        [vet1.id]: 0,
        [vet2.id]: 0,
        [vet3.id]: 0,
      };

      const iterations = 200;
      for (let i = 0; i < iterations; i++) {
        const result = await findEligibleVeterinarians({ villageId });
        expect(result).not.toBeNull();
        expect(result!.eligibleVets.length).toBe(3);

        const firstVet = result!.eligibleVets[0];
        selectedCounts[firstVet.id] = (selectedCounts[firstVet.id] || 0) + 1;
      }

      // Assert that more than one vet is selected (it must not deterministically pick the lowest ID every time)
      const nonZeroSelections = Object.values(selectedCounts).filter((c) => c > 0);
      expect(nonZeroSelections.length).toBeGreaterThan(1);
      expect(selectedCounts[vet1.id]).toBeGreaterThan(0);
      expect(selectedCounts[vet2.id]).toBeGreaterThan(0);
      expect(selectedCounts[vet3.id]).toBeGreaterThan(0);
    });

    it("strictly preserves lowest-load priority deterministically when activeLoads differ", async () => {
      // vet1 (Alpha) has load 0, vet2 (Beta) has load 1, vet3 (Gamma) has load 2
      vi.spyOn(prisma.case, "groupBy").mockResolvedValue([
        { assignedVeterinarianUserId: vet2.id, _count: { id: 1 } },
        { assignedVeterinarianUserId: vet3.id, _count: { id: 2 } },
      ] as any);

      // Run 50 iterations: vet1 (Alpha) with load 0 MUST be at index 0 100% of the time
      for (let i = 0; i < 50; i++) {
        const result = await findEligibleVeterinarians({ villageId });
        expect(result).not.toBeNull();
        expect(result!.eligibleVets[0].id).toBe(vet1.id);
        expect(result!.eligibleVets[0].activeLoad).toBe(0);
        expect(result!.eligibleVets[1].id).toBe(vet2.id);
        expect(result!.eligibleVets[1].activeLoad).toBe(1);
        expect(result!.eligibleVets[2].id).toBe(vet3.id);
        expect(result!.eligibleVets[2].activeLoad).toBe(2);
      }
    });
  });

  describe("BUG 2: IoT Telemetry Ingestion Timeout and Friendly Error Handling", () => {
    it("returns the friendly wake-up message when ingestIoTData throws BackendTimeoutError", async () => {
      vi.spyOn(sessionAuth, "requireActiveUser").mockResolvedValue({
        id: "user_test_farmer",
        clerkId: "clerk_test_farmer",
        role: "FARMER",
        status: "ACTIVE",
        name: "Test Farmer",
      } as any);

      vi.spyOn(permissions, "assertFarmerOwnsAnimal").mockResolvedValue(true as any);

      vi.spyOn(prisma.animal, "findUnique").mockResolvedValue({
        id: "animal_test_id",
        tag: "TAG-TEST-123",
        species: "COW",
        breed: "Gir",
        iotDevices: [],
      } as any);

      // Simulate BackendTimeoutError from ingestIoTData
      vi.spyOn(backendClient, "ingestIoTData").mockRejectedValueOnce(
        new backendClient.BackendTimeoutError("Request to AI Engine timed out after 20000ms.")
      );

      const result = await ingestIoTTelemetryAction({
        animalId: "animal_test_id",
        temperature: 38.5,
        activity: 80,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "The livestock health backend is waking up from an idle state — please wait about 30 seconds and try again."
      );
    });

    it("returns the standard generic message when ingestIoTData throws a non-timeout error", async () => {
      vi.spyOn(sessionAuth, "requireActiveUser").mockResolvedValue({
        id: "user_test_farmer",
        clerkId: "clerk_test_farmer",
        role: "FARMER",
        status: "ACTIVE",
        name: "Test Farmer",
      } as any);

      vi.spyOn(permissions, "assertFarmerOwnsAnimal").mockResolvedValue(true as any);

      vi.spyOn(prisma.animal, "findUnique").mockResolvedValue({
        id: "animal_test_id",
        tag: "TAG-TEST-123",
        species: "COW",
        breed: "Gir",
        iotDevices: [],
      } as any);

      // Simulate generic BackendUnavailableError from ingestIoTData
      vi.spyOn(backendClient, "ingestIoTData").mockRejectedValueOnce(
        new backendClient.BackendUnavailableError("Failed to connect to AI engine.")
      );

      const result = await ingestIoTTelemetryAction({
        animalId: "animal_test_id",
        temperature: 38.5,
        activity: 80,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Unable to reach the backend IoT ingestion service. Please try again."
      );
    });

    describe("AI Clinical Case Analysis Idle Cold-Start Handling", () => {
      it("returns friendly wake-up message when analyzeCase times out due to cold start", async () => {
        const { runCaseAnalysisAction } = await import("@/lib/actions/analysis");

        vi.spyOn(sessionAuth, "requireActiveUser").mockResolvedValue({
          id: "vet_user_test",
          clerkId: "clerk_vet_test",
          role: "VETERINARIAN",
          status: "ACTIVE",
          districtId: "dist_1",
          blockId: "block_1",
          villageId: "village_1",
        } as any);

        vi.spyOn(prisma.case, "findUnique").mockResolvedValue({
          id: "case_test_999",
          caseNumber: "CASE-2026-999",
          symptoms: ["Fever"],
          durationDays: 2,
          affectedCount: 1,
          mortalityCount: 0,
          photoUrl: null,
          gpsLat: 28.6,
          gpsLng: 77.2,
          iotTelemetry: null,
          analysisResult: null,
          visionResult: null,
          animal: {
            id: "animal_999",
            tag: "COW-999",
            herd: {
              species: "COW",
              farm: {
                village: {
                  block: {
                    districtId: "dist_1",
                  },
                },
              },
            },
          },
        } as any);

        vi.spyOn(backendClient, "analyzeCase").mockRejectedValueOnce(
          new backendClient.BackendTimeoutError("Request to AI Engine timed out after 30000ms.")
        );

        const result = await runCaseAnalysisAction("case_test_999");

        expect(result.success).toBe(false);
        expect(result.error).toBe(
          "The livestock health backend is waking up from an idle state — please wait about 30 seconds and try again."
        );
      });
    });
  });
});
