# =============================================================
# ReleaseGuard AI — Built with IBM Bob
# © IBM Bob | ibm.com/products/watsonx
# =============================================================


import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import requests


def normalize_repository_name(repo_name: str) -> str:
    if repo_name is None:
        raise ValueError("Repository name is required")

    candidate = str(repo_name).strip().replace("\\", "/")
    if not candidate:
        raise ValueError("Repository name is required")

    if "github.com/" in candidate:
        candidate = candidate.split("github.com/", 1)[1]

    parsed = urlparse(candidate)
    if parsed.netloc and parsed.path:
        candidate = parsed.path.lstrip("/")

    candidate = candidate.rstrip("/")
    if candidate.startswith("http://") or candidate.startswith("https://"):
        candidate = urlparse(candidate).path.lstrip("/")

    if candidate.count("/") != 1:
        raise ValueError("Use the format owner/repo (for example: octo/demo-app)")

    owner, repo = candidate.split("/", 1)
    if not owner or not repo:
        raise ValueError("Use the format owner/repo (for example: octo/demo-app)")

    return f"{owner}/{repo}"


def build_github_headers(token: str) -> Dict[str, str]:
    if not token or not str(token).strip():
        raise ValueError("A GitHub personal access token is required")

    return {
        "Authorization": f"Bearer {token.strip()}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def build_git_login_instructions(username: str, repo_name: Optional[str] = None, remote_url: Optional[str] = None) -> Dict[str, Any]:
    safe_username = (username or "your-github-username").strip() or "your-github-username"
    repo_slug = "owner/repo"

    if repo_name and str(repo_name).strip():
        repo_slug = normalize_repository_name(str(repo_name).strip())

    remote = str(remote_url or f"https://github.com/{repo_slug}.git").strip() or f"https://github.com/{repo_slug}.git"

    commands = [
        f'git config --global user.name "{safe_username}"',
        'git config --global user.email "you@example.com"',
        f'git remote set-url origin {remote}',
        'git config --global credential.helper manager-core',
        'git remote -v',
        'git fetch origin',
    ]

    return {
        "provider": "github",
        "username": safe_username,
        "repo": repo_slug,
        "remote_url": remote,
        "commands": commands,
        "note": "Use a fine-grained PAT with repo access enabled when authenticating to GitHub.",
    }


def get_github_json(token: str, path: str, params: Optional[Dict[str, Any]] = None) -> Any:
    response = requests.get(
        f"https://api.github.com{path}",
        headers=build_github_headers(token),
        params=params,
        timeout=20,
    )

    try:
        payload = response.json()
    except ValueError:
        payload = {"message": response.text}

    if response.status_code >= 400:
        message = payload.get("message", "GitHub API request failed")
        raise RuntimeError(f"GitHub API error for {path}: {message}")

    return payload


def get_github_diff_text(token: str, repo_name: str, pr_number: int) -> str:
    repo_name = normalize_repository_name(repo_name)
    url = f"https://api.github.com/repos/{repo_name}/pulls/{pr_number}"
    response = requests.get(
        url,
        headers={**build_github_headers(token), "Accept": "application/vnd.github.v3.diff"},
        timeout=20,
    )

    if response.status_code >= 400:
        raise RuntimeError(f"Failed to fetch PR diff for {repo_name}#{pr_number}: {response.text[:200]}")

    return response.text


def fetch_github_repo_metadata(token: str, repo_name: str) -> Dict[str, Any]:
    repo_name = normalize_repository_name(repo_name)
    return get_github_json(token, f"/repos/{repo_name}")


def fetch_github_open_prs(token: str, repo_name: str, limit: int = 5) -> List[Dict[str, Any]]:
    repo_name = normalize_repository_name(repo_name)
    pulls = get_github_json(token, f"/repos/{repo_name}/pulls", {"state": "open", "per_page": max(1, limit)})
    if not isinstance(pulls, list):
        return []
    return pulls


def build_repo_record(repo_meta: Dict[str, Any]) -> Dict[str, Any]:
    repo_name = repo_meta.get("full_name") or repo_meta.get("name")
    return {
        "id": f"repo_{repo_name.replace('/', '_') if repo_name else 'imported'}",
        "name": repo_meta.get("name") or "imported-repo",
        "full_name": repo_name or "imported/repo",
        "description": repo_meta.get("description") or "Imported from GitHub",
        "default_branch": repo_meta.get("default_branch") or "main",
        "webhook_active": True,
        "open_prs_count": int(repo_meta.get("open_issues_count") or 0),
    }
