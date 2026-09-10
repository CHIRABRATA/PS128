import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  enqueueReport,
  getAllQueuedReports,
  getQueueRecordById,
  removeQueueRecord,
  OfflineQueueRecord,
} from "@/lib/offline/db";
import {
  syncSingleQueueItem,
  retryManualQueueItem,
  triggerQueueSync,
} from "@/lib/offline/sync";

// Mock server actions called in sync
vi.mock("@/lib/actions/cases", () => ({
  createCaseReportAction: vi.fn(),
}));

vi.mock("@/lib/actions/analysis", () => ({
  runCaseAnalysisAction: vi.fn().mockResolvedValue({ success: true }),
}));

import { createCaseReportAction } from "@/lib/actions/cases";

describe("Batch 1 (F-06): Sync Retry Capping & Manual Retry Contract", () => {
  beforeEach(async () => {
    const all = await getAllQueuedReports();
    for (const item of all) {
      await removeQueueRecord(item.id);
    }
    vi.clearAllMocks();
  });

  it("should cap retries at MAX_AUTO_RETRIES (5) and transition to NEEDS_MANUAL_RETRY", async () => {
    const record: OfflineQueueRecord = {
      id: "sub_failing_item",
      submissionId: "sub_failing_item",
      clerkUserId: "user_test_farmer",
      animalId: "animal_test",
      symptoms: ["Lethargy"],
      durationDays: 1,
      affectedCount: 1,
      herdSize: 5,
      mortalityCount: 0,
      status: "QUEUED",
      retryCount: 4, // 4 prior failures
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await enqueueReport(record);

    // Mock server failure
    vi.mocked(createCaseReportAction).mockResolvedValue({
      success: false,
      error: "Temporary Database Lock Error",
    });

    // Execute 5th retry attempt
    const success = await syncSingleQueueItem(record);
    expect(success).toBe(false);

    // Record should now be in NEEDS_MANUAL_RETRY
    const updated = await getQueueRecordById("sub_failing_item");
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("NEEDS_MANUAL_RETRY");
    expect(updated!.retryCount).toBe(5);
    expect(updated!.lastError).toBe("Temporary Database Lock Error");
  });

  it("should exclude NEEDS_MANUAL_RETRY items from automated triggerQueueSync loops", async () => {
    const cappedRecord: OfflineQueueRecord = {
      id: "sub_capped_item",
      submissionId: "sub_capped_item",
      clerkUserId: "user_test_farmer",
      animalId: "animal_test",
      symptoms: ["Cough"],
      durationDays: 1,
      affectedCount: 1,
      herdSize: 5,
      mortalityCount: 0,
      status: "NEEDS_MANUAL_RETRY",
      retryCount: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await enqueueReport(cappedRecord);

    // Mock reachability to online
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/health") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: "ok" }),
        });
      }
      return Promise.reject(new Error("Unexpected endpoint call"));
    });

    const syncResult = await triggerQueueSync("user_test_farmer");
    expect(syncResult.processed).toBe(0);
    expect(createCaseReportAction).not.toHaveBeenCalled();

    // Verify status remains NEEDS_MANUAL_RETRY
    const unchanged = await getQueueRecordById("sub_capped_item");
    expect(unchanged!.status).toBe("NEEDS_MANUAL_RETRY");
  });

  it("should allow manual retry via retryManualQueueItem, resetting retryCount to 0 on success", async () => {
    const cappedRecord: OfflineQueueRecord = {
      id: "sub_manual_retry_item",
      submissionId: "sub_manual_retry_item",
      clerkUserId: "user_test_farmer",
      animalId: "animal_test",
      symptoms: ["Cough"],
      durationDays: 1,
      affectedCount: 1,
      herdSize: 5,
      mortalityCount: 0,
      status: "NEEDS_MANUAL_RETRY",
      retryCount: 5,
      lastError: "Previous server failure",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await enqueueReport(cappedRecord);

    // Mock server success for manual retry
    vi.mocked(createCaseReportAction).mockResolvedValue({
      success: true,
      caseId: "case_real_123",
      caseNumber: "CASE-2026-999999",
      status: "PENDING_REVIEW",
    });

    const success = await retryManualQueueItem("sub_manual_retry_item", "user_test_farmer");
    expect(success).toBe(true);

    const synced = await getQueueRecordById("sub_manual_retry_item");
    expect(synced!.status).toBe("SYNCED");
    expect(synced!.serverCaseId).toBe("case_real_123");
    expect(synced!.serverCaseNumber).toBe("CASE-2026-999999");
    expect(synced!.lastError).toBeNull();
  });

  it("should increment retryCount and transition to NEEDS_MANUAL_RETRY when photo upload fails repeatedly", async () => {
    // Mock fetch to simulate failed photo upload endpoint
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/health") {
        return Promise.resolve({ ok: true, json: async () => ({ status: "ok" }) });
      }
      if (url === "/api/media/upload") {
        return Promise.resolve({ ok: false, status: 503, text: async () => "S3 Gateway Timeout" });
      }
      return Promise.reject(new Error("Unknown route"));
    });

    const photoRecord: OfflineQueueRecord = {
      id: "sub_photo_capped_item",
      submissionId: "sub_photo_capped_item",
      clerkUserId: "user_test_farmer",
      animalId: "animal_test",
      symptoms: ["Salivation"],
      durationDays: 2,
      affectedCount: 1,
      herdSize: 5,
      mortalityCount: 0,
      photoBlob: new Blob(["dummy raw photo binary"], { type: "image/jpeg" }),
      status: "QUEUED",
      retryCount: 4, // 4 prior failures
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await enqueueReport(photoRecord);

    const success = await syncSingleQueueItem(photoRecord);
    expect(success).toBe(false);

    const updated = await getQueueRecordById("sub_photo_capped_item");
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("NEEDS_MANUAL_RETRY");
    expect(updated!.retryCount).toBe(5);
    expect(updated!.photoBlob).not.toBeNull(); // Binary blob preserved for manual retry
    expect(createCaseReportAction).not.toHaveBeenCalled(); // Skipped downstream report creation
  });
});
