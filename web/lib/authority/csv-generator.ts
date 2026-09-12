import { formatDate, formatDateTime } from "@/lib/utils";

/**
 * Escapes a single value according to RFC 4180 CSV specifications.
 * Quotes fields containing commas, double quotes, or newlines, escaping internal quotes as `""`.
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let stringValue = String(value);

  // If the value contains quotes, commas, or line breaks, enclose in quotes and escape internal quotes
  if (
    stringValue.includes('"') ||
    stringValue.includes(",") ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    stringValue = `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Serializes headers and rows into a standard RFC 4180 CSV string with UTF-8 BOM.
 */
export function buildCsv(headers: string[], rows: (unknown[])[]): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const rowLines = rows.map((row) => row.map(escapeCsvField).join(","));

  // Include UTF-8 Byte Order Mark (BOM) to ensure clean loading in Microsoft Excel & Calc
  return "\uFEFF" + [headerLine, ...rowLines].join("\r\n");
}

export interface CaseDataRecord {
  caseNumber: string;
  status: string;
  symptoms: string[];
  durationDays?: number | null;
  mortalityCount?: number | null;
  reportedAt: Date | string;
  reviewedAt?: Date | string | null;
  vetDiagnosis?: string | null;
  vetRecommendedAction?: string | null;
  animal?: {
    tag?: string | null;
    species?: string | null;
    breed?: string | null;
    herd?: {
      farm?: {
        name?: string | null;
        village?: {
          name?: string | null;
          block?: {
            name?: string | null;
            district?: {
              name?: string | null;
            } | null;
          } | null;
        } | null;
      } | null;
    } | null;
  } | null;
  createdByUser?: {
    name?: string | null;
    role?: string | null;
  } | null;
  veterinaryReports?: {
    diagnosis?: string | null;
    action?: string | null;
  }[] | null;
}

export interface VaccinationDataRecord {
  id: string;
  vaccineName: string;
  dateGiven: Date | string;
  nextDueDate?: Date | string | null;
  animal?: {
    tag?: string | null;
    species?: string | null;
    breed?: string | null;
    herd?: {
      farm?: {
        name?: string | null;
        village?: {
          name?: string | null;
          block?: {
            name?: string | null;
            district?: {
              name?: string | null;
            } | null;
          } | null;
        } | null;
      } | null;
    } | null;
  } | null;
  administeredByUser?: {
    name?: string | null;
    role?: string | null;
  } | null;
}

export interface AlertDataRecord {
  id: string;
  diseaseName?: string | null;
  caseCount?: number | null;
  active: boolean;
  windowStart: Date | string;
  windowEnd: Date | string;
  createdAt: Date | string;
  village?: {
    name?: string | null;
    block?: {
      name?: string | null;
      district?: {
        name?: string | null;
      } | null;
    } | null;
  } | null;
}

export function generateCaseSummaryCsv(cases: CaseDataRecord[]): string {
  const headers = [
    "Case Number",
    "Animal Tag",
    "Species",
    "Breed",
    "Status",
    "Veterinarian Diagnosis",
    "Clinical Action",
    "Symptoms",
    "Duration (Days)",
    "Mortality Count",
    "Farm",
    "Village",
    "Block / Taluka",
    "District",
    "Reported Date (IST)",
    "Reviewed Date (IST)",
    "Reporter Name",
    "Reporter Role",
  ];

  const rows = cases.map((c) => {
    const animal = c.animal;
    const farm = animal?.herd?.farm;
    const village = farm?.village;
    const block = village?.block;
    const district = block?.district;
    const latestVetReport = c.veterinaryReports?.[0];

    const diagnosis = latestVetReport?.diagnosis || c.vetDiagnosis || "Pending Assessment";
    const action = latestVetReport?.action || c.vetRecommendedAction || "NONE";

    return [
      c.caseNumber,
      animal?.tag || "—",
      animal?.species || "—",
      animal?.breed || "—",
      c.status,
      diagnosis,
      action,
      Array.isArray(c.symptoms) ? c.symptoms.join("; ") : "",
      c.durationDays ?? 0,
      c.mortalityCount ?? 0,
      farm?.name || "—",
      village?.name || "—",
      block?.name || "—",
      district?.name || "—",
      formatDateTime(c.reportedAt, true),
      c.reviewedAt ? formatDateTime(c.reviewedAt, true) : "—",
      c.createdByUser?.name || "—",
      c.createdByUser?.role || "—",
    ];
  });

  return buildCsv(headers, rows);
}

export function generateVaccinationCoverageCsv(vaccinations: VaccinationDataRecord[]): string {
  const headers = [
    "Vaccination ID",
    "Vaccine Name",
    "Animal Tag",
    "Species",
    "Breed",
    "Date Administered (IST)",
    "Next Due Date (IST)",
    "Administered By",
    "Admin Role",
    "Farm",
    "Village",
    "Block / Taluka",
    "District",
  ];

  const rows = vaccinations.map((v) => {
    const animal = v.animal;
    const farm = animal?.herd?.farm;
    const village = farm?.village;
    const block = village?.block;
    const district = block?.district;

    return [
      v.id,
      v.vaccineName,
      animal?.tag || "—",
      animal?.species || "—",
      animal?.breed || "—",
      formatDate(v.dateGiven, true),
      v.nextDueDate ? formatDate(v.nextDueDate, true) : "—",
      v.administeredByUser?.name || "—",
      v.administeredByUser?.role || "—",
      farm?.name || "—",
      village?.name || "—",
      block?.name || "—",
      district?.name || "—",
    ];
  });

  return buildCsv(headers, rows);
}

export function generateOutbreakAlertCsv(alerts: AlertDataRecord[]): string {
  const headers = [
    "Alert ID",
    "Suspected Disease",
    "Affected Animals (Cluster Count)",
    "Status",
    "Village",
    "Block / Taluka",
    "District",
    "Cluster Window Start (IST)",
    "Cluster Window End (IST)",
    "Created Date (IST)",
  ];

  const rows = alerts.map((a) => {
    const village = a.village;
    const block = village?.block;
    const district = block?.district;

    return [
      a.id,
      a.diseaseName || "Unspecified Outbreak",
      a.caseCount ?? 1,
      a.active ? "ACTIVE" : "RESOLVED",
      village?.name || "—",
      block?.name || "—",
      district?.name || "—",
      formatDate(a.windowStart, true),
      formatDate(a.windowEnd, true),
      formatDateTime(a.createdAt, true),
    ];
  });

  return buildCsv(headers, rows);
}
