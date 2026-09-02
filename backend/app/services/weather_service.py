import httpx
from app.schemas.analytics import WeatherRiskResponse

async def fetch_weather_risk(latitude: float, longitude: float) -> WeatherRiskResponse:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": ["temperature_2m", "relative_humidity_2m", "precipitation"]
    }
    
    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            curr = data.get("current", {})
            temp = curr.get("temperature_2m", 28.0)
            humidity = curr.get("relative_humidity_2m", 65.0)
            precip = curr.get("precipitation", 0.0)
        except Exception:
            # Fallback default values if network fails
            temp, humidity, precip = 29.0, 70.0, 0.0

    reasons = []
    
    # Vector-borne proliferation rule (Warm + Humid/Rainy favors vector vectors like Culicoides/Mosquitoes)
    if temp >= 24.0 and humidity >= 70.0:
        vector_risk = "HIGH"
        reasons.append("High ambient humidity and warmth present ideal conditions for vector proliferation (LSD / BTV midges).")
    elif temp >= 20.0 and humidity >= 55.0:
        vector_risk = "MODERATE"
        reasons.append("Moderate weather conditions; vector transmission risk is moderate.")
    else:
        vector_risk = "LOW"
        reasons.append("Low ambient humidity/temperature suppresses active insect vector reproduction.")

    # Temperature Humidity Index (THI) Heat Stress rule for cattle
    if temp >= 32.0 and humidity >= 60.0:
        heat_stress = "HIGH_STRESS"
        reasons.append("High Temperature-Humidity Index indicates thermal stress, suppressing ruminant immunity.")
    elif temp >= 28.0:
        heat_stress = "CAUTION"
    else:
        heat_stress = "NORMAL"

    return WeatherRiskResponse(
        temperature_c=temp,
        relative_humidity_pct=humidity,
        precipitation_mm=precip,
        vector_breeding_risk=vector_risk,
        heat_stress_index=heat_stress,
        risk_factor_reasons=reasons
    )
