import prisma from "@/lib/db/prisma";
import { getRiskRank } from "@/lib/vet/schemas";
import { Prisma } from "@prisma/client";

export interface AuthorityDashboardMetrics {
  districtName: string;
  animalsMonitored: number;
  reportsThisWeek: number;
  highRiskCases: number;
  confirmedCases: number;
  activeAlerts: number;
  pendingApprovalsCount: number;
  avgTimeToReviewHours: number | null;
  avgTimeToConfirmationHours: number | null;
}

/**
 * Computes district public-health surveillance metrics exclusively from real Prisma database records.
 * Zero fabricated data. Handles sparse/empty states cleanly without division-by-zero.
 */
export async function getAuthorityDashboardMetrics(districtId: string | null): Promise<AuthorityDashboardMetrics> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Geographic scoping filter
  const caseWhereClause: Prisma.CaseWhereInput = {};
  const animalWhereClause: Prisma.AnimalWhereInput = {};
  const alertWhereClause: Prisma.AlertWhereInput = {};
  const userWhereClause: Prisma.UserWhereInput = { status: "PENDING_APPROVAL" };

  let districtName = "All Districts Jurisdiction";

  if (districtId) {
    const districtRecord = await prisma.district.findUnique({
      where: { id: districtId },
      select: { name: true },
    });
    if (districtRecord) districtName = districtRecord.name;

    caseWhereClause.animal = {
      herd: {
        farm: {
          village: {
            block: {
              districtId: districtId,
            },
          },
        },
      },
    };

    animalWhereClause.herd = {
      farm: {
        village: {
          block: {
            districtId: districtId,
          },
        },
      },
    };

    alertWhereClause.village = {
      block: {
        districtId: districtId,
      },
    };

    userWhereClause.districtId = districtId;
  }

  // Execute database aggregation queries in parallel
  const [
    animalsMonitored,
    reportsThisWeek,
    confirmedCasesCount,
    activeAlertsCount,
    pendingApprovalsCount,
    allDistrictCases,
  ] = await Promise.all([
    prisma.animal.count({ where: animalWhereClause }),
    prisma.case.count({
      where: {
        ...caseWhereClause,
        reportedAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.case.count({
      where: {
        ...caseWhereClause,
        status: "CONFIRMED",
      },
    }),
    prisma.alert.count({
      where: {
        ...alertWhereClause,
        active: true,
      },
    }),
    prisma.user.count({ where: userWhereClause }),
    prisma.case.findMany({
      where: caseWhereClause,
      select: {
        reportedAt: true,
        reviewedAt: true,
        confirmedAt: true,
        analysisResult: true,
      },
    }),
  ]);

  // 1. High-risk case aggregation using shared getRiskRank helper
  let highRiskCasesCount = 0;
  let totalReviewTimeMs = 0;
  let reviewedCasesCount = 0;
  let totalConfirmationTimeMs = 0;
  let confirmedCasesWithTimestampCount = 0;

  for (const c of allDistrictCases) {
    // Check AI risk level (CRITICAL=5, HIGH=4)
    const analysis = (c.analysisResult as Record<string, unknown> | null) || {};
    const riskLevel = (analysis.overall_risk_level as string) || null;
    const rank = getRiskRank(riskLevel);
    if (rank >= 4) {
      highRiskCasesCount++;
    }

    // Time to review calculation (reviewedAt - reportedAt)
    if (c.reviewedAt) {
      const reviewMs = new Date(c.reviewedAt).getTime() - new Date(c.reportedAt).getTime();
      if (reviewMs >= 0) {
        totalReviewTimeMs += reviewMs;
        reviewedCasesCount++;
      }
    }

    // Time to confirmation calculation (confirmedAt - reportedAt)
    if (c.confirmedAt) {
      const confirmMs = new Date(c.confirmedAt).getTime() - new Date(c.reportedAt).getTime();
      if (confirmMs >= 0) {
        totalConfirmationTimeMs += confirmMs;
        confirmedCasesWithTimestampCount++;
      }
    }
  }

  // Turnaround averages in hours (or null if no reviewed/confirmed cases exist)
  const avgTimeToReviewHours =
    reviewedCasesCount > 0
      ? Math.round((totalReviewTimeMs / (reviewedCasesCount * 1000 * 3600)) * 10) / 10
      : null;

  const avgTimeToConfirmationHours =
    confirmedCasesWithTimestampCount > 0
      ? Math.round((totalConfirmationTimeMs / (confirmedCasesWithTimestampCount * 1000 * 3600)) * 10) / 10
      : null;

  return {
    districtName,
    animalsMonitored,
    reportsThisWeek,
    highRiskCases: highRiskCasesCount,
    confirmedCases: confirmedCasesCount,
    activeAlerts: activeAlertsCount,
    pendingApprovalsCount,
    avgTimeToReviewHours,
    avgTimeToConfirmationHours,
  };
}
