import re
from typing import List, Dict, Any

CONFIG_PATTERNS = [
    {
        "name": "Production Debug Mode Enabled",
        "pattern": r"(DEBUG\s*=\s*True|debug:\s*true|app\.debug\s*=\s*True)",
        "severity": "HIGH",
        "title": "Debug Mode Enabled in Code/Configuration",
        "description": "Enabling debug mode in production exposes interactive stack traces, sensitive variable dumps, and potential RCE.",
        "remediation": "Set DEBUG = False and read strictly from an environment variable defaulted to False."
    },
    {
        "name": "Overly Permissive CORS Policy",
        "pattern": r"""(allow_origins\s*=\s*\[\s*['"]\*['"]\s*\]|CORS_ORIGIN\s*=\s*['"]\*['"]|Access-Control-Allow-Origin:\s*\*)""",
        "severity": "MEDIUM",
        "title": "Wildcard CORS Policy Configured",
        "description": "Wildcard CORS origin (*) allows any unauthorized site to issue cross-origin requests to your backend.",
        "remediation": "Restrict allowed origins to trusted client domains and whitelist specific HTTP methods."
    },
    {
        "name": "Missing HTTP Request Timeout",
        "pattern": r"requests\.(get|post|put|delete|patch)\((?!.*timeout\s*=)[^)]+\)",
        "severity": "MEDIUM",
        "title": "Outbound HTTP Call Without Explicit Timeout",
        "description": "Unbounded network calls can cause thread pool and socket exhaustion when downstream dependencies stall.",
        "remediation": "Always pass an explicit timeout tuple, e.g., requests.get(url, timeout=(3.05, 10))."
    },
    {
        "name": "Insecure TLS / SSL Verification Disabled",
        "pattern": r"(verify\s*=\s*False|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['\"]0['\"])",
        "severity": "HIGH",
        "title": "TLS/SSL Certificate Verification Disabled",
        "description": "Disabling TLS verification leaves connections susceptible to Man-in-the-Middle (MITM) credential theft.",
        "remediation": "Enforce SSL verification (verify=True) and provide custom CA certificates if using internal PKI."
    },
    {
        "name": "Exposed Sensitive Port Binding",
        "pattern": r"""(host\s*=\s*['"]0\.0\.0\.0['"]|bind\s*=\s*['"]0\.0\.0\.0:22['"]|PORT\s*=\s*(5432|27017|6379))""",
        "severity": "LOW",
        "title": "Service Binding to All Interfaces (0.0.0.0)",
        "description": "Binding database or debug ports to all network interfaces may expose internal services to public routing.",
        "remediation": "Bind services to localhost (127.0.0.1) or internal VPC subnet CIDR blocks."
    }
]

def scan_config(diff_text: str, files_content: Dict[str, str] = None) -> List[Dict[str, Any]]:
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
            for rule in CONFIG_PATTERNS:
                if re.search(rule["pattern"], added_content, re.IGNORECASE):
                    findings.append({
                        "scanner_type": "config",
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

    # Check for missing required variables defined in .env.example
    if ".env.example" in diff_text or any(".env.example" in (k or "") for k in (files_content or {}).keys()):
        # Find variable keys defined in .env.example
        env_ex_lines = [l for l in diff_text.splitlines() if re.match(r"^\+[A-Z0-9_]+\s*=", l)]
        for ex_l in env_ex_lines:
            var_name = ex_l[1:].split("=")[0].strip()
            # If variable is added to .env.example without documentation or value
            if var_name in ["JWT_SECRET_KEY", "STRIPE_API_KEY", "SLACK_ALERT_WEBHOOK", "DATABASE_URL"]:
                findings.append({
                    "scanner_type": "config",
                    "severity": "MEDIUM",
                    "title": f"New Environment Variable '{var_name}' Added to .env.example",
                    "description": f"New configuration key '{var_name}' was added to .env.example. Ensure deployment secrets and CI runners configure this variable.",
                    "file_path": ".env.example",
                    "line_number": 1,
                    "snippet": ex_l[1:],
                    "remediation": f"Set {var_name} in your staging/production Secret Manager and .env file."
                })

    return findings

