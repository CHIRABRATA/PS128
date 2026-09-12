import assert from "node:assert";
import { generateFarmerTalkResponse, AnimalContextPacket } from "@/lib/ai/farmer-talk";

async function runGeminiFailoverTests() {
  console.log("==================================================");
  console.log("RUNNING TWO-GEMINI-KEY FAILOVER AUTOMATED TEST SUITE");
  console.log("==================================================");

  const mockAnimalContext: AnimalContextPacket = {
    animalIdentity: { tag: "TEST-COW-01", species: "COW", breed: "Gir", ageMonths: 24 },
    location: { farmName: "Green Pastures", villageName: "Koregaon", blockName: "Haveli", districtName: "Pune" },
    recentCases: [
      {
        caseNumber: "CASE-9001",
        status: "PENDING_REVIEW",
        reportedAt: new Date().toISOString(),
        symptoms: ["fever", "salivation"],
        durationDays: 2,
        affectedCount: 1,
        mortalityCount: 0,
        overallRiskLevel: "HIGH",
        suspectedCondition: "FMD",
        vetDiagnosis: null,
        vetAction: null,
        sanitizedVetNotes: null,
      },
    ],
    vaccinations: [{ vaccineName: "FMD Vaccine", dateGiven: "2026-01-15", nextDueDate: null }],
    treatments: [{ medication: "Meloxicam", dateGiven: "2026-02-01", notes: null }],
    veterinaryReports: [],
    iotTelemetry: null,
    samples: [],
  };

  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  let passedCount = 0;
  let failedCount = 0;

  function recordPass(testName: string) {
    passedCount++;
    console.log(`[PASS] ${testName}`);
  }

  function recordFail(testName: string, err: unknown) {
    failedCount++;
    console.error(`[FAIL] ${testName}:`, err);
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Key 1 succeeds → Key 2 is NOT called.
    // -------------------------------------------------------------
    try {
      process.env.GEMINI_API_KEY_1 = "valid-key-1";
      process.env.GEMINI_API_KEY_2 = "valid-key-2";
      process.env.GROQ_API_KEY = "mock-groq-key";

      const calls: string[] = [];
      global.fetch = async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes("key=valid-key-1")) {
          calls.push("gemini-key-1");
          return new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          answer: "Cow health is stable from Key 1.",
                          needs_veterinarian: false,
                          risk_notice: null,
                          suggested_next_step: "Monitor daily",
                        }),
                      },
                    ],
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } else if (urlStr.includes("key=valid-key-2")) {
          calls.push("gemini-key-2");
          return new Response("{}", { status: 200 });
        } else if (urlStr.includes("api.groq.com")) {
          calls.push("groq");
          return new Response("{}", { status: 200 });
        }
        return new Response("Not found", { status: 404 });
      };

      const res = await generateFarmerTalkResponse(mockAnimalContext, [], "How is my cow?");
      assert.strictEqual(res.answer, "Cow health is stable from Key 1.");
      assert.deepStrictEqual(calls, ["gemini-key-1"], "Only Key 1 should be invoked");
      recordPass("Test 1: Key 1 succeeds → Key 2 and Groq are NOT called");
    } catch (err) {
      recordFail("Test 1: Key 1 succeeds → Key 2 is NOT called", err);
    }

    // -------------------------------------------------------------
    // TEST 2: Key 1 fails (HTTP 429) → Key 2 succeeds → Groq is NOT called.
    // -------------------------------------------------------------
    try {
      process.env.GEMINI_API_KEY_1 = "rate-limited-key-1";
      process.env.GEMINI_API_KEY_2 = "valid-key-2";
      process.env.GROQ_API_KEY = "mock-groq-key";

      const calls: string[] = [];
      global.fetch = async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes("key=rate-limited-key-1")) {
          calls.push("gemini-key-1");
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 });
        } else if (urlStr.includes("key=valid-key-2")) {
          calls.push("gemini-key-2");
          return new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          answer: "Cow health is stable from Key 2 failover.",
                          needs_veterinarian: false,
                          risk_notice: null,
                          suggested_next_step: "Monitor daily",
                        }),
                      },
                    ],
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } else if (urlStr.includes("api.groq.com")) {
          calls.push("groq");
          return new Response("{}", { status: 200 });
        }
        return new Response("Not found", { status: 404 });
      };

      const res = await generateFarmerTalkResponse(mockAnimalContext, [], "How is my cow?");
      assert.strictEqual(res.answer, "Cow health is stable from Key 2 failover.");
      assert.deepStrictEqual(calls, ["gemini-key-1", "gemini-key-2"], "Key 1 fails then Key 2 is invoked; Groq is NOT called");
      recordPass("Test 2: Key 1 fails → Key 2 succeeds → Groq is NOT called");
    } catch (err) {
      recordFail("Test 2: Key 1 fails → Key 2 succeeds → Groq is NOT called", err);
    }

    // -------------------------------------------------------------
    // TEST 3: Key 1 fails → Key 2 fails → Groq succeeds.
    // -------------------------------------------------------------
    try {
      process.env.GEMINI_API_KEY_1 = "failing-key-1";
      process.env.GEMINI_API_KEY_2 = "failing-key-2";
      process.env.GROQ_API_KEY = "valid-groq-key";

      const calls: string[] = [];
      global.fetch = async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes("key=failing-key-1")) {
          calls.push("gemini-key-1");
          return new Response(JSON.stringify({ error: "Internal 500" }), { status: 500 });
        } else if (urlStr.includes("key=failing-key-2")) {
          calls.push("gemini-key-2");
          return new Response(JSON.stringify({ error: "Quota 429" }), { status: 429 });
        } else if (urlStr.includes("api.groq.com")) {
          calls.push("groq");
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      answer: "Cow health response from Groq fallback.",
                      needs_veterinarian: false,
                      risk_notice: null,
                      suggested_next_step: "Regular checkup",
                    }),
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("Not found", { status: 404 });
      };

      const res = await generateFarmerTalkResponse(mockAnimalContext, [], "How is my cow?");
      assert.strictEqual(res.answer, "Cow health response from Groq fallback.");
      assert.deepStrictEqual(calls, ["gemini-key-1", "gemini-key-2", "groq"], "Key 1 fails, Key 2 fails, Groq succeeds");
      recordPass("Test 3: Key 1 fails → Key 2 fails → Groq succeeds");
    } catch (err) {
      recordFail("Test 3: Key 1 fails → Key 2 fails → Groq succeeds", err);
    }

    // -------------------------------------------------------------
    // TEST 4: Key 1 fails → Key 2 fails → Groq fails → existing safe fallback is returned.
    // -------------------------------------------------------------
    try {
      process.env.GEMINI_API_KEY_1 = "failing-key-1";
      process.env.GEMINI_API_KEY_2 = "failing-key-2";
      process.env.GROQ_API_KEY = "failing-groq-key";

      const calls: string[] = [];
      global.fetch = async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes("key=failing-key-1")) {
          calls.push("gemini-key-1");
          return new Response(JSON.stringify({ error: "Fail 1" }), { status: 500 });
        } else if (urlStr.includes("key=failing-key-2")) {
          calls.push("gemini-key-2");
          return new Response(JSON.stringify({ error: "Fail 2" }), { status: 500 });
        } else if (urlStr.includes("api.groq.com")) {
          calls.push("groq");
          return new Response(JSON.stringify({ error: "Fail Groq" }), { status: 500 });
        }
        return new Response("Not found", { status: 404 });
      };

      const res = await generateFarmerTalkResponse(mockAnimalContext, [], "How is my cow?");
      assert.ok(res.answer.includes("Animal TEST-COW-01"), "Should generate safe history fallback");
      assert.strictEqual(res.needs_veterinarian, true, "Should detect high risk from recent cases");
      assert.ok(res.suggested_next_step?.includes("Veterinarian"), "Should suggest contacting veterinarian");
      assert.deepStrictEqual(calls, ["gemini-key-1", "gemini-key-2", "groq"]);
      recordPass("Test 4: Key 1 fails → Key 2 fails → Groq fails → existing safe fallback is returned");
    } catch (err) {
      recordFail("Test 4: Key 1 fails → Key 2 fails → Groq fails → existing safe fallback is returned", err);
    }

    // -------------------------------------------------------------
    // TEST 5: No Gemini keys → existing Groq/safe fallback behavior remains safe.
    // -------------------------------------------------------------
    try {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY_1;
      delete process.env.GEMINI_API_KEY_2;
      process.env.GROQ_API_KEY = "valid-groq-key";

      const calls: string[] = [];
      global.fetch = async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes("api.groq.com")) {
          calls.push("groq");
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      answer: "Safe response when Gemini keys are missing.",
                      needs_veterinarian: false,
                      risk_notice: null,
                      suggested_next_step: "Routine follow-up",
                    }),
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("Not found", { status: 404 });
      };

      const res = await generateFarmerTalkResponse(mockAnimalContext, [], "How is my cow?");
      assert.strictEqual(res.answer, "Safe response when Gemini keys are missing.");
      assert.deepStrictEqual(calls, ["groq"], "Directly falls over to Groq when Gemini keys absent");
      recordPass("Test 5: No Gemini keys → existing Groq/safe fallback behavior remains safe");
    } catch (err) {
      recordFail("Test 5: No Gemini keys → existing Groq/safe fallback behavior remains safe", err);
    }
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }

  console.log("==================================================");
  console.log(`Two-Gemini-Key Failover Test Suite: ${passedCount} PASSED, ${failedCount} FAILED (Total ${passedCount + failedCount})`);
  console.log("==================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runGeminiFailoverTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
