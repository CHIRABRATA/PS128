import prisma from "@/lib/db/prisma";
import { requireDistrictAuthority } from "@/lib/auth/permissions";
import { FullAppUser } from "@/lib/auth/session";
import { AuthorityReportType, ExportFormat } from "@prisma/client";

export interface AuthorityReportScope {
  user: FullAppUser;
  districtId: string;
  districtName: string;
}

/**
 * Server-side authority report scope resolution.
 * Strictly verifies the authenticated user has DISTRICT_AUTHORITY role and an assigned district.
 * Rejects any attempt if district cannot be resolved safely.
 */
export async function getAuthorityReportScope(): Promise<AuthorityReportScope> {
  const authority = await requireDistrictAuthority();

  if (!authority.districtId) {
    throw new Error("No assigned district jurisdiction found for this authority account.");
  }

  const districtName = authority.district?.name || "Authorized District";

  return {
    user: authority,
    districtId: authority.districtId,
    districtName,
  };
}

/**
 * Parses and sanitizes inclusive date range.
 * Converts YYYY-MM-DD strings into inclusive start (00:00:00.000) and end (23:59:59.999) Date objects.
 */
export function parseDateRange(
  startDateStr: string | null | undefined,
  endDateStr: string | null | undefined
): { start: Date; end: Date } {
  if (!startDateStr || !endDateStr) {
    throw new Error("Both start date and end date are required.");
  }

  const start = new Date(`${startDateStr}T00:00:00.000Z`);
  const end = new Date(`${endDateStr}T23:59:59.999Z`);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD.");
  }

  if (start > end) {
    throw new Error("Start date must be before or equal to end date.");
  }

  return { start, end };
}

/**
 * Fetches Case Summary records strictly scoped to the authorized district and date range.
 * Filtered by: reportedAt (canonical clinical case report timestamp).
 */
export async function fetchCaseSummaryData(districtId: string, start: Date, end: Date) {
  return await prisma.case.findMany({
    where: {
      reportedAt: {
        gte: start,
        lte: end,
      },
      animal: {
        herd: {
          farm: {
            village: {
              block: {
                districtId: districtId,
              },
            },
          },
        },
      },
    },
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
      createdByUser: {
        select: { id: true, name: true, role: true, phone: true },
      },
      reviewedByUser: {
        select: { id: true, name: true, role: true },
      },
      veterinaryReports: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { reportedAt: "desc" },
  });
}

/**
 * Fetches Vaccination records strictly scoped to the authorized district and date range.
 * Filtered by: dateGiven (canonical vaccination administration timestamp).
 */
export async function fetchVaccinationCoverageData(districtId: string, start: Date, end: Date) {
  return await prisma.vaccinationRecord.findMany({
    where: {
      dateGiven: {
        gte: start,
        lte: end,
      },
      animal: {
        herd: {
          farm: {
            village: {
              block: {
                districtId: districtId,
              },
            },
          },
        },
      },
    },
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
      administeredByUser: {
        select: { id: true, name: true, role: true },
      },
    },
    orderBy: { dateGiven: "desc" },
  });
}

/**
 * Fetches Outbreak Alert records strictly scoped to the authorized district and date range.
 * Filtered by: createdAt (canonical alert creation timestamp).
 */
export async function fetchOutbreakAlertData(districtId: string, start: Date, end: Date) {
  return await prisma.alert.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
      village: {
        block: {
          districtId: districtId,
        },
      },
    },
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
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Records an audit entry in AuthorityExportAudit.
 * Records the server-authorized district and parameters without storing sensitive patient datasets.
 */
export async function recordExportAudit(params: {
  userId: string;
  districtId: string;
  reportType: AuthorityReportType;
  format: ExportFormat;
  startDate: Date;
  endDate: Date;
  recordCount: number;
  success: boolean;
  errorMessage?: string | null;
}) {
  try {
    return await prisma.authorityExportAudit.create({
      data: {
        userId: params.userId,
        districtId: params.districtId,
        reportType: params.reportType,
        format: params.format,
        startDate: params.startDate,
        endDate: params.endDate,
        recordCount: params.recordCount,
        success: params.success,
        errorMessage: params.errorMessage || null,
      },
    });
  } catch (err) {
    // Non-blocking log to ensure export delivery is not broken by audit failure
    console.error("[Authority Export Audit Failure]:", err);
    return null;
  }
}
