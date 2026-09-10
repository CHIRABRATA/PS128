import {
  getQueuedReports,
  getQueueRecordById,
  updateQueueRecordStatus,
  resetQueueRecordRetry,
  OfflineQueueRecord,
} from "./db";
import { createCaseReportAction } from "@/lib/actions/cases";
import { runCaseAnalysisAction } from "@/lib/actions/analysis";

/**
 * PHASE 11: OFFLINE SYNCHRONIZATION MANAGER & COORDINATOR
 */

export const MAX_AUTO_RETRIES = 5;

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
export async function uploadOfflinePhoto(item: OfflineQueueRecord): Promise<string | null> {
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
    throw err;
  }
}

/**
 * 3. Core Queue Execution Algorithm for a Single Item
 */
export async function syncSingleQueueItem(item: OfflineQueueRecord): Promise<boolean> {
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
        lastError: null,
      });

      // Trigger Phase 6 AI Analysis seamlessly
      runCaseAnalysisAction(reportRes.caseId).catch(() => {
        // AI analysis is non-blocking
      });

      return true;
    } else {
      const errorMsg = reportRes.error || "Server report creation failed";

      if (errorMsg.includes("Unauthorized") || errorMsg.includes("do not own")) {
        await updateQueueRecordStatus(item.id, "FAILED_AUTHORIZATION", { lastError: errorMsg });
      } else {
        const nextRetries = (item.retryCount || 0) + 1;
        if (nextRetries >= MAX_AUTO_RETRIES) {
          await updateQueueRecordStatus(item.id, "NEEDS_MANUAL_RETRY", {
            retryCount: nextRetries,
            lastError: errorMsg,
          });
        } else {
          await updateQueueRecordStatus(item.id, "FAILED", {
            retryCount: nextRetries,
            lastError: errorMsg,
          });
        }
      }

      return false;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Sync error";
    const nextRetries = (item.retryCount || 0) + 1;
    if (nextRetries >= MAX_AUTO_RETRIES) {
      await updateQueueRecordStatus(item.id, "NEEDS_MANUAL_RETRY", {
        retryCount: nextRetries,
        lastError: errorMsg,
      });
    } else {
      await updateQueueRecordStatus(item.id, "FAILED", {
        retryCount: nextRetries,
        lastError: errorMsg,
      });
    }
    return false;
  }
}

/**
 * 4. Manual Retry Handler for Capped/Failed Queue Items
 */
export async function retryManualQueueItem(
  id: string,
  currentClerkUserId?: string
): Promise<boolean> {
  const item = await getQueueRecordById(id);
  if (!item) return false;

  // Enforce account isolation on manual retry
  if (currentClerkUserId && item.clerkUserId !== currentClerkUserId) {
    return false;
  }

  await resetQueueRecordRetry(id);
  const updatedItem: OfflineQueueRecord = {
    ...item,
    status: "QUEUED",
    retryCount: 0,
    lastError: null,
  };

  return await syncSingleQueueItem(updatedItem);
}

/**
 * 5. Main Queue Synchronization Coordinator with Strict Account Isolation
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

  // Strict Account Isolation: Do not sync if no authenticated user session
  if (!currentClerkUserId) {
    return { processed: 0, synced: 0, failed: 0 };
  }

  let processed = 0;
  let synced = 0;
  let failed = 0;

  const executeSyncWork = async () => {
    if (inMemorySyncingFlag) return;
    inMemorySyncingFlag = true;

    try {
      // Strictly fetch only items matching active user ID
      const items = await getQueuedReports(currentClerkUserId);
      const pendingItems = items.filter(
        (item) => item.status === "QUEUED" || item.status === "FAILED"
      );

      for (const item of pendingItems) {
        // Enforce account isolation safeguard: hold-never-reassign
        if (item.clerkUserId !== currentClerkUserId) continue;

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
        return;
      }
      await executeSyncWork();
    });
  } else {
    await executeSyncWork();
  }

  return { processed, synced, failed };
}
