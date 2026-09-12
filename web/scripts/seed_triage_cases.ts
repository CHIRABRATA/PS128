import prisma from "../lib/db/prisma";

async function main() {
  console.log("🚀 Seeding rich clinical cases for Veterinary Triage Queue...");

  // Find all active veterinarians
  const vets = await prisma.user.findMany({
    where: { role: "VETERINARIAN", status: "ACTIVE" },
    include: { district: true },
  });

  console.log(`Found ${vets.length} active veterinarian(s).`);

  // Target veterinarian Dr. Arnab (or any active vet)
  const arnabVet = vets.find((v) => v.name.toLowerCase().includes("arnab") || v.district?.name === "North 24 Parganas") || vets[0];
  const kolkataVet = vets.find((v) => v.district?.name === "Kolkata");

  // Find animals in North 24 Parganas
  const n24Animals = await prisma.animal.findMany({
    where: {
      herd: {
        farm: {
          village: {
            block: {
              district: {
                name: "North 24 Parganas",
              },
            },
          },
        },
      },
    },
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
  });

  console.log(`Found ${n24Animals.length} animal(s) in North 24 Parganas.`);

  if (n24Animals.length === 0) {
    console.error("No animals found in North 24 Parganas. Please ensure farms and animals exist.");
    return;
  }

  const farmer = await prisma.user.findFirst({
    where: { role: "FARMER", district: { name: "North 24 Parganas" } },
  });

  const farmerId = farmer?.id || n24Animals[0].herd.farm.farmerUserId || arnabVet?.id || "user_farmer_01";
  const vetId = arnabVet?.id;

  // Case 1: CRITICAL / PENDING_REVIEW (Foot and Mouth Disease)
  const a1 = n24Animals[0];
  await prisma.case.upsert({
    where: { caseNumber: "CASE-2026-N24-001" },
    update: {
      status: "PENDING_REVIEW",
      assignedVeterinarianUserId: vetId,
    },
    create: {
      caseNumber: "CASE-2026-N24-001",
      animalId: a1.id,
      createdByUserId: farmerId,
      assignedVeterinarianUserId: vetId,
      assignmentLevel: "VILLAGE",
      reportSource: "FARMER",
      status: "PENDING_REVIEW",
      symptoms: ["High Fever (41.2°C)", "Blisters on Tongue and Dental Pad", "Profuse Salivation", "Severe Lameness"],
      durationDays: 2,
      affectedCount: 3,
      mortalityCount: 0,
      photoUrl: "https://images.unsplash.com/photo-1546445317-29f4545f9d52?w=800",
      gpsLat: a1.herd.farm.latitude || 22.7196,
      gpsLng: a1.herd.farm.longitude || 88.4683,
      reportedAt: new Date(Date.now() - 3600 * 1000 * 1.5), // 1.5 hours ago
      analysisResult: {
        overall_risk_score: 95,
        overall_risk_level: "CRITICAL",
        disease_prediction: {
          suspected_condition: "Foot and Mouth Disease (Aphthovirus)",
          confidence: 0.94,
          animal_type: "Cow",
          vitals_evaluated: { body_temp: 41.2, heart_rate: 98 },
          symptoms_analyzed: "High Fever Blisters on Tongue Salivation Lameness",
        },
        iot_telemetry_analysis: {
          animal_id: a1.tag,
          temperature: 41.2,
          activity_index: 18,
          has_anomaly: true,
          anomalies: ["Severe Hyperthermia: 41.2°C", "Acute Lethargy / Immobility: Activity index 18"],
        },
        weather_analysis: {
          temperature: 30.5,
          humidity: 84.0,
          vector_breeding_risk: "HIGH",
          weather_advisory: "Monsoon humidity facilitates aerosol and contact transmission.",
          source: "Open-Meteo API",
        },
        outbreak_surge_analysis: {
          latest_cases: 12,
          historical_mean: 2.1,
          z_score: 18.4,
          is_outbreak_spike: true,
        },
        farmer_advisory: {
          language: "English",
          advisory: "🚨 URGENT: Isolate cow immediately in a dry, disinfected pen. Do not allow movement across herds. District vet notified.",
          provider_used: "Gemini 2.0 Flash",
        },
      },
      visionResult: {
        visual_anomaly_detected: true,
        primary_prediction: "Foot and Mouth Vesicles",
        confidence: 91.8,
        top_predictions: [
          { condition: "Foot and Mouth Disease", confidence: 91.8 },
          { condition: "Vesicular Stomatitis", confidence: 6.2 },
        ],
      },
    },
  });
  console.log("✅ Seeded Case #CASE-2026-N24-001 (CRITICAL / PENDING_REVIEW)");

  // Case 2: HIGH / UNDER_EXAMINATION (Lumpy Skin Disease)
  if (n24Animals.length > 1) {
    const a2 = n24Animals[1];
    await prisma.case.upsert({
      where: { caseNumber: "CASE-2026-N24-002" },
      update: {
        status: "UNDER_EXAMINATION",
        assignedVeterinarianUserId: vetId,
      },
      create: {
        caseNumber: "CASE-2026-N24-002",
        animalId: a2.id,
        createdByUserId: farmerId,
        assignedVeterinarianUserId: vetId,
        reviewedByUserId: vetId,
        assignmentLevel: "BLOCK",
        reportSource: "FIELD_AGENT",
        status: "UNDER_EXAMINATION",
        symptoms: ["Nodular Skin Eruptions (2-5cm)", "Swollen Prescapular Lymph Nodes", "High Pyrexia", "Ocular Discharge"],
        durationDays: 4,
        affectedCount: 2,
        mortalityCount: 0,
        photoUrl: "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800",
        gpsLat: a2.herd.farm.latitude || 22.721,
        gpsLng: a2.herd.farm.longitude || 88.47,
        reportedAt: new Date(Date.now() - 3600 * 1000 * 5),
        reviewedAt: new Date(Date.now() - 3600 * 1000 * 1),
        analysisResult: {
          overall_risk_score: 88,
          overall_risk_level: "HIGH",
          disease_prediction: {
            suspected_condition: "Lumpy Skin Disease (Capripoxvirus)",
            confidence: 0.89,
            animal_type: "Cow",
            vitals_evaluated: { body_temp: 40.4, heart_rate: 86 },
            symptoms_analyzed: "Nodular Skin Eruptions Lymphadenopathy Pyrexia",
          },
          iot_telemetry_analysis: {
            animal_id: a2.tag,
            temperature: 40.4,
            activity_index: 25,
            has_anomaly: true,
            anomalies: ["Hyperthermia: 40.4°C"],
          },
          outbreak_surge_analysis: {
            latest_cases: 8,
            historical_mean: 1.5,
            z_score: 9.2,
            is_outbreak_spike: true,
          },
        },
      },
    });
    console.log("✅ Seeded Case #CASE-2026-N24-002 (HIGH / UNDER_EXAMINATION)");
  }

  // Case 3: ELEVATED / LAB_REFERRAL with Sample record
  if (n24Animals.length > 2) {
    const a3 = n24Animals[2];
    const c3 = await prisma.case.upsert({
      where: { caseNumber: "CASE-2026-N24-003" },
      update: {
        status: "LAB_REFERRAL",
        assignedVeterinarianUserId: vetId,
      },
      create: {
        caseNumber: "CASE-2026-N24-003",
        animalId: a3.id,
        createdByUserId: farmerId,
        assignedVeterinarianUserId: vetId,
        reviewedByUserId: vetId,
        assignmentLevel: "DISTRICT",
        reportSource: "FARMER",
        status: "LAB_REFERRAL",
        symptoms: ["Chronic Productive Cough", "Progressive Emaciation", "Submandibular Edema", "Intermittent Fever"],
        durationDays: 14,
        affectedCount: 1,
        mortalityCount: 0,
        gpsLat: a3.herd.farm.latitude || 22.725,
        gpsLng: a3.herd.farm.longitude || 88.465,
        reportedAt: new Date(Date.now() - 86400 * 1000 * 1.5),
        reviewedAt: new Date(Date.now() - 3600 * 1000 * 18),
        analysisResult: {
          overall_risk_score: 75,
          overall_risk_level: "ELEVATED",
          disease_prediction: {
            suspected_condition: "Bovine Tuberculosis / Hemorrhagic Septicemia",
            confidence: 0.78,
            animal_type: "Cow",
            vitals_evaluated: { body_temp: 39.8, heart_rate: 78 },
          },
        },
      },
    });

    await prisma.sample.upsert({
      where: { id: `sample_n24_003` },
      update: { status: "SENT" },
      create: {
        id: `sample_n24_003`,
        caseId: c3.id,
        collectedByUserId: vetId || "user_vet_01",
        collectedAt: new Date(Date.now() - 3600 * 1000 * 16),
        labName: "Institute of Animal Health and Veterinary Biologicals (IAH&VB), Kolkata",
        sentAt: new Date(Date.now() - 3600 * 1000 * 12),
        status: "SENT",
      },
    });
    console.log("✅ Seeded Case #CASE-2026-N24-003 (ELEVATED / LAB_REFERRAL with Sample)");
  }

  // Case 4: CONFIRMED with Follow-up due
  if (n24Animals.length > 3) {
    const a4 = n24Animals[3];
    const c4 = await prisma.case.upsert({
      where: { caseNumber: "CASE-2026-N24-004" },
      update: {
        status: "CONFIRMED",
        assignedVeterinarianUserId: vetId,
        vetFollowUpDate: new Date(Date.now() + 86400 * 1000 * 1),
      },
      create: {
        caseNumber: "CASE-2026-N24-004",
        animalId: a4.id,
        createdByUserId: farmerId,
        assignedVeterinarianUserId: vetId,
        reviewedByUserId: vetId,
        assignmentLevel: "VILLAGE",
        reportSource: "FIELD_AGENT",
        status: "CONFIRMED",
        symptoms: ["Severe Mucoid Diarrhea", "Dehydration (Skin tent > 3s)", "Tenesmus", "Anorexia"],
        durationDays: 3,
        affectedCount: 2,
        mortalityCount: 0,
        gpsLat: a4.herd.farm.latitude || 22.718,
        gpsLng: a4.herd.farm.longitude || 88.472,
        vetDiagnosis: "Acute Bovine Coccidiosis with Secondary Enterotoxemia",
        vetRecommendedAction: "TREAT",
        vetFollowUpDate: new Date(Date.now() + 86400 * 1000 * 1), // Tomorrow
        vetNotes: "Administered Sulfadimethoxine bolus and IV fluid resuscitation. Prescribed oral electrolytes and clean dry bedding.",
        reportedAt: new Date(Date.now() - 86400 * 1000 * 2),
        reviewedAt: new Date(Date.now() - 86400 * 1000 * 1.5),
        confirmedAt: new Date(Date.now() - 86400 * 1000 * 1.2),
        analysisResult: {
          overall_risk_score: 82,
          overall_risk_level: "HIGH",
          disease_prediction: {
            suspected_condition: "Bovine Coccidiosis",
            confidence: 0.91,
            animal_type: "Cow",
          },
        },
      },
    });

    await prisma.treatmentRecord.upsert({
      where: { id: `treat_n24_004` },
      update: {},
      create: {
        id: `treat_n24_004`,
        animalId: a4.id,
        caseId: c4.id,
        medication: "Sulfadimethoxine 2g + Ringer's Lactate 3L + Meloxicam 0.5mg/kg",
        dateGiven: new Date(Date.now() - 86400 * 1000 * 1.2),
        notes: "Intravenous fluid rehydration and anticoccidial antimicrobial therapy administered.",
        administeredByUserId: vetId || "user_vet_01",
      },
    });
    console.log("✅ Seeded Case #CASE-2026-N24-004 (CONFIRMED / Follow-up Due Tomorrow with Treatment)");
  }

  // Case 5: MEDIUM / In Service Area (Unassigned)
  if (n24Animals.length > 4) {
    const a5 = n24Animals[4];
    await prisma.case.upsert({
      where: { caseNumber: "CASE-2026-N24-005" },
      update: {
        status: "PENDING_REVIEW",
        assignedVeterinarianUserId: null,
      },
      create: {
        caseNumber: "CASE-2026-N24-005",
        animalId: a5.id,
        createdByUserId: farmerId,
        assignedVeterinarianUserId: null,
        reportSource: "FARMER",
        status: "PENDING_REVIEW",
        symptoms: ["Left Carpal Joint Swelling", "Grade 2 Lameness", "Mild Inappetence"],
        durationDays: 1,
        affectedCount: 1,
        mortalityCount: 0,
        gpsLat: a5.herd.farm.latitude || 22.723,
        gpsLng: a5.herd.farm.longitude || 88.467,
        reportedAt: new Date(Date.now() - 3600 * 1000 * 3),
        analysisResult: {
          overall_risk_score: 52,
          overall_risk_level: "MEDIUM",
          disease_prediction: {
            suspected_condition: "Acute Traumatic Synovitis / Septic Arthritis",
            confidence: 0.74,
            animal_type: "Cow",
            vitals_evaluated: { body_temp: 39.2, heart_rate: 68 },
          },
        },
      },
    });
    console.log("✅ Seeded Case #CASE-2026-N24-005 (MEDIUM / Service Area Unassigned)");
  }

  // Also seed a vaccination record
  if (n24Animals.length > 0) {
    await prisma.vaccinationRecord.upsert({
      where: { id: "vac_n24_001" },
      update: {},
      create: {
        id: "vac_n24_001",
        animalId: n24Animals[0].id,
        vaccineName: "Foot and Mouth Disease (FMD) Oil Adjuvant Vaccine",
        dateGiven: new Date("2026-02-10"),
        nextDueDate: new Date("2026-08-10"),
        administeredByUserId: vetId || "user_vet_01",
      },
    });
  }

  console.log("\n🎉 Veterinary Triage Queue dataset populated successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
