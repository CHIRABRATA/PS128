import { formatDate, formatDateTime } from "@/lib/utils";
import type {
  CaseDataRecord,
  VaccinationDataRecord,
  AlertDataRecord,
} from "@/lib/authority/csv-generator";

/**
 * Escapes characters for PDF literal strings enclosed in parentheses.
 */
function escapePdfText(text: unknown): string {
  if (text === null || text === undefined) return "";
  const str = String(text);
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n]+/g, " ");
}

/**
 * Strips non-ASCII characters to standard Latin-1 / ASCII safe representation for PDF Type 1 standard fonts.
 */
function sanitizeAscii(text: unknown): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/[^\x20-\x7E]/g, "?")
    .trim();
}

/**
 * Truncates text to fit approximately within max characters for a column.
 */
function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 3) + "...";
}

export interface PdfReportOptions {
  title: string;
  reportTypeLabel: string;
  districtName: string;
  startDateStr: string;
  endDateStr: string;
  recordCount: number;
  headers: { label: string; width: number; maxChars?: number }[];
  rows: (string | number)[][];
}

/**
 * Pure TypeScript server-side PDF 1.4 document generator.
 * Produces a valid, standards-compliant, zero-dependency PDF document with multi-page table formatting.
 */
export function generatePdfDocument(options: PdfReportOptions): Buffer {
  const {
    title,
    reportTypeLabel,
    districtName,
    startDateStr,
    endDateStr,
    recordCount,
    headers,
    rows,
  } = options;

  // A4 Landscape dimensions in points (72 points/inch)
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const marginLeft = 36;
  const marginRight = 36;
  const marginTop = 36;
  const marginBottom = 36;
  const contentWidth = pageWidth - marginLeft - marginRight;

  const headerHeight = 90;
  const tableHeaderHeight = 22;
  const rowHeight = 18;
  const startTableY = pageHeight - marginTop - headerHeight;
  const rowsPerPageFirst = Math.floor((startTableY - marginBottom - tableHeaderHeight) / rowHeight);
  const rowsPerPageSubsequent = Math.floor((pageHeight - marginTop - marginBottom - 40 - tableHeaderHeight) / rowHeight);

  // Paginate rows
  const pagesData: { rows: (string | number)[][]; isFirstPage: boolean }[] = [];
  let rowIndex = 0;

  if (rows.length === 0) {
    pagesData.push({ rows: [], isFirstPage: true });
  } else {
    // First page
    const firstPageRows = rows.slice(0, rowsPerPageFirst);
    pagesData.push({ rows: firstPageRows, isFirstPage: true });
    rowIndex = firstPageRows.length;

    // Subsequent pages
    while (rowIndex < rows.length) {
      const nextBatch = rows.slice(rowIndex, rowIndex + rowsPerPageSubsequent);
      pagesData.push({ rows: nextBatch, isFirstPage: false });
      rowIndex += nextBatch.length;
    }
  }

  const totalPages = pagesData.length;
  const pageStreams: string[] = [];

  // Generate content streams for each page
  pagesData.forEach((pageInfo, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirst = pageInfo.isFirstPage;
    const streamParts: string[] = [];

    // Header Background Bar (First Page: Large Banner, Subsequent: Compact Banner)
    if (isFirst) {
      // Dark emerald top bar
      streamParts.push("0.02 0.47 0.34 rg"); // Emerald color (#047857)
      streamParts.push(`${marginLeft} ${pageHeight - marginTop - 28} ${contentWidth} 28 re f`);

      // Title in White
      streamParts.push("BT");
      streamParts.push("/F2 13 Tf");
      streamParts.push("1 1 1 rg"); // White text
      streamParts.push(`${marginLeft + 12} ${pageHeight - marginTop - 19} Td`);
      streamParts.push(`(${escapePdfText(sanitizeAscii(title))}) Tj`);
      streamParts.push("ET");

      // Metadata Box (Grey Outline)
      const metaBoxY = pageHeight - marginTop - headerHeight + 5;
      streamParts.push("0.9 0.9 0.9 rg"); // Light grey background
      streamParts.push(`${marginLeft} ${metaBoxY} ${contentWidth} 48 re f`);
      streamParts.push("0.8 0.78 0.75 RG"); // Border
      streamParts.push("0.5 w");
      streamParts.push(`${marginLeft} ${metaBoxY} ${contentWidth} 48 re S`);

      // Metadata Text
      streamParts.push("BT");
      streamParts.push("/F2 9 Tf");
      streamParts.push("0.1 0.12 0.11 rg"); // Dark text

      // Column 1: District & Report Type
      streamParts.push(`${marginLeft + 10} ${metaBoxY + 32} Td`);
      streamParts.push(`(District Jurisdiction: ) Tj`);
      streamParts.push("/F1 9 Tf");
      streamParts.push(`(${escapePdfText(sanitizeAscii(districtName))}) Tj`);

      streamParts.push("0 -14 Td");
      streamParts.push("/F2 9 Tf");
      streamParts.push(`(Report Type: ) Tj`);
      streamParts.push("/F1 9 Tf");
      streamParts.push(`(${escapePdfText(sanitizeAscii(reportTypeLabel))}) Tj`);

      // Column 2: Date Range & Generated At
      streamParts.push("260 14 Td");
      streamParts.push("/F2 9 Tf");
      streamParts.push(`(Date Range: ) Tj`);
      streamParts.push("/F1 9 Tf");
      streamParts.push(`(${escapePdfText(sanitizeAscii(startDateStr))} to ${escapePdfText(sanitizeAscii(endDateStr))}) Tj`);

      streamParts.push("0 -14 Td");
      streamParts.push("/F2 9 Tf");
      streamParts.push(`(Generated (IST): ) Tj`);
      streamParts.push("/F1 9 Tf");
      streamParts.push(`(${escapePdfText(sanitizeAscii(formatDateTime(new Date(), true)))}) Tj`);

      // Column 3: Record Count
      streamParts.push("250 14 Td");
      streamParts.push("/F2 9 Tf");
      streamParts.push(`(Total Records: ) Tj`);
      streamParts.push("/F1 9 Tf");
      streamParts.push(`(${recordCount}) Tj`);

      streamParts.push("0 -14 Td");
      streamParts.push("/F2 9 Tf");
      streamParts.push(`(Status: ) Tj`);
      streamParts.push("/F1 9 Tf");
      streamParts.push(`(Official District Export) Tj`);

      streamParts.push("ET");
    } else {
      // Compact top banner on subsequent pages
      streamParts.push("0.02 0.47 0.34 rg");
      streamParts.push(`${marginLeft} ${pageHeight - marginTop - 18} ${contentWidth} 18 re f`);

      streamParts.push("BT");
      streamParts.push("/F2 9 Tf");
      streamParts.push("1 1 1 rg");
      streamParts.push(`${marginLeft + 8} ${pageHeight - marginTop - 13} Td`);
      streamParts.push(`(${escapePdfText(sanitizeAscii(title))} | ${escapePdfText(sanitizeAscii(districtName))} | ${escapePdfText(sanitizeAscii(reportTypeLabel))}) Tj`);
      streamParts.push("ET");
    }

    // Render Table
    const tableTopY = isFirst
      ? pageHeight - marginTop - headerHeight - 8
      : pageHeight - marginTop - 30;

    // Table Header Row Background (Emerald)
    streamParts.push("0.06 0.25 0.18 rg"); // Deep emerald (#0f3f2e)
    streamParts.push(`${marginLeft} ${tableTopY - tableHeaderHeight} ${contentWidth} ${tableHeaderHeight} re f`);

    // Table Header Labels
    let currentX = marginLeft;
    headers.forEach((h) => {
      streamParts.push("BT");
      streamParts.push("/F2 8 Tf");
      streamParts.push("1 1 1 rg");
      streamParts.push(`${currentX + 4} ${tableTopY - 14} Td`);
      streamParts.push(`(${escapePdfText(sanitizeAscii(h.label))}) Tj`);
      streamParts.push("ET");
      currentX += (h.width / 100) * contentWidth;
    });

    // Render Data Rows
    let currentY = tableTopY - tableHeaderHeight;
    pageInfo.rows.forEach((row, rIdx) => {
      const rowY = currentY - rowHeight;

      // Alternating row background
      if (rIdx % 2 === 1) {
        streamParts.push("0.96 0.95 0.93 rg"); // Light off-white
        streamParts.push(`${marginLeft} ${rowY} ${contentWidth} ${rowHeight} re f`);
      }

      // Row Border (Light grey line underneath)
      streamParts.push("0.88 0.86 0.83 RG");
      streamParts.push("0.4 w");
      streamParts.push(`${marginLeft} ${rowY} m ${marginLeft + contentWidth} ${rowY} l S`);

      // Cell Values
      let cellX = marginLeft;
      headers.forEach((h, cIdx) => {
        const rawVal = row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : "—";
        const maxLen = h.maxChars || 24;
        const cellText = truncateText(sanitizeAscii(rawVal), maxLen);

        streamParts.push("BT");
        streamParts.push("/F1 7.5 Tf");
        streamParts.push("0.12 0.15 0.13 rg");
        streamParts.push(`${cellX + 4} ${rowY + 5} Td`);
        streamParts.push(`(${escapePdfText(cellText)}) Tj`);
        streamParts.push("ET");

        cellX += (h.width / 100) * contentWidth;
      });

      currentY = rowY;
    });

    // If empty data on first page
    if (pageInfo.rows.length === 0) {
      const emptyY = tableTopY - tableHeaderHeight - 25;
      streamParts.push("BT");
      streamParts.push("/F1 9 Tf");
      streamParts.push("0.5 0.5 0.5 rg");
      streamParts.push(`${marginLeft + 20} ${emptyY} Td`);
      streamParts.push(`(No records found for the selected date range in this district jurisdiction.) Tj`);
      streamParts.push("ET");
    }

    // Outer Table Border
    const tableBottomY = currentY;
    streamParts.push("0.7 0.68 0.65 RG");
    streamParts.push("0.6 w");
    streamParts.push(`${marginLeft} ${tableBottomY} ${contentWidth} ${tableTopY - tableBottomY} re S`);

    // Page Footer
    streamParts.push("BT");
    streamParts.push("/F1 8 Tf");
    streamParts.push("0.4 0.4 0.4 rg");
    streamParts.push(`${marginLeft} ${marginBottom - 10} Td`);
    streamParts.push(`(MAITRI Livestock Surveillance & Disease Early Warning System | Confidential Government Report) Tj`);

    streamParts.push(`${contentWidth - 60} 0 Td`);
    streamParts.push(`(Page ${pageNum} of ${totalPages}) Tj`);
    streamParts.push("ET");

    pageStreams.push(streamParts.join("\n"));
  });

  // Assemble PDF Object Structure
  const objects: string[] = [];

  // Helper to add PDF object
  function addObject(content: string): number {
    objects.push(content);
    return objects.length; // 1-indexed object number
  }

  // Object 1: Catalog
  // Object 2: Pages
  // Object 3: Font Helvetica
  // Object 4: Font Helvetica-Bold
  // For each page: Page Object, Content Stream Object

  addObject("<< /Type /Catalog /Pages 2 0 R >>");
  
  // Placeholder for Pages object (will replace with actual kids)
  const pagesObjId = addObject(""); 
  
  const fontHelveticaId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const fontHelveticaBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  const pageObjectIds: number[] = [];

  pageStreams.forEach((streamContent) => {
    // Content Stream Object
    const streamBytes = Buffer.from(streamContent, "utf-8");
    const streamObjId = addObject(
      `<< /Length ${streamBytes.length} >>\nstream\n${streamContent}\nendstream`
    );

    // Page Object
    const pageObjId = addObject(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${streamObjId} 0 R /Resources << /Font << /F1 ${fontHelveticaId} 0 R /F2 ${fontHelveticaBoldId} 0 R >> >> >>`
    );

    pageObjectIds.push(pageObjId);
  });

  // Update Pages Object (Object 2)
  const kidsStr = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  objects[pagesObjId - 1] = `<< /Type /Pages /Kids [${kidsStr}] /Count ${pageObjectIds.length} >>`;

  // Build Binary Output Buffer
  let bufferStr = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const xrefEntries: string[] = ["0000000000 65535 f \n"];

  objects.forEach((objContent, idx) => {
    const objNum = idx + 1;
    const currentOffset = Buffer.byteLength(bufferStr, "utf-8");
    const offsetStr = String(currentOffset).padStart(10, "0");
    xrefEntries.push(`${offsetStr} 00000 n \n`);

    bufferStr += `${objNum} 0 obj\n${objContent}\nendobj\n`;
  });

  const startXref = Buffer.byteLength(bufferStr, "utf-8");
  bufferStr += `xref\n0 ${objects.length + 1}\n`;
  bufferStr += xrefEntries.join("");
  bufferStr += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.from(bufferStr, "utf-8");
}

export function generateCaseSummaryPdf(
  districtName: string,
  startDateStr: string,
  endDateStr: string,
  cases: CaseDataRecord[]
): Buffer {
  const headers = [
    { label: "Case #", width: 14, maxChars: 16 },
    { label: "Animal", width: 11, maxChars: 12 },
    { label: "Species", width: 8, maxChars: 8 },
    { label: "Status", width: 12, maxChars: 14 },
    { label: "Diagnosis", width: 15, maxChars: 18 },
    { label: "Village / Farm", width: 16, maxChars: 20 },
    { label: "Taluka", width: 10, maxChars: 12 },
    { label: "Reported (IST)", width: 14, maxChars: 18 },
  ];

  const rows = cases.map((c) => {
    const animal = c.animal;
    const farm = animal?.herd?.farm;
    const village = farm?.village;
    const block = village?.block;
    const latestVetReport = c.veterinaryReports?.[0];

    const diagnosis = latestVetReport?.diagnosis || c.vetDiagnosis || "Pending Assessment";
    const loc = village ? `${village.name} (${farm?.name || "Farm"})` : "—";

    return [
      c.caseNumber,
      animal?.tag || "—",
      animal?.species || "—",
      c.status,
      diagnosis,
      loc,
      block?.name || "—",
      formatDateTime(c.reportedAt, true),
    ];
  });

  return generatePdfDocument({
    title: "DISTRICT LIVESTOCK HEALTH SURVEILLANCE & CASE SUMMARY",
    reportTypeLabel: "Case Summary (Epidemiological Records)",
    districtName,
    startDateStr,
    endDateStr,
    recordCount: cases.length,
    headers,
    rows,
  });
}

export function generateVaccinationCoveragePdf(
  districtName: string,
  startDateStr: string,
  endDateStr: string,
  vaccinations: VaccinationDataRecord[]
): Buffer {
  const headers = [
    { label: "Vaccine", width: 20, maxChars: 24 },
    { label: "Animal Tag", width: 12, maxChars: 14 },
    { label: "Species", width: 10, maxChars: 10 },
    { label: "Date Given (IST)", width: 14, maxChars: 16 },
    { label: "Next Due Date", width: 14, maxChars: 16 },
    { label: "Administered By", width: 15, maxChars: 18 },
    { label: "Village / Taluka", width: 15, maxChars: 20 },
  ];

  const rows = vaccinations.map((v) => {
    const animal = v.animal;
    const farm = animal?.herd?.farm;
    const village = farm?.village;
    const block = village?.block;

    return [
      v.vaccineName,
      animal?.tag || "—",
      animal?.species || "—",
      formatDate(v.dateGiven, true),
      v.nextDueDate ? formatDate(v.nextDueDate, true) : "—",
      v.administeredByUser?.name || "—",
      village ? `${village.name} (${block?.name || ""})` : "—",
    ];
  });

  return generatePdfDocument({
    title: "DISTRICT LIVESTOCK VACCINATION & IMMUNIZATION LOG",
    reportTypeLabel: "Vaccination Coverage Records",
    districtName,
    startDateStr,
    endDateStr,
    recordCount: vaccinations.length,
    headers,
    rows,
  });
}

export function generateOutbreakAlertPdf(
  districtName: string,
  startDateStr: string,
  endDateStr: string,
  alerts: AlertDataRecord[]
): Buffer {
  const headers = [
    { label: "Suspected Disease", width: 22, maxChars: 28 },
    { label: "Cluster Cases", width: 12, maxChars: 10 },
    { label: "Status", width: 10, maxChars: 12 },
    { label: "Village", width: 14, maxChars: 16 },
    { label: "Block / Taluka", width: 12, maxChars: 14 },
    { label: "Cluster Window", width: 16, maxChars: 20 },
    { label: "Alert Logged (IST)", width: 14, maxChars: 18 },
  ];

  const rows = alerts.map((a) => {
    const village = a.village;
    const block = village?.block;

    return [
      a.diseaseName || "Unspecified Outbreak",
      a.caseCount ?? 1,
      a.active ? "ACTIVE" : "RESOLVED",
      village?.name || "—",
      block?.name || "—",
      `${formatDate(a.windowStart, false)} - ${formatDate(a.windowEnd, false)}`,
      formatDateTime(a.createdAt, true),
    ];
  });

  return generatePdfDocument({
    title: "DISTRICT EPIDEMIOLOGICAL OUTBREAK & ALERT LOG",
    reportTypeLabel: "Outbreak Early Warning & Biosecurity Alerts",
    districtName,
    startDateStr,
    endDateStr,
    recordCount: alerts.length,
    headers,
    rows,
  });
}
