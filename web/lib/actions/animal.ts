"use server";

import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { requireActiveUser } from "@/lib/auth/session";
import { requireFarmer } from "@/lib/auth/permissions";
import { Species } from "@prisma/client";

export interface AnimalTimelineEvent {
  id: string;
  type: "HEALTH_SESSION" | "VET_REPORT" | "FIELD_VISIT" | "VACCINATION" | "TREATMENT" | "SAMPLE" | "FOLLOW_UP";
  date: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "default" | "outline" | "destructive" | "secondary";
  details?: Record<string, unknown>;
}

/**
 * Retrieves all animals owned by the authenticated Farmer.
 */
export async function getFarmerAnimalsAction() {
  const farmer = await requireFarmer();

  const farms = await prisma.farm.findMany({
    where: { farmerUserId: farmer.id },
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
      herds: {
        include: {
          animals: {
            include: {
              cases: {
                orderBy: { reportedAt: "desc" },
                take: 5,
              },
              veterinaryReports: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
              vaccinations: {
                orderBy: { dateGiven: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  return farms.flatMap((farm) =>
    farm.herds.flatMap((herd) =>
      herd.animals.map((animal) => ({
        ...animal,
        farmName: farm.name,
        villageName: farm.village.name,
        districtName: farm.village.block.district.name,
        activeCase: animal.cases.find((c) => c.status !== "CLOSED_HARMLESS") || null,
        latestReport: animal.veterinaryReports[0] || null,
      }))
    )
  );
}

/**
 * Retrieves the complete longitudinal health dossier and chronological timeline for a specific Animal.
 */
export async function getAnimalDetailHistoryAction(animalId: string) {
  const appUser = await requireActiveUser();

  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
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
      cases: {
        include: {
          createdByUser: { select: { id: true, name: true, role: true } },
          reviewedByUser: { select: { id: true, name: true, role: true } },
          samples: {
            include: { collectedByUser: { select: { name: true } } },
          },
        },
        orderBy: { reportedAt: "desc" },
      },
      assistanceRequests: {
        include: {
          assignedFieldAgentUser: { select: { id: true, name: true, phone: true } },
          visit: true,
        },
        orderBy: { requestedAt: "desc" },
      },
      veterinaryReports: {
        include: {
          vetUser: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      vaccinations: {
        include: {
          administeredByUser: { select: { id: true, name: true, role: true } },
        },
        orderBy: { dateGiven: "desc" },
      },
      treatments: {
        include: {
          administeredByUser: { select: { id: true, name: true, role: true } },
        },
        orderBy: { dateGiven: "desc" },
      },
    },
  });

  if (!animal) {
    throw new Error("Animal record not found.");
  }

  const farm = animal.herd.farm;
  const isOwner = farm.farmerUserId === appUser.id;
  const isAssignedAgent = farm.fieldAgentUserId === appUser.id;
  const isVet = appUser.role === "VETERINARIAN";
  const isAuthority = appUser.role === "DISTRICT_AUTHORITY";

  if (!isOwner && !isAssignedAgent && !isVet && !isAuthority) {
    throw new Error("Unauthorized to access this animal record.");
  }

  // Construct unified chronological timeline
  const timeline: AnimalTimelineEvent[] = [];

  // 1. Add Cases (Health Sessions)
  for (const c of animal.cases) {
    const analysis = (c.analysisResult as Record<string, unknown> | null) || {};
    const risk = (analysis.overall_risk_level as string) || "PENDING";

    timeline.push({
      id: `case_${c.id}`,
      type: "HEALTH_SESSION",
      date: c.reportedAt.toISOString(),
      title: `Health Concern #${c.caseNumber}`,
      subtitle: `Reported by ${c.createdByUser.name} (${c.reportSource}) • Status: ${c.status}`,
      badge: `Risk: ${risk}`,
      badgeVariant: risk === "CRITICAL" || risk === "HIGH" ? "destructive" : "default",
      details: {
        caseId: c.id,
        symptoms: c.symptoms,
        durationDays: c.durationDays,
        affectedCount: c.affectedCount,
        mortalityCount: c.mortalityCount,
        status: c.status,
        diagnosis: c.vetDiagnosis,
      },
    });

    // If follow-up was scheduled
    if (c.vetFollowUpDate) {
      timeline.push({
        id: `followup_${c.id}`,
        type: "FOLLOW_UP",
        date: c.vetFollowUpDate.toISOString(),
        title: `Scheduled Clinical Follow-up`,
        subtitle: `Case #${c.caseNumber} follow-up review`,
        badge: c.followUpCompleted ? "COMPLETED" : c.vetFollowUpDate < new Date() ? "OVERDUE" : "SCHEDULED",
        badgeVariant: c.followUpCompleted ? "default" : c.vetFollowUpDate < new Date() ? "destructive" : "secondary",
        details: {
          caseId: c.id,
          followUpDate: c.vetFollowUpDate.toISOString(),
          completed: c.followUpCompleted,
        },
      });
    }

    // Add Samples
    for (const s of c.samples) {
      timeline.push({
        id: `sample_${s.id}`,
        type: "SAMPLE",
        date: s.collectedAt.toISOString(),
        title: `Diagnostic Lab Sample (${s.status})`,
        subtitle: `Collected by ${s.collectedByUser.name}${s.labName ? ` • Target: ${s.labName}` : ""}`,
        badge: s.status,
        badgeVariant: s.status === "RESULT_RECEIVED" ? "default" : "outline",
        details: {
          sampleId: s.id,
          labName: s.labName,
          resultSummary: s.resultSummary,
          status: s.status,
        },
      });
    }
  }

  // 2. Add Field Visits
  for (const ar of animal.assistanceRequests) {
    if (ar.visit && ar.visit.completedAt) {
      timeline.push({
        id: `visit_${ar.visit.id}`,
        type: "FIELD_VISIT",
        date: ar.visit.completedAt.toISOString(),
        title: `Field Inspection: Doorstep Visit`,
        subtitle: `Inspected by Agent ${ar.assignedFieldAgentUser?.name || "Field Agent"}${ar.assignedFieldAgentUser?.phone ? ` (${ar.assignedFieldAgentUser.phone})` : ""}`,
        badge: "Completed Visit",
        badgeVariant: "default",
        details: {
          visitId: ar.visit.id,
          observations: ar.visit.observations,
          notes: ar.visit.notes,
          measurements: ar.visit.measurements,
        },
      });
    }
  }

  // 3. Add Veterinary Reports
  for (const r of animal.veterinaryReports) {
    timeline.push({
      id: `vet_report_${r.id}`,
      type: "VET_REPORT",
      date: r.createdAt.toISOString(),
      title: `Veterinary Assessment: ${r.diagnosis}`,
      subtitle: `Doctor: Dr. ${r.vetUser.name} • Action: ${r.action}`,
      badge: r.action,
      badgeVariant: r.action === "ISOLATE" ? "destructive" : "default",
      details: {
        reportId: r.id,
        diagnosis: r.diagnosis,
        action: r.action,
        instructions: r.instructions,
        notes: r.notes,
        followUpDate: r.followUpDate ? r.followUpDate.toISOString() : null,
      },
    });
  }

  // 3. Add Vaccinations
  for (const v of animal.vaccinations) {
    timeline.push({
      id: `vac_${v.id}`,
      type: "VACCINATION",
      date: v.dateGiven.toISOString(),
      title: `Vaccination: ${v.vaccineName}`,
      subtitle: `Administered by ${v.administeredByUser.name} (${v.administeredByUser.role})`,
      badge: "Immunized",
      badgeVariant: "default",
      details: {
        vaccineName: v.vaccineName,
        dateGiven: v.dateGiven.toISOString(),
        nextDueDate: v.nextDueDate ? v.nextDueDate.toISOString() : null,
      },
    });
  }

  // 4. Add Treatments
  for (const t of animal.treatments) {
    timeline.push({
      id: `treat_${t.id}`,
      type: "TREATMENT",
      date: t.dateGiven.toISOString(),
      title: `Treatment / Medication: ${t.medication}`,
      subtitle: `Administered by ${t.administeredByUser.name} • ${t.notes || "Standard dosage"}`,
      badge: "Medication",
      badgeVariant: "secondary",
      details: {
        medication: t.medication,
        notes: t.notes,
        dateGiven: t.dateGiven.toISOString(),
      },
    });
  }

  // Sort timeline chronologically descending (newest first)
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Current Health status
  const activeCase = animal.cases.find((c) => c.status !== "CLOSED_HARMLESS") || null;
  const latestReport = animal.veterinaryReports[0] || null;

  return {
    animal: {
      id: animal.id,
      tag: animal.tag,
      species: animal.species,
      breed: animal.breed,
      ageMonths: animal.ageMonths,
      iotDeviceId: animal.iotDeviceId,
      createdAt: animal.createdAt.toISOString(),
      farm: {
        id: farm.id,
        name: farm.name,
        villageName: farm.village.name,
        blockName: farm.village.block.name,
        districtName: farm.village.block.district.name,
        ownerName: farm.farmerUser?.name || "Farmer",
        ownerPhone: farm.farmerUser?.phone || "N/A",
      },
    },
    activeCase,
    latestReport,
    timeline,
    allCases: animal.cases,
    allReports: animal.veterinaryReports,
    allVaccinations: animal.vaccinations,
    allTreatments: animal.treatments,
  };
}

const registerAnimalSchema = z.object({
  farmId: z.string().min(1, "Farm is required"),
  tag: z.string().min(2, "Tag ID is required"),
  species: z.nativeEnum(Species),
  breed: z.string().optional().nullable(),
  ageMonths: z.number().int().min(1).optional().nullable(),
  iotDeviceId: z.string().optional().nullable(),
});

export type RegisterAnimalInput = z.infer<typeof registerAnimalSchema>;

/**
 * Registers a new animal under a farm.
 */
export async function registerAnimalAction(input: RegisterAnimalInput) {
  try {
    const appUser = await requireActiveUser();

    const val = registerAnimalSchema.safeParse(input);
    if (!val.success) {
      return { success: false, error: val.error.issues[0]?.message || "Invalid input." };
    }

    const { farmId, tag, species, breed, ageMonths, iotDeviceId } = val.data;

    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: { herds: true },
    });

    if (!farm) {
      return { success: false, error: "Farm not found." };
    }

    if (appUser.role === "FARMER" && farm.farmerUserId !== appUser.id) {
      return { success: false, error: "Unauthorized: You do not own this farm." };
    }

    // Find or create default herd for this species
    let herd = farm.herds.find((h) => h.species === species);
    if (!herd) {
      herd = await prisma.herd.create({
        data: {
          farmId: farm.id,
          species,
          name: `${species} Herd`,
        },
      });
    }

    const newAnimal = await prisma.animal.create({
      data: {
        herdId: herd.id,
        tag: tag.trim().toUpperCase(),
        species,
        breed: breed || null,
        ageMonths: ageMonths || null,
        iotDeviceId: iotDeviceId || null,
      },
    });

    return {
      success: true,
      animalId: newAnimal.id,
      tag: newAnimal.tag,
    };
  } catch (err: unknown) {
    console.error("[Register Animal Error]:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to register animal.",
    };
  }
}
