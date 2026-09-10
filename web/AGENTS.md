<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Maitri (PS128) Developer & Agent Instructions

## Architecture Reference
- Consult [ARCHITECTURE.md](file:///c:/Users/Arnab/Downloads/PS128/PS128-main/web/ARCHITECTURE.md) for full architectural blueprints, data flow diagrams, offline-first sync lifecycle, and RBAC specifications.

## Mandatory Quality Gates
All code contributions must satisfy the Triple Verification Gate before merging or release:
1. `npm test` — All Vitest test suites must pass.
2. `npm run lint` — ESLint must report 0 errors and 0 warnings.
3. `npx tsc --noEmit` — Strict TypeScript compilation with 0 errors.

## Key System Contracts
- **Offline Sync Isolation (F-02)**: Queue items must be tagged with the active Clerk `userId` at enqueue time. Syncing only executes items matching the current user session; mismatched items are held (never reassigned or dropped).
- **Retry Capping (F-06)**: Sync failures (including photo uploads) increment `retryCount` toward `MAX_AUTO_RETRIES = 5` and transition to `NEEDS_MANUAL_RETRY`.
- **Concurrency Control (F-03)**: Field assistance status changes require `expectedUpdatedAt` timestamps to prevent stale overwrite races.
- **Relational Integrity (F-10)**: Animal deletion is blocked if associated with clinical cases, vaccinations, treatments, assistance requests, veterinary reports, or conversations.
