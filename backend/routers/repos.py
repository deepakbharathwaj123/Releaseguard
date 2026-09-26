from fastapi import APIRouter, HTTPException
from typing import List, Optional
from ..database import get_db
from ..github_service import fetch_github_repo_metadata, normalize_repository_name

router = APIRouter(prefix="/api/repos", tags=["repos"])


def get_review_policy(repo_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM repo_review_configs WHERE repo_id = ?",
        (repo_id,),
    )
    row = cursor.fetchone()
    conn.close()

    if row is None:
        return {
            "repo_id": repo_id,
            "auto_review_enabled": True,
            "severity_threshold": "medium",
        }

    return {
        "repo_id": row["repo_id"],
        "auto_review_enabled": bool(row["auto_review_enabled"]),
        "severity_threshold": row["severity_threshold"] or "medium",
    }


@router.get("/{repo_id}/review-policy")
def get_review_policy_route(repo_id: str):
    return get_review_policy(repo_id)


@router.post("/{repo_id}/review-policy")
def set_review_policy(repo_id: str, payload: dict):
    if repo_id is None:
        raise HTTPException(status_code=400, detail="Repository id is required")

    auto_review_enabled = bool((payload or {}).get("auto_review_enabled", True))
    severity_threshold = str((payload or {}).get("severity_threshold", "medium")).strip().lower() or "medium"
    allowed = {"low", "medium", "high", "critical"}
    if severity_threshold not in allowed:
        raise HTTPException(status_code=400, detail="severity_threshold must be one of: low, medium, high, critical")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM repo_review_configs WHERE repo_id = ?",
        (repo_id,),
    )
    existing = cursor.fetchone()

    if existing is None:
        cursor.execute(
            """
            INSERT INTO repo_review_configs (id, repo_id, auto_review_enabled, severity_threshold, created_at, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
            """,
            (f"review_cfg_{repo_id}", repo_id, int(auto_review_enabled), severity_threshold),
        )
    else:
        cursor.execute(
            """
            UPDATE repo_review_configs
            SET auto_review_enabled = ?, severity_threshold = ?, updated_at = datetime('now')
            WHERE repo_id = ?
            """,
            (int(auto_review_enabled), severity_threshold, repo_id),
        )

    conn.commit()
    conn.close()

    return {
        "repo_id": repo_id,
        "auto_review_enabled": auto_review_enabled,
        "severity_threshold": severity_threshold,
    }

@router.get("")
def list_repositories():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT r.*, 
               COUNT(p.id) as open_prs_count,
               AVG(p.risk_score) as average_risk_score
        FROM repositories r
        LEFT JOIN pull_requests p ON r.id = p.repo_id AND p.status = 'open'
        WHERE r.webhook_active = 1
        GROUP BY r.id
        ORDER BY r.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for row in rows:
        result.append({
            "id": row["id"],
            "name": row["name"],
            "full_name": row["full_name"],
            "description": row["description"],
            "default_branch": row["default_branch"],
            "webhook_active": bool(row["webhook_active"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "open_prs_count": row["open_prs_count"] or 0,
            "average_risk_score": round(row["average_risk_score"] or 0, 1)
        })
    return result


@router.delete("/{repo_id}")
def delete_repository(repo_id: str):
    if not repo_id:
        raise HTTPException(status_code=400, detail="Repository id is required")

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM repositories WHERE id = ?", (repo_id,))
    if cursor.fetchone() is None:
        raise HTTPException(status_code=404, detail="Repository not found")

    cursor.execute("DELETE FROM repo_review_configs WHERE repo_id = ?", (repo_id,))

    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='pull_requests'")
        if cursor.fetchone():
            cursor.execute("DELETE FROM pull_requests WHERE repo_id = ?", (repo_id,))

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='findings'")
        if cursor.fetchone():
            cursor.execute("DELETE FROM findings WHERE pr_id IN (SELECT id FROM pull_requests WHERE repo_id = ?)", (repo_id,))

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_outputs'")
        if cursor.fetchone():
            cursor.execute("DELETE FROM agent_outputs WHERE pr_id IN (SELECT id FROM pull_requests WHERE repo_id = ?)", (repo_id,))

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='pr_comments'")
        if cursor.fetchone():
            cursor.execute("DELETE FROM pr_comments WHERE pr_id IN (SELECT id FROM pull_requests WHERE repo_id = ?)", (repo_id,))
    except Exception:
        pass

    cursor.execute("DELETE FROM repositories WHERE id = ?", (repo_id,))

    conn.commit()

    return {
        "status": "deleted",
        "repo_id": repo_id,
    }

@router.get("/{repo_id}")
def get_repository(repo_id: str):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM repositories WHERE id = ?", (repo_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"error": "Repository not found"}

    return dict(row)

@router.post("/connect")
def connect_github_repo(payload: dict):
    token = (payload or {}).get("token", "").strip()
    repo_name = (payload or {}).get("repo_name", "").strip()
    if not token or not repo_name:
        raise HTTPException(status_code=400, detail="GitHub repo name and PAT are required")

    normalized = normalize_repository_name(repo_name)
    metadata = fetch_github_repo_metadata(token, normalized)

    repo_id = f"repo_{normalized.replace('/', '_')}"
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM repositories WHERE id = ?", (repo_id,))
    exists = cursor.fetchone()

    if not exists:
        cursor.execute(
            """
            INSERT INTO repositories (id, name, full_name, description, default_branch, webhook_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
            """,
            (repo_id, metadata.get("name", normalized.split("/")[-1]), metadata.get("full_name", normalized), metadata.get("description") or "Imported GitHub repository", metadata.get("default_branch") or "main")
        )

    conn.commit()
    conn.close()

    return {
        "status": "connected",
        "repo_id": repo_id,
        "repo_name": normalized,
        "default_branch": metadata.get("default_branch") or "main",
        "description": metadata.get("description") or "Imported GitHub repository"
    }
