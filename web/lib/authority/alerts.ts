import prisma from "@/lib/db/prisma";
import { getRiskRank } from "@/lib/vet/schemas";
import { dispatchOutbreakAlertNotifications } from "@/lib/telegram/notifications";

/**
 * Server-side evaluation of village outbreak alerts.
 * 
 * Rolling 7-day window rules:
 * - windowStart = evaluationTime - 7 days
 * - windowEnd = evaluationTime
 * - Threshold: >= 3 qualifying cases (CONFIRMED or CRITICAL/HIGH AI risk) in same village
 * 
 * Concurrency-safe: Database partial unique index + atomic transaction upsert.
 */
export async function evaluateVillageOutbreakAlert(villageId: string): Promise<boolean> {
  if (!villageId) return false;

  const evaluationTime = new Date();
  const windowStart = new Date(evaluationTime.getTime() - 7 * 24 * 60 * 60 * 1000);
  const windowEnd = evaluationTime;

  // 1. Fetch cases in the village reported within the rolling 7-day window
  const casesInWindow = await prisma.case.findMany({
    where: {
      reportedAt: {
        gte: windowStart,
        lte: windowEnd,
      },
      animal: {
        herd: {
          farm: {
            villageId: villageId,
          },
        },
      },
    },
    select: {
      id: true,
      status: true,
      vetDiagnosis: true,
      analysisResult: true,
      visionResult: true,
    },
  });

  // 2. Filter qualifying cases (CONFIRMED status OR CRITICAL/HIGH AI risk)
  const qualifyingCases = casesInWindow.filter((c) => {
    if (c.status === "CONFIRMED") return true;

    const analysis = (c.analysisResult as Record<string, unknown> | null) || {};
    const riskLevel = (analysis.overall_risk_level as string) || null;
    const rank = getRiskRank(riskLevel);

    // CRITICAL is 5, HIGH is 4
    return rank >= 4;
  });

  const qualifyingCount = qualifyingCases.length;

  // Determine a primary disease name if available from vet diagnosis or AI prediction
  let diseaseName: string | null = null;
  const confirmedWithDiagnosis = qualifyingCases.find((c) => c.status === "CONFIRMED" && c.vetDiagnosis);
  if (confirmedWithDiagnosis?.vetDiagnosis) {
    diseaseName = confirmedWithDiagnosis.vetDiagnosis;
  } else {
    const aiCase = qualifyingCases.find((c) => c.analysisResult);
    if (aiCase?.analysisResult) {
      const analysis = aiCase.analysisResult as Record<string, unknown>;
      const diseasePrediction = analysis.disease_prediction as Record<string, unknown> | null;
      if (diseasePrediction?.suspected_condition) {
        diseaseName = String(diseasePrediction.suspected_condition);
      }
    }
  }

  // 3. System-controlled alert lifecycle
  if (qualifyingCount >= 3) {
    let targetAlertId: string | null = null;

    // Upsert active alert atomically
    try {
      await prisma.$transaction(async (tx) => {
        const existingActiveAlert = await tx.alert.findFirst({
          where: {
            villageId: villageId,
            active: true,
          },
        });

        if (existingActiveAlert) {
          const updated = await tx.alert.update({
            where: { id: existingActiveAlert.id },
            data: {
              caseCount: qualifyingCount,
              windowEnd: windowEnd,
              diseaseName: diseaseName || existingActiveAlert.diseaseName,
            },
          });
          targetAlertId = updated.id;
        } else {
          const created = await tx.alert.create({
            data: {
              villageId: villageId,
              diseaseName: diseaseName,
              caseCount: qualifyingCount,
              windowStart: windowStart,
              windowEnd: windowEnd,
              active: true,
            },
          });
          targetAlertId = created.id;
        }
      });
    } catch (err) {
      console.warn(`[Maitri Alert] Concurrent alert evaluation handled for village ${villageId}:`, err);
      // Fallback: update if concurrent insert raced
      const activeAlert = await prisma.alert.findFirst({
        where: { villageId, active: true },
      });
      if (activeAlert) {
        const updated = await prisma.alert.update({
          where: { id: activeAlert.id },
          data: {
            caseCount: qualifyingCount,
            windowEnd: windowEnd,
          },
        });
        targetAlertId = updated.id;
      }
    }

    // Trigger Telegram notification dispatch (decoupled from alert creation)
    if (targetAlertId) {
      dispatchOutbreakAlertNotifications(targetAlertId).catch((err) => {
        console.error("[Maitri Alert] Error dispatching outbreak alert notifications:", err);
      });
    }

    return true;
  } else {
    // Deactivate active alert if threshold drops below 3
    const existingActiveAlert = await prisma.alert.findFirst({
      where: {
        villageId: villageId,
        active: true,
      },
    });

    if (existingActiveAlert) {
      await prisma.alert.update({
        where: { id: existingActiveAlert.id },
        data: { active: false },
      });
    }
    return false;
  }
}
