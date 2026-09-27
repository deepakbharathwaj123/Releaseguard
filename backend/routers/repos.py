# =============================================================
# ReleaseGuard AI — Built with IBM Bob
# © IBM Bob | ibm.com/products/watsonx
# =============================================================


import uuid

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from ..database import get_current_user_id, get_db
from ..github_service import fetch_github_repo_metadata, normalize_repository_name

router = APIRouter(prefix="/api/repos", tags=["repos"])


def _allowed_thresholds():
    return {"low", "medium", "high", "critical"}


def _allowed_alert_channels():
    return {"slack", "teams", "both"}


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
    allowed = _allowed_thresholds()
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


def create_team_policy_preset(payload: dict):
    name = str((payload or {}).get("name", "")).strip()
    if not name:
        raise HTTPException(status_code=400, detail="Preset name is required")

    severity_threshold = str((payload or {}).get("severity_threshold", "medium")).strip().lower() or "medium"
    if severity_threshold not in _allowed_thresholds():
        raise HTTPException(status_code=400, detail="severity_threshold must be one of: low, medium, high, critical")

    auto_review_enabled = bool((payload or {}).get("auto_review_enabled", True))
    alert_channel = str((payload or {}).get("alert_channel", "slack")).strip().lower() or "slack"
    if alert_channel not in _allowed_alert_channels():
        raise HTTPException(status_code=400, detail="alert_channel must be one of: slack, teams, both")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM team_policy_presets WHERE name = ?", (name,))
    existing = cursor.fetchone()
    if existing is not None:
        cursor.execute(
            """
            UPDATE team_policy_presets
            SET description = ?, severity_threshold = ?, auto_review_enabled = ?, alert_channel = ?, updated_at = datetime('now')
            WHERE name = ?
            """,
            (
                (payload or {}).get("description") or "",
                severity_threshold,
                int(auto_review_enabled),
                alert_channel,
                name,
            ),
        )
        preset_id = existing["id"]
    else:
        preset_id = f"preset_{uuid.uuid4().hex[:8]}"
        cursor.execute(
            """
            INSERT INTO team_policy_presets (id, name, description, severity_threshold, auto_review_enabled, alert_channel, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            """,
            (
                preset_id,
                name,
                (payload or {}).get("description") or "",
                severity_threshold,
                int(auto_review_enabled),
                alert_channel,
            ),
        )

    conn.commit()
    conn.close()

    return {
        "id": preset_id,
        "name": name,
        "description": (payload or {}).get("description") or "",
        "severity_threshold": severity_threshold,
        "auto_review_enabled": auto_review_enabled,
        "alert_channel": alert_channel,
    }


def list_team_policy_presets():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM team_policy_presets ORDER BY created_at DESC"
    )
    rows = cursor.fetchall()
    conn.close()

    def as_dict(row):
        if hasattr(row, "keys"):
            return {key: row[key] for key in row.keys()}
        columns = [
            "id",
            "name",
            "description",
            "severity_threshold",
            "auto_review_enabled",
            "alert_channel",
            "created_at",
            "updated_at",
        ]
        return {columns[i]: row[i] for i in range(len(columns))}

    return [
        {
            "id": as_dict(row)["id"],
            "name": as_dict(row)["name"],
            "description": as_dict(row)["description"],
            "severity_threshold": as_dict(row)["severity_threshold"] or "medium",
            "auto_review_enabled": bool(as_dict(row)["auto_review_enabled"]),
            "alert_channel": as_dict(row)["alert_channel"] or "slack",
        }
        for row in rows
    ]


def apply_policy_preset_to_repo(repo_id: str, payload: dict):
    if not repo_id:
        raise HTTPException(status_code=400, detail="Repository id is required")
    preset_name = str((payload or {}).get("preset_name", "")).strip()
    if not preset_name:
        raise HTTPException(status_code=400, detail="preset_name is required")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM repositories WHERE id = ?", (repo_id,))
    if cursor.fetchone() is None:
        raise HTTPException(status_code=404, detail="Repository not found")

    cursor.execute(
        "SELECT * FROM team_policy_presets WHERE name = ?",
        (preset_name,),
    )
    preset = cursor.fetchone()
    if preset is None:
        raise HTTPException(status_code=404, detail="Policy preset not found")

    preset_row = preset if hasattr(preset, "keys") else {
        "id": preset[0],
        "name": preset[1],
        "description": preset[2],
        "severity_threshold": preset[3],
        "auto_review_enabled": preset[4],
        "alert_channel": preset[5],
        "created_at": preset[6],
        "updated_at": preset[7],
    }

    severity_threshold = str(preset_row.get("severity_threshold") or "medium").strip().lower()
    auto_review_enabled = bool(preset_row.get("auto_review_enabled"))
    alert_channel = str(preset_row.get("alert_channel") or "slack").strip().lower()

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
        "preset_name": preset_name,
        "severity_threshold": severity_threshold,
        "auto_review_enabled": auto_review_enabled,
        "alert_channel": alert_channel,
    }


@router.get("/policy-presets")
def get_policy_presets_route():
    return list_team_policy_presets()


@router.post("/policy-presets")
def create_policy_preset_route(payload: dict):
    return create_team_policy_preset(payload)


@router.post("/{repo_id}/apply-policy-preset")
def apply_policy_preset_route(repo_id: str, payload: dict):
    return apply_policy_preset_to_repo(repo_id, payload)


@router.post("/bulk-import")
def bulk_import_repositories(payload: dict):
    token = str((payload or {}).get("token", "")).strip()
    repos = list((payload or {}).get("repos", []) or [])
    if not token:
        raise HTTPException(status_code=400, detail="GitHub token is required")
    if not repos:
        raise HTTPException(status_code=400, detail="At least one repository is required")

    conn = get_db()
    cursor = conn.cursor()
    created = []
    user_id = get_current_user_id()

    for repo_name in repos:
        normalized = normalize_repository_name(str(repo_name).strip())
        metadata = fetch_github_repo_metadata(token, normalized)
        repo_id = f"repo_{normalized.replace('/', '_')}"
        cursor.execute("SELECT * FROM repositories WHERE id = ?", (repo_id,))
        existing = cursor.fetchone()
        if existing is not None and user_id and existing["owner_id"] not in (None, user_id):
            conn.close()
            raise HTTPException(status_code=404, detail="Repository not found")
        if existing is None:
            cursor.execute(
                """
                INSERT INTO repositories (id, name, full_name, description, default_branch, webhook_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
                """,
                (
                    repo_id,
                    metadata.get("name") or normalized.split("/")[-1],
                    metadata.get("full_name") or normalized,
                    metadata.get("description") or "Imported GitHub repository",
                    metadata.get("default_branch") or "main",
                ),
            )
        if user_id:
            cursor.execute("UPDATE repositories SET owner_id = ? WHERE id = ? AND owner_id IS NULL", (user_id, repo_id))
        created.append({
            "id": repo_id,
            "name": metadata.get("name") or normalized.split("/")[-1],
            "full_name": metadata.get("full_name") or normalized,
            "description": metadata.get("description") or "Imported GitHub repository",
            "default_branch": metadata.get("default_branch") or "main",
        })

    conn.commit()
    conn.close()

    return {
        "status": "imported",
        "count": len(created),
        "repos": created,
    }


@router.get("")
def list_repositories():
    conn = get_db()
    cursor = conn.cursor()
    user_id = get_current_user_id()
    owner_filter = " AND r.owner_id = ?" if user_id else ""

    cursor.execute(f"""
        SELECT r.*, 
               COUNT(p.id) as open_prs_count,
               AVG(p.risk_score) as average_risk_score
        FROM repositories r
        LEFT JOIN pull_requests p ON r.id = p.repo_id AND p.status = 'open'
        WHERE r.webhook_active = 1{owner_filter}
        GROUP BY r.id
        ORDER BY r.created_at DESC
    """, (user_id,) if user_id else ())
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
    user_id = get_current_user_id()
    cursor.execute("SELECT * FROM repositories WHERE id = ?", (repo_id,))
    exists = cursor.fetchone()
    if exists is not None and user_id and exists["owner_id"] not in (None, user_id):
        conn.close()
        raise HTTPException(status_code=404, detail="Repository not found")

    if not exists:
        cursor.execute(
            """
            INSERT INTO repositories (id, name, full_name, description, default_branch, webhook_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
            """,
            (repo_id, metadata.get("name", normalized.split("/")[-1]), metadata.get("full_name", normalized), metadata.get("description") or "Imported GitHub repository", metadata.get("default_branch") or "main")
        )

    if user_id:
        cursor.execute("UPDATE repositories SET owner_id = ? WHERE id = ? AND owner_id IS NULL", (user_id, repo_id))

    conn.commit()
    conn.close()

    return {
        "status": "connected",
        "repo_id": repo_id,
        "repo_name": normalized,
        "default_branch": metadata.get("default_branch") or "main",
        "description": metadata.get("description") or "Imported GitHub repository"
    }
