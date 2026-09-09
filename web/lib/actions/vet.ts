"use server";

import prisma from "@/lib/db/prisma";
import { requireActiveUser, FullAppUser } from "@/lib/auth/session";
import { canUserAccessCase } from "@/lib/storage/auth";
import { VetAction, SampleStatus, Prisma } from "@prisma/client";
import {
  vetFeedbackSchema,
  referToLabSchema,
  confirmCaseSchema,
  closeCaseSchema,
  updateSampleStatusSchema,
  getRiskRank,
  VetFeedbackInput,
  ReferToLabInput,
  ConfirmCaseInput,
  CloseCaseInput,
  UpdateSampleStatusInput,
} from "@/lib/vet/schemas";
import { evaluateVillageOutbreakAlert } from "@/lib/authority/alerts";

/**
 * Requires the current user to be an ACTIVE VETERINARIAN.
 */
async function requireActiveVeterinarian(): Promise<FullAppUser> {
  const appUser = await requireActiveUser();
  if (appUser.role !== "VETERINARIAN" || appUser.status !== "ACTIVE") {
    throw new Error("Unauthorized: Only active veterinarians may perform clinical actions.");
  }
  return appUser;
}

/**
 * Retrieves the priority triage queue for an active veterinarian.
 * Filtered by district jurisdiction and ordered by risk rank, score, and oldest reportedAt.
 */
export async function getVetQueueAction() {
  const vet = await requireActiveVeterinarian();

  const whereClause: Prisma.CaseWhereInput = {
    status: {
      in: ["PENDING_REVIEW", "UNDER_EXAMINATION", "LAB_REFERRAL"],
    },
  };

  // District scoping
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

  const cases = await prisma.case.findMany({
    where: whereClause,
    include: {
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

  // Sort queue: Risk Rank DESC -> Risk Score DESC -> reportedAt ASC (oldest first)
  const sortedCases = cases.sort((a, b) => {
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

  return sortedCases;
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
 * Retrieves full clinical dossier for a specific case.
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
              reportedAt: true,
              vetDiagnosis: true,
            },
            orderBy: { reportedAt: "desc" },
            take: 5,
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
      photoUrl: true,
      status: true,
      updatedAt: true,
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

  await prisma.case.update({
    where: { id: caseId },
    data: {
      vetDiagnosis,
      vetRecommendedAction: vetRecommendedAction as VetAction,
      vetFollowUpDate: parsedFollowUp,
      vetNotes: vetNotes || null,
      reviewedByUserId: vet.id,
    },
  });

  return { success: true };
}

/**
 * Atomic transaction to transition case to LAB_REFERRAL and create a Sample record.
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
      photoUrl: true,
      status: true,
      updatedAt: true,
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
  });

  if (!currentCase) return { success: false, error: "Case not found." };
  if (!canUserAccessCase(vet, currentCase)) return { success: false, error: "Unauthorized." };

  // State Machine Validation: PENDING_REVIEW or UNDER_EXAMINATION -> LAB_REFERRAL
  if (currentCase.status !== "PENDING_REVIEW" && currentCase.status !== "UNDER_EXAMINATION") {
    return { success: false, error: `Cannot refer to lab from state: ${currentCase.status}` };
  }

  // Optimistic concurrency check
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
  ]);

  return { success: true };
}

/**
 * Transitions case to CONFIRMED.
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
      photoUrl: true,
      status: true,
      updatedAt: true,
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
  });

  if (!currentCase) return { success: false, error: "Case not found." };
  if (!canUserAccessCase(vet, currentCase)) return { success: false, error: "Unauthorized." };

  // State Machine Validation: UNDER_EXAMINATION or LAB_REFERRAL -> CONFIRMED
  if (currentCase.status !== "UNDER_EXAMINATION" && currentCase.status !== "LAB_REFERRAL" && currentCase.status !== "PENDING_REVIEW") {
    return { success: false, error: `Invalid transition to CONFIRMED from state ${currentCase.status}` };
  }

  if (currentCase.updatedAt.toISOString() !== expectedUpdatedAt) {
    return { success: false, error: "Case was updated by another user. Please refresh." };
  }

  await prisma.case.update({
    where: { id: caseId },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      vetDiagnosis,
      vetNotes: vetNotes || undefined,
      reviewedByUserId: vet.id,
    },
  });

  const villageId = currentCase.animal.herd.farm.villageId;
  if (villageId) {
    await evaluateVillageOutbreakAlert(villageId);
  }

  return { success: true };
}

/**
 * Transitions case to CLOSED_HARMLESS.
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
      photoUrl: true,
      status: true,
      updatedAt: true,
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
  });

  if (!currentCase) return { success: false, error: "Case not found." };
  if (!canUserAccessCase(vet, currentCase)) return { success: false, error: "Unauthorized." };

  if (currentCase.status === "CLOSED_HARMLESS" || currentCase.status === "CONFIRMED") {
    return { success: false, error: "Case is already terminal." };
  }

  if (currentCase.updatedAt.toISOString() !== expectedUpdatedAt) {
    return { success: false, error: "Case was updated by another user. Please refresh." };
  }

  await prisma.case.update({
    where: { id: caseId },
    data: {
      status: "CLOSED_HARMLESS",
      closedAt: new Date(),
      vetNotes: vetNotes || undefined,
      reviewedByUserId: vet.id,
    },
  });

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

  const samples = await prisma.sample.findMany({
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

  return samples;
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

  // Optimistic concurrency check
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

  return { success: true };
}

/**
 * Retrieves follow-up cases sorted by nearest vetFollowUpDate.
 */
export async function getVetFollowUpsAction() {
  const vet = await requireActiveVeterinarian();

  const whereClause: Prisma.CaseWhereInput = {
    vetFollowUpDate: { not: null },
  };

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

  const followUps = await prisma.case.findMany({
    where: whereClause,
    include: {
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
    orderBy: { vetFollowUpDate: "asc" },
  });

  return followUps;
}
