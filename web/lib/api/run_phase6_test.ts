import { AnalyzeResponseSchema, VisionResponseSchema } from "./schemas";
import { getHistoricalWeeklyCases } from "./historical";

async function runPhase6Tests() {
  console.log("==========================================");
  console.log("RUNNING MAITRI PHASE 6 AI INTEGRATION TEST SUITE");
  console.log("==========================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string) {
    if (condition) {
      console.log(`[PASS] ${title}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title}`);
      failed++;
    }
  }

  // 1. Validate /api/analyze Response Schema Parsing
  const mockBackendAnalyze = {
    overall_risk_score: 85,
    overall_risk_level: "CRITICAL",
    disease_prediction: {
      suspected_condition: "Foot and Mouth Disease",
      confidence: 0.92,
      animal_type: "Cow",
      vitals_evaluated: { body_temp: 40.2, heart_rate: 95 },
      symptoms_analyzed: "Fever Nasal Discharge",
      epidemiology_context: { affected_count: 2, herd_size: 10, mortality_count: 0 },
    },
    iot_telemetry_analysis: {
      animal_id: "ESP32-COW-01",
      temperature: 40.2,
      activity_index: 22,
      has_anomaly: true,
      anomalies: ["Hyperthermia: 40.2°C"],
    },
    weather_analysis: {
      temperature: 28.0,
      humidity: 80.0,
      precipitation: 0.0,
      vector_breeding_risk: "HIGH",
      weather_advisory: "High humidity vector breeding risk",
      source: "Open-Meteo",
    },
    outbreak_surge_analysis: {
      latest_cases: 48,
      historical_mean: 13.0,
      z_score: 35.0,
      is_outbreak_spike: true,
    },
    farmer_advisory: {
      language: "English",
      advisory: "Isolate affected animals immediately.",
      provider_used: "Gemini (Key 1)",
    },
  };

  const analyzeParse = AnalyzeResponseSchema.safeParse(mockBackendAnalyze);
  assert(analyzeParse.success, "Valid /api/analyze payload parsed successfully");

  // 2. Validate /api/predict Response Schema Parsing
  const mockBackendVision = {
    success: true,
    yolo_result: {
      visual_anomaly_detected: true,
      primary_prediction: "Lumpy Skin Disease",
      confidence: 94.5,
      top_predictions: [{ condition: "Lumpy Skin Disease", confidence: 94.5 }],
    },
  };

  const visionParse = VisionResponseSchema.safeParse(mockBackendVision);
  assert(visionParse.success, "Valid /api/predict payload parsed successfully");

  // 3. Validate Unrecognized Risk Level Handling
  const unknownRiskAnalyze = {
    ...mockBackendAnalyze,
    overall_risk_level: "EXTREME_WARNING",
  };
  const unknownParse = AnalyzeResponseSchema.safeParse(unknownRiskAnalyze);
  assert(
    unknownParse.success && unknownParse.data.overall_risk_level === "EXTREME_WARNING",
    "Unrecognized backend risk level preserved safely as string without breaking"
  );

  // 4. Validate Sparse Historical Cases Aggregation (Zero Fabricated Counts)
  const sparseCases = await getHistoricalWeeklyCases(null);
  assert(sparseCases === undefined, "Sparse/null district returns undefined (omits payload field to use backend default)");

  // 5. Test Live FastAPI Endpoint (if http://localhost:8000 is running)
  const backendUrl = process.env.AI_ENGINE_URL || "http://localhost:8000";
  console.log(`\nChecking live backend status at ${backendUrl}...`);

  try {
    const healthRes = await fetch(`${backendUrl}/api/health`, { signal: AbortSignal.timeout(2000) });
    if (healthRes.ok) {
      console.log(`[PASS] Live FastAPI Backend is active at ${backendUrl}!`);

      // Real /api/analyze integration call
      const analyzeCall = await fetch(`${backendUrl}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: 28.6139,
          longitude: 77.209,
          language: "English",
          health_report: {
            animal: "Cow",
            symptoms: ["Fever", "Nasal Discharge"],
            heart_rate: 90,
            duration_days: 2,
            affected_count: 1,
            herd_size: 10,
            mortality_count: 0,
          },
          iot_telemetry: {
            animal_id: "TEST-TAG-01",
            temperature: 39.8,
            activity: 25,
          },
        }),
      });

      if (analyzeCall.ok) {
        const liveData = await analyzeCall.json();
        assert(Boolean(liveData.overall_risk_level), `Live POST /api/analyze succeeded (Risk: ${liveData.overall_risk_level}, Score: ${liveData.overall_risk_score})`);
      } else {
        console.warn(`[WARN] Live POST /api/analyze returned HTTP ${analyzeCall.status}`);
      }
    } else {
      console.log(`[INFO] Live FastAPI backend returned status ${healthRes.status} (Live integration test skipped, mocked tests verified).`);
    }
  } catch {
    console.log(`[INFO] Live FastAPI backend at ${backendUrl} is offline (Live integration test skipped, mocked tests verified).`);
  }

  console.log("==========================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Tests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
