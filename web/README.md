# Maitri — Livestock Health Intelligence Platform

> **Maitri** is an AI-powered livestock health surveillance platform providing early outbreak detection, IoT sensor integration, YOLO lesion inspection, and clinical decision support across four primary user roles: **Farmer**, **Field Agent**, **Veterinarian**, and **District Authority**.

---

## 🚀 Getting Started

First, set up your environment variables (see [Database Setup](#-database-setup-phase-2)) and run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router) + React 19 + Turbopack
- **Styling**: Tailwind CSS v4
- **Auth**: Clerk (`@clerk/nextjs`)
- **Database (Phase 2)**: Neon PostgreSQL + Prisma ORM 7 (`@prisma/adapter-pg` / `pg`)
- **Secure Image Storage (Phase 5)**: Vercel Blob (`@vercel/blob`)
- **AI Engine (Phase 6)**: FastAPI microservice (`backend/`)
- **Vet Workstation (Phase 7)**: Clinical triage, dossier, structured feedback, state machine, lab tracking, optimistic concurrency.

---

## 🩺 Veterinarian Clinical Workstation Architecture (Phase 7)

Phase 7 implements the clinical workstation for licensed veterinarians (`/vet`).

### 1. Routes & Server Authorization
- `/vet`: Triage Queue dashboard. Cases are prioritized by risk level (`CRITICAL` > `HIGH` > `ELEVATED` > `MEDIUM` > `LOW` > `UNKNOWN`) and oldest `reportedAt` timestamp.
- `/vet/cases`: Full clinical case repository.
- `/vet/cases/[caseId]`: Clinical dossier view.
- `/vet/samples`: Lab diagnostic sample lifecycle tracker (`COLLECTED` → `SENT` → `RESULT_PENDING` → `RESULT_RECEIVED`).
- `/vet/follow-ups`: Scheduled clinical follow-up tracker.
- **Server Guard**: All routes require `VETERINARIAN` role and `ACTIVE` user status.

### 2. Clinical Safety & Visual Separation
- AI outputs are visually labeled as decision-support signals ("AI Assessment", "Preliminary Risk", "Veterinary Review Recommended") and are strictly separated from "Veterinarian Assessment / Clinical Decision".
- AI confidence never automatically confirms a diagnosis or creates a prescription.

### 3. Server-Side State Machine & Concurrency Control
- **State Machine**:
  - `PENDING_REVIEW` → `UNDER_EXAMINATION` (automatically sets `reviewedAt` and `reviewedByUserId` on first view).
  - `UNDER_EXAMINATION` → `LAB_REFERRAL` | `CONFIRMED` | `CLOSED_HARMLESS`.
  - `LAB_REFERRAL` → remains `LAB_REFERRAL` during sample processing.
  - `CONFIRMED` & `CLOSED_HARMLESS` are terminal states.
- **Optimistic Concurrency**: All mutations validate `expectedUpdatedAt` against `Case.updatedAt` to reject stale writes and prevent multi-clinician overwrite races.
- **Atomic Transactions**: Lab referral (`referCaseToLabAction`) updates `Case.status = LAB_REFERRAL` and creates a `Sample` record in a single atomic Prisma `$transaction`.

---

## 🤖 FastAPI AI Engine Integration (Phase 6)

Maitri connects registered health cases to the external FastAPI AI engine via server-to-server HTTP execution.

### 1. Architecture & Dual Pipeline Execution
- **Server-Only API Client**: `web/lib/api/backend-client.ts` (`import "server-only";`).
- **Endpoint Separation**:
  - `POST /api/analyze`: Multi-stream risk aggregation (ML symptom analysis, IoT vitals anomalies, Open-Meteo microclimate vector risk, regional outbreak surge Z-score, and GenAI advisory).
  - `POST /api/predict`: YOLO visual inspection for clinical lesion photographs (`cow`, `dog`, `pet` categories).
- **Result Storage**: Responses are stored as two separate JSON fields on PostgreSQL: `Case.analysisResult` and `Case.visionResult`.

### 2. Environment Configuration
Add to `.env.local`:
```bash
# Server-only FastAPI AI Engine URL
AI_ENGINE_URL="http://localhost:8000"
```
> ⚠️ **SECURITY**: `AI_ENGINE_URL` is strictly server-only. It must NOT be prefixed with `NEXT_PUBLIC_` or exposed to browser bundles.

### 3. Reliability & Retry Policy
- **Durable Case First**: Case creation in PostgreSQL occurs before AI execution. If the AI engine is offline or times out, the Case remains valid (`status = PENDING_REVIEW`, `analysisResult = null`).
- **Timeout Protection**: 10-second timeout using `AbortController`.
- **Bounded Retries**: Server action `retryCaseAnalysisAction(caseId)` allows authorized users to re-run AI inference without re-uploading photographs or creating duplicate case records.
- **Zero Fabricated Historical Data**: Historical case counts are calculated directly from Prisma district case history over 6 weeks. If data is sparse, the request omits the array so the backend applies its documented default without introducing fake epidemiological numbers.

---

## 🔒 Secure Image Storage Architecture (Phase 5)

Maitri implements a secure, private image pipeline for clinical animal photographs.

### 1. Storage Abstraction Layer
- `web/lib/storage/index.ts`: Provider-agnostic storage abstraction.
- `web/lib/storage/blob.ts`: Production Vercel Blob implementation.

### 2. Privacy & Access Control Model
- **Non-guessable Object Keys**: Keys are generated using random UUIDs (`cases/{submissionId}/{uuid}.jpg`). No personal identifiers (farmer names, phones, raw filenames) are ever exposed.
- **Server Authorization Proxy**: Images are strictly private. Direct public access is disabled; photos are served through server-authorized proxy endpoint `/api/media/photo/[caseId]`.
- **Role Scoping**: Access is checked via server permissions (`FARMER` owns animal, `FIELD_AGENT` within village/district scope, `VETERINARIAN` and `DISTRICT_AUTHORITY` within district jurisdiction).

---

## 🗄️ Database Setup (Phase 2)

Maitri uses **Neon PostgreSQL** as its primary authoritative relational datastore managed via **Prisma ORM**.

### 1. Environment Variables

Create `.env.local` in the `web/` directory based on `.env.example`:

```bash
DATABASE_URL="postgresql://neondb_owner:password@ep-xxx-pooler.c-4.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:password@ep-xxx.c-4.aws.neon.tech/neondb?sslmode=require"
```

- **`DATABASE_URL`**: Pooled connection string (used for normal application runtime queries).
- **`DIRECT_URL`**: Direct connection string (used for Prisma migrations and CLI schema pushes).

> ⚠️ **SECURITY WARNING**: NEVER commit `.env.local` or any file containing real database credentials to Git. Connection strings MUST NOT be prefixed with `NEXT_PUBLIC_`.

### 2. Useful Prisma Commands

```bash
# Validate Prisma schema syntax
npx prisma validate

# Format Prisma schema file
npx prisma format

# Push schema changes to Neon PostgreSQL database
npx prisma db push

# Generate Prisma Client types
npx prisma generate

# Execute deterministic database seed script
npx prisma db seed
# OR directly via tsx:
npx tsx prisma/seed.ts

# Open interactive Prisma Studio GUI
npx prisma studio
```

### 3. Domain Entities & Hierarchy

The database model covers 14 core entities:

1. **User**: Roles (`FARMER`, `FIELD_AGENT`, `VETERINARIAN`, `DISTRICT_AUTHORITY`), Status (`PENDING_APPROVAL`, `ACTIVE`, `REJECTED`), linked via `clerkId`.
2. **Geographic Hierarchy**: `District` → `Block` → `Village`.
3. **Farm**: Belongs to `Village`, optional `farmerUserId` and `fieldAgentUserId`.
4. **Herd**: Belongs to `Farm` (`species`).
5. **Animal**: Belongs to `Herd`, unique tag per herd, optional `iotDeviceId`.
6. **Case**: Central health report (`analysisResult` JSON & `visionResult` JSON preserved separately), veterinary workflow fields (`vetDiagnosis`, `vetRecommendedAction`, `vetFollowUpDate`, `vetNotes`).
7. **VaccinationRecord**: History of administered vaccines.
8. **TreatmentRecord**: History of administered treatments (clinical history, not AI prescription generator).
9. **Sample**: Lab diagnostic sample tracker (`COLLECTED`, `SENT`, `RESULT_PENDING`, `RESULT_RECEIVED`).
10. **Alert**: High-risk village epidemic surge alert window.
11. **ChatConversation** & **ChatMessage**: AI assistant chat storage per animal/user.
