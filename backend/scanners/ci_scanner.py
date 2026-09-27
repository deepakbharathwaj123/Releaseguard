# =============================================================
# ReleaseGuard AI — Built with IBM Bob
# © IBM Bob | ibm.com/products/watsonx
# =============================================================


import re
from typing import List, Dict, Any

CI_PATTERNS = [
    {
        "name": "Unverified Script Piping (curl | bash)",
        "pattern": r"(curl\s+[^\|]+\|\s*(bash|sh)|wget\s+[^\|]+\|\s*(bash|sh))",
        "severity": "HIGH",
        "title": "Unverified Remote Script Execution via curl | bash",
        "description": "Executing remote scripts directly via pipe introduces supply chain execution risk if DNS or endpoint is compromised.",
        "remediation": "Download scripts to a temporary file, verify checksum/SHA256, and execute with minimum necessary permissions."
    },
    {
        "name": "Dangerous pull_request_target Trigger",
        "pattern": r"on:\s*\n[^\n]*pull_request_target",
        "severity": "CRITICAL",
        "title": "Dangerous pull_request_target Event Trigger",
        "description": "pull_request_target runs in the context of the base repository with full access to secrets, enabling untrusted fork exploitation.",
        "remediation": "Use standard 'pull_request' trigger, or never checkout untrusted PR code in a pull_request_target workflow."
    },
    {
        "name": "Unpinned 3rd Party Action",
        "pattern": r"uses:\s*([a-zA-Z0-9_\-\/]+)@(v\d+|master|main)",
        "severity": "MEDIUM",
        "title": "Mutable Tag Used in GitHub Action",
        "description": "Action referenced with mutable tag (e.g., @v1 or @main) instead of a pinned immutable commit hash.",
        "remediation": "Pin GitHub Actions to full commit SHAs (e.g. actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11)."
    },
    {
        "name": "Secret Printing in Logs",
        "pattern": r"(echo\s+['\"]?\$\{\{\s*secrets\.|echo\s+['\"]?\$[A-Z0-9_]*SECRET)",
        "severity": "CRITICAL",
        "title": "Pipeline Echoes Secret Variable into Build Logs",
        "description": "Echoing secret variables can expose them in CI runner public logs or artifact archives.",
        "remediation": "Mask secrets using ::add-mask:: and do not reference secrets directly in shell echo statements."
    }
]

def scan_ci(diff_text: str, files_content: Dict[str, str] = None) -> List[Dict[str, Any]]:
    findings = []
    lines = diff_text.splitlines()
    current_file = "unknown"
    line_number = 1

    for line in lines:
        if line.startswith("+++ b/"):
            current_file = line.replace("+++ b/", "").strip()
            continue
        if line.startswith("@@"):
            match = re.search(r"\+(\d+)", line)
            if match:
                line_number = int(match.group(1))
            continue
        
        # Only inspect CI workflow files
        is_ci_file = (".github/workflows" in current_file or "gitlab-ci" in current_file or "jenkins" in current_file.lower())
        
        if line.startswith("+") and not line.startswith("+++"):
            added_content = line[1:]
            if is_ci_file:
                for rule in CI_PATTERNS:
                    if re.search(rule["pattern"], added_content, re.IGNORECASE):
                        findings.append({
                            "scanner_type": "ci",
                            "severity": rule["severity"],
                            "title": rule["title"],
                            "description": f"{rule['description']} (File: {current_file})",
                            "file_path": current_file,
                            "line_number": line_number,
                            "snippet": added_content.strip()[:120],
                            "remediation": rule["remediation"]
                        })
            line_number += 1
        elif not line.startswith("-"):
            line_number += 1

    return findings
