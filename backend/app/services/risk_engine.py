from app.schemas.livestock import HealthReportInput

def calculate_hybrid_risk(ml_result: dict, report: HealthReportInput) -> dict:
    """
    Combines the ML prediction with epidemiological rule-based logic.
    """
    base_score = int(ml_result["confidence"] * 100)
    risk_score = base_score
    reasons = [f"AI identified symptom pattern matching {ml_result['suspected_condition']} (Base Score: {base_score})"]
    
    # 1. Mortality Check (Critical Escalation)
    if report.mortality_count > 0:
        risk_score += 40
        reasons.append(f"CRITICAL: {report.mortality_count} deaths reported in the herd.")
        
    # 2. Spread / Contagion Rate
    if report.herd_size > 0:
        spread_percentage = (report.affected_count / report.herd_size) * 100
        if spread_percentage >= 30:
            risk_score += 25
            reasons.append(f"High contagion alert: {spread_percentage:.1f}% of herd affected.")
        elif spread_percentage >= 10:
            risk_score += 10
            reasons.append(f"Elevated spread: {spread_percentage:.1f}% of herd affected.")

    # 3. Vaccination Status Vulnerability
    if report.animal.vaccination_status.lower() in ["none", "unknown"]:
        risk_score += 10
        reasons.append("Animal lacks verified vaccination history, increasing susceptibility.")

    # 4. Cap score at 100
    risk_score = min(risk_score, 100)

    # 5. Determine Final Risk Level & Actions
    if ml_result["suspected_condition"] == "Healthy" and report.mortality_count == 0:
        risk_level = "LOW"
        risk_score = min(risk_score, 20)  # Force low score if healthy and no deaths
        actions = ["Maintain standard care and hygiene."]
    elif risk_score >= 80:
        risk_level = "CRITICAL"
        actions = [
            "IMMEDIATE ISOLATION of affected animals.",
            "Contact local veterinary officer immediately.",
            "Restrict farm access and do not move animals off-site."
        ]
    elif risk_score >= 60:
        risk_level = "HIGH"
        actions = [
            "Isolate affected animals.",
            "Schedule veterinary consultation.",
            "Monitor herd temperature twice daily."
        ]
    else:
        risk_level = "MEDIUM"
        actions = [
            "Monitor closely for 24-48 hours.",
            "Ensure adequate hydration and clean feed."
        ]

    return {
        "final_score": risk_score,
        "risk_level": risk_level,
        "reasons": reasons,
        "recommended_actions": actions
    }
