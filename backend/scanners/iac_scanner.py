# =============================================================
# ReleaseGuard AI — Built with IBM Bob
# © IBM Bob | ibm.com/products/watsonx
# =============================================================


import re
from typing import List, Dict, Any

IAC_PATTERNS = [
    {
        "name": "Dockerfile Running as Root",
        "pattern": r"(USER\s+root|FROM\s+[^\n]+\s*\n(?!.*USER\s+))",
        "file_match": r"Dockerfile",
        "severity": "HIGH",
        "title": "Container Image Runs as Privileged Root",
        "description": "Containers running as root allow malicious breakouts to access host kernel capabilities.",
        "remediation": "Create an unprivileged user (e.g., USER 10001:10001 or adduser -D appuser) in the Dockerfile."
    },
    {
        "name": "Docker Latest Tag Usage",
        "pattern": r"FROM\s+[a-zA-Z0-9_\-\.\/]+:latest",
        "file_match": r"Dockerfile",
        "severity": "LOW",
        "title": "Unpinned Docker Image Tag (:latest)",
        "description": "Using ':latest' tag produces non-reproducible builds and risks unexpected breaking upstream changes.",
        "remediation": "Pin container image tags to specific semantic versions or immutable SHA256 digests."
    },
    {
        "name": "Overly Permissive Ingress CIDR",
        "pattern": r"""(cidr_blocks\s*=\s*\[\s*['"]0\.0\.0\.0/0['"]\s*\]|cidr:\s*0\.0\.0\.0/0)""",
        "file_match": r"(\.tf|\.ya?ml)",
        "severity": "HIGH",
        "title": "Security Group Opens 0.0.0.0/0 to the Internet",
        "description": "Security group rule allows unrestricted public access from all IPv4 addresses.",
        "remediation": "Restrict CIDR blocks to internal corporate VPNs, bastion hosts, or AWS/IBM Cloud VPC subnets."
    },
    {
        "name": "Kubernetes Privileged Container",
        "pattern": r"privileged:\s*true",
        "file_match": r"(\.ya?ml|\.json)",
        "severity": "CRITICAL",
        "title": "Privileged Container Execution in Kubernetes",
        "description": "Setting privileged: true disables all isolation mechanisms and gives full host device access.",
        "remediation": "Drop all unnecessary Linux capabilities and set privileged: false with readOnlyRootFilesystem: true."
    },
    {
        "name": "Missing Container Resource Limits",
        "pattern": r"resources:\s*\{\s*\}|containers:\s*\n(?![^p]*limits:)",
        "file_match": r"(\.ya?ml|\.json)",
        "severity": "MEDIUM",
        "title": "Missing Kubernetes CPU/Memory Limits",
        "description": "Containers without resource limits can monopolize worker node memory, triggering OOMKills on neighboring pods.",
        "remediation": "Define both requests and limits for memory and CPU in Pod container specifications."
    },
    {
        "name": "Unencrypted Storage / S3 Bucket",
        "pattern": r"""(encrypted\s*=\s*false|server_side_encryption_configuration\s*\{\s*\})""",
        "file_match": r"\.tf",
        "severity": "HIGH",
        "title": "Unencrypted Cloud Storage Bucket",
        "description": "Storage resource provisioned without default server-side encryption enabled.",
        "remediation": "Enable AES256 or KMS server-side encryption on all cloud bucket and disk volume definitions."
    },
    {
        "name": "Public Cloud Storage Bucket (public-read)",
        "pattern": r"""(acl\s*=\s*['"]public-read['"]|acl\s*:\s*public-read)""",
        "file_match": r"(\.tf|\.ya?ml)",
        "severity": "CRITICAL",
        "title": "Public Cloud Storage Bucket ACL (public-read)",
        "description": "Cloud object storage bucket configured with public-read permissions, allowing unauthorized public access.",
        "remediation": "Change bucket ACL to 'private' and enable S3 Block Public Access settings."
    }
]


def scan_iac(diff_text: str, files_content: Dict[str, str] = None) -> List[Dict[str, Any]]:
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
            for rule in IAC_PATTERNS:
                if re.search(rule["file_match"], current_file, re.IGNORECASE):
                    if re.search(rule["pattern"], added_content, re.IGNORECASE):
                        findings.append({
                            "scanner_type": "iac",
                            "severity": rule["severity"],
                            "title": rule["title"],
                            "description": f"{rule['description']} (Found in {current_file})",
                            "file_path": current_file,
                            "line_number": line_number,
                            "snippet": added_content.strip()[:120],
                            "remediation": rule["remediation"]
                        })
            line_number += 1
        elif not line.startswith("-"):
            line_number += 1

    return findings
