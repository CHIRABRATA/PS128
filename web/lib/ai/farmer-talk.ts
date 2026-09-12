import { z } from "zod";

/**
 * PHASE 10: MAITRI FARMER TALK AI SERVICE
 *
 * Dynamic Question-Answering AI Architecture with Structured Real-Data Context & Layered Safety Guardrails:
 * Layer 1: System Prompt Clinical Guardrails & Question Scoping
 * Layer 2: Structured Output Schema (Zod)
 * Layer 3: Application Semantic Safety Checks (Distinguishes historical vet summary vs new prescription instructions)
 * Layer 4: Multi-language (English/Hindi/Bengali/Marathi) Heuristic Regex Scan
 * Layer 5: Safe Fallback Override (Honest System Notice on LLM Failure)
 */

export const FarmerTalkResponseSchema = z.object({
  answer: z.string(),
  needs_veterinarian: z.boolean().default(false),
  risk_notice: z.string().nullable().optional(),
  suggested_next_step: z.string().optional(),
});

export type FarmerTalkResponse = z.infer<typeof FarmerTalkResponseSchema>;

export interface AnimalContextPacket {
  animalIdentity: {
    tag: string;
    species: string;
    breed: string | null;
    ageMonths: number | null;
  };
  location: {
    farmName: string;
    villageName: string;
    blockName: string;
    districtName: string;
  };
  recentCases: Array<{
    caseNumber: string;
    status: string;
    reportedAt: string;
    symptoms: string[];
    durationDays: number;
    affectedCount: number;
    mortalityCount: number;
    overallRiskLevel: string | null;
    suspectedCondition: string | null;
    vetDiagnosis: string | null;
    vetAction: string | null;
    sanitizedVetNotes: string | null;
  }>;
  vaccinations: Array<{
    vaccineName: string;
    dateGiven: string;
    nextDueDate: string | null;
  }>;
  treatments: Array<{
    medication: string;
    dateGiven: string;
    notes: string | null;
  }>;
  veterinaryReports?: Array<{
    id: string;
    diagnosis: string;
    action: string;
    createdAt: string;
    followUpDate: string | null;
    instructions: string | null;
    prescription: string | null;
    notes: string | null;
  }>;
  iotTelemetry?: {
    hasDevice: boolean;
    deviceIdentifier: string | null;
    deviceStatus: string | null;
    source: string | null;
    lastSeenAt: string | null;
    latestReading: {
      temperature: number | null;
      activityIndex: number | null;
      hasAnomaly: boolean;
      anomalies: string[];
      source: string;
      recordedAt: string;
    } | null;
  } | null;
  samples: Array<{
    status: string;
    collectedAt: string;
    resultSummary: string | null;
  }>;
}

export const SYSTEM_PROMPT = `
You are Maitri Farmer Talk, an informational livestock health and veterinary assistance AI system for farmers.
Your role is to answer the farmer's CURRENT QUESTION using ONLY the supplied Maitri animal data.

You are an AI assistance system, not a veterinarian.
You may explain recorded information, clarify veterinary terms, and provide general livestock care and educational guidance.

CRITICAL CLINICAL SAFETY & BOUNDARY RULES:
1. Answer the CURRENT FARMER QUESTION directly and specifically.
2. Use ONLY the supplied animal context data. Do NOT invent missing records, dates, medications, vaccinations, or sensor readings.
3. If requested information is not recorded in Maitri (e.g. no vaccinations, no treatments, no IoT readings, no vet reports), clearly state that it is not recorded in Maitri (e.g. "I don't see any vaccination records for this animal in Maitri").
4. Do NOT provide a generic health summary unless the farmer explicitly asks for a general summary or health overview.
5. You MUST NOT:
   - Diagnose disease or state definitive diagnoses (unless directly quoting a veterinarian's recorded diagnosis).
   - Prescribe medications, change medications, stop medications, or start new medications.
   - Recommend specific drug dosages (e.g. mg, ml, pills).
   - Claim antimicrobial resistance (AMR).
6. If the farmer asks about medical treatments, medications, or urgent health concerns beyond what is recorded, provide safe general educational care guidance and instruct them to contact their local veterinarian or field agent.
7. If the recorded risk level is HIGH or CRITICAL, or if severe acute symptoms/anomalies are active, remind the farmer to seek veterinary assistance.
8. Respond in JSON format with fields:
   {
     "answer": "Clear, direct, conversational answer addressing the CURRENT FARMER QUESTION",
     "needs_veterinarian": boolean,
     "risk_notice": string | null,
     "suggested_next_step": "Actionable next step phrase"
   }
9. Respond in the requested language (English, Hindi, Bengali, or Marathi).
`;

export function buildUserPrompt(
  animalContext: AnimalContextPacket,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  preferredLanguage: string
): string {
  const languageMap: Record<string, string> = {
    en: "English",
    hi: "Hindi (हिंदी)",
    bn: "Bengali (বাংলা)",
    mr: "Marathi (मराठी)",
  };
  const languageName = languageMap[preferredLanguage] || preferredLanguage;

  const historyText = conversationHistory
    .slice(-4)
    .map((msg) => `${msg.role === "user" ? "Farmer" : "Assistant"}: ${msg.content}`)
    .join("\n");

  const vaxList = animalContext.vaccinations.length > 0
    ? animalContext.vaccinations
        .map((v) => `- ${v.vaccineName} (Date Given: ${v.dateGiven}${v.nextDueDate ? `, Next Due: ${v.nextDueDate}` : ""})`)
        .join("\n")
    : "vaccinations: [] (No vaccination records available in Maitri)";

  const treatList = animalContext.treatments.length > 0
    ? animalContext.treatments
        .map((t) => `- ${t.medication} (Date: ${t.dateGiven}${t.notes ? `, Notes: ${t.notes}` : ""})`)
        .join("\n")
    : "treatments: [] (No treatment records available in Maitri)";

  const vetList = (animalContext.veterinaryReports && animalContext.veterinaryReports.length > 0)
    ? animalContext.veterinaryReports
        .map((vr) => `- Report (${vr.createdAt}): Diagnosis: ${vr.diagnosis}, Action: ${vr.action}${vr.followUpDate ? `, Follow-up: ${vr.followUpDate}` : ""}${vr.instructions ? `, Instructions: ${vr.instructions}` : ""}${vr.prescription ? `, Prescription: ${vr.prescription}` : ""}${vr.notes ? `, Notes: ${vr.notes}` : ""}`)
        .join("\n")
    : "veterinary_reports: [] (No veterinary reports recorded in Maitri)";

  const iotInfo = animalContext.iotTelemetry?.latestReading
    ? `- Device: ${animalContext.iotTelemetry.deviceIdentifier || "IoT Sensor"} (Status: ${animalContext.iotTelemetry.deviceStatus || "ONLINE"}, Source: ${animalContext.iotTelemetry.source || "UNKNOWN"})
- Temperature: ${animalContext.iotTelemetry.latestReading.temperature !== null ? `${animalContext.iotTelemetry.latestReading.temperature} °C` : "Not recorded"}
- Activity Index: ${animalContext.iotTelemetry.latestReading.activityIndex !== null ? animalContext.iotTelemetry.latestReading.activityIndex : "Not recorded"}
- Anomaly Status: ${animalContext.iotTelemetry.latestReading.hasAnomaly ? `ANOMALY DETECTED: ${animalContext.iotTelemetry.latestReading.anomalies.join(", ") || "Active Alert"}` : "Normal (No anomalies detected)"}
- Telemetry Source: ${animalContext.iotTelemetry.latestReading.source}
- Last Reading Time: ${animalContext.iotTelemetry.latestReading.recordedAt}`
    : "iot_readings: [] (No IoT sensor telemetry recorded in Maitri for this animal)";

  const casesList = animalContext.recentCases.length > 0
    ? animalContext.recentCases
        .map((c) => `- Case ${c.caseNumber} (${c.status}, Reported: ${c.reportedAt}):
  Symptoms: ${c.symptoms.join(", ") || "None"} (Duration: ${c.durationDays} days, Affected: ${c.affectedCount})
  Suspected Condition: ${c.suspectedCondition || "None recorded"}
  Risk Level: ${c.overallRiskLevel || "None recorded"}${c.vetDiagnosis ? `\n  Vet Diagnosis: ${c.vetDiagnosis}` : ""}${c.vetAction ? `\n  Vet Action: ${c.vetAction}` : ""}${c.sanitizedVetNotes ? `\n  Vet Notes: ${c.sanitizedVetNotes}` : ""}`)
        .join("\n")
    : "cases: [] (No recent cases or health reports recorded in Maitri)";

  const samplesList = animalContext.samples.length > 0
    ? animalContext.samples
        .map((s) => `- Sample (${s.status}, Collected: ${s.collectedAt})${s.resultSummary ? `: ${s.resultSummary}` : ""}`)
        .join("\n")
    : "samples: [] (No lab sample records)";

  return `
REQUESTED RESPONSE LANGUAGE: ${languageName}

ANIMAL CONTEXT:
1. Animal Profile:
- Tag: ${animalContext.animalIdentity.tag}
- Species: ${animalContext.animalIdentity.species}
- Breed: ${animalContext.animalIdentity.breed || "Not specified"}
- Age: ${animalContext.animalIdentity.ageMonths ? `${animalContext.animalIdentity.ageMonths} months` : "Not specified"}
- Location: ${animalContext.location.farmName}, Village: ${animalContext.location.villageName}, Block: ${animalContext.location.blockName}, District: ${animalContext.location.districtName}

2. VACCINATIONS:
${vaxList}

3. TREATMENTS:
${treatList}

4. VETERINARY REPORTS:
${vetList}

5. IOT SENSOR & TELEMETRY:
${iotInfo}

6. HEALTH REPORTS & CASES:
${casesList}

7. LAB SAMPLES:
${samplesList}

RECENT CONVERSATION (PREVIOUS MESSAGES FOR CONTEXT ONLY):
${historyText || "No previous messages."}

CURRENT FARMER QUESTION:
"${userMessage}"

INSTRUCTIONS FOR GENERATING RESPONSE:
- Address the CURRENT FARMER QUESTION directly in ${languageName}.
- If the question is about vaccinations, focus on section 2 (VACCINATIONS).
- If the question is about treatments or medicines given, focus on section 3 (TREATMENTS).
- If the question is about what the vet said, focus on section 4 (VETERINARY REPORTS) and cases vet notes.
- If the question is about sensor / IoT readings or temperature / activity, focus on section 5 (IOT SENSOR & TELEMETRY).
- If the question is about why the animal is at risk or latest health report, focus on section 6 (HEALTH REPORTS & CASES).
- If the question is a general or educational question (e.g. "what is a cow?"), answer the question directly.
- If the relevant data category is empty, state clearly in ${languageName} that no records are found in Maitri for that category. Do NOT replace it with a general health summary.
- Output ONLY valid JSON matching the schema.
`;
}

export function buildSafeHistoryFallback(
  animalContext: AnimalContextPacket,
  preferredLanguage: string,
  hasHighRisk: boolean
): FarmerTalkResponse {
  const vaxCount = animalContext.vaccinations.length;
  const treatCount = animalContext.treatments.length;
  const caseCount = animalContext.recentCases.length;
  const tag = animalContext.animalIdentity.tag;

  const fallbackMessages: Record<string, string> = {
    en: `I am currently unable to generate an AI response right now. Here is the information recorded for Animal ${tag}: ${caseCount} recent health record(s), ${vaxCount} vaccination record(s), and ${treatCount} treatment record(s). For clinical advice, please consult your local veterinarian or field agent.`,
    hi: `मैं इस समय एआई प्रतिक्रिया उत्पन्न करने में असमर्थ हूँ। पशु ${tag} के लिए मैत्री में उपलब्ध रिकॉर्ड: ${caseCount} स्वास्थ्य रिकॉर्ड, ${vaxCount} टीकाकरण, और ${treatCount} उपचार। चिकित्सीय सलाह के लिए कृपया स्थानीय पशु चिकित्सक से संपर्क करें।`,
    bn: `আমি এই মুহূর্তে এআই প্রতিক্রিয়া তৈরি করতে পারছি না। পশু ${tag}-এর জন্য উপলব্ধ রেকর্ড: ${caseCount}টি স্বাস্থ্য রেকর্ড, ${vaxCount}টি টিকাদান, এবং ${treatCount}টি চিকিৎসা। চিকিৎসার পরামর্শের জন্য স্থানীয় পশুচিকিৎসকের সাথে যোগাযোগ করুন।`,
    mr: `मी सध्या एआय प्रतिसाद तयार करू शकत नाही. जनावर ${tag} साठी मैत्रीत उपलब्ध माहिती: ${caseCount} आरोग्य नोंदी, ${vaxCount} लसीकरण, आणि ${treatCount} उपचार. वैद्यकीय सल्ल्यासाठी कृपया स्थानिक पशुवैद्यकाशी संपर्क साधा.`,
  };

  const answer = fallbackMessages[preferredLanguage] || fallbackMessages.en;

  return {
    answer,
    needs_veterinarian: hasHighRisk,
    risk_notice: hasHighRisk
      ? {
          en: `Escalation Notice: A HIGH or CRITICAL risk is recorded for animal #${tag}. Please contact a veterinarian immediately.`,
          hi: `चेतावनी सूचना: पशु #${tag} के लिए उच्च/गंभीर जोखिम दर्ज है। कृपया तुरंत पशु चिकित्सक से संपर्क करें।`,
          bn: `সতর্কতা বিজ্ঞপ্তি: পশু #${tag}-এর জন্য উচ্চ/গুরুতর ঝুঁকি নথিভুক্ত হয়েছে। অবিলম্বে পশুচিকিৎসকের সাথে যোগাযোগ করুন।`,
          mr: `सूचना: जनावर #${tag} साठी उच्च किंवा गंभीर धोका नोंदवला आहे. कृपया त्वरित पशुवैद्यकाशी संपर्क साधा.`,
        }[preferredLanguage] || `Escalation Notice: High risk recorded for animal #${tag}.`
      : null,
    suggested_next_step: {
      bn: "পশুচিকিৎসকের সঙ্গে যোগাযোগ করুন",
      hi: "पशु चिकित्सक से संपर्क करें",
      mr: "पशुवैद्यकाशी संपर्क साधा",
      en: "Contact Veterinarian",
    }[preferredLanguage] || "Contact Veterinarian",
  };
}

/**
 * LLM Call: Gemini REST API for a specific API Key
 */
async function callGeminiWithKey(prompt: string, apiKey: string): Promise<string> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`TRANSIENT_ERROR: Gemini HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("TRANSIENT_ERROR: Empty response from Gemini");
  }
  return text;
}

/**
 * Fallback LLM Call: Groq REST API
 */
async function callGroqProvider(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("CONFIG_ERROR: GROQ_API_KEY is missing from environment");
  }

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`TRANSIENT_ERROR: Groq HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("TRANSIENT_ERROR: Empty response from Groq");
  }
  return text;
}

/**
 * Layer 3 & Layer 4 Semantic Output Safety Inspection
 */
export function inspectOutputSafety(text: string): { isSafe: boolean; reason?: string } {
  // Layer 3 Semantic check: Distinguish historical summaries vs new prescription instructions
  const lower = text.toLowerCase();

  // Allow historical mentions e.g. "previously recorded", "past record", "veterinarian administered"
  const isHistoricalContext =
    lower.includes("previously recorded") ||
    lower.includes("past record") ||
    lower.includes("veterinarian prescribed") ||
    lower.includes("already administered") ||
    lower.includes("दर्ज है") ||
    lower.includes("पुराना रिकॉर्ड");

  // Secondary English, Hindi, Bengali & Marathi Heuristic Patterns (Layer 4)
  const unsafePrescriptionPatterns = [
    /\bgive\s+\d+\s*(mg|ml|g|tablets|pills|shots|dose)\b/i,
    /\badminister\s+\d+\s*(mg|ml|g)\b/i,
    /\binject\s+\d+/i,
    /\bprescribe\s+[a-z0-9]+/i,
    /\btake\s+\d+\s*(mg|ml)\b/i,
    /\b\d+\s*mg\s+daily\b/i,
    /खुराक\s+\d+/i,
    /दवा\s+दें/i,
    /सुई\s+लगाएं/i,
  ];

  for (const pattern of unsafePrescriptionPatterns) {
    if (pattern.test(text) && !isHistoricalContext) {
      return {
        isSafe: false,
        reason: `Flagged unsafe prescription/dosage instruction pattern: ${pattern}`,
      };
    }
  }

  // Check for definitive non-veterinary diagnosis claims
  if (
    (lower.includes("this animal definitely has") || lower.includes("i diagnose your cow with")) &&
    !isHistoricalContext
  ) {
    return {
      isSafe: false,
      reason: "Flagged unauthorized definitive diagnosis claim",
    };
  }

  return { isSafe: true };
}

/**
 * Main Executable GenAI Service for Farmer Talk with Two-Gemini-Key Failover, Groq Fallback & Safety Layers
 */
export async function generateFarmerTalkResponse(
  animalContext: AnimalContextPacket,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  preferredLanguage: string = "en"
): Promise<FarmerTalkResponse> {
  const prompt = buildUserPrompt(animalContext, conversationHistory, userMessage, preferredLanguage);

  let rawJsonText: string | null = null;
  let providerUsed: string = "Static Fallback";

  // Step 1: Attempt Gemini Key 1
  const geminiKey1 = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY;
  if (geminiKey1) {
    try {
      rawJsonText = await callGeminiWithKey(prompt, geminiKey1);
      providerUsed = "Gemini (Key 1)";
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn("[Farmer Talk] Gemini Key 1 failed, failing over to Key 2:", errorMsg);
    }
  }

  // Step 2: Attempt Gemini Key 2 if Key 1 failed or was not configured
  if (!rawJsonText) {
    const geminiKey2 = process.env.GEMINI_API_KEY_2;
    if (geminiKey2) {
      try {
        rawJsonText = await callGeminiWithKey(prompt, geminiKey2);
        providerUsed = "Gemini (Key 2)";
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn("[Farmer Talk] Gemini Key 2 failed, failing over to Groq:", errorMsg);
      }
    }
  }

  // Step 3: Attempt Groq Fallback if both Gemini keys failed or were not configured
  if (!rawJsonText) {
    try {
      rawJsonText = await callGroqProvider(prompt);
      providerUsed = "Groq";
    } catch (groqErr: unknown) {
      const groqMsg = groqErr instanceof Error ? groqErr.message : String(groqErr);
      console.warn("[Farmer Talk] Groq fallback failed:", groqMsg);
    }
  }

  // Parse & Validate Response through Layered Architecture
  if (rawJsonText) {
    try {
      // Clean JSON formatting if wrapped in code blocks
      const cleanJson = rawJsonText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      // Layer 2: Zod Schema Validation
      const validated = FarmerTalkResponseSchema.parse(parsed);

      // Layer 3 & 4: Application & Heuristic Safety Checks
      const safetyCheck = inspectOutputSafety(validated.answer);
      if (safetyCheck.isSafe) {
        return validated;
      } else {
        console.warn(`[Farmer Talk Guardrail] AI response failed safety check (${providerUsed}):`, safetyCheck.reason);
      }
    } catch (e: unknown) {
      console.warn(`[Farmer Talk] Failed parsing structured response from ${providerUsed}:`, e);
    }
  }

  // Layer 5: Safe Fallback Response (Honest Fallback)
  const hasHighRisk = animalContext.recentCases.some(
    (c) => c.overallRiskLevel === "HIGH" || c.overallRiskLevel === "CRITICAL"
  );

  return buildSafeHistoryFallback(animalContext, preferredLanguage, hasHighRisk);
}
