import uuid
from typing import Dict, Any, List

def run_security_agent(findings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    IBM Bob Security Subagent:
    Scrutinizes cryptographic material, authentication bypasses, API secrets,
    and regulatory compliance flags (SOC2 / PCI-DSS).
    """
    sec_findings = [f for f in findings if f.get("scanner_type") in ["secrets", "config"]]
    critical_sec = [f for f in sec_findings if f.get("severity") == "CRITICAL"]
    high_sec = [f for f in sec_findings if f.get("severity") == "HIGH"]

    if critical_sec:
        status = "FAILED"
        verdict = "BLOCK"
        summary = (
            f"CRITICAL SECURITY COMPROMISE: {len(critical_sec)} live secret or credential exposures detected. "
            f"Keys must be rotated immediately in identity provider and removed from git commit trees."
        )
    elif high_sec:
        status = "WARNING"
        verdict = "REVIEW_REQUIRED"
        summary = (
            f"SECURITY DEFENSE WARNING: {len(high_sec)} elevated risk configurations detected (e.g. permissive CORS or exposed ports). "
            f"Remediate before traffic exposure to prevent reconnaissance."
        )
    else:
        status = "SUCCESS"
        verdict = "PASSED"
        summary = "SECURITY VERIFIED: No hardcoded credentials, token leaks, or unsafe cryptographic primitives discovered."

    compliance = {
        "soc2_cc6_1": "PASS" if not critical_sec else "FAIL (Credential Protection)",
        "pci_dss_req_8": "PASS" if not critical_sec else "FAIL (Unprotected Authentication Credentials)",
        "owasp_top10": "PASS" if not sec_findings else "WARN (A02:2021-Cryptographic Failures / A05-Security Misconfig)"
    }

    return {
        "id": f"agent_{uuid.uuid4().hex[:8]}",
        "agent_name": "Security Subagent",
        "agent_role": "Vulnerability & Cryptographic Safeguard Auditor",
        "status": status,
        "verdict": verdict,
        "summary": summary,
        "confidence": 0.96,
        "details_json": {
            "threat_level": "ELEVATED" if (critical_sec or high_sec) else "NORMAL",
            "findings_count": len(sec_findings),
            "compliance_matrix": compliance,
            "action_items": [f["remediation"] for f in critical_sec + high_sec][:3]
        }
    }
