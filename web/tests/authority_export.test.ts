import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import prisma from "@/lib/db/prisma";
import * as clerkNextjs from "@clerk/nextjs/server";
import {
  generateAuthorityReportAction,
  getAuthorityReportContextAction,
  GenerateReportParams,
} from "@/lib/actions/authority-reports";
import {
  escapeCsvField,
  buildCsv,
  generateCaseSummaryCsv,
} from "@/lib/authority/csv-generator";
import {
  generatePdfDocument,
  generateCaseSummaryPdf,
  generateVaccinationCoveragePdf,
  generateOutbreakAlertPdf,
} from "@/lib/authority/pdf-generator";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

describe("District Authority Data Export & Reports Feature", () => {
  // Unique test identifiers
  const clerkAuthA = "clerk_test_authority_pune";
  const clerkAuthB = "clerk_test_authority_nagpur";
  const clerkFarmer = "clerk_test_farmer_export";
  const clerkAgent = "clerk_test_agent_export";
  const clerkUnassignedAuth = "clerk_test_auth_unassigned";

  let districtAId: string;
  let districtBId: string;
  let userAuthAId: string;
  let userFarmerId: string;
  let userAgentId: string;
  let animalAId: string;
  let animalBId: string;

  async function cleanTestData() {
    await prisma.authorityExportAudit.deleteMany({
      where: {
        OR: [
          { district: { name: { in: ["Export Test District Pune", "Export Test District Nagpur"] } } },
          { user: { clerkId: { in: [clerkAuthA, clerkAuthB, clerkFarmer, clerkAgent, clerkUnassignedAuth] } } },
        ],
      },
    });
    await prisma.vaccinationRecord.deleteMany({
      where: { animal: { tag: { in: ["COW-PUNE-01", "BUF-NAGPUR-01"] } } },
    });
    await prisma.case.deleteMany({
      where: { caseNumber: { in: ["CASE-PUNE-101", "CASE-PUNE-102", "CASE-NAGPUR-201"] } },
    });
    await prisma.alert.deleteMany({
      where: { village: { name: { in: ["Export Test Village A", "Export Test Village B"] } } },
    });
    await prisma.animal.deleteMany({
      where: { tag: { in: ["COW-PUNE-01", "BUF-NAGPUR-01"] } },
    });
    await prisma.herd.deleteMany({
      where: { name: { in: ["Pune Dairy Herd", "Nagpur Herd"] } },
    });
    await prisma.farm.deleteMany({
      where: { name: { in: ["Ramesh Dairy Farm, Pune", "Nagpur Cattle Ranch"] } },
    });
    await prisma.user.deleteMany({
      where: { clerkId: { in: [clerkAuthA, clerkAuthB, clerkFarmer, clerkAgent, clerkUnassignedAuth] } },
    });
    await prisma.village.deleteMany({
      where: { name: { in: ["Export Test Village A", "Export Test Village B"] } },
    });
    await prisma.block.deleteMany({
      where: { name: { in: ["Export Test Block A", "Export Test Block B"] } },
    });
    await prisma.district.deleteMany({
      where: { name: { in: ["Export Test District Pune", "Export Test District Nagpur"] } },
    });
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanTestData();

    // 1. Create Districts
    const distA = await prisma.district.create({
      data: { name: "Export Test District Pune" },
    });
    districtAId = distA.id;

    const distB = await prisma.district.create({
      data: { name: "Export Test District Nagpur" },
    });
    districtBId = distB.id;

    // 2. Create Blocks & Villages
    const blockA = await prisma.block.create({
      data: { name: "Export Test Block A", districtId: districtAId },
    });
    const villageA = await prisma.village.create({
      data: { name: "Export Test Village A", blockId: blockA.id },
    });

    const blockB = await prisma.block.create({
      data: { name: "Export Test Block B", districtId: districtBId },
    });
    const villageB = await prisma.village.create({
      data: { name: "Export Test Village B", blockId: blockB.id },
    });

    // 3. Create Users
    const uAuthA = await prisma.user.create({
      data: {
        clerkId: clerkAuthA,
        role: "DISTRICT_AUTHORITY",
        status: "ACTIVE",
        name: "Dr. Deshmukh (Pune Authority)",
        phone: "+919800000001",
        districtId: districtAId,
      },
    });
    userAuthAId = uAuthA.id;

    await prisma.user.create({
      data: {
        clerkId: clerkAuthB,
        role: "DISTRICT_AUTHORITY",
        status: "ACTIVE",
        name: "Dr. Patil (Nagpur Authority)",
        phone: "+919800000002",
        districtId: districtBId,
      },
    });

    const uFarmer = await prisma.user.create({
      data: {
        clerkId: clerkFarmer,
        role: "FARMER",
        status: "ACTIVE",
        name: "Farmer Ramesh",
        phone: "+919800000003",
        districtId: districtAId,
        blockId: blockA.id,
        villageId: villageA.id,
      },
    });
    userFarmerId = uFarmer.id;

    const uAgent = await prisma.user.create({
      data: {
        clerkId: clerkAgent,
        role: "FIELD_AGENT",
        status: "ACTIVE",
        name: "Agent Suresh",
        phone: "+919800000004",
        districtId: districtAId,
        blockId: blockA.id,
        villageId: villageA.id,
      },
    });
    userAgentId = uAgent.id;

    await prisma.user.create({
      data: {
        clerkId: clerkUnassignedAuth,
        role: "DISTRICT_AUTHORITY",
        status: "ACTIVE",
        name: "Unassigned Authority",
        phone: "+919800000005",
        districtId: null, // No jurisdiction
      },
    });

    // 4. Create Farms, Herds & Animals
    const farmA = await prisma.farm.create({
      data: {
        name: "Ramesh Dairy Farm, Pune",
        villageId: villageA.id,
        farmerUserId: userFarmerId,
        latitude: 18.5204,
        longitude: 73.8567,
      },
    });
    const herdA = await prisma.herd.create({
      data: {
        farmId: farmA.id,
        species: "COW",
        name: "Pune Dairy Herd",
      },
    });
    const animalA = await prisma.animal.create({
      data: {
        herdId: herdA.id,
        tag: "COW-PUNE-01",
        species: "COW",
        breed: "Gir",
      },
    });
    animalAId = animalA.id;

    const farmB = await prisma.farm.create({
      data: {
        name: "Nagpur Cattle Ranch",
        villageId: villageB.id,
        latitude: 21.1458,
        longitude: 79.0882,
      },
    });
    const herdB = await prisma.herd.create({
      data: {
        farmId: farmB.id,
        species: "BUFFALO",
        name: "Nagpur Herd",
      },
    });
    const animalB = await prisma.animal.create({
      data: {
        herdId: herdB.id,
        tag: "BUF-NAGPUR-01",
        species: "BUFFALO",
        breed: "Murrah",
      },
    });
    animalBId = animalB.id;

    // 5. Create Cases (Within date window: 2026-09-01 to 2026-09-10)
    await prisma.case.create({
      data: {
        caseNumber: "CASE-PUNE-101",
        animalId: animalAId,
        createdByUserId: userFarmerId,
        reportSource: "FARMER",
        status: "CONFIRMED",
        symptoms: ["High Fever", "Blisters on Hoof, Salivation"],
        durationDays: 3,
        mortalityCount: 0,
        vetDiagnosis: "Foot and Mouth Disease (FMD)",
        reportedAt: new Date("2026-09-05T10:30:00.000Z"),
      },
    });

    await prisma.case.create({
      data: {
        caseNumber: "CASE-PUNE-102",
        animalId: animalAId,
        createdByUserId: userAgentId,
        reportSource: "FIELD_AGENT",
        status: "PENDING_REVIEW",
        symptoms: ["Lethargy", 'Loss of "Appetite"'],
        durationDays: 2,
        mortalityCount: 0,
        reportedAt: new Date("2026-09-08T14:00:00.000Z"),
      },
    });

    // Case in District B (Nagpur)
    await prisma.case.create({
      data: {
        caseNumber: "CASE-NAGPUR-201",
        animalId: animalBId,
        createdByUserId: userFarmerId,
        reportSource: "FARMER",
        status: "CONFIRMED",
        symptoms: ["High Fever", "Sudden Death"],
        durationDays: 1,
        mortalityCount: 2,
        vetDiagnosis: "Anthrax (Suspected)",
        reportedAt: new Date("2026-09-06T08:00:00.000Z"),
      },
    });

    // 6. Create Vaccinations
    await prisma.vaccinationRecord.create({
      data: {
        animalId: animalAId,
        vaccineName: "FMD Vaccine (Raksha-Ovac)",
        dateGiven: new Date("2026-09-03T09:00:00.000Z"),
        nextDueDate: new Date("2027-03-03T09:00:00.000Z"),
        administeredByUserId: userAgentId,
      },
    });

    await prisma.vaccinationRecord.create({
      data: {
        animalId: animalBId,
        vaccineName: "Brucellosis S19",
        dateGiven: new Date("2026-09-04T11:00:00.000Z"),
        administeredByUserId: userAgentId,
      },
    });

    // 7. Create Alerts
    await prisma.alert.create({
      data: {
        villageId: villageA.id,
        diseaseName: "Lumpy Skin Disease (LSD)",
        caseCount: 4,
        windowStart: new Date("2026-09-01T00:00:00.000Z"),
        windowEnd: new Date("2026-09-07T23:59:59.000Z"),
        active: true,
        createdAt: new Date("2026-09-05T12:00:00.000Z"),
      },
    });

    await prisma.alert.create({
      data: {
        villageId: villageB.id,
        diseaseName: "Hemorrhagic Septicemia (HS)",
        caseCount: 7,
        windowStart: new Date("2026-09-02T00:00:00.000Z"),
        windowEnd: new Date("2026-09-08T23:59:59.000Z"),
        active: true,
        createdAt: new Date("2026-09-05T15:00:00.000Z"),
      },
    });
  });

  afterAll(async () => {
    await cleanTestData();
  });

  /* ==================================================
   * 1. DISTRICT SCOPING & ANTI-LEAKAGE BOUNDARY
   * ================================================== */
  describe("1. District Scoping & Anti-Leakage Boundary", () => {
    it("exports Case Summary exclusively for the authenticated user's assigned district", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: clerkAuthA } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      const result = await generateAuthorityReportAction({
        reportType: "CASE_SUMMARY",
        startDate: "2026-09-01",
        endDate: "2026-09-10",
        format: "CSV",
      });

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(2);

      const csvText = Buffer.from(result.base64Data!, "base64").toString("utf-8");
      // Must contain Pune cases
      expect(csvText).toContain("CASE-PUNE-101");
      expect(csvText).toContain("CASE-PUNE-102");
      expect(csvText).toContain("Export Test District Pune");

      // MUST NOT contain Nagpur case
      expect(csvText).not.toContain("CASE-NAGPUR-201");
      expect(csvText).not.toContain("Export Test District Nagpur");
    });

    it("exports Vaccination Coverage exclusively for the authenticated user's assigned district", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: clerkAuthA } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      const result = await generateAuthorityReportAction({
        reportType: "VACCINATION_COVERAGE",
        startDate: "2026-09-01",
        endDate: "2026-09-10",
        format: "CSV",
      });

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(1);

      const csvText = Buffer.from(result.base64Data!, "base64").toString("utf-8");
      expect(csvText).toContain("FMD Vaccine (Raksha-Ovac)");
      expect(csvText).toContain("COW-PUNE-01");
      expect(csvText).not.toContain("Brucellosis S19");
      expect(csvText).not.toContain("BUF-NAGPUR-01");
    });

    it("exports Outbreak Alerts exclusively for the authenticated user's assigned district", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: clerkAuthA } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      const result = await generateAuthorityReportAction({
        reportType: "OUTBREAK_ALERTS",
        startDate: "2026-09-01",
        endDate: "2026-09-10",
        format: "CSV",
      });

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(1);

      const csvText = Buffer.from(result.base64Data!, "base64").toString("utf-8");
      expect(csvText).toContain("Lumpy Skin Disease (LSD)");
      expect(csvText).not.toContain("Hemorrhagic Septicemia (HS)");
    });

    it("prevents arbitrary district parameter spoofing from overriding server jurisdiction", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: clerkAuthA } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      // Attempt to pass arbitrary foreign districtId (if any property is passed)
      const spoofedPayload = {
        reportType: "CASE_SUMMARY" as const,
        startDate: "2026-09-01",
        endDate: "2026-09-10",
        format: "CSV" as const,
        districtId: districtBId, // Malicious override attempt
      };

      const result = await generateAuthorityReportAction(spoofedPayload as unknown as GenerateReportParams);

      expect(result.success).toBe(true);
      const csvText = Buffer.from(result.base64Data!, "base64").toString("utf-8");
      // Still only contains Pune
      expect(csvText).toContain("CASE-PUNE-101");
      expect(csvText).not.toContain("CASE-NAGPUR-201");
    });
  });

  /* ==================================================
   * 2. CSV FORMATTING & RFC 4180 ESCAPING
   * ================================================== */
  describe("2. CSV Formatting & RFC 4180 Escaping", () => {
    it("escapes fields containing commas, double quotes, and line breaks", () => {
      expect(escapeCsvField("Hello, World")).toBe('"Hello, World"');
      expect(escapeCsvField('Loss of "Appetite"')).toBe('"Loss of ""Appetite"""');
      expect(escapeCsvField("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
      expect(escapeCsvField("NormalText")).toBe("NormalText");
      expect(escapeCsvField(null)).toBe("");
    });

    it("generates valid CSV with UTF-8 BOM and correct header row", () => {
      const headers = ["ID", "Name", "Symptoms"];
      const rows = [
        ["1", "Cow 1", "Fever, Cough"],
        ["2", 'Cow "2"', "Normal"],
      ];

      const csv = buildCsv(headers, rows);
      expect(csv.startsWith("\uFEFF")).toBe(true); // UTF-8 BOM
      expect(csv).toContain("ID,Name,Symptoms\r\n");
      expect(csv).toContain('1,Cow 1,"Fever, Cough"\r\n');
      expect(csv).toContain('2,"Cow ""2""",Normal');
    });

    it("generates deterministic Case Summary CSV with all expected columns", () => {
      const mockCases = [
        {
          caseNumber: "CASE-001",
          animal: {
            tag: "TAG-1",
            species: "COW",
            breed: "Gir",
            herd: {
              farm: {
                name: "Farm A, East Wing",
                village: {
                  name: "Village A",
                  block: {
                    name: "Block A",
                    district: { name: "District A" },
                  },
                },
              },
            },
          },
          status: "CONFIRMED",
          vetDiagnosis: "FMD",
          vetRecommendedAction: "ISOLATE",
          symptoms: ["Fever", "Blisters"],
          durationDays: 3,
          mortalityCount: 0,
          reportedAt: new Date("2026-09-05T10:00:00Z"),
          reviewedAt: new Date("2026-09-06T12:00:00Z"),
          createdByUser: { name: "Ramesh", role: "FARMER" },
          veterinaryReports: [{ diagnosis: "FMD Confirmed", action: "ISOLATE" }],
        },
      ];

      const csv = generateCaseSummaryCsv(mockCases);
      expect(csv).toContain("Case Number,Animal Tag,Species,Breed,Status");
      expect(csv).toContain('CASE-001,TAG-1,COW,Gir,CONFIRMED,FMD Confirmed,ISOLATE,Fever; Blisters,3,0,"Farm A, East Wing",Village A,Block A,District A');
    });
  });

  /* ==================================================
   * 3. PDF GENERATION STANDARDS COMPLIANCE
   * ================================================== */
  describe("3. PDF Generation Standards Compliance", () => {
    it("generates structurally valid PDF 1.4 binary documents", () => {
      const pdfBuffer = generatePdfDocument({
        title: "TEST SURVEILLANCE REPORT",
        reportTypeLabel: "Case Summary",
        districtName: "Pune District",
        startDateStr: "2026-09-01",
        endDateStr: "2026-09-10",
        recordCount: 2,
        headers: [
          { label: "Case #", width: 30 },
          { label: "Animal", width: 30 },
          { label: "Status", width: 40 },
        ],
        rows: [
          ["CASE-001", "COW-101", "CONFIRMED"],
          ["CASE-002", "COW-102", "PENDING_REVIEW"],
        ],
      });

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      const pdfStr = pdfBuffer.toString("binary");

      // 1. Valid PDF header
      expect(pdfStr.startsWith("%PDF-1.4")).toBe(true);

      // 2. Contains Catalog, Pages, Page, Font objects
      expect(pdfStr).toContain("/Type /Catalog");
      expect(pdfStr).toContain("/Type /Pages");
      expect(pdfStr).toContain("/Type /Page");
      expect(pdfStr).toContain("/Type /Font");
      expect(pdfStr).toContain("/BaseFont /Helvetica");

      // 3. Contains content stream
      expect(pdfStr).toContain("stream");
      expect(pdfStr).toContain("endstream");

      // 4. Contains xref table and trailer
      expect(pdfStr).toContain("xref");
      expect(pdfStr).toContain("trailer");
      expect(pdfStr).toContain("/Root 1 0 R");

      // 5. Ends with EOF
      expect(pdfStr.trim().endsWith("%%EOF")).toBe(true);
    });

    it("generates Case Summary, Vaccination, and Outbreak PDFs without error", () => {
      const casePdf = generateCaseSummaryPdf("Pune", "2026-09-01", "2026-09-10", []);
      expect(casePdf.length).toBeGreaterThan(500);

      const vacPdf = generateVaccinationCoveragePdf("Pune", "2026-09-01", "2026-09-10", []);
      expect(vacPdf.length).toBeGreaterThan(500);

      const alertPdf = generateOutbreakAlertPdf("Pune", "2026-09-01", "2026-09-10", []);
      expect(alertPdf.length).toBeGreaterThan(500);
    });
  });

  /* ==================================================
   * 4. DATE RANGE FILTERING
   * ================================================== */
  describe("4. Date Range Filtering", () => {
    it("correctly includes records on boundary dates and excludes out-of-range records", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: clerkAuthA } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      // 1. Narrow window that only covers CASE-PUNE-101 (2026-09-05) and excludes CASE-PUNE-102 (2026-09-08)
      const result = await generateAuthorityReportAction({
        reportType: "CASE_SUMMARY",
        startDate: "2026-09-05",
        endDate: "2026-09-06",
        format: "CSV",
      });

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(1);

      const csvText = Buffer.from(result.base64Data!, "base64").toString("utf-8");
      expect(csvText).toContain("CASE-PUNE-101");
      expect(csvText).not.toContain("CASE-PUNE-102");
    });

    it("rejects inverted date ranges (start > end)", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: clerkAuthA } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      const result = await generateAuthorityReportAction({
        reportType: "CASE_SUMMARY",
        startDate: "2026-09-10",
        endDate: "2026-09-01",
        format: "CSV",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Start date must be before or equal to end date");
    });

    it("rejects invalid date format", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: clerkAuthA } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      const result = await generateAuthorityReportAction({
        reportType: "CASE_SUMMARY",
        startDate: "invalid-date",
        endDate: "2026-09-10",
        format: "CSV",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid date format");
    });
  });

  /* ==================================================
   * 5. ROLE GUARDS & JURISDICTION INTEGRITY
   * ================================================== */
  describe("5. Role Guards & Jurisdiction Integrity", () => {
    it("rejects FARMER role attempts to generate authority reports", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: clerkFarmer } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      const result = await generateAuthorityReportAction({
        reportType: "CASE_SUMMARY",
        startDate: "2026-09-01",
        endDate: "2026-09-10",
        format: "CSV",
      });

      expect(result.success).toBe(false);
    });

    it("rejects FIELD_AGENT role attempts to generate authority reports", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: clerkAgent } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      const result = await generateAuthorityReportAction({
        reportType: "CASE_SUMMARY",
        startDate: "2026-09-01",
        endDate: "2026-09-10",
        format: "CSV",
      });

      expect(result.success).toBe(false);
    });

    it("rejects authority accounts lacking an assigned district jurisdiction", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: clerkUnassignedAuth } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      const result = await generateAuthorityReportAction({
        reportType: "CASE_SUMMARY",
        startDate: "2026-09-01",
        endDate: "2026-09-10",
        format: "CSV",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No assigned district jurisdiction found");
    });
  });

  /* ==================================================
   * 6. AUDIT TRAIL LOGGING
   * ================================================== */
  describe("6. Audit Trail Logging", () => {
    it("records a complete audit entry upon successful report generation", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: clerkAuthA } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      const result = await generateAuthorityReportAction({
        reportType: "CASE_SUMMARY",
        startDate: "2026-09-01",
        endDate: "2026-09-10",
        format: "PDF",
      });

      expect(result.success).toBe(true);

      const audits = await prisma.authorityExportAudit.findMany({
        where: { userId: userAuthAId },
      });

      expect(audits.length).toBe(1);
      const audit = audits[0];
      expect(audit.districtId).toBe(districtAId);
      expect(audit.reportType).toBe("CASE_SUMMARY");
      expect(audit.format).toBe("PDF");
      expect(audit.recordCount).toBe(2);
      expect(audit.success).toBe(true);
      expect(audit.errorMessage).toBeNull();
      expect(audit.createdAt).toBeInstanceOf(Date);
    });

    it("records an audit entry with failure details on validation failure", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: clerkAuthA } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      await generateAuthorityReportAction({
        reportType: "CASE_SUMMARY",
        startDate: "2026-09-10",
        endDate: "2026-09-01", // Inverted date
        format: "CSV",
      });

      const failedAudits = await prisma.authorityExportAudit.findMany({
        where: { userId: userAuthAId, success: false },
      });

      expect(failedAudits.length).toBe(1);
      expect(failedAudits[0].errorMessage).toContain("Start date must be before or equal to end date");
    });
  });

  /* ==================================================
   * 7. CONTEXT RESOLUTION ACTION
   * ================================================== */
  describe("7. Context Resolution Action", () => {
    it("returns authorized district context for authenticated authority", async () => {
      vi.mocked(clerkNextjs.auth).mockResolvedValue({ userId: clerkAuthA } as unknown as Awaited<ReturnType<typeof clerkNextjs.auth>>);

      const ctx = await getAuthorityReportContextAction();
      expect(ctx.success).toBe(true);
      expect(ctx.districtId).toBe(districtAId);
      expect(ctx.districtName).toBe("Export Test District Pune");
      expect(ctx.authorityName).toBe("Dr. Deshmukh (Pune Authority)");
    });
  });
});
