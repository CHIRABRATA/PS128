# Maitri (PS128) — Comprehensive Workflow, Logic & UI Audit Report

**Audit Date:** September 2026  
**Auditor:** Antigravity (Advanced Agentic Coding)  
**Target Codebase:** `web/` (Next.js 16 App Router + React 19 + Prisma/Neon + Clerk Auth) & `backend/` (FastAPI AI Engine)  
**Audit Scope:** Workflow state machines, concurrency locks, offline sync correctness, AI engine resiliency, authorization boundaries, UI stability, and codebase hygiene.

---

## Executive Summary

The **Maitri** platform demonstrates a well-architected, security-conscious foundation:
- **Strong Role-Based Authorization:** Every server action enforces multi-level permission checks (authentication, role, status, and geographic jurisdiction).
- **Durable Case First Guarantee:** Clinical cases are durably recorded in PostgreSQL before invoking AI microservices, preventing data loss during AI downtime.
- **Robust Vet State Machine:** Strict transitions (`PENDING_REVIEW` → `UNDER_EXAMINATION` → `{LAB_REFERRAL | CONFIRMED | CLOSED_HARMLESS}`) with optimistic locking via `expectedUpdatedAt`.
- **Private Media Architecture:** Private server proxy routes prevent unauthenticated access to clinical animal photographs.

However, the audit identified critical and high-priority gaps in **offline photograph persistence**, **offline queue user isolation**, **assistance request concurrency**, and **Next.js loading/error state boundaries**.

---

## Findings Matrix by Severity

| ID | Category | Severity | Component / Flow | Root Cause Summary |
|---|---|---|---|---|
| **F-01** | Offline Sync | `Critical` | `PhotoCapture.tsx` / `HealthReportForm.tsx` | Offline photos are discarded because raw image blobs are not persisted to IndexedDB when offline. |
| **F-02** | Offline Sync / Security | `Critical` | `HealthReportForm.tsx` / `sync.ts` / `db.ts` | Offline reports hardcode `clerkUserId: "local_user"`. Cross-user data misattribution risk on shared devices if fallback-matched. |
| **F-03** | Workflow Concurrency | `High` | `assistance.ts` (`accept`/`start`/`complete`) | Assistance actions lack `expectedUpdatedAt` optimistic concurrency checks, creating multi-agent race conditions. |
| **F-04** | UI Stability | `High` | `app/{farmer,agent,vet,authority}/loading.tsx` | Missing `loading.tsx` route skeletons cause blank/frozen UI during Next.js server data-fetching navigations. |
| **F-05** | UI Stability | `High` | `app/{farmer,agent,vet,authority}/error.tsx` | Missing `error.tsx` route boundaries cause unstyled 500 error screens on transient backend hiccups. |
| **F-06** | Offline Sync | `Medium` | `sync.ts` / `SyncStatusBadge.tsx` | Unbounded sync retries without attempt capping, plus risk of silent data loss if capped items disappear without manual retry UI. |
| **F-07** | UI Stability | `Medium` | `FarmerChatBox.tsx` | Optimistic chat messages lack failure status indicators and retry triggers when AI calls fail. |
| **F-08** | UI & Accessibility | `Medium` | `HealthReportForm.tsx` / `AuthorityMetricsCards.tsx` | Step indicators and metric grids can cause horizontal overflow on mobile viewports (< 380px). |
| **F-09** | Diagnostic Route | `Medium` | `app/map-debug/page.tsx` | Standalone diagnostic route is unauthenticated; production GIS map has already resolved the Leaflet SSR/icon issues. |
| **F-10** | Database Integrity | `Low` | `reporting_data.ts` (`deleteFarmerAnimal`) | Animal deletion check misses `assistanceRequests` and `veterinaryReports` relation counts. |
| **F-11** | Code Hygiene | `Low` | `lib/{actions,api,storage}/run_phase*.ts` | Ad-hoc test scripts in source directories without a formal test runner (Vitest). |
| **F-12** | Code Hygiene | `Low` | `lib/offline/sync.ts` & `PwaRegister.tsx` | Stray `console.log` statements in production runtime code. |
| **F-13** | Documentation | `Low` | `AGENTS.md` / `ARCHITECTURE.md` | Boilerplate `AGENTS.md` lacks explicit state machine, offline sync, and auth architecture reference. |

---

## Detailed Findings & Technical Root Cause Analysis

### Finding F-01: Offline Photograph Persistence Failure (Data Loss Risk)
- **Severity:** `Critical`
- **Affected Files:** [PhotoCapture.tsx](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/components/reporting/PhotoCapture.tsx), [HealthReportForm.tsx](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/components/reporting/HealthReportForm.tsx), [db.ts](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/lib/offline/db.ts), [sync.ts](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/lib/offline/sync.ts)
- **Technical Root Cause:** When offline, `PhotoCapture.tsx` attempts an immediate upload to `/api/storage/upload`. On network failure, it resets local state and calls `onChangePhotoUrl(null)`. It does not propagate the raw `Blob`/`File` to `HealthReportForm`. When `HealthReportForm` enqueues the record to IndexedDB, it writes `{ photoBlob: null, photoUrl: null }`. Thus, photos captured in the field while offline are completely lost.
- **Remediation:** 
  1. `PhotoCapture.tsx` passes both preview URL and raw `Blob` via `onChangePhoto(url, blob)`.
  2. `HealthReportForm.tsx` stores `photoBlob` in IndexedDB upon offline enqueue.
  3. `sync.ts` reads `item.photoBlob` and calls `uploadOfflinePhoto()` when back online.

---

### Finding F-02: Offline Queue User Isolation & Cross-User Misattribution Risk
- **Severity:** `Critical` *(Upgraded from High)*
- **Affected Files:** [HealthReportForm.tsx](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/components/reporting/HealthReportForm.tsx#L179), [sync.ts](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/lib/offline/sync.ts), [db.ts](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/lib/offline/db.ts), [SyncStatusBadge.tsx](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/components/offline/SyncStatusBadge.tsx)
- **Technical Root Cause:** `HealthReportForm` hardcodes `clerkUserId: "local_user"`. In a multi-user or shared-device field scenario, attempting naive "fallback matching" risks syncing Farmer A's queued health report under Farmer B's session. Conversely, strict filtering by `currentClerkUserId` drops all `"local_user"` items.
- **Strict User Isolation Contract:**
  1. `HealthReportForm` tags records with the active Clerk `userId` at enqueue time.
  2. `sync.ts` **only** syncs queue items matching the currently authenticated `userId`.
  3. Mismatched queue items are **strictly held** (never dropped, never reassigned to another user).
  4. `SyncStatusBadge.tsx` displays a visible warning: *"Reports pending for another user (Sign in as [User] to sync)"*.

---

### Finding F-03: Missing Optimistic Concurrency on Field Agent Assistance Actions
- **Severity:** `High`
- **Affected Files:** [assistance.ts](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/lib/actions/assistance.ts)
- **Technical Root Cause:** Unlike `vet.ts`, `acceptAssistanceRequestAction`, `startVisitAssistanceRequestAction`, and `completeAssistanceWithReportAction` do not validate `expectedUpdatedAt`. If multiple field agents in the same territory accept/start a visit simultaneously, a race condition occurs without stale-write detection.
- **Remediation:** Add `expectedUpdatedAt: z.string()` to schemas and enforce `request.updatedAt.toISOString() === expectedUpdatedAt` before transitioning states.

---

### Finding F-04 & F-05: Missing Next.js Route Loading & Error Boundaries
- **Severity:** `High`
- **Affected Routes:** `/farmer`, `/agent`, `/vet`, `/authority`
- **Technical Root Cause:** Missing `loading.tsx` creates a 300–800ms frozen/blank UI during server component navigation. Missing `error.tsx` causes unstyled Next.js 500 error screens on transient DB hiccups.
- **Remediation:** Create dedicated `loading.tsx` skeletons and client `error.tsx` boundaries with `reset()` retry buttons for each role portal.

---

### Finding F-06: Unbounded Sync Retries & Silent Data Loss Prevention
- **Severity:** `Medium`
- **Affected Files:** [sync.ts](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/lib/offline/sync.ts), [db.ts](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/lib/offline/db.ts), [SyncStatusBadge.tsx](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/components/offline/SyncStatusBadge.tsx)
- **Technical Root Cause:** Unbounded 30s retry loops on malformed items waste resources. However, simply capping retries without UI notice causes silent report disappearance.
- **Remediation:** Cap automatic retries at 5 attempts. Transition exceeded records to `NEEDS_MANUAL_RETRY`. Render them prominently in `SyncStatusBadge.tsx` with error explanation and a manual "Retry Now" button.

---

### Finding F-09: Map Debug Route & Production GIS Investigation
- **Severity:** `Medium`
- **Affected Files:** [app/map-debug/page.tsx](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/app/map-debug/page.tsx), [SurveillanceHeatmapInternal.tsx](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/components/authority/SurveillanceHeatmapInternal.tsx)
- **Root Cause Investigation:**
  - `map-debug` was built to diagnose 3 classic Leaflet bugs in Next.js App Router:
    1. Marker PNG icon 404s (`marker-icon.png`, `marker-shadow.png`) when bundled with Webpack/Turbopack.
    2. Server-side `window is not defined` crashes.
    3. Container `0px` height tile grayouts due to CSS grid layout timing.
  - **Verification of Production Map:** [SurveillanceHeatmapInternal.tsx](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/components/authority/SurveillanceHeatmapInternal.tsx) has **completely resolved all 3 issues**:
    1. It uses vector `L.circleMarker` elements instead of PNG pins, eliminating icon 404s.
    2. It uses `next/dynamic` with `ssr: false` in `SurveillanceHeatmap.tsx`.
    3. It implements staggered `invalidateSize()` timeouts (50ms, 200ms, 500ms) and `ResizeObserver`.
  - **Remediation:** Remove `/map-debug` or restrict strictly to development mode to prevent unauthenticated access.

---

### Finding F-10: Incomplete Relation Check in Animal Deletion
- **Severity:** `Low`
- **Affected Files:** [reporting_data.ts](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/lib/actions/reporting_data.ts#L165)
- **Remediation:** Expand `_count` check to include `assistanceRequests` and `veterinaryReports`.

---

### Finding F-11 & F-13: Test Infrastructure, Code Hygiene & Documentation
- **Severity:** `Low`
- **Affected Files:** `package.json`, `web/tests/`, `ARCHITECTURE.md`
- **Remediation:** Set up Vitest upfront in Batch 0. Convert regression tests to `web/tests/`. Remove obsolete test scripts from production directories. Create `ARCHITECTURE.md`.
