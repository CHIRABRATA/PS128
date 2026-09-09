import requests
import logging

logger = logging.getLogger(__name__)

def fetch_weather_risk(latitude: float = 28.6139, longitude: float = 77.2090) -> dict:
    """
    Fetches real-time weather metrics from Open-Meteo REST API (No Key Required)
    and evaluates vector-borne disease transmission risks (mosquitos/midges for LSD/BT).
    """
    url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m,relative_humidity_2m,precipitation"
    
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json().get("current", {})
            temp = data.get("temperature_2m", 25.0)
            humidity = data.get("relative_humidity_2m", 50.0)
            precip = data.get("precipitation", 0.0)

            # High humidity (>70%) or rain triggers vector-borne disease breeding risk
            if (temp > 24.0 and humidity > 70.0) or precip > 1.0:
                vector_risk = "HIGH"
                advisory = "High vector breeding risk: Mosquito and fly activity elevated due to high humidity/rainfall."
            elif temp > 20.0 and humidity > 55.0:
                vector_risk = "MEDIUM"
                advisory = "Moderate vector activity. Check surroundings for stagnant water."
            else:
                vector_risk = "LOW"
                advisory = "Low environmental vector breeding risk."

            return {
                "temperature": temp,
                "humidity": humidity,
                "precipitation": precip,
                "vector_breeding_risk": vector_risk,
                "weather_advisory": advisory,
                "source": "Live Open-Meteo API"
            }
    except Exception as e:
        logger.error(f"Open-Meteo API connection error: {e}")

    # Fallback response if network is offline
    return {
        "temperature": 28.0,
        "humidity": 80.0,
        "precipitation": 0.0,
        "vector_breeding_risk": "HIGH",
        "weather_advisory": "High humidity indicates elevated vector risk.",
        "source": "Offline Fallback"
    }
