from app.schemas.master import MasterAnalysisRequest, MasterAnalysisResponse
from app.services.ml_service import predictor
from app.services.risk_engine import calculate_hybrid_risk
from app.services.iot_service import analyze_iot_telemetry
from app.services.weather_service import fetch_weather_risk
from app.services.trend_service import evaluate_disease_trend
from app.schemas.analytics import HistoricalTrendRequest

async def execute_master_analysis(request: MasterAnalysisRequest) -> MasterAnalysisResponse:
    # 1. Disease Prediction & Epidemiological Hybrid Engine
    ml_res = predictor.predict(request.health_report.symptoms, request.health_report.duration_days)
    hybrid_res = calculate_hybrid_risk(ml_res, request.health_report)
    
    # 2. Process IoT Telemetry (if available)
    iot_res = None
    if request.iot_telemetry:
        iot_res = analyze_iot_telemetry(request.iot_telemetry)

    # 3. Dynamic Weather Risk Intake
    weather_res = await fetch_weather_risk(request.latitude, request.longitude)

    # 4. Disease Trend & Outbreak Surge Analysis
    trend_req = HistoricalTrendRequest(
        region_id=request.region_id,
        disease_name=ml_res["suspected_condition"],
        current_week_cases=request.health_report.affected_count,
        historical_weekly_cases=request.historical_weekly_cases or [2, 3, 1, 4]
    )
    trend_res = evaluate_disease_trend(trend_req)

    # 5. Composite Master Risk Calculation
    final_score = hybrid_res["final_score"]
    
    # Adjust score dynamically based on external factors
    if iot_res and iot_res.is_anomaly:
        final_score += 15
    if weather_res.vector_breeding_risk == "HIGH":
        final_score += 10
    if trend_res.is_outbreak_spike:
        final_score += 20

    final_score = min(final_score, 100)

    # Resolve Overall Risk Category
    if final_score >= 80:
        overall_level = "CRITICAL"
    elif final_score >= 60:
        overall_level = "HIGH"
    elif final_score >= 35:
        overall_level = "MEDIUM"
    else:
        overall_level = "LOW"

    # Consolidate Recommendations
    unified_actions = list(hybrid_res["recommended_actions"])
    if weather_res.vector_breeding_risk == "HIGH":
        unified_actions.append("Apply anti-vector sprays and clear standing water near shelter.")
    if trend_res.is_outbreak_spike:
        unified_actions.append("ALARM: Local outbreak spike detected. Notify regional veterinary authorities.")

    return MasterAnalysisResponse(
        overall_risk_score=final_score,
        overall_risk_level=overall_level,
        disease_prediction={
            "risk_score": hybrid_res["final_score"],
            "risk_level": hybrid_res["risk_level"],
            "suspected_condition": ml_res["suspected_condition"],
            "confidence": ml_res["confidence"],
            "reasons": hybrid_res["reasons"],
            "recommended_actions": hybrid_res["recommended_actions"]
        },
        iot_analysis=iot_res,
        weather_risk=weather_res,
        epidemiological_trend=trend_res,
        unified_recommendations=list(set(unified_actions))
    )
