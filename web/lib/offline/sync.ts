import {
  getQueuedReports,
  updateQueueRecordStatus,
  OfflineQueueRecord,
} from "./db";
import { createCaseReportAction } from "@/lib/actions/cases";
import { runCaseAnalysisAction } from "@/lib/actions/analysis";

/**
 * PHASE 11: OFFLINE SYNCHRONIZATION MANAGER & COORDINATOR
 */

let inMemorySyncingFlag = false;

/**
 * 1. Dedicated Reachability Check via GET /api/health (decoupled from Telegram)
 */
export async function checkServerReachability(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!navigator.onLine) return false;

  try {
    const res = await fetch("/api/health", {
      method: "GET",
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

/**
 * 2. Uploads offline photo Blob to POST /api/storage/upload with deterministic submissionId key
 */
async function uploadOfflinePhoto(item: OfflineQueueRecord): Promise<string | null> {
  if (item.photoUrl) return item.photoUrl;
  if (!item.photoBlob) return null;

  try {
    const formData = new FormData();
    formData.append("file", item.photoBlob, `photo_${item.submissionId}.jpg`);
    formData.append("submissionId", item.submissionId);

    const res = await fetch("/api/storage/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Photo upload HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.success && data.url) {
      return data.url;
    }
    throw new Error(data.error || "Failed to upload photo");
  } catch (err: unknown) {
    console.warn(`[Offline Sync] Photo upload retry for ${item.submissionId}:`, err);
    throw err;
  }
}

/**
 * 3. Core Queue Execution Algorithm for a Single Item
 */
async function syncSingleQueueItem(item: OfflineQueueRecord): Promise<boolean> {
  try {
    await updateQueueRecordStatus(item.id, "SYNCING");

    // Upload photo if present (deterministic key handles retries after crashes)
    let photoUrl = item.photoUrl || null;
    if (item.photoBlob && !photoUrl) {
      photoUrl = await uploadOfflinePhoto(item);
      if (photoUrl) {
        await updateQueueRecordStatus(item.id, "SYNCING", { photoUrl });
      }
    }

    // Submit report with original submissionId (server enforces @unique idempotency)
    const reportRes = await createCaseReportAction({
      submissionId: item.submissionId,
      animalId: item.animalId,
      symptoms: item.symptoms,
      durationDays: item.durationDays,
      affectedCount: item.affectedCount,
      herdSize: item.herdSize,
      mortalityCount: item.mortalityCount,
      heartRate: item.heartRate,
      gpsLat: item.gpsLat,
      gpsLng: item.gpsLng,
      photoUrl,
      iotData: item.iotData,
    });

    if (reportRes.success && reportRes.caseId) {
      // Mark item SYNCED and store server case details
      await updateQueueRecordStatus(item.id, "SYNCED", {
        serverCaseId: reportRes.caseId,
        serverCaseNumber: reportRes.caseNumber,
        photoBlob: null, // Clear binary blob to free IndexedDB space
      });

      // Trigger Phase 6 AI Analysis seamlessly
      runCaseAnalysisAction(reportRes.caseId).catch((aiErr) => {
        console.warn(`[Offline Sync] AI analysis trigger after sync for case ${reportRes.caseId}:`, aiErr);
      });

      return true;
    } else {
      const errorMsg = reportRes.error || "Server report creation failed";

      if (errorMsg.includes("Unauthorized") || errorMsg.includes("do not own")) {
        await updateQueueRecordStatus(item.id, "FAILED_AUTHORIZATION", { lastError: errorMsg });
      } else {
        await updateQueueRecordStatus(item.id, "FAILED", { lastError: errorMsg });
      }

      return false;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Sync error";
    await updateQueueRecordStatus(item.id, "FAILED", { lastError: errorMsg });
    return false;
  }
}

/**
 * 4. Main Queue Synchronization Coordinator with Progressive Web Locks
 */
export async function triggerQueueSync(currentClerkUserId?: string): Promise<{
  processed: number;
  synced: number;
  failed: number;
}> {
  if (typeof window === "undefined") {
    return { processed: 0, synced: 0, failed: 0 };
  }

  // Reachability Check via /api/health
  const isReachable = await checkServerReachability();
  if (!isReachable) {
    return { processed: 0, synced: 0, failed: 0 };
  }

  let processed = 0;
  let synced = 0;
  let failed = 0;

  const executeSyncWork = async () => {
    if (inMemorySyncingFlag) return;
    inMemorySyncingFlag = true;

    try {
      const items = await getQueuedReports(currentClerkUserId);
      const pendingItems = items.filter(
        (item) => item.status === "QUEUED" || item.status === "FAILED"
      );

      for (const item of pendingItems) {
        processed++;
        const success = await syncSingleQueueItem(item);
        if (success) {
          synced++;
        } else {
          failed++;
        }
      }

      // Notify open tabs via BroadcastChannel
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel("maitri_offline_sync");
        channel.postMessage({ type: "SYNC_COMPLETE", synced, failed });
        channel.close();
      }
    } finally {
      inMemorySyncingFlag = false;
    }
  };

  // Progressive Web Locks: Use navigator.locks if available, otherwise in-memory fallback
  if ("locks" in navigator && typeof navigator.locks?.request === "function") {
    await navigator.locks.request("maitri_queue_sync_lock", { ifAvailable: true }, async (lock) => {
      if (!lock) {
        console.log("[Offline Sync] Sync lock already held by another tab");
        return;
      }
      await executeSyncWork();
    });
  } else {
    await executeSyncWork();
  }

  return { processed, synced, failed };
}
