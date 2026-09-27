# =============================================================
# ReleaseGuard AI — Built with IBM Bob
# © IBM Bob | ibm.com/products/watsonx
# =============================================================


import uuid
from typing import List, Dict, Any
from .secrets_scanner import scan_secrets
from .config_scanner import scan_config
from .iac_scanner import scan_iac
from .ci_scanner import scan_ci
from .test_scanner import scan_tests
from .cost_scanner import scan_cost
from .db_scanner import scan_db

def run_all_scanners(diff_text: str, files_content: Dict[str, str] = None) -> List[Dict[str, Any]]:
    """
    Executes all 7 scanners against pull request changes and aggregates the findings.
    Scanners:
      1. Secrets Scanner
      2. Config & Env Scanner
      3. Infrastructure as Code (IaC) Scanner
      4. CI / CD Workflow Scanner
      5. Test & Regression Scanner
      6. Cloud Cost / FinOps Scanner
      7. DB Migration Scanner
    """
    all_findings = []

    all_findings.extend(scan_secrets(diff_text, files_content))
    all_findings.extend(scan_config(diff_text, files_content))
    all_findings.extend(scan_iac(diff_text, files_content))
    all_findings.extend(scan_ci(diff_text, files_content))
    all_findings.extend(scan_tests(diff_text, files_content))
    all_findings.extend(scan_cost(diff_text, files_content))
    all_findings.extend(scan_db(diff_text, files_content))

    for f in all_findings:
        if "id" not in f or not f["id"]:
            f["id"] = f"find_{uuid.uuid4().hex[:8]}"

    return all_findings
