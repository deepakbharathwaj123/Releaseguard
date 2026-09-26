from __future__ import annotations

import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Query

from ..database import get_db, init_db


def _is_project_question(message: str) -> bool:
    if not message:
        return False
    lower = message.lower()
    project_keywords = [
        "project",
        "workspace",
        "repo",
        "repository",
        "health",
        "risk",
        "scan",
        "status",
        "release",
        "blocker",
        "deploy",
        "incident",
        "findings",
        "summary",
        "analyze",
        "prioritize",
    ]
    return any(keyword in lower for keyword in project_keywords)


def _maybe_auto_scan_project(project_name: str | None, message: str, memory: dict | None):
    if not _is_project_question(message):
        return None
    if not memory:
        return None

    repo_names = memory.get("repo_names") or "ops-pilot/core-banking-service"
    repo_name = str(repo_names).split(",")[0].strip() if isinstance(repo_names, str) and repo_names else "ops-pilot/core-banking-service"
    if not repo_name or repo_name == "No repositories available":
        repo_name = "ops-pilot/core-banking-service"

    from ..routers.webhooks import process_pr_pipeline

    diff_text = (
        "diff --git a/README.md b/README.md\n"
        "@@\n-Project status\n+Project status and health scan\n"
        "+ Auto-triggered by the Project Agent\n"
        "+ repo: " + repo_name + "\n"
    )

    repo_data = {
        "name": repo_name.split("/")[-1],
        "full_name": repo_name,
        "description": f"Auto-scanned by project agent for: {message[:80]}"
    }
    pr_number = 900 + abs(hash(message)) % 100
    pr_data = {
        "number": pr_number,
        "title": f"Project agent review: {message[:60]}",
        "body": message,
        "user": {"login": "project-agent"},
        "head": {"ref": "agent/auto-scan"},
        "base": {"ref": "main"}
    }
    return process_pr_pipeline(repo_data, pr_data, diff_text)

router = APIRouter(prefix="/api/agent", tags=["agent"])


def _timestamp() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def _stored_memory(project_name: str | None = None):
    init_db()
    project_name = (project_name or "workspace").strip() or "workspace"
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT memory_json FROM agent_project_memory WHERE project = ? ORDER BY updated_at DESC LIMIT 1",
        (project_name,),
    )
    row = cursor.fetchone()
    conn.close()
    if not row or not row["memory_json"]:
        return None
    try:
        return json.loads(row["memory_json"])
    except json.JSONDecodeError:
        return None


def _save_memory(project_name: str | None, memory_payload: dict):
    init_db()
    project_name = (project_name or "workspace").strip() or "workspace"
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO agent_project_memory (project, memory_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(project)
        DO UPDATE SET memory_json = excluded.memory_json, updated_at = excluded.updated_at
        """,
        (project_name, json.dumps(memory_payload, default=str), _timestamp()),
    )
    conn.commit()
    conn.close()


def _read_chat_history(project_name: str | None = None):
    init_db()
    project_name = (project_name or "workspace").strip() or "workspace"
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, project, role, content, created_at FROM agent_chat_history WHERE project = ? ORDER BY created_at ASC",
        (project_name,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "id": row["id"],
            "project": row["project"],
            "role": row["role"],
            "content": row["content"],
            "timestamp": row["created_at"],
        }
        for row in rows
    ]


def _save_chat_message(project_name: str | None, role: str, content: str):
    init_db()
    project_name = (project_name or "workspace").strip() or "workspace"
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO agent_chat_history (id, project, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        (str(uuid.uuid4()), project_name, role, content, _timestamp()),
    )
    conn.commit()
    conn.close()


def _save_action(project_name: str | None, action_type: str, message: str, metadata: dict | None = None):
    init_db()
    project_name = (project_name or "workspace").strip() or "workspace"
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO agent_action_log (id, project, action_type, message, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (
            str(uuid.uuid4()),
            project_name,
            action_type,
            message,
            json.dumps(metadata or {}, default=str),
            _timestamp(),
        ),
    )
    conn.commit()
    conn.close()


def _get_action_history(project_name: str | None = None):
    init_db()
    project_name = (project_name or "workspace").strip() or "workspace"
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, project, action_type, message, metadata_json, created_at FROM agent_action_log WHERE project = ? ORDER BY created_at DESC LIMIT 20",
        (project_name,),
    )
    rows = cursor.fetchall()
    conn.close()
    result = []
    for row in rows:
        metadata_json = row["metadata_json"]
        metadata = json.loads(metadata_json) if metadata_json else {}
        result.append(
            {
                "id": row["id"],
                "project": row["project"],
                "action_type": row["action_type"],
                "message": row["message"],
                "metadata": metadata,
                "timestamp": row["created_at"],
            }
        )
    return result


def get_project_memory(project_name: str | None = None):
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as repo_count FROM repositories")
    repo_count = cursor.fetchone()["repo_count"]

    cursor.execute("SELECT COUNT(*) as pr_count FROM pull_requests")
    pr_count = cursor.fetchone()["pr_count"]

    cursor.execute("SELECT COUNT(*) as incident_count FROM incidents")
    incident_count = cursor.fetchone()["incident_count"]

    cursor.execute("SELECT COUNT(*) as blocker_count FROM pull_requests WHERE risk_level = 'CRITICAL' OR verdict = 'NO-GO'")
    blocker_count = cursor.fetchone()["blocker_count"]

    cursor.execute(
        """
        SELECT p.id, p.title, p.risk_level, p.risk_score, p.verdict, r.full_name, p.pr_number,
               p.description, p.author, p.source_branch, p.target_branch
        FROM pull_requests p
        JOIN repositories r ON r.id = p.repo_id
        ORDER BY p.risk_score DESC, p.updated_at DESC
        LIMIT 1
        """
    )
    top_pr = cursor.fetchone()

    cursor.execute(
        """
        SELECT f.pr_id, f.scanner_type, f.severity, f.title, f.description, f.remediation
        FROM findings f
        ORDER BY CASE f.severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
                 f.created_at DESC
        LIMIT 12
        """
    )
    finding_rows = cursor.fetchall()

    cursor.execute(
        """
        SELECT p.id as pr_id, p.title, p.risk_level, p.verdict, i.id as incident_id, i.title as incident_title,
               i.severity as incident_severity, i.status as incident_status, r.full_name as repo_name
        FROM incidents i
        LEFT JOIN pull_requests p ON p.id = i.correlated_pr_id
        LEFT JOIN repositories r ON r.id = i.repo_id
        ORDER BY i.created_at DESC
        LIMIT 8
        """
    )
    incident_rows = cursor.fetchall()

    cursor.execute(
        """
        SELECT id, full_name, name, description
        FROM repositories
        ORDER BY created_at DESC
        LIMIT 5
        """
    )
    repo_rows = cursor.fetchall()

    conn.close()

    top_pr_label = "No active PR risk detected"
    top_pr_findings = []
    if top_pr:
        top_pr_label = f"{top_pr['title']} ({top_pr['full_name']}) - {top_pr['risk_level']} / {top_pr['verdict']}"
        top_pr_findings = [
            {
                "id": row["title"],
                "scanner_type": row["scanner_type"],
                "severity": row["severity"],
                "title": row["title"],
                "description": row["description"],
                "remediation": row["remediation"],
            }
            for row in finding_rows
            if row["pr_id"] == top_pr["id"]
        ][:5]

    repo_names = ", ".join(row["full_name"] or row["name"] for row in repo_rows) if repo_rows else "No repositories available"
    findings_summary = "; ".join(
        f"{row['scanner_type']} ({row['severity']}): {row['title']}"
        for row in finding_rows[:5]
    ) if finding_rows else "No scanner findings are currently recorded."

    incident_links = [
        {
            "incident_id": row["incident_id"],
            "incident_title": row["incident_title"],
            "incident_severity": row["incident_severity"],
            "incident_status": row["incident_status"],
            "pr_id": row["pr_id"],
            "pr_title": row["title"],
            "repo_name": row["repo_name"],
        }
        for row in incident_rows
    ]

    memory = {
        "project": (project_name or "workspace").strip() or "workspace",
        "repo_count": repo_count,
        "pr_count": pr_count,
        "incident_count": incident_count,
        "blocker_count": blocker_count,
        "top_pr": {
            "id": top_pr["id"] if top_pr else None,
            "title": top_pr["title"] if top_pr else None,
            "risk_level": top_pr["risk_level"] if top_pr else None,
            "verdict": top_pr["verdict"] if top_pr else None,
            "repo_name": top_pr["full_name"] if top_pr else None,
            "pr_number": top_pr["pr_number"] if top_pr else None,
            "author": top_pr["author"] if top_pr else None,
        },
        "top_pr_findings": top_pr_findings,
        "incident_links": incident_links,
        "repo_names": repo_names,
        "findings_summary": findings_summary,
        "focus_areas": [
            "release risk gate",
            "security findings",
            "rollback readiness",
            "PR blocker prioritization",
        ],
        "recommended_actions": [
            "Address the highest-risk PR and its critical findings first.",
            "Verify rollback and canary controls before the next release window.",
            "Correlate active incidents to the relevant PR and deployment state.",
            "Re-run the security and config checks after remediation.",
        ],
    }
    return memory


@router.get("/memory")
def get_project_memory_endpoint(project_name: str | None = Query(default=None, alias="project")):
    project_name = (project_name or "workspace").strip() or "workspace"
    base_memory = get_project_memory(project_name)
    stored_memory = _stored_memory(project_name)
    merged_memory = base_memory if stored_memory is None else {**base_memory, **stored_memory, "project": stored_memory.get("project", project_name)}
    return {"memory": merged_memory}


@router.get("/memory/export")
def export_project_memory(project_name: str | None = Query(default=None, alias="project")):
    project_name = (project_name or "workspace").strip() or "workspace"
    stored_memory = _stored_memory(project_name)
    if stored_memory:
        return {"project": project_name, "memory": stored_memory}
    base_memory = get_project_memory(project_name)
    return {"project": project_name, "memory": base_memory}


@router.post("/memory/import")
def import_project_memory(payload: dict):
    project_name = str((payload or {}).get("project") or "workspace").strip() or "workspace"
    memory_payload = payload.get("memory") if isinstance(payload, dict) else None
    if not isinstance(memory_payload, dict):
        raise ValueError("A valid memory JSON object is required.")
    normalized = {**get_project_memory(project_name), **memory_payload, "project": project_name}
    _save_memory(project_name, normalized)
    return {"project": project_name, "memory": normalized}


@router.get("/history")
def get_project_history(project_name: str | None = Query(default=None, alias="project")):
    return {"history": _read_chat_history(project_name)}


@router.post("/actions")
def log_project_action(payload: dict):
    project_name = str((payload or {}).get("project") or "workspace").strip() or "workspace"
    action_type = str((payload or {}).get("action_type") or "analysis").strip() or "analysis"
    message = str((payload or {}).get("message") or "Project agent action recorded.").strip()
    metadata = payload.get("metadata") if isinstance(payload, dict) else {}
    if not isinstance(metadata, dict):
        metadata = {}
    _save_action(project_name, action_type, message, metadata)
    return {
        "project": project_name,
        "action_type": action_type,
        "message": message,
        "metadata": metadata,
        "timestamp": _timestamp(),
    }


@router.get("/actions")
def read_project_actions(project_name: str | None = Query(default=None, alias="project")):
    return {"actions": _get_action_history(project_name)}


@router.post("/chat")
def chat_with_project_agent(payload: dict):
    message = str((payload or {}).get("message", "")).strip()
    project_name = str((payload or {}).get("project") or "workspace").strip() or "workspace"
    memory = get_project_memory(project_name)
    stored_memory = _stored_memory(project_name)
    if stored_memory:
        memory = {**memory, **stored_memory, "project": stored_memory.get("project", project_name)}

    top_pr = memory["top_pr"]
    top_pr_label = top_pr["title"] if top_pr["title"] else "No active PR risk detected"
    findings_summary = memory["findings_summary"]

    scan_result = None
    if message and _is_project_question(message):
        scan_result = _maybe_auto_scan_project(project_name, message, memory)

    if not message:
        reply = (
            f"The workspace currently has {memory['repo_count']} repositories and {memory['pr_count']} PRs tracked. "
            f"There are {memory['blocker_count']} blocker(s) flagged, with the highest-risk item being {top_pr_label}. "
            f"Current repo focus: {memory['repo_names']}. Observed issue clusters: {findings_summary}."
        )
        _save_chat_message(project_name, "assistant", reply)
        return {
            "reply": reply,
            "summary": memory,
            "history": _read_chat_history(project_name),
        }

    lower = message.lower()
    repo_focus = f"The workspace currently has {memory['repo_count']} tracked repositories: {memory['repo_names']}."
    pr_focus = f"There are {memory['pr_count']} PRs under review, with {memory['blocker_count']} blocker(s) flagged."
    incident_focus = f"There are {memory['incident_count']} recorded incident signal(s) in the system."
    risk_focus = f"The highest-risk item is {top_pr_label}."
    issue_focus = f"The main issue clusters are: {findings_summary}."

    if any(keyword in lower for keyword in ["health", "risk", "status", "repo", "scan", "analyze", "project", "workspace"]):
        reply = (
            f"{repo_focus} {pr_focus} {incident_focus} {risk_focus} {issue_focus} "
            "The project is operational, but the main risk remains concentrated in the PR gate and unresolved signal findings. "
            "Focus on the highest-risk PR first, validate secrets/config findings, and confirm rollback readiness before the next deployment window."
        )
    elif any(keyword in lower for keyword in ["blocker", "blockers", "why", "summarize", "summary"]):
        reply = (
            f"Current blockers: {memory['blocker_count']} item(s) are still in critical/no-go state. {pr_focus} {issue_focus} "
            "The most common causes are still release policy violations, unresolved scanner findings, and missing rollback or release-readiness evidence. "
            "Prioritize the top-risk PR, clear the critical findings, and re-run the release checks before approval."
        )
    elif any(keyword in lower for keyword in ["remediation", "fix", "next", "priority", "release"]):
        reply = (
            f"Recommended next steps: 1) address the highest-risk PR and its blockers first, 2) validate rollback and deployment controls, 3) clear secrets/config exposures, and 4) re-run governance checks before release approval. {repo_focus} {pr_focus} {incident_focus} {issue_focus}"
        )
    else:
        reply = (
            f"{repo_focus} {pr_focus} {incident_focus} {risk_focus} {issue_focus} "
            "The Project Agent recommends a structured review of the live repo and PR findings, then a focused remediation pass on the highest-risk work before release approval."
        )

    if scan_result:
        reply = (
            f"{reply} I also triggered an automatic project scan for the active repo context. "
            f"Scan result: risk {scan_result.get('risk_level', 'review')}, verdict {scan_result.get('verdict', 'PENDING')}"
        )

    _save_chat_message(project_name, "user", message)
    _save_chat_message(project_name, "assistant", reply)
    _save_action(project_name, "analysis", f"Chat prompt: {message}", {"message": message, "project": project_name, "scan_triggered": bool(scan_result)})

    response = {
        "reply": reply,
        "summary": memory,
        "history": _read_chat_history(project_name),
        "scan_triggered": bool(scan_result),
    }
    if scan_result:
        response["scan_result"] = scan_result
    return response
