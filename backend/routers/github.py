# =============================================================
# ReleaseGuard AI — Built with IBM Bob
# © IBM Bob | ibm.com/products/watsonx
# =============================================================


from fastapi import APIRouter, HTTPException

from ..database import get_current_user_id, get_db
from ..github_review_service import (
    build_review_summary,
    create_status_check,
    post_pr_comment,
    save_review_record,
    trigger_review_for_repo,
)
from ..github_service import (
    build_git_login_instructions,
    fetch_github_open_prs,
    fetch_github_repo_metadata,
    get_github_diff_text,
    normalize_repository_name,
)
from .webhooks import process_pr_pipeline

router = APIRouter(prefix="/api/github", tags=["github"])


@router.post("/authorize")
def authorize_github_repo(payload: dict):
    token = str((payload or {}).get("token", "")).strip()
    repo_name = str((payload or {}).get("repo_name", "")).strip()

    if not token or not repo_name:
        raise HTTPException(status_code=400, detail="GitHub repo name and PAT are required")

    try:
        normalized = normalize_repository_name(repo_name)
        metadata = fetch_github_repo_metadata(token, normalized)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=403, detail=f"GitHub authentication failed: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"GitHub repository lookup failed: {exc}") from exc

    repo_id = f"repo_{normalized.replace('/', '_')}"
    conn = get_db()
    cursor = conn.cursor()
    user_id = get_current_user_id()
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
                metadata.get("description") or "Connected GitHub repository",
                metadata.get("default_branch") or "main",
            ),
        )
        conn.commit()
    if user_id:
        cursor.execute("UPDATE repositories SET owner_id = ? WHERE id = ? AND owner_id IS NULL", (user_id, repo_id))
        conn.commit()
    conn.close()

    return {
        "status": "authorized",
        "repo_name": normalized,
        "default_branch": metadata.get("default_branch") or "main",
        "description": metadata.get("description") or "Connected GitHub repository",
        "private": bool(metadata.get("private")),
        "repo_id": repo_id,
    }


@router.post("/login")
def generate_git_login(payload: dict):
    username = str((payload or {}).get("username", "")).strip()
    repo_name = str((payload or {}).get("repo_name", "")).strip()
    remote_url = str((payload or {}).get("remote_url", "")).strip()

    if not username:
        raise HTTPException(status_code=400, detail="GitHub username is required")

    return build_git_login_instructions(username, repo_name or "owner/repo", remote_url)


@router.post("/scan")
def scan_github_pr(payload: dict):
    token = str((payload or {}).get("token", "")).strip()
    repo_name = str((payload or {}).get("repo_name", "")).strip()
    pr_number = int((payload or {}).get("pr_number", 0) or 0)

    if not token or not repo_name:
        raise HTTPException(status_code=400, detail="GitHub PAT and repo name are required")

    try:
        normalized_repo = normalize_repository_name(repo_name)
        user_id = get_current_user_id()
        if user_id and not _user_owns_github_repo(user_id, normalized_repo):
            raise HTTPException(status_code=404, detail="Repository not found")
        metadata = fetch_github_open_prs(token, normalized_repo, 5)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=403, detail=f"GitHub PAT access failed: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"GitHub repo lookup failed: {exc}") from exc

    pr_details = metadata[0] if metadata else {}

    if pr_number <= 0 and pr_details:
        pr_number = int(pr_details.get("number") or 0)

    if pr_number <= 0:
        raise HTTPException(status_code=400, detail="No open PR number was found for this repo. Add a valid PR number or open a PR first.")

    try:
        diff_text = get_github_diff_text(token, normalized_repo, pr_number)
    except RuntimeError as exc:
        raise HTTPException(status_code=403, detail=f"GitHub PR access failed: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"GitHub diff lookup failed: {exc}") from exc

    repo_data = {
        "name": normalized_repo.split("/")[-1],
        "full_name": normalized_repo,
        "description": f"Imported from GitHub: {normalized_repo}",
    }
    pr_data = {
        "number": pr_number,
        "title": pr_details.get("title") or f"PR #{pr_number}",
        "body": pr_details.get("body") or "Queued from GitHub authorization.",
        "user": {"login": (pr_details.get("user") or {}).get("login") or "github-user"},
        "head": {"ref": (pr_details.get("head") or {}).get("ref") or "feature/live-scan", "sha": (pr_details.get("head") or {}).get("sha") or ""},
        "base": {"ref": (pr_details.get("base") or {}).get("ref") or "main"},
    }

    return process_pr_pipeline(repo_data, pr_data, diff_text)


@router.post("/review/manual")
def review_pr_manually(payload: dict):
    token = str((payload or {}).get("token", "")).strip()
    repo_name = str((payload or {}).get("repo_name", "")).strip()
    pr_number = int((payload or {}).get("pr_number", 0) or 0)

    if not token or not repo_name or pr_number <= 0:
        raise HTTPException(status_code=400, detail="GitHub PAT, repo name, and PR number are required")

    normalized_repo = normalize_repository_name(repo_name)
    user_id = get_current_user_id()
    if user_id and not _user_owns_github_repo(user_id, normalized_repo):
        raise HTTPException(status_code=404, detail="Repository not found")
    prs = fetch_github_open_prs(token, normalized_repo, 10)
    pr_details = next((pr for pr in prs if int((pr or {}).get("number") or 0) == pr_number), None)

    if pr_details is None:
        raise HTTPException(status_code=400, detail=f"PR #{pr_number} was not found in {normalized_repo}")

    result = trigger_review_for_repo(normalized_repo, token, pr_number, repo_id=f"repo_{normalized_repo.replace('/', '_')}", pr_data={
        "number": pr_number,
        "title": pr_details.get("title") or f"PR #{pr_number}",
        "body": pr_details.get("body") or "Manual PR review triggered by ReleaseGuard.",
        "user": {"login": (pr_details.get("user") or {}).get("login") or "github-user"},
        "head": {"ref": (pr_details.get("head") or {}).get("ref") or "feature/review-bot", "sha": (pr_details.get("head") or {}).get("sha") or ""},
        "base": {"ref": (pr_details.get("base") or {}).get("ref") or "main"},
    })
    return {
        "status": result["status"],
        "repo_name": result["repo_name"],
        "pr_number": result["pr_number"],
        "risk_level": result["risk_level"],
        "summary": result["summary"],
    }


def _user_owns_github_repo(user_id: str, repo_name: str) -> bool:
    repo_id = f"repo_{repo_name.replace('/', '_')}"
    conn = get_db()
    row = conn.execute(
        "SELECT 1 FROM repositories WHERE id = ? AND owner_id = ?",
        (repo_id, user_id),
    ).fetchone()
    conn.close()
    return row is not None
