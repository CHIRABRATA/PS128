"use server";

import { AuthorityReportType, ExportFormat } from "@prisma/client";
import {
  getAuthorityReportScope,
  parseDateRange,
  fetchCaseSummaryData,
  fetchVaccinationCoverageData,
  fetchOutbreakAlertData,
  recordExportAudit,
} from "@/lib/authority/reports";
import {
  generateCaseSummaryCsv,
  generateVaccinationCoverageCsv,
  generateOutbreakAlertCsv,
} from "@/lib/authority/csv-generator";
import {
  generateCaseSummaryPdf,
  generateVaccinationCoveragePdf,
  generateOutbreakAlertPdf,
} from "@/lib/authority/pdf-generator";

export interface GenerateReportParams {
  reportType: AuthorityReportType;
  startDate: string;
  endDate: string;
  format: ExportFormat;
}

export interface GenerateReportResult {
  success: boolean;
  filename?: string;
  mimeType?: string;
  base64Data?: string;
  recordCount?: number;
  error?: string;
}

/**
 * Returns current authority user's assigned jurisdiction for UI context.
 * Strictly derives information from the authenticated session.
 */
export async function getAuthorityReportContextAction() {
  try {
    const scope = await getAuthorityReportScope();
    return {
      success: true,
      districtId: scope.districtId,
      districtName: scope.districtName,
      authorityName: scope.user.name,
      authorityPhone: scope.user.phone,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unauthorized access.",
    };
  }
}

/**
 * Authoritative, server-side data export action for District Authorities.
 * Strictly scopes all database queries to the authenticated user's assigned district.
 * Client-provided district parameters are never accepted.
 */
export async function generateAuthorityReportAction(
  params: GenerateReportParams
): Promise<GenerateReportResult> {
  let scope: { user: { id: string }; districtId: string; districtName: string } | null = null;
  let parsedRange: { start: Date; end: Date } | null = null;

  try {
    // 1. Authenticate & resolve district jurisdiction server-side
    scope = await getAuthorityReportScope();

    // 2. Validate & parse date boundaries
    if (!params.startDate || !params.endDate) {
      throw new Error("Both start date and end date are required.");
    }
    parsedRange = parseDateRange(params.startDate, params.endDate);

    // 3. Validate reportType and format
    if (!["CASE_SUMMARY", "VACCINATION_COVERAGE", "OUTBREAK_ALERTS"].includes(params.reportType)) {
      throw new Error("Invalid report type requested.");
    }
    if (!["CSV", "PDF"].includes(params.format)) {
      throw new Error("Invalid export format requested.");
    }

    const { districtId, districtName, user } = scope;
    const { start, end } = parsedRange;

    let base64Data = "";
    let mimeType = "";
    let recordCount = 0;
    const sanitizedDistrictPrefix = districtName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const reportTypeLower = params.reportType.toLowerCase();
    const filename = `maitri_${sanitizedDistrictPrefix}_${reportTypeLower}_${params.startDate}_to_${params.endDate}.${params.format.toLowerCase()}`;

    // 4. Query data & generate payload based on requested reportType and format
    if (params.reportType === "CASE_SUMMARY") {
      const cases = await fetchCaseSummaryData(districtId, start, end);
      recordCount = cases.length;

      if (params.format === "CSV") {
        const csvContent = generateCaseSummaryCsv(cases);
        base64Data = Buffer.from(csvContent, "utf-8").toString("base64");
        mimeType = "text/csv; charset=utf-8";
      } else {
        const pdfBuffer = generateCaseSummaryPdf(districtName, params.startDate, params.endDate, cases);
        base64Data = pdfBuffer.toString("base64");
        mimeType = "application/pdf";
      }
    } else if (params.reportType === "VACCINATION_COVERAGE") {
      const vaccinations = await fetchVaccinationCoverageData(districtId, start, end);
      recordCount = vaccinations.length;

      if (params.format === "CSV") {
        const csvContent = generateVaccinationCoverageCsv(vaccinations);
        base64Data = Buffer.from(csvContent, "utf-8").toString("base64");
        mimeType = "text/csv; charset=utf-8";
      } else {
        const pdfBuffer = generateVaccinationCoveragePdf(districtName, params.startDate, params.endDate, vaccinations);
        base64Data = pdfBuffer.toString("base64");
        mimeType = "application/pdf";
      }
    } else if (params.reportType === "OUTBREAK_ALERTS") {
      const alerts = await fetchOutbreakAlertData(districtId, start, end);
      recordCount = alerts.length;

      if (params.format === "CSV") {
        const csvContent = generateOutbreakAlertCsv(alerts);
        base64Data = Buffer.from(csvContent, "utf-8").toString("base64");
        mimeType = "text/csv; charset=utf-8";
      } else {
        const pdfBuffer = generateOutbreakAlertPdf(districtName, params.startDate, params.endDate, alerts);
        base64Data = pdfBuffer.toString("base64");
        mimeType = "application/pdf";
      }
    }

    // 5. Record successful export in audit trail
    await recordExportAudit({
      userId: user.id,
      districtId,
      reportType: params.reportType,
      format: params.format,
      startDate: start,
      endDate: end,
      recordCount,
      success: true,
      errorMessage: null,
    });

    return {
      success: true,
      filename,
      mimeType,
      base64Data,
      recordCount,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to generate authority report.";

    // Attempt to log failure in audit trail if user and district were resolved
    if (scope) {
      const fallbackStart = params.startDate ? new Date(params.startDate) : new Date();
      const fallbackEnd = params.endDate ? new Date(params.endDate) : new Date();
      const validStart = !isNaN(fallbackStart.getTime()) ? fallbackStart : new Date();
      const validEnd = !isNaN(fallbackEnd.getTime()) ? fallbackEnd : new Date();

      await recordExportAudit({
        userId: scope.user.id,
        districtId: scope.districtId,
        reportType: params.reportType,
        format: params.format,
        startDate: parsedRange ? parsedRange.start : validStart,
        endDate: parsedRange ? parsedRange.end : validEnd,
        recordCount: 0,
        success: false,
        errorMessage,
      });
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
