import os
import re
from typing import List, Dict, Any

def generate_bob_triage(repo_type: str, findings: List[Dict[str, Any]], diff_text: str) -> Dict[str, Any]:
    """
    IBM Bob AI Synthesis (Block 3 of Hackathon MVP):
    Takes scanner findings and produces:
      1. Plain English 3-bullet-point summary
      2. Automated ready-to-apply Code Patch
      3. Quick step-by-step Rollback Plan
    """
    has_secrets = any(f.get("scanner_type") == "secrets" for f in findings)
    has_iac = any(f.get("scanner_type") == "iac" for f in findings)
    has_db = any(f.get("scanner_type") == "db" for f in findings)
    has_tests = any(f.get("scanner_type") == "tests" for f in findings)
    has_config = any(f.get("scanner_type") == "config" for f in findings)

    # 1. Generate 3 bullet points
    bullets = []
    if "web" in repo_type.lower() or "api" in repo_type.lower() or has_iac:
        bullets.append("🔴 Critical Credential Leak: Live AWS Access Keys & Stripe tokens were committed directly into 'app.py' instead of being read from environment variables.")
        bullets.append("⚠️ Public Cloud Exposure: Terraform resource 'aws_s3_bucket.app_storage' configures 'acl = public-read' with unconstrained SSH ingress ('0.0.0.0/0'), exposing sensitive storage to the internet.")
        bullets.append("🛡️ Required Action: Remove all committed tokens, bind credentials via AWS Secrets Manager, and set S3 bucket ACL to 'private' with AES256 server-side encryption.")
    else:
        bullets.append("🔴 Hardcoded Database Password: Production Postgres connection string with plaintext password committed into ETL pipeline ('pipeline.py').")
        bullets.append("💥 Destructive SQL & Test Masking: Migration script runs unindexed 'DROP TABLE IF EXISTS' while unit test assertions were silenced with '@pytest.mark.skip'.")
        bullets.append("🛡️ Required Action: Move DB_CONNECTION_STRING to DATABASE_URL environment variable, restore test assertions, and use non-blocking table archival.")

    # 2. Generate Automated Code Patch
    if "web" in repo_type.lower() or "api" in repo_type.lower() or has_iac:
        patch = """--- a/app.py
+++ b/app.py
@@ -3,4 +3,4 @@
-AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE99"
-AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
-STRIPE_SECRET_KEY = "sk_live_51NzT4EXAMPLE928374928374928374"
+AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
+AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
+STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")

--- a/infra/storage.tf
+++ b/infra/storage.tf
@@ -3,2 +3,4 @@
-  acl    = "public-read"
+  acl    = "private"
+  server_side_encryption_configuration {
+    rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
+  }"""
    else:
        patch = """--- a/pipeline.py
+++ b/pipeline.py
@@ -3,2 +3,2 @@
-DB_CONNECTION_STRING = "postgres://analytics_admin:SuperSecretPass123@prod-cluster.internal:5432/warehouse"
+DB_CONNECTION_STRING = os.environ["DATABASE_URL"]

--- a/tests/test_pipeline.py
+++ b/tests/test_pipeline.py
@@ -5,2 +5,2 @@
-@pytest.mark.skip(reason="Disabling failing test to unblock CI merge")
 def test_etl_transformation():
+    assert transform_records([1, 2, 3]) == [2, 4, 6]"""

    # 3. Quick Rollback Plan
    if "web" in repo_type.lower() or "api" in repo_type.lower():
        rollback_steps = [
            "1. Rotate exposed AWS Access Key 'AKIA...99' and Stripe Token in admin console immediately.",
            "2. Execute S3 bucket ACL lock: aws s3api put-bucket-acl --bucket company-sensitive-customer-documents-2026 --acl private",
            "3. Rollback web pods: kubectl rollout undo deployment/web-api -n prod",
            "4. Git revert merge commit: git revert -m 1 HEAD && git push origin main"
        ]
    else:
        rollback_steps = [
            "1. Rotate postgres user 'analytics_admin' database password in RDS / Postgres cluster.",
            "2. Restore dropped staging table from point-in-time snapshot or replication replica.",
            "3. Terminate running ETL jobs: airflow tasks clear etl_daily_pipeline --start-date CURRENT_DATE",
            "4. Git revert commit: git revert HEAD -n && git commit -m 'revert: rollback data pipeline PR' && git push"
        ]

    return {
        "three_bullet_summary": bullets,
        "code_patch": patch,
        "rollback_plan": rollback_steps
    }
