import uuid
from typing import Dict, Any, List

def run_cost_agent(findings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    IBM Bob Cost & FinOps Subagent:
    Models monthly infrastructure expenditure delta, warns against uncapped
    autoscaling and expensive GPU allocations.
    """
    cost_findings = [f for f in findings if f.get("scanner_type") == "cost"]
    
    # Calculate estimated monthly delta
    monthly_delta = 45.0 # Base compute overhead
    for f in cost_findings:
        if "High-Cost Compute" in f.get("title", ""):
            monthly_delta += 2400.0
        elif "Autoscaling" in f.get("title", ""):
            monthly_delta += 1200.0
        elif "Database" in f.get("title", ""):
            monthly_delta += 850.0
        else:
            monthly_delta += 150.0

    if monthly_delta > 1000.0:
        status = "WARNING"
        verdict = "FINOPS_REVIEW"
        summary = (
            f"FINOPS BUDGET IMPACT: Estimated +${monthly_delta:,.0f}/month infrastructure increase. "
            f"Requires approval from Engineering FinOps team."
        )
    else:
        status = "SUCCESS"
        verdict = "APPROVED"
        summary = f"FINOPS APPROVED: Estimated nominal budget change (+${monthly_delta:,.0f}/month within quarterly allocation)."

    return {
        "id": f"agent_{uuid.uuid4().hex[:8]}",
        "agent_name": "Cost Subagent",
        "agent_role": "FinOps & Cloud Resource Econometrics Specialist",
        "status": status,
        "verdict": verdict,
        "summary": summary,
        "confidence": 0.94,
        "details_json": {
            "estimated_monthly_delta_usd": monthly_delta,
            "currency": "USD",
            "findings_count": len(cost_findings),
            "cost_breakdown": {
                "Compute (Pods/EC2)": f"+${monthly_delta * 0.65:,.0f}",
                "Networking / Egress": f"+${monthly_delta * 0.20:,.0f}",
                "Storage / IOPS": f"+${monthly_delta * 0.15:,.0f}"
            },
            "recommendation": "Use spot/preemptible instances for background workers where possible."
        }
    }
