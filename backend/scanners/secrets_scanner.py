# =============================================================
# ReleaseGuard AI — Built with IBM Bob
# © IBM Bob | ibm.com/products/watsonx
# =============================================================


import re
from typing import List, Dict, Any

SECRETS_PATTERNS = [
    {
        "name": "AWS Access Key",
        "pattern": r"AKIA[0-9A-Z]{16}",
        "severity": "CRITICAL",
        "title": "Hardcoded AWS Access Key ID Detected",
        "description": "An AWS Access Key ID was found hardcoded in the diff. This grants direct AWS API access to anyone who reads the code.",
        "remediation": "Revoke the key immediately in AWS IAM, rotate it, and store it in an environment variable or AWS Secrets Manager."
    },
    {
        "name": "AWS Secret Access Key",
        "pattern": r"(?i)aws.{0,20}secret.{0,20}['\""][0-9a-zA-Z/+]{40}['\""]",
        "severity": "CRITICAL",
        "title": "Hardcoded AWS Secret Access Key Detected",
        "description": "An AWS Secret Access Key was found hardcoded. Combined with the Access Key ID this provides full programmatic AWS access.",
        "remediation": "Revoke and rotate the secret immediately. Use IAM instance profiles or AWS Secrets Manager instead."
    },
    {
        "name": "GCP API Key",
        "pattern": r"AIza[0-9A-Za-z\-_]{35}",
        "severity": "CRITICAL",
        "title": "Hardcoded GCP API Key Detected",
        "description": "A Google Cloud Platform API key was found hardcoded, enabling unauthorized API calls billed to your GCP account.",
        "remediation": "Revoke the key in Google Cloud Console and use Application Default Credentials or Secret Manager."
    },
    {
        "name": "IBM Cloud API Key",
        "pattern": r"(?i)(ibm.{0,10}api.{0,10}key|IBMCLOUD_API_KEY)\s*[=:]\s*['\""]?[a-zA-Z0-9_\-]{40,}['\""]?",
        "severity": "CRITICAL",
        "title": "Hardcoded IBM Cloud API Key Detected",
        "description": "An IBM Cloud API key was found hardcoded, which could allow unauthorized access to IBM Cloud services.",
        "remediation": "Revoke the key in IBM Cloud IAM and store it as an environment variable."
    },
    {
        "name": "Slack Token",
        "pattern": r"xox[baprs]-[0-9a-zA-Z]{10,48}",
        "severity": "HIGH",
        "title": "Hardcoded Slack Token Detected",
        "description": "A Slack bot or user token was found hardcoded, enabling unauthorized access to Slack workspaces and message history.",
        "remediation": "Revoke the token in Slack App settings and store it in an environment variable."
    },
    {
        "name": "Stripe API Key",
        "pattern": r"(?:sk|pk)_(test|live)_[0-9a-zA-Z]{24,}",
        "severity": "CRITICAL",
        "title": "Hardcoded Stripe API Key Detected",
        "description": "A Stripe secret or publishable key was found hardcoded, risking unauthorized payment operations.",
        "remediation": "Revoke the key in the Stripe dashboard immediately and use environment variables."
    },
    {
        "name": "Private RSA/PGP Key",
        "pattern": r"-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY",
        "severity": "CRITICAL",
        "title": "Private Key Material Committed to Code",
        "description": "A private cryptographic key was found in the diff. Anyone with repo access can impersonate this identity.",
        "remediation": "Rotate the key pair immediately, remove from git history using git-filter-repo, and store keys in a secrets vault."
    },
    {
        "name": "Hardcoded Password",
        "pattern": r"(?i)(password|passwd|pwd)\s*[=:]\s*['\""][^'\"\"]{6,}['\""]",
        "severity": "HIGH",
        "title": "Hardcoded Password Detected",
        "description": "A plaintext password was found hardcoded in the source code.",
        "remediation": "Remove the hardcoded password, rotate the credential, and use environment variables or a secrets manager."
    },
    {
        "name": "JWT Secret",
        "pattern": r"(?i)(jwt.{0,10}secret|secret.{0,10}key)\s*[=:]\s*['\""][^'\"\"]{8,}['\""]",
        "severity": "HIGH",
        "title": "Hardcoded JWT Secret Detected",
        "description": "A JWT signing secret was found hardcoded. Attackers can forge valid tokens if they obtain it.",
        "remediation": "Generate a new secret, store it in an environment variable, and redeploy immediately."
    },
]

def scan_secrets(diff_text: str, files_content: dict = None) -> list:
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

        if line.startswith("+") and not line.startswith("+++"):
            added_content = line[1:]
            for rule in SECRETS_PATTERNS:
                if re.search(rule["pattern"], added_content):
                    findings.append({
                        "scanner_type": "secrets",
                        "severity": rule["severity"],
                        "title": rule["title"],
                        "description": f"{rule['description']} (File: {current_file})",
                        "file_path": current_file,
                        "line_number": line_number,
                        "snippet": re.sub(r"(['\"])[^'\"]{6,}(['\"])", r"\1***REDACTED***\2", added_content.strip()[:120]),
                        "remediation": rule["remediation"]
                    })
            line_number += 1
        elif not line.startswith("-"):
            line_number += 1

    return findings