# 🛡️ ReleaseGuard AI — DevSecOps Governance & IBM Bob Agent Swarm

> **Autonomous Pull Request Risk Assessment, 7-Category Code Scanners, IBM Bob Multi-Agent Swarm, Zero-RTO Rollback Runbooks, and Runtime Incident Analysis.**

---

## 📖 Introduction

ReleaseGuard AI is a DevSecOps release-governance platform for engineering teams. It connects repository activity, pull-request analysis, deployment health, incident response, and rollback planning in one workspace.

The system is designed to answer four practical questions before and after a release:

1. **What changed?** Fetch the pull request diff, repository metadata, infrastructure files, tests, and deployment configuration.
2. **How risky is it?** Run seven focused scanners and combine their findings into a risk score and release verdict.
3. **What should the team do?** Ask the IBM Bob agent swarm for security, infrastructure, database, cost, and rollback opinions.
4. **What happens after deployment?** Monitor deployment and incident data, connect incidents to recent changes, and provide a recovery runbook.

ReleaseGuard supports both interactive demonstrations and real repository workflows. The local engine works without external AI credentials, while IBM Cloud and GitHub integrations can be configured for connected environments.

## ✨ Main Features

- Pull-request risk scoring with `GO`, `CONDITIONAL`, and `NO-GO` release decisions.
- Seven scanners for secrets, configuration, IaC, CI/CD, tests, cloud cost, and database migrations.
- IBM Bob specialist agents coordinated by a release orchestrator.
- GitHub repository authorization, pull-request scanning, webhooks, comments, and status checks.
- Repository policy presets, merge-gate enforcement, and approval requirements.
- Deployment health, release timelines, incident simulation, and rollback controls.
- Runtime incident analysis that correlates telemetry and recent pull requests.
- Interactive scanner sandbox for demonstrating high-risk changes.
- Project Agent chat and action workflows for repository and release operations.
- Persistent authentication with scrypt password hashing and revocable HTTP-only sessions.
- Responsive Next.js dashboard with PR, repository, policy, operations, incident, agent, and access views.

## 🧭 How to Use the Repository

### Start the backend

From the repository root, install the Python dependencies and start FastAPI:

```bash
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8001
```

The backend exposes the API at `http://localhost:8001` and API documentation at `http://localhost:8001/docs`.

### Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open `http://localhost:3000/login/`. Create a personal account, then open the dashboard at `http://localhost:3000/`.

For local development, `frontend/.env.local` should point to the local API:

```text
NEXT_PUBLIC_API_BASE=http://localhost:8001
```

### Typical first workflow

1. Register or sign in to a workspace account.
2. Open **Repositories** and authorize or connect a repository.
3. Review the pull requests shown in **Pull Requests**.
4. Inspect scanner findings, risk score, Bob analysis, rollback guidance, and cost impact.
5. Use **Policies** to apply a repository release policy.
6. Use the **Workflow** view to understand the twelve-stage release path.
7. Use the **Runtime Incidents** view to simulate or resolve an incident.

## 🧩 How It Implements Common Cases

### Case 1: A developer opens a normal pull request

The GitHub webhook or manual scan sends the pull-request metadata and diff to the FastAPI backend. The scanner runner executes the seven scanners, stores the findings in SQLite, and calculates a risk score. The frontend then displays the result in the PR list and detail inspector.

If no serious issues are found, the orchestrator can return a `GO` decision. The team can inspect the evidence before merging.

### Case 2: A pull request exposes a secret

The secrets scanner compares changed lines against credential and private-key patterns. A detected AWS key, cloud token, Slack token, Stripe key, password, JWT secret, or private key is recorded as a critical or high-severity finding.

The release gate receives the finding, raises the risk score, and can produce a `NO-GO` decision. The PR detail view shows the affected file, matching line, explanation, and remediation such as revoking and rotating the credential.

### Case 3: A pull request contains a destructive database migration

The database scanner checks for destructive DDL, unsafe index creation, table locks, and required columns without defaults. The database agent then evaluates migration ordering and zero-downtime risk.

The final review can require an expand-and-contract migration, a rollback plan, or an additional approval before the release is allowed to proceed.

### Case 4: A change increases infrastructure cost

The FinOps scanner identifies expensive compute types, uncapped autoscaling, and missing lifecycle controls. It estimates the monthly cost delta and sends the result to the cost agent.

The release policy can require FinOps approval when the projected change exceeds a configured threshold. The PR inspector shows the cost breakdown together with the release decision.

### Case 5: A deployment becomes unhealthy

Deployment and telemetry data are loaded through the deployments API. When an incident is created or simulated, the incident agent correlates it with recent releases and pull requests.

The incident hub displays the affected service, suspected root cause, related PR, severity, status, and recommended next action. The rollback agent can produce an emergency recovery runbook, and authorized users can trigger the configured rollback workflow.

### Case 6: A team needs consistent repository governance

An administrator creates a policy preset with a severity threshold, automatic review setting, and alert channel. The preset is assigned to one or more repositories.

Future scans use the repository policy when deciding whether findings should block a release, require review, or remain informational.

### Case 7: A team wants to demonstrate the platform without GitHub credentials

The scanner sandbox provides prepared scenarios such as critical secret exposure, destructive database migration, and high-cost infrastructure changes. The sandbox sends a simulated payload through the same scanning and agent workflow used by real pull requests.

This makes it possible to demonstrate the risk engine, findings, agent reasoning, release gate, and rollback guidance locally.

## 🏗️ Repository Structure

```text
backend/              FastAPI application, routers, agents, scanners, and tests
backend/agents/       Release, security, infrastructure, cost, DB, and incident agents
backend/routers/      Authentication, GitHub, PR, repository, deployment, and webhook APIs
backend/scanners/     Seven static and architectural scanners
frontend/src/app/     Next.js routes and dashboard pages
frontend/src/components/ Dashboard panels, lists, modals, workflow, and agent UI
frontend/src/lib/     Frontend API and shared client utilities
demo_repos/           Small repositories and diffs used by demonstrations
docs/screenshots/     ReleaseGuard product and deployment screenshots
```

## 🔐 Authentication and Data Handling

User passwords are stored as salted scrypt hashes. Successful login creates a revocable HTTP-only session cookie. API routes use the session to enforce repository, pull-request, and incident ownership.

Local operational data is stored in `backend/releaseguard.db`. Do not commit real credentials, GitHub tokens, IBM Cloud keys, production databases, or personal session data. Production deployments should use HTTPS, set `SESSION_COOKIE_SECURE=true`, restrict `FRONTEND_ORIGINS`, and protect the database with backups and access controls.

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
py -m uvicorn backend.main:app --host 127.0.0.1 --port 8001 --reload
```
API runs at: `http://localhost:8001`
Interactive Swagger docs: `http://localhost:8001/docs`

### 2. Frontend (Next.js)
```bash
cd frontend
npm run dev
```
Website runs at: `http://localhost:3000`

### 3. Accounts and local data

Open `http://localhost:3000/login` and create an account with a password of at least 12 characters. Accounts, salted scrypt password hashes, revocable sessions, connected repositories, pull requests, and related release data are stored in `backend/releaseguard.db` (SQLite). Session cookies are HTTP-only and expire after seven days. The first account claims any repositories already in the local database; repositories added later belong to the account that connected them.

For HTTPS deployments, set `SESSION_COOKIE_SECURE=true` and set `FRONTEND_ORIGINS` to the exact frontend origin(s), separated by commas. Do not expose the development server or SQLite file as a production deployment without an appropriate backup and access-control plan.

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
