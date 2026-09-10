import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock server actions
vi.mock("@/lib/actions/cases", () => ({
  createCaseReportAction: vi.fn(),
}));

vi.mock("@/lib/actions/analysis", () => ({
  runCaseAnalysisAction: vi.fn().mockResolvedValue({ success: true }),
}));

import { createCaseReportAction } from "@/lib/actions/cases";
import {
  enqueueReport,
  getQueuedReports,
  getAllQueuedReports,
  getQueueRecordById,
  removeQueueRecord,
  OfflineQueueRecord,
} from "@/lib/offline/db";
import { triggerQueueSync, syncSingleQueueItem } from "@/lib/offline/sync";

describe("Batch 1 (F-01 & F-02): Offline Persistence & User Isolation Contract", () => {
  beforeEach(async () => {
    // Clear all records from IndexedDB
    const all = await getAllQueuedReports();
    for (const item of all) {
      await removeQueueRecord(item.id);
    }
    vi.restoreAllMocks();
  });

  it("F-01: should persist raw photoBlob in IndexedDB when offline report is enqueued", async () => {
    const fakeBlob = new Blob(["fake-image-bytes"], { type: "image/jpeg" });
    const record: OfflineQueueRecord = {
      id: "sub_offline_001",
      submissionId: "sub_offline_001",
      clerkUserId: "user_farmer_123",
      animalId: "animal_cow_01",
      symptoms: ["Fever", "Blisters"],
      durationDays: 2,
      affectedCount: 1,
      herdSize: 10,
      mortalityCount: 0,
      photoBlob: fakeBlob,
      photoUrl: null,
      status: "QUEUED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await enqueueReport(record);

    const retrieved = await getQueuedReports("user_farmer_123");
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].id).toBe("sub_offline_001");
    expect(retrieved[0].photoBlob).toBeTruthy();
    const retrievedBlob = retrieved[0].photoBlob;
    expect(retrievedBlob).toBeDefined();
    if (retrievedBlob && "size" in retrievedBlob) {
      expect(retrievedBlob.size).toBe(fakeBlob.size);
    }
  });

  it("F-01: should upload photoBlob during sync before calling createCaseReportAction and clear blob on success", async () => {
    const fakeBlob = new Blob(["photo-data-payload"], { type: "image/jpeg" });
    const record: OfflineQueueRecord = {
      id: "sub_photo_sync_001",
      submissionId: "sub_photo_sync_001",
      clerkUserId: "user_farmer_123",
      animalId: "animal_cow_01",
      symptoms: ["Salivation", "Lesions"],
      durationDays: 1,
      affectedCount: 1,
      herdSize: 10,
      mortalityCount: 0,
      photoBlob: fakeBlob,
      photoUrl: null,
      status: "QUEUED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await enqueueReport(record);

    // Mock storage upload endpoint
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/storage/upload") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            url: "https://blob.vercel-storage.com/photo_sub_photo_sync_001.jpg",
          }),
        });
      }
      return Promise.reject(new Error("Unknown route"));
    });

    // Mock report creation action
    vi.mocked(createCaseReportAction).mockResolvedValue({
      success: true,
      caseId: "case_photo_synced_99",
      caseNumber: "CASE-2026-111111",
      status: "PENDING_REVIEW",
    });

    const success = await syncSingleQueueItem(record);
    expect(success).toBe(true);

    // Verify photo upload was called
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/storage/upload",
      expect.objectContaining({ method: "POST" })
    );

    // Verify createCaseReportAction was called with the uploaded photo URL
    expect(createCaseReportAction).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionId: "sub_photo_sync_001",
        photoUrl: "https://blob.vercel-storage.com/photo_sub_photo_sync_001.jpg",
      })
    );

    // Verify IndexedDB record updated to SYNCED and photoBlob cleared
    const synced = await getQueueRecordById("sub_photo_sync_001");
    expect(synced).not.toBeNull();
    expect(synced!.status).toBe("SYNCED");
    expect(synced!.photoBlob).toBeNull();
    expect(synced!.serverCaseId).toBe("case_photo_synced_99");
  });

  it("F-01: should handle photo upload failure without calling createCaseReportAction and preserve photoBlob", async () => {
    const fakeBlob = new Blob(["photo-data-payload"], { type: "image/jpeg" });
    const record: OfflineQueueRecord = {
      id: "sub_photo_fail_001",
      submissionId: "sub_photo_fail_001",
      clerkUserId: "user_farmer_123",
      animalId: "animal_cow_01",
      symptoms: ["Salivation"],
      durationDays: 1,
      affectedCount: 1,
      herdSize: 10,
      mortalityCount: 0,
      photoBlob: fakeBlob,
      photoUrl: null,
      status: "QUEUED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await enqueueReport(record);

    // Mock photo upload failure (e.g., storage 500 error)
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/storage/upload") {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ success: false, error: "Storage gateway timeout" }),
        });
      }
      return Promise.reject(new Error("Unknown route"));
    });

    const success = await syncSingleQueueItem(record);
    expect(success).toBe(false);

    // createCaseReportAction should NOT have been invoked
    expect(createCaseReportAction).not.toHaveBeenCalled();

    // Verify record transitioned to FAILED, with photoBlob preserved
    const failed = await getQueueRecordById("sub_photo_fail_001");
    expect(failed).not.toBeNull();
    expect(failed!.status).toBe("FAILED");
    expect(failed!.photoBlob).toBeTruthy();
  });

  it("F-02: should strictly isolate queued reports by clerkUserId", async () => {
    const reportUserA: OfflineQueueRecord = {
      id: "sub_user_A_001",
      submissionId: "sub_user_A_001",
      clerkUserId: "user_A",
      animalId: "animal_01",
      symptoms: ["Lethargy"],
      durationDays: 1,
      affectedCount: 1,
      herdSize: 5,
      mortalityCount: 0,
      status: "QUEUED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const reportUserB: OfflineQueueRecord = {
      id: "sub_user_B_001",
      submissionId: "sub_user_B_001",
      clerkUserId: "user_B",
      animalId: "animal_02",
      symptoms: ["Cough"],
      durationDays: 3,
      affectedCount: 2,
      herdSize: 8,
      mortalityCount: 0,
      status: "QUEUED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await enqueueReport(reportUserA);
    await enqueueReport(reportUserB);

    // User A should only see User A's reports
    const userAItems = await getQueuedReports("user_A");
    expect(userAItems).toHaveLength(1);
    expect(userAItems[0].id).toBe("sub_user_A_001");
    expect(userAItems[0].clerkUserId).toBe("user_A");

    // User B should only see User B's reports
    const userBItems = await getQueuedReports("user_B");
    expect(userBItems).toHaveLength(1);
    expect(userBItems[0].id).toBe("sub_user_B_001");
    expect(userBItems[0].clerkUserId).toBe("user_B");

    // All reports total 2 in IndexedDB
    const all = await getAllQueuedReports();
    expect(all).toHaveLength(2);
  });

  it("F-02 Contract: hold-never-reassign — syncing for user_A must never execute or drop user_B reports", async () => {
    const reportUserB: OfflineQueueRecord = {
      id: "sub_user_B_held",
      submissionId: "sub_user_B_held",
      clerkUserId: "user_B",
      animalId: "animal_02",
      symptoms: ["Salivation"],
      durationDays: 1,
      affectedCount: 1,
      herdSize: 4,
      mortalityCount: 0,
      status: "QUEUED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await enqueueReport(reportUserB);

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

    // Trigger sync as User A
    const result = await triggerQueueSync("user_A");
    expect(result.processed).toBe(0);
    expect(result.synced).toBe(0);

    // Verify User B's item is strictly held and unchanged
    const remaining = await getAllQueuedReports();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("sub_user_B_held");
    expect(remaining[0].clerkUserId).toBe("user_B");
    expect(remaining[0].status).toBe("QUEUED");
  });
});
