from fastapi import APIRouter, HTTPException

from ..github_service import (
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

    normalized = normalize_repository_name(repo_name)
    metadata = fetch_github_repo_metadata(token, normalized)

    return {
        "status": "authorized",
        "repo_name": normalized,
        "default_branch": metadata.get("default_branch") or "main",
        "description": metadata.get("description") or "Imported GitHub repository",
        "private": bool(metadata.get("private")),
    }


@router.post("/scan")
def scan_github_pr(payload: dict):
    token = str((payload or {}).get("token", "")).strip()
    repo_name = str((payload or {}).get("repo_name", "")).strip()
    pr_number = int((payload or {}).get("pr_number", 0))

    if not token or not repo_name or not pr_number:
        raise HTTPException(status_code=400, detail="GitHub PAT, repo name, and PR number are required")

    normalized_repo = normalize_repository_name(repo_name)
    metadata = fetch_github_open_prs(token, normalized_repo, 1)
    pr_details = metadata[0] if metadata else {}
    diff_text = get_github_diff_text(token, normalized_repo, pr_number)

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
        "head": {"ref": (pr_details.get("head") or {}).get("ref") or "feature/live-scan"},
        "base": {"ref": (pr_details.get("base") or {}).get("ref") or "main"},
    }

    return process_pr_pipeline(repo_data, pr_data, diff_text)
