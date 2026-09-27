# =============================================================
# ReleaseGuard AI — Built with IBM Bob
# © IBM Bob | ibm.com/products/watsonx
# =============================================================


import re
from typing import List, Dict, Any

EXPENSIVE_INSTANCES = [
    (r"p3\.(8|16)xlarge", "AWS GPU Instance (P3 high-tier)", 24.48, "month", 17625.0),
    (r"p4d\.24xlarge", "AWS Multi-GPU Instance (P4d)", 32.77, "month", 23594.0),
    (r"g5\.(12|24|48)xlarge", "AWS G5 Large GPU cluster", 7.06, "month", 5083.0),
    (r"m5\.(16|24)xlarge", "High memory instance tier", 4.60, "month", 3312.0),
    (r"cx2-32x64", "IBM Cloud VPC 32 vCPU Tier", 1.84, "month", 1324.0),
    (r"gx2-16x128x2v100", "IBM Cloud GPU V100 Instance", 5.20, "month", 3744.0)
]

COST_PATTERNS = [
    {
        "name": "Unbounded Autoscaling Ceiling",
        "pattern": r"(max_size\s*=\s*([1-9]\d{2,})|maxReplicas:\s*([1-9]\d{2,})|max_capacity\s*=\s*([1-9]\d{2,}))",
        "severity": "HIGH",
        "title": "Unbounded or Excessively High Autoscaling Ceiling",
        "description": "Autoscaling max replica limit set above 100 pods/nodes without budget alerts, risking runaway cloud billing during traffic surges.",
        "cost_delta": 4200.0,
        "remediation": "Cap maxReplicas to reasonable headroom (e.g., 20-30) and configure CloudWatch / IBM Cloud billing alarms."
    },
    {
        "name": "Missing S3/Object Storage Lifecycle Policy",
        "pattern": r"(resource\s+['\"]aws_s3_bucket['\"][^}]+(?!lifecycle_rule)[^}]+bucket\s*=)",
        "severity": "LOW",
        "title": "Object Storage Bucket Missing Archival Lifecycle Rule",
        "description": "Buckets storing raw logs, assets, or backups without expiration or transition to Glacier/Cold storage accumulate unbounded storage costs.",
        "cost_delta": 350.0,
        "remediation": "Add a lifecycle rule transitioning non-current versions to Glacier after 30 days and deleting after 90 days."
    },
    {
        "name": "Provisioned Multi-AZ High-Tier Database",
        "pattern": r"(multi_az\s*=\s*true.*instance_class\s*=\s*['\"]db\.[rm]5\.(4|8|12|16)xlarge['\"])",
        "severity": "HIGH",
        "title": "High-Spec Multi-AZ Production Database Provisioned",
        "description": "Enterprise-tier Multi-AZ database instance added with expected significant baseline cost increase.",
        "cost_delta": 2800.0,
        "remediation": "Review capacity requirements, benchmark IOPS, and ensure compute scaling uses serverless or reserved instances if permanent."
    }
]

def scan_cost(diff_text: str, files_content: Dict[str, str] = None) -> List[Dict[str, Any]]:
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
            
            # Check for expensive instance types
            for pattern, name, hourly, period, monthly in EXPENSIVE_INSTANCES:
                if re.search(pattern, added_content, re.IGNORECASE):
                    findings.append({
                        "scanner_type": "cost",
                        "severity": "HIGH",
                        "title": f"FinOps Alert: High-Cost Compute Provisioned ({name})",
                        "description": f"Added reference to {name} with an estimated cost of ~${monthly:,.0f}/month.",
                        "file_path": current_file,
                        "line_number": line_number,
                        "snippet": added_content.strip()[:120],
                        "remediation": f"Ensure FinOps approval is logged before spinning up high-cost tier {name}. Consider Spot or Reserved instances."
                    })

            # Check general cost rules
            for rule in COST_PATTERNS:
                if re.search(rule["pattern"], added_content, re.IGNORECASE):
                    findings.append({
                        "scanner_type": "cost",
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
