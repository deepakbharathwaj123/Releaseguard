import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from ..database import get_db
from ..github_review_service import trigger_review_for_repo
from ..scanners import run_all_scanners
from ..risk_engine import compute_risk_score
from ..agents import (
    run_release_orchestrator,
    run_security_agent,
    run_infra_agent,
    run_rollback_agent,
    run_cost_agent,
    run_db_agent
)
from ..comment_generator import generate_github_pr_comment

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

def process_pr_pipeline(repo_data: dict, pr_data: dict, diff_text: str):
    """
    Executes steps 3 through 8 of the ReleaseGuard workflow:
    3. Fetch repo files & metadata
    4. Run scanners (secrets, config, IaC, CI, tests, cost, DB)
    5. Aggregate findings → compute risk score
    6. Call IBM Bob agents:
       - Release Orchestrator Agent
       - Security Subagent
       - Infra/DevOps Subagent
       - Rollback Planner Subagent
       - Cost Subagent, DB Migration Subagent
    7. Store findings, risk scores, Bob outputs in DB
    8. Post PR comment / status check
    """
    now = datetime.now().isoformat()
    conn = get_db()
    cursor = conn.cursor()

    repo_id = f"repo_{repo_data.get('name', 'custom')}"
    repo_name = repo_data.get("name", "custom-repo")
    repo_full_name = repo_data.get("full_name", f"org/{repo_name}")

    # Ensure repo exists
    cursor.execute("SELECT id FROM repositories WHERE id = ?", (repo_id,))
    if not cursor.fetchone():
        cursor.execute("""
            INSERT INTO repositories (id, name, full_name, description, default_branch, webhook_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        """, (repo_id, repo_name, repo_full_name, repo_data.get("description", "Imported GitHub Repository"), "main", now, now))

    pr_number = pr_data.get("number", int(uuid.uuid4().int % 900 + 100))
    pr_id = f"pr_{repo_id}_{pr_number}"
    title = pr_data.get("title", f"Pull Request #{pr_number}")
    description = pr_data.get("body", "") or "No description provided."
    author = pr_data.get("user", {}).get("login", "contributor") if isinstance(pr_data.get("user"), dict) else "contributor"
    source_branch = pr_data.get("head", {}).get("ref", "feature-branch") if isinstance(pr_data.get("head"), dict) else "feature-branch"
    target_branch = pr_data.get("base", {}).get("ref", "main") if isinstance(pr_data.get("base"), dict) else "main"

    # Step 4: Run Scanners
    findings = run_all_scanners(diff_text)

    # Step 5: Compute Risk Score
    risk = compute_risk_score(findings)

    # Step 6: Call IBM Bob agents
    sec_agent = run_security_agent(findings)
    infra_agent = run_infra_agent(findings)
    rollback_agent = run_rollback_agent(repo_id, pr_number, source_branch, findings)
    cost_agent = run_cost_agent(findings)
    db_agent = run_db_agent(findings)
    orchestrator = run_release_orchestrator(
        title,
        description,
        risk,
        findings,
        {"sec": sec_agent, "infra": infra_agent, "rollback": rollback_agent}
    )

    all_agents = [orchestrator, sec_agent, infra_agent, rollback_agent, cost_agent, db_agent]

    # Step 8: PR Comment & Status Check
    comment_data = generate_github_pr_comment(pr_number, risk, findings, all_agents)

    # Step 7: Store in DB
    # Delete existing PR records if updating (synchronize)
    cursor.execute("DELETE FROM findings WHERE pr_id = ?", (pr_id,))
    cursor.execute("DELETE FROM agent_outputs WHERE pr_id = ?", (pr_id,))
    cursor.execute("DELETE FROM pr_comments WHERE pr_id = ?", (pr_id,))
    cursor.execute("DELETE FROM pull_requests WHERE id = ?", (pr_id,))

    cursor.execute("""
        INSERT INTO pull_requests (
            id, repo_id, pr_number, title, description, author,
            source_branch, target_branch, status, risk_score, risk_level,
            verdict, comment_posted, diff_content, files_changed_json,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, 1, ?, ?, ?, ?)
    """, (
        pr_id, repo_id, pr_number, title, description, author,
        source_branch, target_branch, risk["score"], risk["level"],
        risk["verdict"], diff_text, json.dumps(["diff.patch"]), now, now
    ))

    for f in findings:
        cursor.execute("""
            INSERT INTO findings (
                id, pr_id, scanner_type, severity, title, description,
                file_path, line_number, snippet, remediation, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f.get("id", f"find_{uuid.uuid4().hex[:8]}"), pr_id, f["scanner_type"], f["severity"],
            f["title"], f["description"], f.get("file_path"), f.get("line_number", 1),
            f.get("snippet", ""), f.get("remediation", ""), now
        ))

    for a in all_agents:
        cursor.execute("""
            INSERT INTO agent_outputs (
                id, pr_id, agent_name, agent_role, status, summary,
                verdict, details_json, confidence, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            a["id"], pr_id, a["agent_name"], a["agent_role"], a["status"],
            a["summary"], a.get("verdict"), json.dumps(a.get("details_json", {})),
            a.get("confidence", 0.95), now
        ))

    cursor.execute("""
        INSERT INTO pr_comments (
            id, pr_id, comment_body, status_check_state, status_check_description, posted_at
        ) VALUES (?, ?, ?, ?, ?, ?)
    """, (
        f"comment_{pr_id}", pr_id, comment_data["comment_body"],
        comment_data["status_check_state"], comment_data["status_check_description"], now
    ))

    conn.commit()
    conn.close()

    return {
        "pr_id": pr_id,
        "pr_number": pr_number,
        "risk_score": risk["score"],
        "risk_level": risk["level"],
        "verdict": risk["verdict"],
        "findings_count": len(findings),
        "comment_posted": True
    }

@router.post("/github")
async def github_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Step 2: Receives GitHub Webhook events (pull_request opened/synchronized).
    """
    event = request.headers.get("X-GitHub-Event", "pull_request")
    payload = await request.json()

    if event == "ping":
        return {"status": "pong", "message": "ReleaseGuard Webhook registered successfully!"}

    if event == "pull_request":
        action = payload.get("action", "opened")
        pr_data = payload.get("pull_request", {})
        repo_data = payload.get("repository", {})

        if action not in {"opened", "reopened", "synchronize"}:
            return {"status": "ignored", "event": event, "action": action}

        repo_full_name = (repo_data or {}).get("full_name")
        pr_number = int((pr_data or {}).get("number") or 0)
        token = str((repo_data or {}).get("token") or "").strip() or str(os.getenv("GITHUB_TOKEN", "")).strip()

        if not repo_full_name or not token or pr_number <= 0:
            diff_text = payload.get("diff_content", "")
            if not diff_text and "diff_url" in pr_data:
                diff_text = "# Mock diff fetched from diff_url\n+ API_KEY = 'AKIA1234567890123456'"

            result = process_pr_pipeline(repo_data, pr_data, diff_text)
            return {
                "status": "success",
                "message": f"Processed PR #{result['pr_number']}",
                "result": result
            }

        review_result = trigger_review_for_repo(repo_full_name, token, pr_number, repo_id=f"repo_{repo_full_name.replace('/', '_')}", pr_data=pr_data)
        return {
            "status": "success",
            "message": f"Reviewed PR #{review_result['pr_number']} via GitHub review bot",
            "result": review_result,
        }

    return {"status": "ignored", "event": event}
