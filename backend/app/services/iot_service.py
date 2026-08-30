from app.schemas.iot import IoTData, IoTResponse

def analyze_iot_telemetry(data: IoTData) -> IoTResponse:
    """
    Evaluates livestock IoT telemetry for early anomaly detection.
    Normal physiological ranges for cattle/ruminants:
      - Body Temperature: ~38.0°C to 39.3°C (Febrile/Fever: >= 39.5°C, Hypothermia: < 37.5°C)
      - Activity Index: 40-80 (Lethargy/Depression: < 25, Hyperactivity/Pain/Agitation: > 85)
    """
    reasons = []
    is_anomaly = False
    risk_level = "LOW"

    # Temperature Check
    if data.temperature >= 40.5:
        is_anomaly = True
        risk_level = "CRITICAL"
        reasons.append(f"Severe hyperthermia/fever detected ({data.temperature:.1f}°C).")
    elif data.temperature >= 39.5:
        is_anomaly = True
        risk_level = "HIGH" if risk_level != "CRITICAL" else risk_level
        reasons.append(f"Elevated body temperature / fever detected ({data.temperature:.1f}°C).")
    elif data.temperature < 37.5:
        is_anomaly = True
        risk_level = "HIGH" if risk_level != "CRITICAL" else risk_level
        reasons.append(f"Subnormal body temperature / hypothermia risk ({data.temperature:.1f}°C).")

    # Activity Check
    if data.activity < 20:
        is_anomaly = True
        if risk_level in ["HIGH", "CRITICAL"]:
            risk_level = "CRITICAL"
        else:
            risk_level = "HIGH"
        reasons.append(f"Severe lethargy or recumbency detected (Activity index: {data.activity}/100).")
    elif data.activity < 35:
        is_anomaly = True
        if risk_level == "LOW":
            risk_level = "MEDIUM"
        reasons.append(f"Reduced motor activity observed (Activity index: {data.activity}/100).")

    if not is_anomaly:
        message = "Vitals are within standard physiological parameters."
    else:
        message = "; ".join(reasons)

    return IoTResponse(
        status="ANOMALY_DETECTED" if is_anomaly else "NORMAL",
        is_anomaly=is_anomaly,
        risk_level=risk_level,
        message=message
    )
