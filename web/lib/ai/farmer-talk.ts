import { z } from "zod";

/**
 * PHASE 10: MAITRI FARMER TALK AI SERVICE
 *
 * Clinical Safety Boundary & Layered Guardrails:
 * Layer 1: System Prompt Injection
 * Layer 2: Structured Output Schema (Zod)
 * Layer 3: Application Semantic Safety Checks (Distinguishes historical vet summary vs new prescription instructions)
 * Layer 4: Dual-language (English/Hindi) Secondary Heuristic Regex Scan
 * Layer 5: Safe Fallback Override
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
  samples: Array<{
    status: string;
    collectedAt: string;
    resultSummary: string | null;
  }>;
}

const SYSTEM_PROMPT = `
You are Maitri Farmer Talk, an informational livestock health support assistant for farmers.
You assist farmers by explaining recorded health information about their specific animal.

CRITICAL CLINICAL SAFETY RULES:
1. You are NOT a veterinarian. You MUST NOT diagnose any disease as confirmed.
2. You MUST NOT prescribe new medications, recommend drug dosages (e.g. mg, ml, pills), or instruct the farmer to administer drugs.
3. You MAY summarize existing historical records (e.g. "Your veterinarian previously recorded a treatment of Antiseptic Wash on 2026-09-05").
4. You MUST NOT override or contradict a veterinarian's recorded advice.
5. Use ONLY the provided animal context packet. Never invent missing medical records or telemetry data.
6. If recorded risk level is HIGH or CRITICAL, explicitly advise the farmer to contact a local veterinarian immediately.
7. Respond in JSON format with fields: {"answer": "...", "needs_veterinarian": boolean, "risk_notice": string | null, "suggested_next_step": "..."}.
8. Respond in the requested language (English or Hindi).
`;

function buildUserPrompt(
  animalContext: AnimalContextPacket,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  preferredLanguage: string
): string {
  const historyText = conversationHistory
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join("\n");

  return `
REQUESTED LANGUAGE: ${{ en: "English", bn: "Bengali", hi: "Hindi", mr: "Marathi" }[preferredLanguage] || preferredLanguage}

ANIMAL CONTEXT PACKET (REAL VERIFIED RECORDS):
${JSON.stringify(animalContext, null, 2)}

RECENT CONVERSATION HISTORY:
${historyText || "No previous messages in this conversation."}

FARMER'S NEW MESSAGE:
"${userMessage}"

Respond in JSON adhering strictly to the safety instructions.
`;
}

function buildSafeHistoryFallback(animalContext: AnimalContextPacket, preferredLanguage: string, hasHighRisk: boolean): FarmerTalkResponse {
  const latestCase = animalContext.recentCases[0];
  const latestVaccination = animalContext.vaccinations[0];
  const latestTreatment = animalContext.treatments[0];
  const symptoms = latestCase?.symptoms.join(", ") || "none recorded";
  const condition = latestCase?.suspectedCondition || "not recorded";
  const risk = latestCase?.overallRiskLevel || "not recorded";

  const summaries = {
    en: `Animal ${animalContext.animalIdentity.tag}: ${animalContext.recentCases.length} recent health record(s). Latest symptoms: ${symptoms}. Suspected condition: ${condition}. Recorded risk: ${risk}. ${latestVaccination ? `Latest vaccination: ${latestVaccination.vaccineName} on ${latestVaccination.dateGiven}. ` : ""}${latestTreatment ? `Latest recorded treatment: ${latestTreatment.medication} on ${latestTreatment.dateGiven}. ` : ""}${hasHighRisk ? "A high or critical risk was recorded. Contact a veterinarian immediately." : "For examination or treatment guidance, contact your local veterinarian or field agent."}`,
    bn: `${animalContext.animalIdentity.tag} পশুর ${animalContext.recentCases.length}টি সাম্প্রতিক স্বাস্থ্য রেকর্ড আছে। সর্বশেষ লক্ষণ: ${symptoms}। সন্দেহভাজন অবস্থা: ${condition}। নথিভুক্ত ঝুঁকি: ${risk}। ${latestVaccination ? `সর্বশেষ টিকা: ${latestVaccination.vaccineName}, ${latestVaccination.dateGiven}। ` : ""}${latestTreatment ? `সর্বশেষ চিকিৎসা: ${latestTreatment.medication}, ${latestTreatment.dateGiven}। ` : ""}${hasHighRisk ? "উচ্চ বা গুরুতর ঝুঁকি নথিভুক্ত হয়েছে। অবিলম্বে পশুচিকিৎসকের সঙ্গে যোগাযোগ করুন।" : "পরীক্ষা বা চিকিৎসার পরামর্শের জন্য স্থানীয় পশুচিকিৎসক বা মাঠকর্মীর সঙ্গে যোগাযোগ করুন।"}`,
    hi: `पशु ${animalContext.animalIdentity.tag} के ${animalContext.recentCases.length} हालिया स्वास्थ्य रिकॉर्ड हैं। नवीनतम लक्षण: ${symptoms}। संदिग्ध स्थिति: ${condition}। दर्ज जोखिम: ${risk}। ${latestVaccination ? `नवीनतम टीका: ${latestVaccination.vaccineName}, ${latestVaccination.dateGiven}। ` : ""}${latestTreatment ? `नवीनतम दर्ज उपचार: ${latestTreatment.medication}, ${latestTreatment.dateGiven}। ` : ""}${hasHighRisk ? "उच्च या गंभीर जोखिम दर्ज है। तुरंत पशु चिकित्सक से संपर्क करें।" : "जांच या उपचार संबंधी सलाह के लिए स्थानीय पशु चिकित्सक या फील्ड एजेंट से संपर्क करें।"}`,
    mr: `जनावर ${animalContext.animalIdentity.tag} चे ${animalContext.recentCases.length} अलीकडील आरोग्य नोंदी आहेत. नवीनतम लक्षणे: ${symptoms}. संशयित स्थिती: ${condition}. नोंदवलेला धोका: ${risk}. ${latestVaccination ? `नवीनतम लसीकरण: ${latestVaccination.vaccineName}, ${latestVaccination.dateGiven}. ` : ""}${latestTreatment ? `नवीनतम नोंदवलेला उपचार: ${latestTreatment.medication}, ${latestTreatment.dateGiven}. ` : ""}${hasHighRisk ? "उच्च किंवा गंभीर धोका नोंदवला आहे. त्वरित पशुवैद्यकाशी संपर्क साधा." : "तपासणी किंवा उपचाराच्या मार्गदर्शनासाठी स्थानिक पशुवैद्यक किंवा पशुसखीशी संपर्क साधा."}`,
  };

  return {
    answer: summaries[preferredLanguage as keyof typeof summaries] || summaries.en,
    needs_veterinarian: hasHighRisk,
    risk_notice: hasHighRisk ? summaries[preferredLanguage as keyof typeof summaries] || summaries.en : null,
    suggested_next_step: { bn: "পশুচিকিৎসকের সঙ্গে যোগাযোগ করুন", hi: "पशु चिकित्सक से संपर्क करें", mr: "पशुवैद्यकाशी संपर्क साधा" }[preferredLanguage] || "Contact Veterinarian",
  };
}

/**
 * LLM Call: Gemini REST API for a specific API Key
 */
async function callGeminiWithKey(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
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

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
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

  // Secondary English & Hindi Heuristic Patterns (Layer 4)
  const unsafePrescriptionPatterns = [
    /\bgive\s+\d+\s*(mg|ml|g|tablets|pills|shots|dose)\b/i,
    /\badminister\s+\d+\s*(mg|ml|g)\b/i,
    /\binject\s+\d+/i,
    /\bprescribe\s+[a-z0-9]+/i,
    /\b take \d+\s*(mg|ml)\b/i,
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

  // Layer 5: Safe Fallback Response
  const hasHighRisk = animalContext.recentCases.some(
    (c) => c.overallRiskLevel === "HIGH" || c.overallRiskLevel === "CRITICAL"
  );

  return buildSafeHistoryFallback(animalContext, preferredLanguage, hasHighRisk);
}
