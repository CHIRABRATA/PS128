"use server";

import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { requireFarmer, requireFieldAgent } from "@/lib/auth/permissions";
import {
  routeAssistanceRequestToFieldAgent,
  routeCaseToVeterinarian,
  canUserAccessAssistanceRequest,
  AssignmentLevel,
  AssignedUserInfo,
  RoutedLocationInfo,
} from "@/lib/geo/routing";
import { createInAppNotification } from "./notifications";
import { runCaseAnalysisAction } from "./analysis";
import { Prisma } from "@prisma/client";

const createAssistanceRequestSchema = z.object({
  farmId: z.string().min(1, "Please select a farm"),
  animalId: z.string().optional().nullable(),
  reason: z.string().min(5, "Please describe the reason for assistance (at least 5 characters)"),
  notes: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
});

export type CreateAssistanceRequestInput = z.infer<typeof createAssistanceRequestSchema>;

export interface CreateAssistanceRequestResult {
  success: boolean;
  error?: string;
  requestId?: string;
  status?: string;
  assignedFieldAgent?: AssignedUserInfo | null;
  assignmentLevel?: AssignmentLevel | null;
  location?: RoutedLocationInfo;
}

/**
 * Farmer creates a new field agent assistance request.
 * Creates an AssistanceRequest in REQUESTED status. Case is NOT created at this stage.
 * Deterministically routes request to eligible field agent in the territory.
 */
export async function createAssistanceRequestAction(
  input: CreateAssistanceRequestInput
): Promise<CreateAssistanceRequestResult> {
  try {
    const farmer = await requireFarmer();

    const val = createAssistanceRequestSchema.safeParse(input);
    if (!val.success) {
      return { success: false, error: val.error.issues[0]?.message || "Invalid input." };
    }

    const { farmId, animalId, reason, notes, scheduledAt } = val.data;

    // Verify farm ownership
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: {
        village: {
          include: {
            block: {
              include: {
                district: true,
              },
            },
          },
        },
      },
    });

    if (!farm || farm.farmerUserId !== farmer.id) {
      return { success: false, error: "Unauthorized: You do not own this farm." };
    }

    // Verify animal ownership if animal is specified
    if (animalId) {
      const animal = await prisma.animal.findUnique({
        where: { id: animalId },
        include: { herd: true },
      });
      if (!animal || animal.herd.farmId !== farmId) {
        return { success: false, error: "Selected animal does not belong to this farm." };
      }
    }

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;

    // Create the Assistance Request (caseId remains null until field visit is completed)
    const request = await prisma.assistanceRequest.create({
      data: {
        farmerUserId: farmer.id,
        farmId,
        animalId: animalId || null,
        villageId: farm.villageId || null,
        blockId: farm.village?.blockId || null,
        districtId: farm.village?.block?.districtId || null,
        reason,
        notes: notes || null,
        scheduledAt: scheduledDate,
        status: "REQUESTED",
        caseId: null,
      },
    });

    // Deterministic server-side field agent routing
    const routeRes = await routeAssistanceRequestToFieldAgent(request.id);

    return {
      success: true,
      requestId: request.id,
      status: routeRes.assignedFieldAgent ? "ASSIGNED" : request.status,
      assignedFieldAgent: routeRes.assignedFieldAgent,
      assignmentLevel: routeRes.assignmentLevel,
      location: routeRes.location,
    };
  } catch (err: unknown) {
    console.error("[Create Assistance Request Error]:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create assistance request.",
    };
  }
}

/**
 * Retrieves assistance requests submitted by the current farmer.
 */
export async function getFarmerAssistanceRequestsAction() {
  const farmer = await requireFarmer();

  return await prisma.assistanceRequest.findMany({
    where: { farmerUserId: farmer.id },
    include: {
      animal: true,
      farm: true,
      visit: true,
      village: {
        include: {
          block: {
            include: {
              district: true,
            },
          },
        },
      },
      assignedFieldAgentUser: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      case: {
        select: {
          id: true,
          caseNumber: true,
          status: true,
          reportedAt: true,
        },
      },
    },
    orderBy: { requestedAt: "desc" },
  });
}

/**
 * Retrieves the field agent queue of assistance requests based on territory and assignments.
 */
export async function getFieldAgentAssistanceQueueAction() {
  const agent = await requireFieldAgent();

  const whereClause: Prisma.AssistanceRequestWhereInput = {
    OR: [
      { assignedFieldAgentUserId: agent.id },
      {
        status: { in: ["REQUESTED", "ASSIGNED", "ACCEPTED", "IN_PROGRESS"] },
        OR: [
          agent.villageId ? { villageId: agent.villageId } : undefined,
          agent.blockId ? { blockId: agent.blockId } : undefined,
          agent.districtId ? { districtId: agent.districtId } : undefined,
          {
            village: {
              block: {
                districtId: agent.districtId || undefined,
              },
            },
          },
        ].filter(Boolean) as Prisma.AssistanceRequestWhereInput[],
      },
    ],
  };

  return await prisma.assistanceRequest.findMany({
    where: whereClause,
    include: {
      farmerUser: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      animal: true,
      farm: true,
      visit: true,
      village: {
        include: {
          block: {
            include: {
              district: true,
            },
          },
        },
      },
      assignedFieldAgentUser: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      case: {
        select: {
          id: true,
          caseNumber: true,
          status: true,
        },
      },
    },
    orderBy: { requestedAt: "desc" },
  });
}

/**
 * Field Agent accepts an assistance request.
 * Transitions status to ACCEPTED and records the persistent FieldVisit timestamp.
 */
export async function acceptAssistanceRequestAction(requestId: string, expectedUpdatedAt?: string) {
  const agent = await requireFieldAgent();

  const request = await prisma.assistanceRequest.findUnique({
    where: { id: requestId },
    include: {
      village: {
        include: {
          block: true,
        },
      },
    },
  });

  if (!request) {
    return { success: false, error: "Assistance request not found." };
  }

  // Strict agent authorization: if already assigned to a specific agent, only that agent may accept
  if (request.assignedFieldAgentUserId && request.assignedFieldAgentUserId !== agent.id) {
    return { success: false, error: "Unauthorized: This assistance request is assigned to another field agent." };
  }

  if (request.village && !canUserAccessAssistanceRequest(agent, request as Parameters<typeof canUserAccessAssistanceRequest>[1])) {
    return { success: false, error: "Unauthorized: Request lies outside your jurisdiction." };
  }

  if (request.status !== "REQUESTED" && request.status !== "ASSIGNED") {
    return { success: false, error: `Cannot accept request in status: ${request.status}` };
  }

  // F-03: Optimistic concurrency check
  if (expectedUpdatedAt && request.updatedAt.toISOString() !== expectedUpdatedAt) {
    return {
      success: false,
      error: "This assistance request was updated by another field agent. Please refresh your queue before accepting.",
    };
  }

  const [updated] = await prisma.$transaction([
    prisma.assistanceRequest.update({
      where: { id: requestId },
      data: {
        status: "ACCEPTED",
        assignedFieldAgentUserId: agent.id,
        assignedAt: request.assignedAt || new Date(),
        assignmentLevel: request.assignmentLevel || "DISTRICT",
      },
    }),
    prisma.fieldVisit.upsert({
      where: { assistanceRequestId: requestId },
      create: {
        assistanceRequestId: requestId,
        fieldAgentUserId: agent.id,
        acceptedAt: new Date(),
      },
      update: {
        fieldAgentUserId: agent.id,
        acceptedAt: new Date(),
      },
    }),
  ]);

  // Notify farmer
  await createInAppNotification({
    userId: request.farmerUserId,
    title: "Assistance Request Accepted",
    message: `Field agent ${agent.name} has accepted your assistance request.`,
    link: `/farmer`,
    type: "ASSISTANCE_ACCEPTED",
  });

  return { success: true, status: updated.status };
}

/**
 * Field Agent starts visit (transitions to IN_PROGRESS and records startedAt).
 */
export async function startVisitAssistanceRequestAction(requestId: string, expectedUpdatedAt?: string) {
  const agent = await requireFieldAgent();

  const request = await prisma.assistanceRequest.findUnique({
    where: { id: requestId },
    include: {
      village: {
        include: {
          block: true,
        },
      },
    },
  });

  if (!request) {
    return { success: false, error: "Assistance request not found." };
  }

  // Strict agent authorization: only the assigned agent may start the visit
  if (request.assignedFieldAgentUserId !== agent.id) {
    return { success: false, error: "Unauthorized: You are not the assigned field agent for this assistance request." };
  }

  // F-03: Optimistic concurrency check
  if (expectedUpdatedAt && request.updatedAt.toISOString() !== expectedUpdatedAt) {
    return {
      success: false,
      error: "This assistance request was updated by another field agent. Please refresh your queue before starting the visit.",
    };
  }

  const [updated] = await prisma.$transaction([
    prisma.assistanceRequest.update({
      where: { id: requestId },
      data: {
        status: "IN_PROGRESS",
      },
    }),
    prisma.fieldVisit.upsert({
      where: { assistanceRequestId: requestId },
      create: {
        assistanceRequestId: requestId,
        fieldAgentUserId: agent.id,
        startedAt: new Date(),
      },
      update: {
        startedAt: new Date(),
      },
    }),
  ]);

  // Notify farmer
  await createInAppNotification({
    userId: request.farmerUserId,
    title: "Field Visit in Progress",
    message: `Field agent ${agent.name} has begun the physical livestock inspection.`,
    link: `/farmer`,
    type: "VISIT_IN_PROGRESS",
  });

  return { success: true, status: updated.status };
}

const completeFieldReportSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
  expectedUpdatedAt: z.string().optional().nullable(),
  submissionId: z.string().min(1, "Submission ID is required"),
  animalId: z.string().min(1, "Animal selection is required"),
  symptoms: z.array(z.string()).min(1, "At least one symptom is required"),
  durationDays: z.number().int().min(1),
  affectedCount: z.number().int().min(1),
  herdSize: z.number().int().min(1),
  mortalityCount: z.number().int().min(0),
  heartRate: z.number().optional().nullable(),
  observations: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  gpsLat: z.number().optional().nullable(),
  gpsLng: z.number().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  iotData: z
    .object({
      temperature: z.number().optional().nullable(),
      activity: z.number().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type CompleteFieldReportInput = z.infer<typeof completeFieldReportSchema>;

/**
 * Field Agent completes visit and submits field report.
 * Strict lifecycle check: only the assigned field agent may complete.
 * Atomically:
 * 1. Creates Case (status: PENDING_REVIEW)
 * 2. Persists FieldVisit (observations, measurements, timestamps, photos, caseId)
 * 3. Updates AssistanceRequest (status: COMPLETED, caseId) - preserves original assignedFieldAgentUserId
 * 4. Routes newly created Case to Veterinarian
 * 5. Notifies Farmer and assigned Veterinarian
 * 6. Triggers advisory AI analysis
 */
export async function completeAssistanceWithReportAction(input: CompleteFieldReportInput) {
  try {
    const agent = await requireFieldAgent();

    const val = completeFieldReportSchema.safeParse(input);
    if (!val.success) {
      return { success: false, error: val.error.issues[0]?.message || "Invalid report data." };
    }

    const data = val.data;

    const request = await prisma.assistanceRequest.findUnique({
      where: { id: data.requestId },
      include: {
        farm: true,
        village: {
          include: {
            block: true,
          },
        },
      },
    });

    if (!request) {
      return { success: false, error: "Assistance request not found." };
    }

    if (request.status === "COMPLETED") {
      return { success: false, error: "This assistance request is already completed." };
    }

    // Strict Authorization: only the assigned field agent may complete this report
    if (request.assignedFieldAgentUserId !== agent.id) {
      return {
        success: false,
        error: "Unauthorized: You are not the assigned field agent for this assistance request.",
      };
    }

    // F-03: Optimistic concurrency check
    if (data.expectedUpdatedAt && request.updatedAt.toISOString() !== data.expectedUpdatedAt) {
      return {
        success: false,
        error: "This assistance request was updated by another field agent. Please refresh before completing the report.",
      };
    }

    // Load and verify animal
    const animal = await prisma.animal.findUnique({
      where: { id: data.animalId },
      include: {
        herd: {
          include: {
            farm: true,
          },
        },
      },
    });

    if (!animal) {
      return { success: false, error: "Selected animal does not exist." };
    }

    const caseNumber = `CASE-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const rawIotTelemetry =
      data.iotData || data.heartRate || animal.iotDeviceId
        ? {
            animalId: animal.id,
            deviceId: animal.iotDeviceId || null,
            temperature: data.iotData?.temperature ?? null,
            activity: data.iotData?.activity ?? null,
            heartRate: data.heartRate ?? null,
          }
        : undefined;

    const measurementsJson = {
      heartRate: data.heartRate ?? null,
      temperature: data.iotData?.temperature ?? null,
      activity: data.iotData?.activity ?? null,
      affectedCount: data.affectedCount,
      herdSize: data.herdSize,
      mortalityCount: data.mortalityCount,
    };

    // Atomic transaction: Create Case + Persist FieldVisit + Complete AssistanceRequest
    const result = await prisma.$transaction(async (tx) => {
      const newCase = await tx.case.create({
        data: {
          caseNumber,
          submissionId: data.submissionId,
          animalId: data.animalId,
          createdByUserId: agent.id,
          reportSource: "FIELD_AGENT",
          status: "PENDING_REVIEW",
          symptoms: data.symptoms,
          durationDays: data.durationDays,
          affectedCount: data.affectedCount,
          mortalityCount: data.mortalityCount,
          photoUrl: data.photoUrl || null,
          gpsLat: data.gpsLat ?? null,
          gpsLng: data.gpsLng ?? null,
          iotTelemetry: rawIotTelemetry,
        },
      });

      const fieldVisit = await tx.fieldVisit.upsert({
        where: { assistanceRequestId: data.requestId },
        create: {
          assistanceRequestId: data.requestId,
          fieldAgentUserId: agent.id,
          completedAt: new Date(),
          observations: data.observations || `Symptoms: ${data.symptoms.join(", ")}`,
          measurements: measurementsJson,
          photos: data.photoUrl ? [data.photoUrl] : [],
          notes: data.notes || null,
          caseId: newCase.id,
        },
        update: {
          completedAt: new Date(),
          observations: data.observations || `Symptoms: ${data.symptoms.join(", ")}`,
          measurements: measurementsJson,
          photos: data.photoUrl ? [data.photoUrl] : [],
          notes: data.notes || null,
          caseId: newCase.id,
        },
      });

      const updatedRequest = await tx.assistanceRequest.update({
        where: { id: data.requestId },
        data: {
          status: "COMPLETED",
          animalId: data.animalId,
          caseId: newCase.id,
          // Preserves original assignedFieldAgentUserId, assignedAt, assignmentLevel
        },
      });

      return { newCase, fieldVisit, updatedRequest };
    });

    // Route newly created Case to an eligible Veterinarian
    const vetRouteResult = await routeCaseToVeterinarian(result.newCase.id);

    // Notify farmer that Case has been created and routed to Vet
    await createInAppNotification({
      userId: request.farmerUserId,
      title: "Field Inspection Completed",
      message: `Field report completed for ${animal.tag}. Health Case #${result.newCase.caseNumber} has been submitted for veterinary review.`,
      link: `/farmer/animals/${animal.id}`,
      type: "VISIT_COMPLETED",
    });

    // Asynchronously trigger AI analysis (advisory only, non-blocking)
    runCaseAnalysisAction(result.newCase.id).catch((err) => {
      console.error("[Field Report AI Trigger Error]:", err);
    });

    return {
      success: true,
      caseNumber: result.newCase.caseNumber,
      caseId: result.newCase.id,
      status: result.newCase.status,
      requestId: result.updatedRequest.id,
      assignedVeterinarian: vetRouteResult.assignedVeterinarian,
      assignmentLevel: vetRouteResult.assignmentLevel,
    };
  } catch (err: unknown) {
    console.error("[Complete Field Report Error]:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to complete field report.",
    };
  }
}
