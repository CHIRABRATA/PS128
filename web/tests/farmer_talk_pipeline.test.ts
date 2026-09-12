import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateFarmerTalkResponse,
  buildUserPrompt,
  AnimalContextPacket,
} from "@/lib/ai/farmer-talk";
import { assertFarmerOwnsAnimal, AuthorizationError } from "@/lib/auth/permissions";
import { FullAppUser } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";

describe("Maitri Farmer Talk AI Pipeline & Question Answering Suite", () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  const sampleAnimalContext: AnimalContextPacket = {
    animalIdentity: {
      tag: "COW-101",
      species: "COW",
      breed: "Gir",
      ageMonths: 36,
    },
    location: {
      farmName: "Green Meadow Farm",
      villageName: "Panchgaon",
      blockName: "Haveli",
      districtName: "Pune",
    },
    recentCases: [
      {
        caseNumber: "CASE-2026-001",
        status: "UNDER_EXAMINATION",
        reportedAt: "2026-09-10T08:30:00.000Z",
        symptoms: ["fever", "loss of appetite"],
        durationDays: 2,
        affectedCount: 1,
        mortalityCount: 0,
        overallRiskLevel: "MEDIUM",
        suspectedCondition: "Bovine Viral Diarrhea",
        vetDiagnosis: "Suspected mild gastrointestinal infection",
        vetAction: "MONITOR",
        sanitizedVetNotes: "Keep animal isolated in dry pen and monitor rectal temperature twice daily.",
      },
    ],
    vaccinations: [
      {
        vaccineName: "Foot and Mouth Disease (FMD) Vaccine",
        dateGiven: "2026-03-12",
        nextDueDate: "2026-09-12",
      },
      {
        vaccineName: "Hemorrhagic Septicemia (HS) Vaccine",
        dateGiven: "2026-01-20",
        nextDueDate: null,
      },
    ],
    treatments: [
      {
        medication: "Meloxicam Bolus 100mg",
        dateGiven: "2026-09-10",
        notes: "Administered with feed",
      },
    ],
    veterinaryReports: [
      {
        id: "vr-001",
        diagnosis: "Mild Enteritis",
        action: "MONITOR",
        createdAt: "2026-09-10",
        followUpDate: "2026-09-15",
        instructions: "Offer fresh clean water and green fodder.",
        prescription: "Electrolyte supportive sachet",
        notes: "Animal is alert and responsive.",
      },
    ],
    iotTelemetry: {
      hasDevice: true,
      deviceIdentifier: "ESP32-COW-101",
      deviceStatus: "ONLINE",
      source: "REAL",
      lastSeenAt: "2026-09-12T10:00:00.000Z",
      latestReading: {
        temperature: 38.6,
        activityIndex: 85,
        hasAnomaly: false,
        anomalies: [],
        source: "REAL",
        recordedAt: "2026-09-12T10:00:00.000Z",
      },
    },
    samples: [
      {
        status: "RESULT_PENDING",
        collectedAt: "2026-09-11",
        resultSummary: null,
      },
    ],
  };

  const emptyRecordsAnimalContext: AnimalContextPacket = {
    animalIdentity: {
      tag: "BUFFALO-202",
      species: "BUFFALO",
      breed: "Murrah",
      ageMonths: 48,
    },
    location: {
      farmName: "Sunrise Dairy",
      villageName: "Shirur",
      blockName: "Shirur",
      districtName: "Pune",
    },
    recentCases: [],
    vaccinations: [],
    treatments: [],
    veterinaryReports: [],
    iotTelemetry: null,
    samples: [],
  };

  beforeEach(() => {
    process.env.GEMINI_API_KEY_1 = "test-gemini-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Prompt Distinctness: Different questions produce DIFFERENT prompts
  // ---------------------------------------------------------------------------
  it("15. verifies different current questions produce different prompts on the SAME animal", () => {
    const questionA = "What vaccinations are recorded?";
    const questionB = "What does the sensor say?";

    const promptA = buildUserPrompt(sampleAnimalContext, [], questionA, "en");
    const promptB = buildUserPrompt(sampleAnimalContext, [], questionB, "en");

    expect(promptA).not.toBe(promptB);
    expect(promptA).toContain(`CURRENT FARMER QUESTION:\n"${questionA}"`);
    expect(promptB).toContain(`CURRENT FARMER QUESTION:\n"${questionB}"`);
  });

  // ---------------------------------------------------------------------------
  // 2. Question 1: Vaccination question
  // ---------------------------------------------------------------------------
  it("1. handles vaccination questions and passes the exact question to the LLM", async () => {
    let capturedPrompt = "";
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string);
      capturedPrompt = body.contents[0].parts[0].text;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      answer:
                        "The recorded vaccinations for this animal are FMD Vaccine on 12 March 2026 and HS Vaccine on 20 January 2026.",
                      needs_veterinarian: false,
                      risk_notice: null,
                      suggested_next_step: "Ensure booster shots on schedule",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await generateFarmerTalkResponse(
      sampleAnimalContext,
      [],
      "What vaccinations are recorded?",
      "en"
    );

    expect(capturedPrompt).toContain('CURRENT FARMER QUESTION:\n"What vaccinations are recorded?"');
    expect(capturedPrompt).toContain("Foot and Mouth Disease (FMD) Vaccine");
    expect(res.answer).toContain("FMD Vaccine on 12 March 2026");
    expect(res.needs_veterinarian).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 3. Question 2: Latest health report question
  // ---------------------------------------------------------------------------
  it("2. handles latest health report questions with real case data", async () => {
    let capturedPrompt = "";
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string);
      capturedPrompt = body.contents[0].parts[0].text;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      answer:
                        "The last health report on 10 September 2026 noted fever and loss of appetite for 2 days under case #CASE-2026-001.",
                      needs_veterinarian: false,
                      risk_notice: null,
                      suggested_next_step: "Monitor daily temperature",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await generateFarmerTalkResponse(
      sampleAnimalContext,
      [],
      "What was recorded in the last report?",
      "en"
    );

    expect(capturedPrompt).toContain('CURRENT FARMER QUESTION:\n"What was recorded in the last report?"');
    expect(capturedPrompt).toContain("CASE-2026-001");
    expect(res.answer).toContain("CASE-2026-001");
  });

  // ---------------------------------------------------------------------------
  // 4. Question 3: Risk assessment question
  // ---------------------------------------------------------------------------
  it("3. handles risk level questions accurately using recorded risk data", async () => {
    let capturedPrompt = "";
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string);
      capturedPrompt = body.contents[0].parts[0].text;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      answer:
                        "Your animal is currently recorded at MEDIUM risk due to recent symptoms of fever and loss of appetite.",
                      needs_veterinarian: false,
                      risk_notice: null,
                      suggested_next_step: "Follow vet monitoring guidelines",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await generateFarmerTalkResponse(
      sampleAnimalContext,
      [],
      "Why is my animal at risk?",
      "en"
    );

    expect(capturedPrompt).toContain('CURRENT FARMER QUESTION:\n"Why is my animal at risk?"');
    expect(capturedPrompt).toContain("Risk Level: MEDIUM");
    expect(res.answer).toContain("MEDIUM risk");
  });

  // ---------------------------------------------------------------------------
  // 5. Question 4: Treatment question
  // ---------------------------------------------------------------------------
  it("4. handles treatment questions using TreatmentRecord data", async () => {
    let capturedPrompt = "";
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string);
      capturedPrompt = body.contents[0].parts[0].text;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      answer:
                        "The recorded treatment is Meloxicam Bolus 100mg given on 2026-09-10 with feed.",
                      needs_veterinarian: false,
                      risk_notice: null,
                      suggested_next_step: "Complete prescribed care",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await generateFarmerTalkResponse(
      sampleAnimalContext,
      [],
      "What treatment was given?",
      "en"
    );

    expect(capturedPrompt).toContain('CURRENT FARMER QUESTION:\n"What treatment was given?"');
    expect(capturedPrompt).toContain("Meloxicam Bolus 100mg");
    expect(res.answer).toContain("Meloxicam Bolus 100mg");
  });

  // ---------------------------------------------------------------------------
  // 6. Question 5: IoT sensor question
  // ---------------------------------------------------------------------------
  it("5. handles IoT sensor telemetry questions using real IoT readings", async () => {
    let capturedPrompt = "";
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string);
      capturedPrompt = body.contents[0].parts[0].text;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      answer:
                        "The real ESP32 sensor shows a body temperature of 38.6 °C and normal activity (index 85) with no anomalies.",
                      needs_veterinarian: false,
                      risk_notice: null,
                      suggested_next_step: "Continue routine monitoring",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await generateFarmerTalkResponse(
      sampleAnimalContext,
      [],
      "What does the sensor say?",
      "en"
    );

    expect(capturedPrompt).toContain('CURRENT FARMER QUESTION:\n"What does the sensor say?"');
    expect(capturedPrompt).toContain("Temperature: 38.6 °C");
    expect(capturedPrompt).toContain("Activity Index: 85");
    expect(capturedPrompt).toContain("Telemetry Source: REAL");
    expect(res.answer).toContain("38.6 °C");
  });

  // ---------------------------------------------------------------------------
  // 7. Question 6: Veterinary report question
  // ---------------------------------------------------------------------------
  it("6. handles veterinary report questions using authorized VeterinaryReport data", async () => {
    let capturedPrompt = "";
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string);
      capturedPrompt = body.contents[0].parts[0].text;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      answer:
                        "The veterinarian diagnosed Mild Enteritis on 2026-09-10 and instructed to offer fresh clean water and green fodder.",
                      needs_veterinarian: false,
                      risk_notice: null,
                      suggested_next_step: "Follow veterinary instructions",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await generateFarmerTalkResponse(
      sampleAnimalContext,
      [],
      "What did the veterinarian say?",
      "en"
    );

    expect(capturedPrompt).toContain('CURRENT FARMER QUESTION:\n"What did the veterinarian say?"');
    expect(capturedPrompt).toContain("Diagnosis: Mild Enteritis");
    expect(capturedPrompt).toContain("Instructions: Offer fresh clean water and green fodder.");
    expect(res.answer).toContain("Mild Enteritis");
  });

  // ---------------------------------------------------------------------------
  // 8. Empty category: No vaccination records
  // ---------------------------------------------------------------------------
  it("7. explicitly formats empty vaccinations as vaccinations: []", () => {
    const prompt = buildUserPrompt(emptyRecordsAnimalContext, [], "What vaccinations are recorded?", "en");
    expect(prompt).toContain("vaccinations: [] (No vaccination records available in Maitri)");
  });

  // ---------------------------------------------------------------------------
  // 9. Empty category: No treatment records
  // ---------------------------------------------------------------------------
  it("8. explicitly formats empty treatments as treatments: []", () => {
    const prompt = buildUserPrompt(emptyRecordsAnimalContext, [], "What treatment was given?", "en");
    expect(prompt).toContain("treatments: [] (No treatment records available in Maitri)");
  });

  // ---------------------------------------------------------------------------
  // 10. Empty category: No IoT records
  // ---------------------------------------------------------------------------
  it("9. explicitly formats empty IoT telemetry as iot_readings: []", () => {
    const prompt = buildUserPrompt(emptyRecordsAnimalContext, [], "What does the sensor say?", "en");
    expect(prompt).toContain("iot_readings: [] (No IoT sensor telemetry recorded in Maitri for this animal)");
  });

  // ---------------------------------------------------------------------------
  // 11. Empty category: No veterinary report
  // ---------------------------------------------------------------------------
  it("10. explicitly formats empty veterinary reports as veterinary_reports: []", () => {
    const prompt = buildUserPrompt(emptyRecordsAnimalContext, [], "What did the vet say?", "en");
    expect(prompt).toContain("veterinary_reports: [] (No veterinary reports recorded in Maitri)");
  });

  // ---------------------------------------------------------------------------
  // 12. Fallback on Gemini Failure: Does NOT masquerade as an AI response
  // ---------------------------------------------------------------------------
  it("11. returns an honest fallback notice when LLM fails without pretending to be a successful AI response", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network connection timeout"));

    const res = await generateFarmerTalkResponse(
      sampleAnimalContext,
      [],
      "What vaccinations are recorded?",
      "en"
    );

    expect(res.answer).toContain("I am currently unable to generate an AI response right now");
    expect(res.answer).toContain("Animal COW-101");
    expect(res.answer).toContain("2 vaccination record(s)");
  });

  // ---------------------------------------------------------------------------
  // 13. Gemini Timeout Handling
  // ---------------------------------------------------------------------------
  it("12. handles Gemini timeout gracefully and returns the localized fallback", async () => {
    global.fetch = vi.fn().mockImplementation(async () => {
      throw new DOMException("The operation was aborted", "TimeoutError");
    });

    const res = await generateFarmerTalkResponse(
      sampleAnimalContext,
      [],
      "What is the risk level?",
      "hi"
    );

    expect(res.answer).toContain("मैं इस समय एआई प्रतिक्रिया उत्पन्न करने में असमर्थ हूँ");
    expect(res.answer).toContain("पशु COW-101");
  });

  // ---------------------------------------------------------------------------
  // 14. Quick questions send their exact text
  // ---------------------------------------------------------------------------
  it("16. ensures quick question prompts contain the exact question string", () => {
    const quickQuestion = "Should I contact a veterinarian?";
    const prompt = buildUserPrompt(sampleAnimalContext, [], quickQuestion, "en");

    expect(prompt).toContain(`CURRENT FARMER QUESTION:\n"${quickQuestion}"`);
  });

  // ---------------------------------------------------------------------------
  // 15. Conversation history does not override current question
  // ---------------------------------------------------------------------------
  it("17. verifies previous conversation history does not override the current question", () => {
    const conversationHistory = [
      { role: "user" as const, content: "My cow seems less active." },
      { role: "assistant" as const, content: "The recorded activity is normal." },
    ];
    const currentQuestion = "What vaccinations are recorded?";

    const prompt = buildUserPrompt(sampleAnimalContext, conversationHistory, currentQuestion, "en");

    expect(prompt).toContain("RECENT CONVERSATION (PREVIOUS MESSAGES FOR CONTEXT ONLY):");
    expect(prompt).toContain("Farmer: My cow seems less active.");
    expect(prompt).toContain(`CURRENT FARMER QUESTION:\n"${currentQuestion}"`);
  });

  // ---------------------------------------------------------------------------
  // 16. Multi-language Support (en, hi, mr, bn)
  // ---------------------------------------------------------------------------
  it("13. formats prompt correctly for all supported languages: en, hi, mr, bn", () => {
    const languages = [
      { code: "en", name: "English" },
      { code: "hi", name: "Hindi (हिंदी)" },
      { code: "mr", name: "Marathi (मराठी)" },
      { code: "bn", name: "Bengali (বাংলা)" },
    ];

    for (const lang of languages) {
      const prompt = buildUserPrompt(sampleAnimalContext, [], "How is my cow?", lang.code);
      expect(prompt).toContain(`REQUESTED RESPONSE LANGUAGE: ${lang.name}`);
    }
  });

  // ---------------------------------------------------------------------------
  // 17. Unrelated question handling (e.g. "what is a cow?")
  // ---------------------------------------------------------------------------
  it("18. handles general or unrelated questions directly rather than returning a health summary", async () => {
    let capturedPrompt = "";
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string);
      capturedPrompt = body.contents[0].parts[0].text;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      answer:
                        "A cow is a domesticated bovine, commonly raised as livestock for dairy, meat, and agricultural purposes.",
                      needs_veterinarian: false,
                      risk_notice: null,
                      suggested_next_step: "Ask any specific question about animal health",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await generateFarmerTalkResponse(
      sampleAnimalContext,
      [],
      "What is a cow?",
      "en"
    );

    expect(capturedPrompt).toContain('CURRENT FARMER QUESTION:\n"What is a cow?"');
    expect(res.answer).toContain("A cow is a domesticated bovine");
  });

  // ---------------------------------------------------------------------------
  // 18. Farmer Authorization & Animal Access Control
  // ---------------------------------------------------------------------------
  it("13 & 14. strictly enforces that a farmer cannot access another farmer's animal", async () => {
    // Mock requireFarmer returning farmer 1
    const mockFarmerUser: FullAppUser = {
      id: "farmer_user_01",
      clerkId: "clerk_01",
      role: "FARMER",
      status: "ACTIVE",
      name: "Farmer One",
      phone: "+919000000001",
      preferredLanguage: "en",
      districtId: null,
      blockId: null,
      villageId: null,
      district: null,
      block: null,
      village: null,
      telegramChatId: null,
      telegramLinkToken: null,
      telegramLinkTokenCreatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const sessionModule = await import("@/lib/auth/session");
    vi.spyOn(sessionModule, "requireActiveUser").mockResolvedValue(mockFarmerUser);

    // Mock animal belonging to farmer 2
    vi.spyOn(prisma.animal, "findUnique").mockResolvedValue({
      id: "animal_other_farmer",
      herdId: "herd_02",
      tag: "COW-999",
      species: "COW",
      iotDeviceId: null,
      breed: null,
      ageMonths: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      herd: {
        id: "herd_02",
        farmId: "farm_02",
        species: "COW",
        name: "Default Herd",
        createdAt: new Date(),
        updatedAt: new Date(),
        farm: {
          id: "farm_02",
          villageId: "v1",
          farmerUserId: "farmer_user_02", // Different farmer!
          fieldAgentUserId: null,
          name: "Other Farm",
          latitude: 0,
          longitude: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    } as unknown as Awaited<ReturnType<typeof prisma.animal.findUnique>>);

    await expect(assertFarmerOwnsAnimal("animal_other_farmer")).rejects.toThrow(
      AuthorizationError
    );
  });
});
