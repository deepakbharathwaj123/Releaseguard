import json
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..models import ManualScanRequest
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
    if repo_id:
        query += " WHERE p.repo_id = ?"
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
