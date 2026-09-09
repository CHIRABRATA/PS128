/**
 * PHASE 11: INDEXEDDB OFFLINE QUEUE MODULE
 * Database: MaitriOfflineDB
 * Object Store: reports_queue
 */

export interface OfflineQueueRecord {
  id: string; // submissionId or client UUID
  submissionId: string;
  clerkUserId: string;
  animalId: string;
  symptoms: string[];
  durationDays: number;
  affectedCount: number;
  herdSize: number;
  mortalityCount: number;
  heartRate?: number | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  iotData?: { iotDeviceId?: string | null; temperature?: number | null; activity?: number | null } | null;
  photoBlob?: Blob | null;
  photoUrl?: string | null;
  status: "QUEUED" | "SYNCING" | "SYNCED" | "FAILED" | "FAILED_AUTHORIZATION";
  createdAt: string;
  updatedAt: string;
  lastError?: string | null;
  serverCaseId?: string | null;
  serverCaseNumber?: string | null;
}

const DB_NAME = "MaitriOfflineDB";
const DB_VERSION = 1;
const STORE_NAME = "reports_queue";

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by_clerk_id", "clerkUserId", { unique: false });
        store.createIndex("by_submission_id", "submissionId", { unique: true });
        store.createIndex("by_status", "status", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueReport(record: OfflineQueueRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getQueuedReports(clerkUserId?: string): Promise<OfflineQueueRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = (request.result as OfflineQueueRecord[]) || [];
        if (clerkUserId) {
          // Account Isolation: filter reports by authenticated clerkUserId
          results = results.filter((item) => item.clerkUserId === clerkUserId);
        }
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

export async function updateQueueRecordStatus(
  id: string,
  status: OfflineQueueRecord["status"],
  updates?: Partial<OfflineQueueRecord>
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const record = getReq.result as OfflineQueueRecord | undefined;
      if (!record) return resolve();

      const updatedRecord: OfflineQueueRecord = {
        ...record,
        status,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const putReq = store.put(updatedRecord);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

export async function removeQueueRecord(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
