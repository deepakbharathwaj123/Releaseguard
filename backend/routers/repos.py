from fastapi import APIRouter, HTTPException
from typing import List, Optional
from ..database import get_db
from ..github_service import fetch_github_repo_metadata, normalize_repository_name

router = APIRouter(prefix="/api/repos", tags=["repos"])

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
