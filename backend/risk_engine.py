from typing import List, Dict, Any

SEVERITY_WEIGHTS = {
    "CRITICAL": 35,
    "HIGH": 20,
    "MEDIUM": 10,
    "LOW": 4,
    "INFO": 1
}

def compute_risk_score(findings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes a composite risk score (0-100), risk tier, and category distribution.
    """
    if not findings:
        return {
            "score": 5,
            "level": "LOW",
            "verdict": "GO",
            "breakdown": {
                "secrets": 0,
                "config": 0,
                "iac": 0,
                "ci": 0,
                "tests": 0,
                "cost": 0,
                "db": 0
            },
            "summary": "No security, infrastructure, or reliability defects found."
        }

    raw_score = 0
    breakdown = {
        "secrets": 0,
        "config": 0,
        "iac": 0,
        "ci": 0,
        "tests": 0,
        "cost": 0,
        "db": 0
    }

    critical_count = 0
    high_count = 0

    for f in findings:
        sev = f.get("severity", "LOW").upper()
        scanner = f.get("scanner_type", "config").lower()
        weight = SEVERITY_WEIGHTS.get(sev, 5)
        
        raw_score += weight
        if scanner in breakdown:
            breakdown[scanner] += weight

        if sev == "CRITICAL":
            critical_count += 1
        elif sev == "HIGH":
            high_count += 1

    # Apply category multiplier heuristics
    if breakdown["secrets"] > 0:
        raw_score += 15 # Severe breach exposure
    if breakdown["db"] >= 20:
        raw_score += 15 # High outage or data loss risk

    # Normalize to 0-100 scale
    score = min(100, max(5, int(raw_score)))

    # Determine risk level and verdict
    if score >= 75 or critical_count > 0:
        level = "CRITICAL"
        verdict = "NO-GO"
        summary = f"CRITICAL RISK: {critical_count} critical and {high_count} high severity issues detected. Merging is blocked."
    elif score >= 50:
        level = "HIGH"
        verdict = "CONDITIONAL"
        summary = f"HIGH RISK: Elevated risk detected ({high_count} high severity items). Requires designated team lead signoff and rollback runbook."
    elif score >= 25:
        level = "MEDIUM"
        verdict = "CONDITIONAL"
        summary = "MEDIUM RISK: Minor architectural or configuration warnings identified. Peer review recommended."
    else:
        level = "LOW"
        verdict = "GO"
        summary = "LOW RISK: Changes conform to reliability and security guardrails."

    return {
        "score": score,
        "level": level,
        "verdict": verdict,
        "breakdown": breakdown,
        "critical_count": critical_count,
        "high_count": high_count,
        "total_findings": len(findings),
        "summary": summary
    }
