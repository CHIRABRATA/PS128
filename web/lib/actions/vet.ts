"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { requireActiveUser, FullAppUser, getCurrentClerkUser } from "@/lib/auth/session";
import { clerkClient } from "@clerk/nextjs/server";
import { canUserAccessCase } from "@/lib/storage/auth";
import { VetAction, SampleStatus, Prisma } from "@prisma/client";
import {
  vetFeedbackSchema,
  referToLabSchema,
  confirmCaseSchema,
  closeCaseSchema,
  updateSampleStatusSchema,
  updateVetProfileSchema,
  getRiskRank,
  VetFeedbackInput,
  ReferToLabInput,
  ConfirmCaseInput,
  CloseCaseInput,
  UpdateSampleStatusInput,
  UpdateVetProfileInput,
} from "@/lib/vet/schemas";
import { evaluateVillageOutbreakAlert } from "@/lib/authority/alerts";
import { createInAppNotification } from "./notifications";

/**
 * Requires the current user to be an ACTIVE VETERINARIAN.
 */
async function requireActiveVeterinarian(): Promise<FullAppUser> {
  const appUser = await requireActiveUser();
  if ((appUser.role !== "VETERINARIAN" && appUser.role !== "ADMIN") || appUser.status !== "ACTIVE") {
    throw new Error("Unauthorized: Only active veterinarians and administrators may perform clinical actions.");
  }
  return appUser;
}

/**
 * Retrieves real database metrics for the veterinarian dashboard.
 */
export async function getVetDashboardMetricsAction() {
  const vet = await requireActiveVeterinarian();

  const baseWhere: Prisma.CaseWhereInput = {};
  if (vet.districtId) {
    baseWhere.animal = {
      herd: {
        farm: {
          village: {
            block: {
              districtId: vet.districtId,
            },
          },
        },
      },
    };
  }

  const [pendingCount, underExamCount, labRefCount, followUpsDueCount, myAssignedCount, activeCases] = await Promise.all([
    prisma.case.count({
      where: { ...baseWhere, status: "PENDING_REVIEW" },
    }),
    prisma.case.count({
      where: { ...baseWhere, status: "UNDER_EXAMINATION" },
    }),
    prisma.case.count({
      where: { ...baseWhere, status: "LAB_REFERRAL" },
    }),
    prisma.case.count({
      where: {
        ...baseWhere,
        vetFollowUpDate: { not: null },
        status: { not: "CLOSED_HARMLESS" },
      },
    }),
    prisma.case.count({
      where: {
        assignedVeterinarianUserId: vet.id,
        status: { in: ["PENDING_REVIEW", "UNDER_EXAMINATION", "LAB_REFERRAL"] },
      },
    }),
    prisma.case.findMany({
      where: {
        ...baseWhere,
        status: { in: ["PENDING_REVIEW", "UNDER_EXAMINATION", "LAB_REFERRAL"] },
      },
      select: {
        id: true,
        analysisResult: true,
      },
    }),
  ]);

  let criticalCount = 0;
  let highCount = 0;
  for (const c of activeCases) {
    const analysis = (c.analysisResult as Record<string, unknown> | null) || {};
    const level = analysis.overall_risk_level as string;
    if (level === "CRITICAL") criticalCount++;
    else if (level === "HIGH") highCount++;
  }

  const recentlyReviewedCount = await prisma.case.count({
    where: {
      ...baseWhere,
      reviewedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  return {
    pendingCount,
    underExamCount,
    labRefCount,
    followUpsDueCount,
    myAssignedCount,
    criticalCount,
    highCount,
    recentlyReviewedCount,
    totalActiveCount: activeCases.length,
  };
}

/**
 * Retrieves the priority triage queue for an active veterinarian.
 * Filtered by district jurisdiction / direct assignment and ordered by risk rank, score, and oldest reportedAt.
 */
export async function getVetQueueAction(filters?: {
  status?: string;
  riskLevel?: string;
  villageId?: string;
  species?: string;
  scope?: "assigned" | "service_area";
}) {
  const vet = await requireActiveVeterinarian();

  const scope = filters?.scope || "assigned";

  const whereClause: Prisma.CaseWhereInput = {
    status: {
      in: filters?.status
        ? [filters.status as Prisma.EnumCaseStatusFilter["in"] extends readonly (infer T)[] ? T : never]
        : ["PENDING_REVIEW", "UNDER_EXAMINATION", "LAB_REFERRAL"],
    },
  };

  if (scope === "assigned") {
    // Authoritative assigned queue: directly assigned to this authenticated veterinarian
    whereClause.assignedVeterinarianUserId = vet.id;
  } else {
    // Service area jurisdiction queue: cases within vet's assigned district (including unassigned)
    if (vet.districtId) {
      whereClause.animal = {
        herd: {
          farm: {
            village: {
              block: {
                districtId: vet.districtId,
              },
            },
          },
        },
      };
    }
  }

  if (filters?.villageId) {
    if (whereClause.animal) {
      whereClause.animal = {
        ...(whereClause.animal as Prisma.AnimalWhereInput),
        herd: {
          farm: {
            villageId: filters.villageId,
            village: vet.districtId && scope === "service_area"
              ? { block: { districtId: vet.districtId } }
              : undefined,
          },
        },
      };
    } else {
      whereClause.animal = {
        herd: {
          farm: {
            villageId: filters.villageId,
          },
        },
      };
    }
  }

  if (filters?.species) {
    whereClause.animal = {
      ...(whereClause.animal as Prisma.AnimalWhereInput),
      species: filters.species as Prisma.EnumSpeciesFilter["equals"],
    };
  }

  const cases = await prisma.case.findMany({
    where: whereClause,
    include: {
      createdByUser: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      assignedVeterinarianUser: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      animal: {
        include: {
          herd: {
            include: {
              farm: {
                include: {
                  village: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Filter by risk if requested
  let filteredCases = cases;
  if (filters?.riskLevel) {
    filteredCases = cases.filter((c) => {
      const analysis = (c.analysisResult as Record<string, unknown> | null) || {};
      return analysis.overall_risk_level === filters.riskLevel;
    });
  }

  // Sort queue: Risk Rank DESC -> Risk Score DESC -> reportedAt ASC (oldest first)
  return filteredCases.sort((a, b) => {
    const analysisA = (a.analysisResult as Record<string, unknown> | null) || {};
    const analysisB = (b.analysisResult as Record<string, unknown> | null) || {};

    const levelA = (analysisA.overall_risk_level as string) || null;
    const levelB = (analysisB.overall_risk_level as string) || null;

    const rankA = getRiskRank(levelA);
    const rankB = getRiskRank(levelB);

    if (rankA !== rankB) {
      return rankB - rankA;
    }

    const scoreA = Number(analysisA.overall_risk_score || 0);
    const scoreB = Number(analysisB.overall_risk_score || 0);

    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    return new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime();
  });
}

/**
 * Automatically sets reviewedAt and reviewedByUserId atomically when opened for the first time.
 */
export async function markCaseReviewedAction(caseId: string) {
  const vet = await requireActiveVeterinarian();

  const healthCase = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      photoUrl: true,
      status: true,
      reviewedAt: true,
      reviewedByUserId: true,
      createdByUserId: true,
      assignedVeterinarianUserId: true,
      animal: {
        select: {
          herd: {
            select: {
              farm: {
                select: {
                  farmerUserId: true,
                  fieldAgentUserId: true,
                  villageId: true,
                  village: {
                    select: {
                      blockId: true,
                      block: {
                        select: {
                          districtId: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!healthCase) {
    throw new Error("Health case not found.");
  }

  if (!canUserAccessCase(vet, healthCase)) {
    throw new Error("Unauthorized to access this health case.");
  }

  // Atomically initialize reviewedAt/reviewedByUserId if not yet reviewed
  if (!healthCase.reviewedAt) {
    const newStatus = healthCase.status === "PENDING_REVIEW" ? "UNDER_EXAMINATION" : healthCase.status;
    await prisma.case.update({
      where: { id: caseId },
      data: {
        reviewedAt: new Date(),
        reviewedByUserId: vet.id,
        status: newStatus,
      },
    });
  }
}

/**
 * Retrieves full clinical dossier for a specific case with complete longitudinal animal history.
 */
export async function getVetCaseDetailAction(caseId: string) {
  const vet = await requireActiveVeterinarian();

  const healthCase = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      animal: {
        include: {
          herd: {
            include: {
              farm: {
                include: {
                  farmerUser: {
                    select: { id: true, name: true, phone: true },
                  },
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
              },
            },
          },
          veterinaryReports: {
            include: {
              vetUser: { select: { id: true, name: true, phone: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          vaccinations: {
            include: {
              administeredByUser: {
                select: { name: true, role: true },
              },
            },
            orderBy: { dateGiven: "desc" },
          },
          treatments: {
            include: {
              administeredByUser: {
                select: { name: true, role: true },
              },
            },
            orderBy: { dateGiven: "desc" },
          },
          cases: {
            where: { id: { not: caseId } },
            select: {
              id: true,
              caseNumber: true,
              status: true,
              symptoms: true,
              reportedAt: true,
              vetDiagnosis: true,
              vetRecommendedAction: true,
              vetNotes: true,
            },
            orderBy: { reportedAt: "desc" },
          },
        },
      },
      createdByUser: {
        select: { id: true, name: true, role: true, phone: true },
      },
      reviewedByUser: {
        select: { id: true, name: true, role: true },
      },
      samples: {
        include: {
          collectedByUser: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      veterinaryReports: {
        include: {
          vetUser: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!healthCase) {
    throw new Error("Case not found.");
  }

  if (!canUserAccessCase(vet, healthCase)) {
    throw new Error("Unauthorized to access this health case.");
  }

  return healthCase;
}

/**
 * Saves structured veterinary feedback (diagnosis, action, follow-up, notes) with optimistic concurrency.
 * Atomically creates a permanent VeterinaryReport record, updates the Case, and notifies the farmer.
 */
export async function saveVetFeedbackAction(input: VetFeedbackInput) {
  const vet = await requireActiveVeterinarian();

  const val = vetFeedbackSchema.safeParse(input);
  if (!val.success) {
    return { success: false, error: val.error.issues[0]?.message || "Invalid input data." };
  }

  const { caseId, expectedUpdatedAt, vetDiagnosis, vetRecommendedAction, vetFollowUpDate, vetNotes } = val.data;

  const currentCase = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      caseNumber: true,
      animalId: true,
      photoUrl: true,
      status: true,
      updatedAt: true,
      createdByUserId: true,
      animal: {
        select: {
          tag: true,
          species: true,
          herd: {
            select: {
              farm: {
                select: {
                  farmerUserId: true,
                  fieldAgentUserId: true,
                  villageId: true,
                  village: {
                    select: {
                      blockId: true,
                      block: { select: { districtId: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!currentCase) return { success: false, error: "Case not found." };
  if (!canUserAccessCase(vet, currentCase)) return { success: false, error: "Unauthorized access." };

  // Terminal state check
  if (currentCase.status === "CLOSED_HARMLESS" || currentCase.status === "CONFIRMED") {
    return { success: false, error: "Cannot modify a closed or confirmed clinical case." };
  }

  // Optimistic concurrency check
  if (currentCase.updatedAt.toISOString() !== expectedUpdatedAt) {
    return {
      success: false,
      error: "This case was updated by another clinician. Please refresh the page before saving changes.",
    };
  }

  const parsedFollowUp = vetFollowUpDate ? new Date(vetFollowUpDate) : null;
  const actionEnum = (vetRecommendedAction as VetAction) || "MONITOR";

  // Atomically update Case and create VeterinaryReport
  await prisma.$transaction([
    prisma.case.update({
      where: { id: caseId },
      data: {
        vetDiagnosis: vetDiagnosis || null,
        vetRecommendedAction: actionEnum,
        vetFollowUpDate: parsedFollowUp,
        vetNotes: vetNotes || null,
        reviewedByUserId: vet.id,
        reviewedAt: new Date(),
        status: "UNDER_EXAMINATION",
      },
    }),
    prisma.veterinaryReport.create({
      data: {
        caseId,
        animalId: currentCase.animalId,
        vetUserId: vet.id,
        diagnosis: vetDiagnosis || "Clinical assessment recorded",
        action: actionEnum,
        followUpDate: parsedFollowUp,
        notes: vetNotes || null,
        instructions: `Recommended clinical action: ${actionEnum}`,
      },
    }),
  ]);

  // Notify farmer
  const farmerUserId = currentCase.animal.herd.farm.farmerUserId;
  if (farmerUserId) {
    await createInAppNotification({
      userId: farmerUserId,
      title: "Veterinary Report Available",
      message: `Dr. ${vet.name} submitted a clinical assessment for Animal ${currentCase.animal.tag} (${currentCase.animal.species}): "${vetDiagnosis || actionEnum}".`,
      link: `/farmer/cases/${caseId}`,
      type: "VET_REPORT_SUBMITTED",
    });
  }

  try {
    revalidatePath("/vet");
    revalidatePath("/vet/cases");
    revalidatePath(`/vet/cases/${caseId}`);
    revalidatePath("/vet/follow-ups");
    revalidatePath("/farmer");
    revalidatePath(`/farmer/cases/${caseId}`);
    revalidatePath(`/farmer/animals/${currentCase.animalId}`);
    revalidatePath("/authority");
  } catch {
    // Safe fallback
  }

  return { success: true };
}

/**
 * Atomic transaction to transition case to LAB_REFERRAL, create Sample record, and VeterinaryReport.
 */
export async function referCaseToLabAction(input: ReferToLabInput) {
  const vet = await requireActiveVeterinarian();

  const val = referToLabSchema.safeParse(input);
  if (!val.success) {
    return { success: false, error: val.error.issues[0]?.message || "Invalid input." };
  }

  const { caseId, expectedUpdatedAt, labName, vetDiagnosis, vetNotes } = val.data;

  const currentCase = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      caseNumber: true,
      animalId: true,
      photoUrl: true,
      status: true,
      updatedAt: true,
      createdByUserId: true,
      animal: {
        select: {
          tag: true,
          species: true,
          herd: {
            select: {
              farm: {
                select: {
                  farmerUserId: true,
                  fieldAgentUserId: true,
                  villageId: true,
                  village: { select: { blockId: true, block: { select: { districtId: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!currentCase) return { success: false, error: "Case not found." };
  if (!canUserAccessCase(vet, currentCase)) return { success: false, error: "Unauthorized." };

  if (currentCase.status !== "PENDING_REVIEW" && currentCase.status !== "UNDER_EXAMINATION") {
    return { success: false, error: `Cannot refer to lab from state: ${currentCase.status}` };
  }

  if (currentCase.updatedAt.toISOString() !== expectedUpdatedAt) {
    return { success: false, error: "This case was updated by another user. Please refresh." };
  }

  // Execute atomic Prisma transaction
  await prisma.$transaction([
    prisma.case.update({
      where: { id: caseId },
      data: {
        status: "LAB_REFERRAL",
        vetRecommendedAction: "REFER_LAB",
        vetDiagnosis: vetDiagnosis || undefined,
        vetNotes: vetNotes || undefined,
        reviewedByUserId: vet.id,
        reviewedAt: new Date(),
      },
    }),
    prisma.sample.create({
      data: {
        caseId,
        collectedByUserId: vet.id,
        labName,
        status: "COLLECTED",
      },
    }),
    prisma.veterinaryReport.create({
      data: {
        caseId,
        animalId: currentCase.animalId,
        vetUserId: vet.id,
        diagnosis: vetDiagnosis || "Referred to laboratory for confirmatory testing",
        action: "REFER_LAB",
        notes: `Referred to lab: ${labName}. ${vetNotes || ""}`,
      },
    }),
  ]);

  // Notify farmer
  const farmerUserId = currentCase.animal.herd.farm.farmerUserId;
  if (farmerUserId) {
    await createInAppNotification({
      userId: farmerUserId,
      title: "Lab Referral Scheduled",
      message: `Sample for Animal ${currentCase.animal.tag} has been referred to ${labName} for testing.`,
      link: `/farmer/cases/${caseId}`,
      type: "LAB_REFERRAL",
    });
  }

  try {
    revalidatePath("/vet");
    revalidatePath("/vet/cases");
    revalidatePath(`/vet/cases/${caseId}`);
    revalidatePath("/vet/samples");
    revalidatePath("/farmer");
    revalidatePath(`/farmer/cases/${caseId}`);
    revalidatePath(`/farmer/animals/${currentCase.animalId}`);
    revalidatePath("/authority");
  } catch {
    // Safe fallback
  }

  return { success: true };
}

/**
 * Transitions case to CONFIRMED and appends VeterinaryReport to permanent animal history.
 */
export async function confirmCaseAction(input: ConfirmCaseInput) {
  const vet = await requireActiveVeterinarian();

  const val = confirmCaseSchema.safeParse(input);
  if (!val.success) return { success: false, error: val.error.issues[0]?.message || "Invalid input." };

  const { caseId, expectedUpdatedAt, vetDiagnosis, vetNotes } = val.data;

  const currentCase = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      caseNumber: true,
      animalId: true,
      photoUrl: true,
      status: true,
      updatedAt: true,
      createdByUserId: true,
      animal: {
        select: {
          tag: true,
          species: true,
          herd: {
            select: {
              farm: {
                select: {
                  farmerUserId: true,
                  fieldAgentUserId: true,
                  villageId: true,
                  village: { select: { blockId: true, block: { select: { districtId: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!currentCase) return { success: false, error: "Case not found." };
  if (!canUserAccessCase(vet, currentCase)) return { success: false, error: "Unauthorized." };

  if (currentCase.status !== "UNDER_EXAMINATION" && currentCase.status !== "LAB_REFERRAL" && currentCase.status !== "PENDING_REVIEW") {
    return { success: false, error: `Invalid transition to CONFIRMED from state ${currentCase.status}` };
  }

  if (currentCase.updatedAt.toISOString() !== expectedUpdatedAt) {
    return { success: false, error: "Case was updated by another user. Please refresh." };
  }

  await prisma.$transaction([
    prisma.case.update({
      where: { id: caseId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        vetDiagnosis,
        vetNotes: vetNotes || undefined,
        reviewedByUserId: vet.id,
      },
    }),
    prisma.veterinaryReport.create({
      data: {
        caseId,
        animalId: currentCase.animalId,
        vetUserId: vet.id,
        diagnosis: vetDiagnosis,
        action: "TREAT",
        notes: `Confirmed disease: ${vetDiagnosis}. ${vetNotes || ""}`,
        instructions: "Follow prescribed treatment regimen and maintain quarantine.",
      },
    }),
  ]);

  const villageId = currentCase.animal.herd.farm.villageId;
  if (villageId) {
    await evaluateVillageOutbreakAlert(villageId);
  }

  // Notify farmer
  const farmerUserId = currentCase.animal.herd.farm.farmerUserId;
  if (farmerUserId) {
    await createInAppNotification({
      userId: farmerUserId,
      title: "Diagnosis Confirmed",
      message: `Dr. ${vet.name} confirmed diagnosis: "${vetDiagnosis}" for Animal ${currentCase.animal.tag}.`,
      link: `/farmer/cases/${caseId}`,
      type: "DIAGNOSIS_CONFIRMED",
    });
  }

  try {
    revalidatePath("/vet");
    revalidatePath("/vet/cases");
    revalidatePath(`/vet/cases/${caseId}`);
    revalidatePath("/farmer");
    revalidatePath(`/farmer/cases/${caseId}`);
    revalidatePath(`/farmer/animals/${currentCase.animalId}`);
    revalidatePath("/authority");
  } catch {
    // Safe fallback
  }

  return { success: true };
}

/**
 * Transitions case to CLOSED_HARMLESS and saves concluding report.
 */
export async function closeCaseAction(input: CloseCaseInput) {
  const vet = await requireActiveVeterinarian();

  const val = closeCaseSchema.safeParse(input);
  if (!val.success) return { success: false, error: val.error.issues[0]?.message || "Invalid input." };

  const { caseId, expectedUpdatedAt, vetNotes } = val.data;

  const currentCase = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      caseNumber: true,
      animalId: true,
      photoUrl: true,
      status: true,
      updatedAt: true,
      createdByUserId: true,
      animal: {
        select: {
          tag: true,
          species: true,
          herd: {
            select: {
              farm: {
                select: {
                  farmerUserId: true,
                  fieldAgentUserId: true,
                  villageId: true,
                  village: { select: { blockId: true, block: { select: { districtId: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!currentCase) return { success: false, error: "Case not found." };
  if (!canUserAccessCase(vet, currentCase)) return { success: false, error: "Unauthorized." };

  if (currentCase.status === "CLOSED_HARMLESS" || currentCase.status === "CONFIRMED") {
    return { success: false, error: "Case is already terminal." };
  }

  if (currentCase.updatedAt.toISOString() !== expectedUpdatedAt) {
    return { success: false, error: "Case was updated by another user. Please refresh." };
  }

  await prisma.$transaction([
    prisma.case.update({
      where: { id: caseId },
      data: {
        status: "CLOSED_HARMLESS",
        closedAt: new Date(),
        vetNotes: vetNotes || undefined,
        reviewedByUserId: vet.id,
      },
    }),
    prisma.veterinaryReport.create({
      data: {
        caseId,
        animalId: currentCase.animalId,
        vetUserId: vet.id,
        diagnosis: "Case closed / Condition resolved harmlessly",
        action: "NONE",
        notes: vetNotes || "Routine recovery verified.",
      },
    }),
  ]);

  // Notify farmer
  const farmerUserId = currentCase.animal.herd.farm.farmerUserId;
  if (farmerUserId) {
    await createInAppNotification({
      userId: farmerUserId,
      title: "Case Closed / Resolved",
      message: `Case #${currentCase.caseNumber} for Animal ${currentCase.animal.tag} has been closed by Dr. ${vet.name}.`,
      link: `/farmer/cases/${caseId}`,
      type: "CASE_CLOSED",
    });
  }

  try {
    revalidatePath("/vet");
    revalidatePath("/vet/cases");
    revalidatePath(`/vet/cases/${caseId}`);
    revalidatePath("/farmer");
    revalidatePath(`/farmer/cases/${caseId}`);
    revalidatePath(`/farmer/animals/${currentCase.animalId}`);
    revalidatePath("/authority");
  } catch {
    // Safe fallback
  }

  return { success: true };
}

/**
 * Retrieves lab samples for veterinarian dashboard.
 */
export async function getVetSamplesAction() {
  const vet = await requireActiveVeterinarian();

  const whereClause: Prisma.SampleWhereInput = {};
  if (vet.districtId) {
    whereClause.case = {
      animal: {
        herd: {
          farm: {
            village: {
              block: {
                districtId: vet.districtId,
              },
            },
          },
        },
      },
    };
  }

  return await prisma.sample.findMany({
    where: whereClause,
    include: {
      case: {
        select: {
          id: true,
          caseNumber: true,
          status: true,
          symptoms: true,
          updatedAt: true,
          animal: {
            select: {
              tag: true,
              species: true,
            },
          },
        },
      },
      collectedByUser: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Updates a Sample's status (COLLECTED -> SENT -> RESULT_PENDING -> RESULT_RECEIVED) and result summary.
 */
export async function updateSampleStatusAction(input: UpdateSampleStatusInput) {
  const vet = await requireActiveVeterinarian();

  const val = updateSampleStatusSchema.safeParse(input);
  if (!val.success) return { success: false, error: val.error.issues[0]?.message || "Invalid sample data." };

  const { sampleId, expectedUpdatedAt, status, resultSummary, labName } = val.data;

  const currentSample = await prisma.sample.findUnique({
    where: { id: sampleId },
    include: {
      case: {
        select: {
          id: true,
          photoUrl: true,
          createdByUserId: true,
          animal: {
            select: {
              herd: {
                select: {
                  farm: {
                    select: {
                      farmerUserId: true,
                      fieldAgentUserId: true,
                      villageId: true,
                      village: { select: { blockId: true, block: { select: { districtId: true } } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!currentSample) return { success: false, error: "Sample record not found." };
  if (!canUserAccessCase(vet, currentSample.case)) return { success: false, error: "Unauthorized sample access." };

  if (currentSample.updatedAt.toISOString() !== expectedUpdatedAt) {
    return { success: false, error: "Sample was updated by another user. Please refresh." };
  }

  const updateData: Prisma.SampleUpdateInput = {
    status: status as SampleStatus,
    labName: labName || undefined,
  };

  if (status === "SENT" && !currentSample.sentAt) {
    updateData.sentAt = new Date();
  }

  if (status === "RESULT_RECEIVED") {
    updateData.resultReceivedAt = new Date();
    updateData.resultSummary = resultSummary || "Sample results received and verified by veterinarian.";
  }

  await prisma.sample.update({
    where: { id: sampleId },
    data: updateData,
  });

  try {
    revalidatePath("/vet");
    revalidatePath("/vet/samples");
    if (currentSample.case?.id) {
      revalidatePath(`/vet/cases/${currentSample.case.id}`);
    }
  } catch {
    // Safe fallback
  }

  return { success: true };
}

/**
 * Retrieves follow-up cases sorted by nearest vetFollowUpDate with categorization filters.
 * Categories: 'all' | 'due_today' | 'upcoming' | 'overdue' | 'completed'
 */
export async function getVetFollowUpsAction(category: "all" | "due_today" | "upcoming" | "overdue" | "completed" = "all") {
  const vet = await requireActiveVeterinarian();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const whereClause: Prisma.VeterinaryReportWhereInput = {
    followUpDate: { not: null },
  };

  if (category === "due_today") {
    whereClause.followUpDate = { gte: startOfToday, lte: endOfToday };
    whereClause.followUpCompleted = false;
  } else if (category === "overdue") {
    whereClause.followUpDate = { lt: startOfToday };
    whereClause.followUpCompleted = false;
  } else if (category === "upcoming") {
    whereClause.followUpDate = { gt: endOfToday };
    whereClause.followUpCompleted = false;
  } else if (category === "completed") {
    whereClause.followUpCompleted = true;
  }

  if (vet.districtId) {
    whereClause.animal = {
      herd: {
        farm: {
          village: {
            block: {
              districtId: vet.districtId,
            },
          },
        },
      },
    };
  }

  return await prisma.veterinaryReport.findMany({
    where: whereClause,
    include: {
      case: {
        select: {
          id: true,
          caseNumber: true,
          status: true,
          symptoms: true,
          updatedAt: true,
        },
      },
      animal: {
        include: {
          herd: {
            include: {
              farm: {
                include: {
                  village: true,
                  farmerUser: { select: { name: true, phone: true } },
                },
              },
            },
          },
        },
      },
      vetUser: {
        select: { id: true, name: true },
      },
    },
    orderBy: { followUpDate: "asc" },
  });
}

/**
 * Marks a scheduled follow-up as completed by the veterinarian.
 */
export async function completeFollowUpAction(reportId: string, notes?: string) {
  const vet = await requireActiveVeterinarian();

  const report = await prisma.veterinaryReport.findUnique({
    where: { id: reportId },
    include: {
      case: {
        include: {
          animal: {
            include: {
              herd: {
                include: {
                  farm: {
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
                  },
                },
              },
            },
          },
        },
      },
      animal: {
        include: {
          herd: {
            include: {
              farm: {
                include: {
                  village: {
                    include: {
                      block: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!report) {
    return { success: false, error: "Veterinary report not found." };
  }

  if (!canUserAccessCase(vet, report.case)) {
    return { success: false, error: "Unauthorized." };
  }

  const completedAt = new Date();

  await prisma.$transaction([
    prisma.veterinaryReport.update({
      where: { id: reportId },
      data: {
        followUpCompleted: true,
        followUpCompletedAt: completedAt,
        followUpNotes: notes || "Follow-up examination completed successfully.",
      },
    }),
    prisma.case.update({
      where: { id: report.caseId },
      data: {
        followUpCompleted: true,
        followUpCompletedAt: completedAt,
      },
    }),
  ]);

  const farmerUserId = report.animal.herd.farm.farmerUserId;
  if (farmerUserId) {
    await createInAppNotification({
      userId: farmerUserId,
      title: "Follow-up Examination Completed",
      message: `Dr. ${vet.name} completed the follow-up examination for Animal ${report.animal.tag}.`,
      link: `/farmer/cases/${report.caseId}`,
      type: "FOLLOW_UP_COMPLETED",
    });
  }

  try {
    revalidatePath("/vet");
    revalidatePath("/vet/follow-ups");
    if (report.caseId) {
      revalidatePath(`/vet/cases/${report.caseId}`);
      revalidatePath(`/farmer/cases/${report.caseId}`);
    }
    revalidatePath("/farmer");
    revalidatePath(`/farmer/animals/${report.animalId}`);
  } catch {
    // Safe fallback
  }

  return { success: true };
}

export interface VetProfileData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  imageUrl: string | null;
  preferredLanguage: string;
  telegramChatId: string | null;
  role: string;
  status: string;
  districtId: string | null;
  districtName: string | null;
  blockId: string | null;
  blockName: string | null;
  villageId: string | null;
  villageName: string | null;
  assignedActiveCasesCount: number;
  authoredReportsCount: number;
  reviewedCasesCount: number;
  createdAt: string;
}

/**
 * Retrieves the profile details for the currently authenticated veterinarian.
 */
export async function getVetProfileAction(): Promise<VetProfileData> {
  const vet = await requireActiveVeterinarian();
  const [clerkUser, fullUser, assignedActiveCasesCount, authoredReportsCount, reviewedCasesCount] = await Promise.all([
    getCurrentClerkUser(),
    prisma.user.findUnique({
      where: { id: vet.id },
      include: {
        district: true,
        block: true,
        village: true,
      },
    }),
    prisma.case.count({
      where: {
        assignedVeterinarianUserId: vet.id,
        status: { in: ["PENDING_REVIEW", "UNDER_EXAMINATION", "LAB_REFERRAL"] },
      },
    }),
    prisma.veterinaryReport.count({
      where: { vetUserId: vet.id },
    }),
    prisma.case.count({
      where: { reviewedByUserId: vet.id },
    }),
  ]);

  if (!fullUser) {
    throw new Error("Veterinarian profile not found.");
  }

  const primaryEmail = clerkUser?.emailAddresses[0]?.emailAddress || null;
  const imageUrl = clerkUser?.imageUrl || null;

  return {
    id: fullUser.id,
    name: fullUser.name,
    phone: fullUser.phone,
    email: primaryEmail,
    imageUrl,
    preferredLanguage: fullUser.preferredLanguage || "en",
    telegramChatId: fullUser.telegramChatId || null,
    role: fullUser.role,
    status: fullUser.status,
    districtId: fullUser.districtId || null,
    districtName: fullUser.district?.name || null,
    blockId: fullUser.blockId || null,
    blockName: fullUser.block?.name || null,
    villageId: fullUser.villageId || null,
    villageName: fullUser.village?.name || null,
    assignedActiveCasesCount,
    authoredReportsCount,
    reviewedCasesCount,
    createdAt: fullUser.createdAt.toISOString(),
  };
}

/**
 * Updates the authenticated veterinarian's profile and service jurisdiction.
 * Strictly verifies identity, forbids role manipulation, and validates location hierarchy.
 */
export async function updateVetProfileAction(input: UpdateVetProfileInput) {
  try {
    const vet = await requireActiveVeterinarian();

    const parsed = updateVetProfileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid profile data.",
      };
    }

    const { name, phone, preferredLanguage, districtId, blockId, villageId } = parsed.data;

    // 1. Resolve and validate administrative location hierarchy
    let resolvedDistrictId: string | null = null;
    let resolvedBlockId: string | null = null;
    let resolvedVillageId: string | null = null;

    if (villageId) {
      const villageObj = await prisma.village.findUnique({
        where: { id: villageId },
        include: { block: { include: { district: true } } },
      });
      if (!villageObj) {
        return { success: false, error: "Selected Village does not exist." };
      }
      resolvedVillageId = villageObj.id;
      resolvedBlockId = villageObj.blockId;
      resolvedDistrictId = villageObj.block.districtId;

      if (blockId && blockId !== resolvedBlockId) {
        return { success: false, error: "Selected Village does not belong to the chosen Block." };
      }
      if (districtId && districtId !== resolvedDistrictId) {
        return { success: false, error: "Selected Village does not belong to the chosen District." };
      }
    } else if (blockId) {
      const blockObj = await prisma.block.findUnique({
        where: { id: blockId },
        include: { district: true },
      });
      if (!blockObj) {
        return { success: false, error: "Selected Block does not exist." };
      }
      resolvedBlockId = blockObj.id;
      resolvedDistrictId = blockObj.districtId;
      if (districtId && districtId !== resolvedDistrictId) {
        return { success: false, error: "Selected Block does not belong to the chosen District." };
      }
    } else if (districtId) {
      const distObj = await prisma.district.findUnique({
        where: { id: districtId },
      });
      if (!distObj) {
        return { success: false, error: "Selected District does not exist." };
      }
      resolvedDistrictId = distObj.id;
    }

    // 2. Update Veterinarian User in Prisma (Role and Status remain strictly protected)
    const updatedUser = await prisma.user.update({
      where: { id: vet.id },
      data: {
        name: name.trim(),
        phone: phone.trim(),
        preferredLanguage: preferredLanguage || "en",
        districtId: resolvedDistrictId,
        blockId: resolvedBlockId,
        villageId: resolvedVillageId,
      },
    });

    // 3. Sync name with Clerk if possible
    try {
      if (vet.clerkId) {
        const client = await clerkClient();
        const parts = name.trim().split(" ");
        const firstName = parts[0] || name.trim();
        const lastName = parts.slice(1).join(" ") || undefined;
        await client.users.updateUser(vet.clerkId, {
          firstName,
          lastName,
        });
      }
    } catch (clerkErr) {
      console.warn("[Clerk Vet Name Sync Warning]:", clerkErr);
    }

    // 4. Invalidate Next.js Server Cache
    try {
      revalidatePath("/vet");
      revalidatePath("/vet/profile");
      revalidatePath("/vet/cases");
      revalidatePath("/vet/follow-ups");
      revalidatePath("/vet/samples");
    } catch {
      // Safe fallback
    }

    return {
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        preferredLanguage: updatedUser.preferredLanguage,
      },
    };
  } catch (err: unknown) {
    console.error("[Update Vet Profile Error]:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update profile.",
    };
  }
}

