import { describe, it, expect, beforeEach } from "vitest";
import prisma from "@/lib/db/prisma";
import {
  getDistrictAuthorityCommandData,
  calculateRiskIntensity,
} from "@/lib/authority/metrics";
import { isValidCoordinate } from "@/components/authority/mapUtils";

describe("District Authority Command Dashboard Engine", () => {
  let districtAId: string;
  let districtBId: string;
  let blockAId: string;
  let blockBId: string;
  let villageA1Id: string;
  let villageA2Id: string;
  let villageB1Id: string;

  let farmerA1Id: string;
  let farmerA2Id: string;
  let farmerB1Id: string;

  let vetAId: string;
  let vetBId: string;

  let agentAId: string;
  let agentBId: string;

  let farmA1Id: string;
  let farmA2Id: string;
  let farmB1Id: string;

  let herdA1Id: string;
  let herdA2Id: string;
  let herdB1Id: string;

  let animalA1Id: string;
  let animalA2Id: string;
  let animalB1Id: string;

  beforeEach(async () => {
    const timestamp = Date.now();

    // 1. Create District A & District B
    const distA = await prisma.district.create({
      data: { name: `District Authority Scope A ${timestamp}` },
    });
    districtAId = distA.id;

    const distB = await prisma.district.create({
      data: { name: `District Authority Scope B ${timestamp}` },
    });
    districtBId = distB.id;

    // 2. Create Blocks
    const blkA = await prisma.block.create({
      data: { districtId: districtAId, name: `Block A ${timestamp}` },
    });
    blockAId = blkA.id;

    const blkB = await prisma.block.create({
      data: { districtId: districtBId, name: `Block B ${timestamp}` },
    });
    blockBId = blkB.id;

    // 3. Create Villages
    const vilA1 = await prisma.village.create({
      data: { blockId: blockAId, name: `Village A1 ${timestamp}` },
    });
    villageA1Id = vilA1.id;

    const vilA2 = await prisma.village.create({
      data: { blockId: blockAId, name: `Village A2 ${timestamp}` },
    });
    villageA2Id = vilA2.id;

    const vilB1 = await prisma.village.create({
      data: { blockId: blockBId, name: `Village B1 ${timestamp}` },
    });
    villageB1Id = vilB1.id;

    // 4. Create Users (Farmers, Vets, Field Agents)
    const fA1 = await prisma.user.create({
      data: {
        clerkId: `clerk_farmer_a1_${timestamp}`,
        name: "Farmer A1",
        phone: "+919800000001",
        role: "FARMER",
        districtId: districtAId,
        blockId: blockAId,
        villageId: villageA1Id,
      },
    });
    farmerA1Id = fA1.id;

    const fA2 = await prisma.user.create({
      data: {
        clerkId: `clerk_farmer_a2_${timestamp}`,
        name: "Farmer A2",
        phone: "+919800000002",
        role: "FARMER",
        districtId: districtAId,
        blockId: blockAId,
        villageId: villageA2Id,
      },
    });
    farmerA2Id = fA2.id;

    const fB1 = await prisma.user.create({
      data: {
        clerkId: `clerk_farmer_b1_${timestamp}`,
        name: "Farmer B1",
        phone: "+919800000003",
        role: "FARMER",
        districtId: districtBId,
        blockId: blockBId,
        villageId: villageB1Id,
      },
    });
    farmerB1Id = fB1.id;

    const vA = await prisma.user.create({
      data: {
        clerkId: `clerk_vet_a_${timestamp}`,
        name: "Dr. Vet A",
        phone: "+919800000004",
        role: "VETERINARIAN",
        districtId: districtAId,
        blockId: blockAId,
      },
    });
    vetAId = vA.id;

    const vB = await prisma.user.create({
      data: {
        clerkId: `clerk_vet_b_${timestamp}`,
        name: "Dr. Vet B",
        phone: "+919800000005",
        role: "VETERINARIAN",
        districtId: districtBId,
        blockId: blockBId,
      },
    });
    vetBId = vB.id;

    const agA = await prisma.user.create({
      data: {
        clerkId: `clerk_agent_a_${timestamp}`,
        name: "Agent A",
        phone: "+919800000006",
        role: "FIELD_AGENT",
        districtId: districtAId,
        blockId: blockAId,
      },
    });
    agentAId = agA.id;

    const agB = await prisma.user.create({
      data: {
        clerkId: `clerk_agent_b_${timestamp}`,
        name: "Agent B",
        phone: "+919800000007",
        role: "FIELD_AGENT",
        districtId: districtBId,
        blockId: blockBId,
      },
    });
    agentBId = agB.id;

    // 5. Create Farms & Animals
    const f1 = await prisma.farm.create({
      data: {
        name: "Farm A1",
        villageId: villageA1Id,
        farmerUserId: farmerA1Id,
        latitude: 19.1234,
        longitude: 74.5678,
      },
    });
    farmA1Id = f1.id;

    const f2 = await prisma.farm.create({
      data: {
        name: "Farm A2",
        villageId: villageA2Id,
        farmerUserId: farmerA2Id,
        latitude: 19.2345,
        longitude: 74.6789,
      },
    });
    farmA2Id = f2.id;

    const fb1 = await prisma.farm.create({
      data: {
        name: "Farm B1",
        villageId: villageB1Id,
        farmerUserId: farmerB1Id,
        latitude: 18.1111,
        longitude: 73.2222,
      },
    });
    farmB1Id = fb1.id;

    const h1 = await prisma.herd.create({
      data: { farmId: farmA1Id, species: "COW", name: "Cattle Herd A1" },
    });
    herdA1Id = h1.id;

    const h2 = await prisma.herd.create({
      data: { farmId: farmA2Id, species: "BUFFALO", name: "Buffalo Herd A2" },
    });
    herdA2Id = h2.id;

    const hb1 = await prisma.herd.create({
      data: { farmId: farmB1Id, species: "GOAT", name: "Goat Herd B1" },
    });
    herdB1Id = hb1.id;

    const a1 = await prisma.animal.create({
      data: { herdId: herdA1Id, tag: `TAG-A1-${timestamp}`, species: "COW" },
    });
    animalA1Id = a1.id;

    const a2 = await prisma.animal.create({
      data: { herdId: herdA2Id, tag: `TAG-A2-${timestamp}`, species: "BUFFALO" },
    });
    animalA2Id = a2.id;

    const ab1 = await prisma.animal.create({
      data: { herdId: herdB1Id, tag: `TAG-B1-${timestamp}`, species: "GOAT" },
    });
    animalB1Id = ab1.id;

    // 6. Create Cases in District A
    // Case 1: Pending Review (High AI Risk)
    await prisma.case.create({
      data: {
        caseNumber: `CASE-A1-${timestamp}`,
        animalId: animalA1Id,
        createdByUserId: farmerA1Id,
        assignedVeterinarianUserId: vetAId,
        reportSource: "FARMER",
        status: "PENDING_REVIEW",
        symptoms: ["fever", "mouth blisters"],
        durationDays: 2,
        gpsLat: 19.1235,
        gpsLng: 74.5679,
        analysisResult: { overall_risk_level: "HIGH" },
      },
    });

    // Case 2: Under Examination (Critical Risk) with follow-up
    await prisma.case.create({
      data: {
        caseNumber: `CASE-A2-${timestamp}`,
        animalId: animalA2Id,
        createdByUserId: farmerA2Id,
        assignedVeterinarianUserId: vetAId,
        reportSource: "FARMER",
        status: "UNDER_EXAMINATION",
        symptoms: ["swelling", "lameness"],
        durationDays: 4,
        analysisResult: { overall_risk_level: "CRITICAL" },
        vetFollowUpDate: new Date(Date.now() - 3600000), // Due follow-up
        followUpCompleted: false,
      },
    });

    // Case in District B: Confirmed Case
    await prisma.case.create({
      data: {
        caseNumber: `CASE-B1-${timestamp}`,
        animalId: animalB1Id,
        createdByUserId: farmerB1Id,
        assignedVeterinarianUserId: vetBId,
        reportSource: "FARMER",
        status: "CONFIRMED",
        symptoms: ["coughing"],
        durationDays: 3,
        analysisResult: { overall_risk_level: "MEDIUM" },
      },
    });

    // 7. Create Assistance Requests & Field Visits in District A
    const reqA = await prisma.assistanceRequest.create({
      data: {
        farmerUserId: farmerA1Id,
        farmId: farmA1Id,
        villageId: villageA1Id,
        blockId: blockAId,
        districtId: districtAId,
        assignedFieldAgentUserId: agentAId,
        reason: "Suspected FMD blister inspection",
        status: "IN_PROGRESS",
      },
    });

    await prisma.fieldVisit.create({
      data: {
        assistanceRequestId: reqA.id,
        fieldAgentUserId: agentAId,
        startedAt: new Date(),
        observations: "Observed lesions on oral cavity.",
        measurements: { latitude: 19.124, longitude: 74.568 },
      },
    });

    // 8. Create Active Outbreak Alert in District A
    await prisma.alert.create({
      data: {
        villageId: villageA1Id,
        diseaseName: "Foot and Mouth Disease (FMD)",
        caseCount: 3,
        windowStart: new Date(Date.now() - 3 * 24 * 3600000),
        windowEnd: new Date(),
        active: true,
      },
    });
  });

  it("strictly enforces district-scope security and isolates District A from District B", async () => {
    const dataA = await getDistrictAuthorityCommandData({ districtId: districtAId, timeRange: "all" });
    const dataB = await getDistrictAuthorityCommandData({ districtId: districtBId, timeRange: "all" });

    // Verify District A data
    expect(dataA.kpis.totalFarmers).toBe(2);
    expect(dataA.kpis.totalFarms).toBe(2);
    expect(dataA.kpis.totalAnimals).toBe(2);
    expect(dataA.kpis.activeCases).toBe(2); // 1 Pending + 1 Under Exam
    expect(dataA.kpis.totalVeterinarians).toBe(1);
    expect(dataA.kpis.totalFieldAgents).toBe(1);
    expect(dataA.kpis.activeAlerts).toBe(1);

    // Verify District B data
    expect(dataB.kpis.totalFarmers).toBe(1);
    expect(dataB.kpis.totalFarms).toBe(1);
    expect(dataB.kpis.totalAnimals).toBe(1);
    expect(dataB.kpis.activeCases).toBe(0); // 0 active, 1 confirmed
    expect(dataB.kpis.confirmedCases).toBe(1);
    expect(dataB.kpis.totalVeterinarians).toBe(1);
    expect(dataB.kpis.totalFieldAgents).toBe(1);
    expect(dataB.kpis.activeAlerts).toBe(0);

    // Verify cross-district isolation
    const vetNamesA = dataA.veterinarians.map((v) => v.name);
    expect(vetNamesA).toContain("Dr. Vet A");
    expect(vetNamesA).not.toContain("Dr. Vet B");

    const agentNamesA = dataA.fieldAgents.map((a) => a.name);
    expect(agentNamesA).toContain("Agent A");
    expect(agentNamesA).not.toContain("Agent B");

    const agentIdsB = dataB.fieldAgents.map((a) => a.id);
    expect(agentIdsB).toContain(agentBId);
    expect(agentIdsB).not.toContain(agentAId);

    const vetIdsB = dataB.veterinarians.map((v) => v.id);
    expect(vetIdsB).toContain(vetBId);
    expect(vetIdsB).not.toContain(vetAId);
  });

  it("calculates personnel responsibility distinct farmers and animals correctly", async () => {
    const dataA = await getDistrictAuthorityCommandData({ districtId: districtAId, timeRange: "all" });

    // Dr. Vet A has 2 active cases across 2 different farmers (Farmer A1, Farmer A2) and 2 animals
    const vetA = dataA.veterinarians.find((v) => v.name === "Dr. Vet A");
    expect(vetA).toBeDefined();
    expect(vetA?.assignedCases).toBe(2);
    expect(vetA?.activeCases).toBe(2);
    expect(vetA?.pendingReviews).toBe(1);
    expect(vetA?.underExam).toBe(1);
    expect(vetA?.farmersUnderCare).toBe(2);
    expect(vetA?.animalsUnderCare).toBe(2);
    expect(vetA?.followUps).toBe(1);
    expect(vetA?.workloadScore).toBeGreaterThan(0);

    // Agent A has 1 active request for Farmer A1
    const agentA = dataA.fieldAgents.find((a) => a.name === "Agent A");
    expect(agentA).toBeDefined();
    expect(agentA?.openRequests).toBe(1);
    expect(agentA?.farmersAssisted).toBe(1);
  });

  it("computes 5-stage case pipeline and all 9 real-data charts with live database counts", async () => {
    const dataA = await getDistrictAuthorityCommandData({ districtId: districtAId, timeRange: "all" });

    // Pipeline stages
    expect(dataA.pipeline.length).toBe(5);
    const pendingStage = dataA.pipeline.find((p) => p.status === "PENDING_REVIEW");
    const examStage = dataA.pipeline.find((p) => p.status === "UNDER_EXAMINATION");
    expect(pendingStage?.count).toBe(1);
    expect(examStage?.count).toBe(1);

    // Chart 1: Cases by status
    expect(dataA.charts.casesByStatus.length).toBe(5);

    // Chart 2: Cases by risk
    const highRisk = dataA.charts.casesByRisk.find((r) => r.label === "High");
    const criticalRisk = dataA.charts.casesByRisk.find((r) => r.label === "Critical");
    expect(highRisk?.value).toBe(1);
    expect(criticalRisk?.value).toBe(1);

    // Chart 7: Species distribution (1 Cow, 1 Buffalo)
    const cow = dataA.charts.speciesDistribution.find((s) => s.label === "Cow");
    const buffalo = dataA.charts.speciesDistribution.find((s) => s.label === "Buffalo");
    expect(cow?.value).toBe(1);
    expect(buffalo?.value).toBe(1);

    // Chart 8: Alerts
    expect(dataA.charts.alertsBySeverity.length).toBe(1);
    expect(dataA.charts.alertsBySeverity[0].value).toBe(1);
  });

  it("resolves map layer coordinates accurately according to authoritative hierarchy", async () => {
    const dataA = await getDistrictAuthorityCommandData({ districtId: districtAId, timeRange: "all" });

    // Case 1 has its own GPS (19.1235, 74.5679)
    const case1 = dataA.mapLayers.cases.find((c) => c.species === "COW");
    expect(case1).toBeDefined();
    expect(case1?.lat).toBe(19.1235);
    expect(case1?.lng).toBe(74.5679);

    // Case 2 fell back to farm coordinates (19.2345, 74.6789)
    const case2 = dataA.mapLayers.cases.find((c) => c.species === "BUFFALO");
    expect(case2).toBeDefined();
    expect(case2?.lat).toBe(19.2345);
    expect(case2?.lng).toBe(74.6789);

    // Field Visit has its own measurement GPS (19.124, 74.568)
    expect(dataA.mapLayers.fieldVisits.length).toBe(1);
    expect(dataA.mapLayers.fieldVisits[0].lat).toBe(19.124);
    expect(dataA.mapLayers.fieldVisits[0].lng).toBe(74.568);

    // Heatmap intensity formula
    const criticalWeight = calculateRiskIntensity("CRITICAL", false);
    const highWithAlertWeight = calculateRiskIntensity("HIGH", true);
    expect(criticalWeight).toBe(5.0);
    expect(highWithAlertWeight).toBe(9.0); // 4.0 + 5.0 alert
  });

  it("handles empty district cleanly without division-by-zero or errors", async () => {
    const emptyDist = await prisma.district.create({
      data: { name: `Empty District ${Date.now()}` },
    });

    const emptyData = await getDistrictAuthorityCommandData({ districtId: emptyDist.id });

    expect(emptyData.kpis.totalFarmers).toBe(0);
    expect(emptyData.kpis.totalFarms).toBe(0);
    expect(emptyData.kpis.totalAnimals).toBe(0);
    expect(emptyData.kpis.activeCases).toBe(0);
    expect(emptyData.kpis.avgTimeToReviewHours).toBeNull();
    expect(emptyData.kpis.avgTimeToConfirmationHours).toBeNull();
    expect(emptyData.mapLayers.cases.length).toBe(0);
    expect(emptyData.mapLayers.farms.length).toBe(0);
    expect(emptyData.mapLayers.heatmapPoints.length).toBe(0);
  });

  it("strictly validates coordinates and excludes invalid or 0,0 points", () => {
    expect(isValidCoordinate(19.1234, 74.5678)).toBe(true);
    expect(isValidCoordinate(0, 0)).toBe(false);
    expect(isValidCoordinate(null, 74.5678)).toBe(false);
    expect(isValidCoordinate(19.1234, undefined)).toBe(false);
    expect(isValidCoordinate(95, 74)).toBe(false); // Out of latitude range
    expect(isValidCoordinate(19, 200)).toBe(false); // Out of longitude range
  });
});
