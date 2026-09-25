from fastapi import APIRouter
from typing import List
from ..database import get_db

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
