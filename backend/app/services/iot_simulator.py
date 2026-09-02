import random
import time

def generate_simulated_telemetry(animal_id: str = "ESP32-SIM-01", simulate_fever: bool = False) -> dict:
    """
    Simulates real-time ESP32 sensor hardware outputs.
    - DS18B20 Temp Sensor: Normal (38.5°C - 39.2°C), Fever (>39.5°C)
    - MPU6050 Activity Index: Normal (40 - 80), Lethargic (<30)
    """
    if simulate_fever:
        # Simulate hyperthermia / fever condition
        temp = round(random.uniform(39.8, 41.2), 2)
        activity = random.randint(10, 28)
    else:
        # Normal baseline body vitals
        temp = round(random.uniform(38.3, 39.3), 2)
        activity = random.randint(45, 85)

    return {
        "animal_id": animal_id,
        "temperature": temp,
        "activity_index": activity,
        "timestamp": int(time.time()),
        "is_hardware_simulated": True
    }
