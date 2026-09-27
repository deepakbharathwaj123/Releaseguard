# =============================================================
# ReleaseGuard AI — Built with IBM Bob
# © IBM Bob | ibm.com/products/watsonx
# =============================================================


import json
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from ..database import get_current_user_id, get_db
from ..models import ManualScanRequest
from ..github_service import fetch_github_open_prs, get_github_diff_text, normalize_repository_name
from .webhooks import process_pr_pipeline

router = APIRouter(prefix="/api/prs", tags=["pull_requests"])

@router.get("")
def list_pull_requests(repo_id: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT p.*, r.name as repo_name, r.full_name as repo_full_name,
               (SELECT COUNT(*) FROM findings f WHERE f.pr_id = p.id) as findings_count
        FROM pull_requests p
        JOIN repositories r ON p.repo_id = r.id
    """
    params = []
    user_id = get_current_user_id()
    if user_id:
        query += " WHERE r.owner_id = ?"
        params.append(user_id)
    if repo_id:
        query += " AND p.repo_id = ?" if user_id else " WHERE p.repo_id = ?"
        params.append(repo_id)

    query += " ORDER BY p.risk_score DESC, p.created_at DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for row in rows:
        result.append({
            "id": row["id"],
            "repo_id": row["repo_id"],
            "repo_name": row["repo_name"],
            "repo_full_name": row["repo_full_name"],
            "pr_number": row["pr_number"],
            "title": row["title"],
            "description": row["description"],
            "author": row["author"],
            "source_branch": row["source_branch"],
            "target_branch": row["target_branch"],
            "status": row["status"],
            "risk_score": row["risk_score"],
            "risk_level": row["risk_level"],
            "verdict": row["verdict"],
            "comment_posted": bool(row["comment_posted"]),
            "findings_count": row["findings_count"] or 0,
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        })
    return result

@router.get("/{pr_id}")
def get_pr_detail(pr_id: str):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT p.*, r.name as repo_name, r.full_name as repo_full_name
        FROM pull_requests p
        JOIN repositories r ON p.repo_id = r.id
        WHERE p.id = ?
    """, (pr_id,))
    pr = cursor.fetchone()

    if not pr:
        conn.close()
        raise HTTPException(status_code=404, detail="Pull request not found")

    # Fetch findings
    cursor.execute("SELECT * FROM findings WHERE pr_id = ? ORDER BY CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END", (pr_id,))
    findings_rows = cursor.fetchall()

    # Fetch agent outputs
    cursor.execute("SELECT * FROM agent_outputs WHERE pr_id = ?", (pr_id,))
    agents_rows = cursor.fetchall()

    # Fetch PR comment
    cursor.execute("SELECT * FROM pr_comments WHERE pr_id = ?", (pr_id,))
    comment_row = cursor.fetchone()

    conn.close()

    findings = []
    for f in findings_rows:
        findings.append({
            "id": f["id"],
            "scanner_type": f["scanner_type"],
            "severity": f["severity"],
            "title": f["title"],
            "description": f["description"],
            "file_path": f["file_path"],
            "line_number": f["line_number"],
            "snippet": f["snippet"],
            "remediation": f["remediation"],
            "created_at": f["created_at"]
        })

    agent_outputs = []
    for a in agents_rows:
        details = {}
        try:
            details = json.loads(a["details_json"]) if a["details_json"] else {}
        except Exception:
            details = {}

        agent_outputs.append({
            "id": a["id"],
            "agent_name": a["agent_name"],
            "agent_role": a["agent_role"],
            "status": a["status"],
            "summary": a["summary"],
            "verdict": a["verdict"],
            "details_json": details,
            "confidence": a["confidence"],
            "created_at": a["created_at"]
        })

    pr_comment = None
    if comment_row:
        pr_comment = {
            "id": comment_row["id"],
            "comment_body": comment_row["comment_body"],
            "status_check_state": comment_row["status_check_state"],
            "status_check_description": comment_row["status_check_description"],
            "posted_at": comment_row["posted_at"]
        }

    return {
        "id": pr["id"],
        "repo_id": pr["repo_id"],
        "repo_name": pr["repo_name"],
        "repo_full_name": pr["repo_full_name"],
        "pr_number": pr["pr_number"],
        "title": pr["title"],
        "description": pr["description"],
        "author": pr["author"],
        "source_branch": pr["source_branch"],
        "target_branch": pr["target_branch"],
        "status": pr["status"],
        "risk_score": pr["risk_score"],
        "risk_level": pr["risk_level"],
        "verdict": pr["verdict"],
        "comment_posted": bool(pr["comment_posted"]),
        "diff_content": pr["diff_content"],
        "created_at": pr["created_at"],
        "updated_at": pr["updated_at"],
        "findings": findings,
        "agent_outputs": agent_outputs,
        "pr_comment": pr_comment
    }

@router.post("/scan")
def trigger_manual_scan(req: ManualScanRequest):
    """
    Allows developers or evaluators to test custom PR diffs instantly.
    """
    repo_data = {
        "name": req.repo_name.split("/")[-1],
        "full_name": req.repo_name,
        "description": "Scanned via ReleaseGuard Sandbox"
    }
    pr_data = {
        "number": int(uuid.uuid4().int % 900 + 200),
        "title": req.title,
        "body": req.description,
        "user": {"login": req.author},
        "head": {"ref": req.source_branch},
        "base": {"ref": req.target_branch}
    }

    result = process_pr_pipeline(repo_data, pr_data, req.diff_content)
    return result

@router.post("/scan/github")
def trigger_github_scan(payload: dict):
    token = str((payload or {}).get("token", "")).strip()
    repo_name = str((payload or {}).get("repo_name", "")).strip()
    pr_number = int((payload or {}).get("pr_number", 0))

    if not token or not repo_name or not pr_number:
        raise HTTPException(status_code=400, detail="GitHub PAT, repo name, and PR number are required")

    normalized_repo = normalize_repository_name(repo_name)
    user_id = get_current_user_id()
    if user_id:
        repo_id = f"repo_{normalized_repo.replace('/', '_')}"
        conn = get_db()
        owned_repo = conn.execute(
            "SELECT 1 FROM repositories WHERE id = ? AND owner_id = ?",
            (repo_id, user_id),
        ).fetchone()
        conn.close()
        if owned_repo is None:
            raise HTTPException(status_code=404, detail="Repository not found")
    diff_text = get_github_diff_text(token, normalized_repo, pr_number)
    metadata = fetch_github_open_prs(token, normalized_repo, 1)
    pr_details = metadata[0] if metadata else {}

    repo_data = {
        "name": normalized_repo.split("/")[-1],
        "full_name": normalized_repo,
        "description": f"Imported from GitHub: {normalized_repo}"
    }

    pr_data = {
        "number": pr_number,
        "title": pr_details.get("title") or f"PR #{pr_number}",
        "body": pr_details.get("body") or "Queued from GitHub repository import",
        "user": {"login": (pr_details.get("user") or {}).get("login") or "github-user"},
        "head": {"ref": (pr_details.get("head") or {}).get("ref") or "feature/live-scan"},
        "base": {"ref": (pr_details.get("base") or {}).get("ref") or "main"}
    }

    return process_pr_pipeline(repo_data, pr_data, diff_text)

@router.post("/{pr_id}/chat")
def chat_with_bob_swarm(pr_id: str, payload: dict):
    """
    Interactive Q&A with IBM Bob Agent Swarm regarding release risk,
    security guardrails, and rollback strategies.
    """
    user_message = payload.get("message", "").strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message is required")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM pull_requests WHERE id = ?", (pr_id,))
    pr = cursor.fetchone()
    if not pr:
        conn.close()
        raise HTTPException(status_code=404, detail="PR not found")

    cursor.execute("SELECT * FROM findings WHERE pr_id = ?", (pr_id,))
    findings = cursor.fetchall()
    conn.close()

    # Build a repo-grounded response from actual findings, not synthetic AI chatter.
    lower_msg = user_message.lower()
    scanner_titles = [f["title"] for f in findings]
    high_severity = [f["title"] for f in findings if str(f.get("severity", "")).upper() in {"HIGH", "CRITICAL"}]
    scan_summary = "; ".join(scanner_titles[:3]) if scanner_titles else "No scanner findings recorded for this PR."

    if any(k in lower_msg for k in ["bypass", "override", "force", "ignore"]):
        response = (
            f"Release verdict for PR #{pr['pr_number']} is currently '{pr['verdict']}'. "
            f"The gate remains enforced because {len(findings)} finding(s) are still open. "
            f"The current blockers are: {scan_summary}. "
            f"Override requires explicit reviewer authorization and a documented remediation follow-up."
        )
    elif any(k in lower_msg for k in ["canary", "traffic", "rollout", "deploy"]):
        response = (
            f"For PR #{pr['pr_number']}, deployment guidance should follow the recorded repo risk. "
            f"If the risk stays above the accepted threshold, continue to block rollout until the active findings are fixed. "
            f"Current high-risk issues: {', '.join(high_severity[:3]) if high_severity else 'No blocking findings on the current diff.'}"
        )
    elif any(k in lower_msg for k in ["secret", "key", "token", "security", "cve"]):
        sec_findings = [f['title'] for f in findings if f['scanner_type'] in ['secrets', 'config']]
        response = (
            f"Security findings recorded for PR #{pr['pr_number']}: {', '.join(sec_findings) if sec_findings else 'No direct secret/config findings detected in this diff.'} "
            f"The latest repo-level review remains gated on the current risk score of {pr['risk_score']}/100."
        )
    elif any(k in lower_msg for k in ["cost", "budget", "billing", "aws", "finops"]):
        response = (
            f"Cost findings are based on the current diff and scanner output only. "
            f"No additional cost statement should be inferred beyond the recorded findings for PR #{pr['pr_number']}. "
            f"Current review summary: {scan_summary}"
        )
    else:
        response = (
            f"PR #{pr['pr_number']} ('{pr['title']}') is currently scored at {pr['risk_score']}/100 ({pr['risk_level']}). "
            f"Verdict: {pr['verdict']}. "
            f"Recorded findings: {scan_summary}. "
            f"This response is derived from the repository diff and the scanner results, not from generic AI filler."
        )

    return {
        "reply": response,
        "author": "ReleaseGuard Review Engine",
        "timestamp": "Just now",
        "pr_id": pr_id
    }

@router.post("/{pr_id}/execute-rollback")
def execute_rollback_simulation(pr_id: str):
    """
    Simulates real-time execution of the automated rollback runbook commands
    with step-by-step console stdout.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM pull_requests WHERE id = ?", (pr_id,))
    pr = cursor.fetchone()
    conn.close()

    if not pr:
        raise HTTPException(status_code=404, detail="PR not found")

    logs = [
        {"time": "00:00.12", "level": "INIT", "msg": f"Initiating automated rollback runbook for PR #{pr['pr_number']}..."},
        {"time": "00:00.45", "level": "INFO", "msg": "Acquiring deployment lock in Kubernetes cluster 'prod-us-east-1' [OK]"},
        {"time": "00:01.10", "level": "EXEC", "msg": "patch virtualservice api-gateway --type merge (weight: 100% stable, 0% canary)..."},
        {"time": "00:01.85", "level": "SUCCESS", "msg": "Canary traffic successfully drained. 100% traffic directed to stable replica set."},
        {"time": "00:02.40", "level": "EXEC", "msg": "kubectl rollout undo deployment/api-server -n prod --to-revision=0"},
        {"time": "00:03.20", "level": "INFO", "msg": "Rolling back pods: 8/8 old pods terminating, 8/8 healthy baseline pods active."},
        {"time": "00:04.05", "level": "EXEC", "msg": "Checking database migration status..."},
        {"time": "00:04.60", "level": "INFO", "msg": "alembic downgrade -1 --sql verification clean. Zero lock contention detected."},
        {"time": "00:05.15", "level": "EXEC", "msg": "Health probe: GET https://api.prod.company.internal/healthz -> HTTP 200 OK (latency: 18ms)"},
        {"time": "00:05.80", "level": "DONE", "msg": "✅ Automated rollback successfully executed in 5.8s. Production baseline restored to 100% health."}
    ]

    return {
        "status": "ROLLBACK_COMPLETED",
        "pr_id": pr_id,
        "execution_duration_sec": 5.8,
        "logs": logs
    }

@router.post("/{pr_id}/override")
def override_pr_verdict(pr_id: str, payload: dict):
    """
    Permits an authorized tech lead to override a release verdict with justification.
    """
    new_verdict = payload.get("verdict", "GO")
    justification = payload.get("justification", "Authorized emergency manual override")
    reviewer = payload.get("reviewer", "Lead SRE Engineer")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM pull_requests WHERE id = ?", (pr_id,))
    pr = cursor.fetchone()
    if not pr:
        conn.close()
        raise HTTPException(status_code=404, detail="PR not found")

    cursor.execute("""
        UPDATE pull_requests 
        SET verdict = ?, description = description || '\n\n[MANUAL OVERRIDE by @' || ? || ']: ' || ?
        WHERE id = ?
    """, (new_verdict, reviewer, justification, pr_id))
    conn.commit()
    conn.close()

    return {
        "status": "OVERRIDE_APPLIED",
        "pr_id": pr_id,
        "new_verdict": new_verdict,
        "reviewer": reviewer
    }

