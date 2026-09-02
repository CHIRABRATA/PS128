import logging
import requests
from typing import Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)

def _call_gemini(api_key: str, prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    response = requests.post(url, json=payload, headers=headers, timeout=12)
    response.raise_for_status()
    data = response.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]

def _call_groq(api_key: str, prompt: str) -> str:
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "You are an expert veterinary epidemiologist and agricultural extension specialist."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3
    }
    response = requests.post(url, json=payload, headers=headers, timeout=12)
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]

def generate_farmer_advisory(analysis_data: Dict[str, Any], language: str = "English") -> Dict[str, Any]:
    disease = analysis_data.get("disease_prediction", {}).get("suspected_condition", "Unknown Disease")
    confidence = analysis_data.get("disease_prediction", {}).get("confidence", 0.0)
    risk_level = analysis_data.get("overall_risk_level", "ELEVATED")
    risk_score = analysis_data.get("overall_risk_score", 50)
    iot_anomalies = analysis_data.get("iot_telemetry_analysis", {}).get("anomalies", [])
    weather = analysis_data.get("weather_analysis", {})
    vector_risk = weather.get("vector_breeding_risk", "MODERATE")
    is_outbreak = analysis_data.get("outbreak_surge_analysis", {}).get("is_outbreak_spike", False)

    prompt = f"""
    You are an expert veterinary and agricultural health extension officer.
    Generate a clear, actionable, and empathetic advisory for a farmer in language: {language}.

    LIVESTOCK DIAGNOSTIC DATA:
    - Suspected Disease: {disease} (Confidence: {confidence * 100:.1f}%)
    - Overall Risk Level: {risk_level} ({risk_score}/100)
    - Sensor Anomalies: {', '.join(iot_anomalies) if iot_anomalies else 'None'}
    - Vector/Breeding Environmental Risk: {vector_risk}
    - Outbreak Surge Active in Region: {is_outbreak}

    FORMAT REQUIREMENTS (Respond in {language}):
    1. Direct Diagnostic Explanation (Simple terms)
    2. Immediate Action Steps for Farm Operations (Isolation, treatment, sanitization)
    3. Biosecurity & Vector Control Instructions
    4. Emergency Contact Notice for Local Veterinary Officer
    """

    providers = []
    if settings.GEMINI_API_KEY_1:
        providers.append(("Gemini (Key 1)", lambda: _call_gemini(settings.GEMINI_API_KEY_1, prompt)))
    if settings.GEMINI_API_KEY_2:
        providers.append(("Gemini (Key 2)", lambda: _call_gemini(settings.GEMINI_API_KEY_2, prompt)))
    if settings.GROQ_API_KEY:
        providers.append(("Groq (Llama-3.3-70B)", lambda: _call_groq(settings.GROQ_API_KEY, prompt)))

    advisory_text = None
    used_provider = None

    for name, func in providers:
        try:
            logger.info(f"Attempting advisory generation using {name}...")
            advisory_text = func()
            used_provider = name
            logger.info(f"Successfully generated advisory using {name}")
            break
        except Exception as e:
            logger.warning(f"Provider {name} failed: {e}. Trying next fallback...")

    if not advisory_text:
        advisory_text = (
            f"Advisory Generation Fallback ({language}):\n"
            f"Critical risk detected ({risk_level}). Suspected condition: {disease}.\n"
            f"Immediate Actions: Isolate affected animals, restrict farm entry, consult local vet immediately."
        )
        used_provider = "Static Fallback"

    return {
        "language": language,
        "advisory": advisory_text,
        "provider_used": used_provider
    }
