# 🛡️ ReleaseGuard AI — DevSecOps Governance & IBM Bob Agent Swarm

> **Autonomous Pull Request Risk Assessment, 7-Category Code Scanners, IBM Bob Multi-Agent Swarm, Zero-RTO Rollback Runbooks, and Runtime Incident Analysis.**

---

## 🚀 System Architecture & End-to-End Workflow

```
[Developer] 
   |
   | 1. Push code / open PR
   v
[GitHub / Git Platform]
   |
   | 2. Webhook: PR opened/updated
   v
[ReleaseGuard Backend (FastAPI)]
   |
   | 3. Fetch repo files & metadata
   | 4. Run scanners (secrets, config, IaC, CI, tests, cost, DB)
   | 5. Aggregate findings → compute risk score (0-100)
   | 6. Call IBM Bob agents:
   |    - Release Orchestrator Agent (Master Gatekeeper & GO/NO-GO Verdict)
   |    - Security Subagent (SOC2 / PCI-DSS / Cryptographic audit)
   |    - Infra/DevOps Subagent (Kubernetes Pod Security & IaC)
   |    - Rollback Planner Subagent (Zero-RTO automated rollback runbook)
   |    - Cost Subagent (FinOps cloud expenditure delta)
   |    - DB Migration Subagent (Schema locks & zero-downtime safety)
   |
   | 7. Store findings, risk scores, Bob outputs in SQLite DB
   | 8. Post PR comment / status check on GitHub
   |
   v
[ReleaseGuard Frontend (Next.js)]
   |
   | 9. Show:
   |    - Repo list & Webhook endpoints
   |    - PR list with risk scores & status badges
   |    - PR detail: findings, Bob summary, rollback plan, cost estimate
   |    - Interactive Webhook & PR Scanner Sandbox
   |
   v
[Deployment & Runtime]
   |
   | 10. Monitor deploys & active production environments
   | 11. On incident: call Bob Incident Analysis Agent
   | 12. Store incident reports, isolate root cause, link to PRs/deploys
```

---

## 🔍 The 7 Static & Architectural Scanners

1. **Secrets Scanner** (`secrets_scanner.py`):
   Detects hardcoded AWS, GCP, IBM Cloud, Slack, Stripe tokens, private PGP/RSA keys, hardcoded database credentials, and unmasked JWTs.
2. **Config & Env Scanner** (`config_scanner.py`):
   Detects `DEBUG = True` in production configurations, wildcard CORS (`allow_origins=["*"]`), missing HTTP client timeouts, and insecure TLS/SSL verification disables.
3. **Infrastructure as Code (IaC) Scanner** (`iac_scanner.py`):
   Audits Dockerfiles (running as root, `:latest` tags), Kubernetes manifests (`privileged: true`, missing resource limits), and Terraform (`0.0.0.0/0` ingress rules, unencrypted S3 buckets).
4. **CI / CD Pipeline Scanner** (`ci_scanner.py`):
   Detects unverified script piping (`curl -sSL | bash`), dangerous `pull_request_target` triggers on untrusted forks, unpinned 3rd-party GitHub Actions, and secrets echoed in logs.
5. **Test & Regression Scanner** (`test_scanner.py`):
   Detects skipped unit/integration tests (`@pytest.mark.skip`, `it.skip`), artificially lowered coverage thresholds, and multi-file code modifications without test additions.
6. **FinOps & Cloud Cost Scanner** (`cost_scanner.py`):
   Flags expensive GPU/bare-metal instance types (P3/G5/IBM bare metal), uncapped autoscaling ceilings (`maxReplicas > 100`), missing S3 lifecycle rules, and calculates monthly budget deltas.
7. **Database Migration Scanner** (`db_scanner.py`):
   Detects destructive DDLs (`DROP TABLE`, `DROP COLUMN`), non-concurrent index building (`CREATE INDEX` without `CONCURRENTLY`), `NOT NULL` columns added without defaults, and table locks.

---

## 🤖 IBM Bob Multi-Agent Swarm

- **Release Orchestrator Agent**: Master swarm coordinator. Evaluates all subagent verdicts, calculates the composite risk score, and issues the binding **GO**, **CONDITIONAL**, or **NO-GO** release gate decision with required executive sign-offs.
- **Security Subagent**: Audits credential exposures, cryptographic integrity, and compliance requirements (SOC2 CC6.1, PCI-DSS Req 8).
- **Infra/DevOps Subagent**: Assesses zero-downtime rolling update readiness and container host isolation.
- **Rollback Planner Subagent**: Automatically synthesizes step-by-step shell commands, canary drain virtual services, pod undo commands, and reverse database migrations (`DOWN` scripts).
- **Cost & FinOps Subagent**: Forecasts monthly cloud spend delta (e.g., `+$2,400/month`) and flags budget thresholds.
- **DB Migration Subagent**: Evaluates schema lock duration and non-blocking expand-and-contract patterns.
- **Bob Incident Analysis Agent**: Triggered upon post-deployment telemetry alerts (e.g., 504 Gateway spike, connection pool exhaustion) to correlate recent PRs, isolate the offending commit, and formulate emergency killswitch runbooks.

---

## 🖥️ Running Locally

### 1. Backend (FastAPI)
```bash
# From workspace root:
py -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
API runs at: `http://localhost:8000`  
Interactive Swagger docs: `http://localhost:8000/docs`

### 2. Frontend (Next.js)
```bash
cd frontend
npm run dev
```
Website runs at: `http://localhost:3000`

---

## 🎯 Testing the System

1. **Dashboard & Visual Architecture Map**:
   Navigate to `http://localhost:3000` to inspect the 12-stage visual workflow diagram, active PR list, and risk meters.
2. **Inspect PR Details**:
   Click "Inspect" on any PR (e.g., PR #142) to view the 6 inspector tabs:
   - **Findings**: 7-scanner findings with file, line number, snippet, and remediation.
   - **IBM Bob Swarm**: Multi-agent consensus, checklist, and compliance flags.
   - **Rollback Runbook**: Zero-RTO executable recovery commands.
   - **Cost & FinOps**: Monthly cloud spend delta and layer breakdown.
   - **GitHub PR Comment**: Real-time simulated GitHub bot comment preview.
   - **Git Diff**: Colorized unified diff viewer.
3. **PR & Webhook Sandbox**:
   Click **"Test PR / Webhook Sandbox"**, pick a preset (e.g. *💥 Destructive DB Migration & High-Cost GPU* or *🚨 Critical Secret Leak*), and click **"Trigger Webhook & Run Swarm"** to watch live pipeline execution!
4. **Runtime Incident Hub**:
   Switch to the **"Runtime Incidents"** tab, click **"Simulate 504 Gateway Spike"**, and see the Bob Incident Analysis Agent isolate the root cause PR and generate an emergency killswitch runbook.
