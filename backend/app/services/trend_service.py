import numpy as np
from app.schemas.analytics import HistoricalTrendRequest, TrendAnalysisResponse

def evaluate_disease_trend(data: HistoricalTrendRequest) -> TrendAnalysisResponse:
    if not data.historical_weekly_cases:
        hist_avg = float(data.current_week_cases)
        pct_inc = 0.0
    else:
        hist_avg = float(np.mean(data.historical_weekly_cases))
        std_dev = float(np.std(data.historical_weekly_cases)) or 1.0
        
        if hist_avg > 0:
            pct_inc = ((data.current_week_cases - hist_avg) / hist_avg) * 100.0
        else:
            pct_inc = float(data.current_week_cases * 100.0)

    # Surge detection using 2 Standard Deviations or >100% surge over baseline
    is_spike = False
    if len(data.historical_weekly_cases) >= 3:
        z_score = (data.current_week_cases - hist_avg) / (std_dev if std_dev > 0 else 1.0)
        if z_score >= 2.0 or (pct_inc >= 100.0 and data.current_week_cases >= 5):
            is_spike = True
            trend = "SURGE_ALERT"
            msg = f"Abnormal statistical surge detected (Z-Score: {z_score:.2f}, +{pct_inc:.1f}% vs baseline)."
        elif pct_inc > 25.0:
            trend = "INCREASING"
            msg = f"Case incidence is trending upward (+{pct_inc:.1f}% increase over historical mean)."
        else:
            trend = "STABLE"
            msg = "Case incidence is within expected historical variance."
    else:
        trend = "INCREASING" if data.current_week_cases > hist_avg else "STABLE"
        msg = f"Baseline tracked. Percentage change: {pct_inc:.1f}%."

    return TrendAnalysisResponse(
        trend=trend,
        is_outbreak_spike=is_spike,
        historical_average=round(hist_avg, 2),
        percentage_increase=round(pct_inc, 2),
        message=msg
    )
