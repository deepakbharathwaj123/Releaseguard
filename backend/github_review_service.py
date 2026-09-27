import os
import sqlite3
import sys
from datetime import datetime

import requests

from .database import get_db
from .github_service import get_github_diff_text, get_github_json
from .alerting import send_review_alerts

DEFAULT_POLICY_PRESETS = {
    "strict": {
        "auto_review_enabled": True,
        "severity_threshold": "high",
        "name": "Strict",
        "description": "Fail on high or critical findings before merge.",
    },
    "balanced": {
        "auto_review_enabled": True,
        "severity_threshold": "medium",
        "name": "Balanced",
        "description": "Block medium and higher severity issues by default.",
    },
    "permissive": {
        "auto_review_enabled": True,
        "severity_threshold": "low",
        "name": "Permissive",
        "description": "Allow low-risk changes through while still reviewing higher findings.",
    },
}


def get_policy_presets():
    return {
        name: {
            **config,
            "severity_threshold": str(config.get("severity_threshold", "medium")).lower(),
        }
        for name, config in DEFAULT_POLICY_PRESETS.items()
    }


def send_policy_alert(repo_full_name, pr_number, risk_level, summary, policy_context=None):
    webhook_url = os.getenv("SLACK_WEBHOOK_URL") or os.getenv("TEAMS_WEBHOOK_URL")
    if not webhook_url:
        return {"status": "skipped", "reason": "No webhook configured"}

    risk_text = str(risk_level or "unknown").upper()
    policy_context = policy_context or {}
    threshold = str(policy_context.get("threshold") or "medium").upper()
    decision = str(policy_context.get("decision") or "review").upper()
    repo_name = repo_full_name or "unknown/repo"

    payload = {
        "text": (
            f"ReleaseGuard policy alert for {repo_name} | PR #{pr_number}\n"
            f"Risk: {risk_text}\n"
            f"Threshold: {threshold}\n"
            f"Decision: {decision}\n"
            f"Summary: {summary}"
        )
    }

    response = requests.post(webhook_url, json=payload, timeout=30)
    response.raise_for_status()
    return {"status": "sent", "channel": "slack", "payload": payload}


def build_review_summary(scan_result):
    findings = scan_result.get("findings", []) or []
    risk_level = str(scan_result.get("risk_level") or "unknown").upper()

    lines = [
        "ReleaseGuard Review",
        "",
        f"Risk: {risk_level}",
        f"Findings: {len(findings)}",
    ]

    for item in findings[:3]:
        title = item.get("title") or item.get("type") or "Issue detected"
        lines.append(f"- {title}")

    lines.extend([
        "",
        "Recommendation: request changes before merge" if risk_level in {"HIGH", "CRITICAL"} else "Recommendation: review for approval",
    ])

    return "\n".join(lines)


def post_pr_comment(repo_full_name, pr_number, token, summary):
    owner, repo = repo_full_name.split("/", 1)
    url = f"https://api.github.com/repos/{owner}/{repo}/issues/{pr_number}/comments"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
    }
    response = requests.post(url, headers=headers, json={"body": summary}, timeout=30)
    response.raise_for_status()
    return response.json()


def create_status_check(repo_full_name, sha, token, risk_level):
    owner, repo = repo_full_name.split("/", 1)
    state = "success"
    if risk_level in {"HIGH", "CRITICAL"}:
        state = "failure"
    elif risk_level == "MEDIUM":
        state = "pending"

    url = f"https://api.github.com/repos/{owner}/{repo}/statuses/{sha}"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
    }
    payload = {
        "state": state,
        "context": "ReleaseGuard",
        "description": f"Risk level: {risk_level.lower()}",
        "target_url": "http://localhost:8001",
    }
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()


def save_review_record(conn, repo_id, pr_number, risk_level, status, summary, comment_url=None, check_run_id=None):
    review_id = f"review_{repo_id}_{pr_number}_{int(datetime.utcnow().timestamp())}"
    conn.execute(
        """
        INSERT INTO pr_reviews (
            id, repo_id, pr_number, risk_level, status, summary_text, comment_url, check_run_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """,
        (review_id, repo_id, pr_number, risk_level, status, summary, comment_url, check_run_id),
    )
    conn.commit()


def evaluate_review_policy(repo_id, risk_level):
    risk_key = str(risk_level or "low").strip().lower()
    allowed_levels = ["low", "medium", "high", "critical"]
    if risk_key not in allowed_levels:
        risk_key = "low"

    threshold = "medium"
    auto_review_enabled = True

    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT auto_review_enabled, severity_threshold FROM repo_review_configs WHERE repo_id = ?",
            (repo_id,),
        )
        row = cursor.fetchone()
        conn.close()

        if row is not None:
            threshold = str((row["severity_threshold"] if isinstance(row, sqlite3.Row) else row[1]) or "medium").strip().lower()
            auto_review_enabled = bool((row["auto_review_enabled"] if isinstance(row, sqlite3.Row) else row[0]) if row else True)
    except Exception:
        threshold = "medium"
        auto_review_enabled = True

    if threshold not in allowed_levels:
        threshold = "medium"

    order = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    if not auto_review_enabled:
        allowed = True
    else:
        allowed = order.get(risk_key, 0) <= order.get(threshold, 1)

    return {
        "repo_id": repo_id,
        "threshold": threshold,
        "auto_review_enabled": auto_review_enabled,
        "risk_level": risk_key.upper(),
        "allowed": allowed,
        "decision": "pass" if allowed else "fail",
    }


def enforce_review_policy(repo_id, risk_info):
    risk_level = str((risk_info or {}).get("level") or "LOW").strip().upper()
    base_verdict = str((risk_info or {}).get("verdict") or "GO").strip().upper()
    policy = evaluate_review_policy(repo_id, risk_level)
    threshold = policy["threshold"]
    blocked = bool(not policy["allowed"])

    if base_verdict == "NO-GO":
        effective_verdict = "NO-GO"
    elif not policy["allowed"]:
        effective_verdict = "NO-GO"
    elif base_verdict == "CONDITIONAL":
        effective_verdict = "CONDITIONAL"
    else:
        effective_verdict = "GO"

    return {
        "repo_id": repo_id,
        "threshold": threshold,
        "auto_review_enabled": policy["auto_review_enabled"],
        "risk_level": risk_level,
        "base_verdict": base_verdict,
        "effective_verdict": effective_verdict,
        "merge_gate_blocked": blocked or effective_verdict == "NO-GO",
        "allowed": not (blocked or effective_verdict == "NO-GO"),
        "decision": "pass" if not (blocked or effective_verdict == "NO-GO") else "fail",
    }


def trigger_review_for_repo(repo_full_name, token, pr_number, repo_id=None, repo_data=None, pr_data=None):
    if not repo_full_name or not token or pr_number <= 0:
        raise ValueError("repo_full_name, token, and pr_number are required")

    router_mod = sys.modules.get("backend.routers.github")
    process_pr_pipeline_fn = getattr(router_mod, "process_pr_pipeline", None) if router_mod is not None else None
    get_db_fn = getattr(router_mod, "get_db", None) if router_mod is not None else None
    get_diff_fn = getattr(router_mod, "get_github_diff_text", None) if router_mod is not None else None
    get_pr_json_fn = getattr(router_mod, "get_github_json", None) if router_mod is not None else None
    comment_fn = getattr(router_mod, "post_pr_comment", None) if router_mod is not None else None
    status_fn = getattr(router_mod, "create_status_check", None) if router_mod is not None else None
    save_fn = getattr(router_mod, "save_review_record", None) if router_mod is not None else None

    if process_pr_pipeline_fn is None:
        from .routers.webhooks import process_pr_pipeline as process_pr_pipeline_fn
    if get_db_fn is None:
        get_db_fn = get_db
    if get_diff_fn is None:
        get_diff_fn = get_github_diff_text
    if get_pr_json_fn is None:
        get_pr_json_fn = get_github_json
    if comment_fn is None:
        comment_fn = post_pr_comment
    if status_fn is None:
        status_fn = create_status_check
    if save_fn is None:
        save_fn = save_review_record

    repo_name = repo_full_name.strip()
    if repo_id is None:
        repo_id = f"repo_{repo_name.replace('/', '_')}"

    pr_meta = {}
    if pr_data and isinstance(pr_data, dict):
        pr_meta = pr_data
    else:
        try:
            pr_meta = get_pr_json_fn(token, f"/repos/{repo_name}/pulls/{pr_number}") or {}
        except Exception:
            pr_meta = {}

    pr_head = (pr_meta or {}).get("head") or {}
    pr_base = (pr_meta or {}).get("base") or {}
    if pr_data and isinstance(pr_data, dict):
        pr_head = (pr_data.get("head") or {}) if isinstance(pr_data.get("head"), dict) else {}
        pr_base = (pr_data.get("base") or {}) if isinstance(pr_data.get("base"), dict) else {}

    repo_details = {
        "name": repo_name.split("/")[-1],
        "full_name": repo_name,
        "description": (repo_data or {}).get("description") or f"Reviewed by ReleaseGuard: {repo_name}",
    }
    pr_payload = pr_data or {
        "number": pr_number,
        "title": pr_meta.get("title") or f"PR #{pr_number}",
        "body": pr_meta.get("body") or "Manual PR review triggered by ReleaseGuard.",
        "user": {"login": (pr_meta.get("user") or {}).get("login") or "github-user"},
        "head": {"ref": pr_head.get("ref") or "feature/review-bot", "sha": pr_head.get("sha") or ""},
        "base": {"ref": pr_base.get("ref") or "main"},
    }

    try:
        diff_text = get_diff_fn(token, repo_name, pr_number)
    except Exception:
        diff_text = "# Review fallback diff\n+ ReleaseGuard review requested\n- no diff available"

    review_result = process_pr_pipeline_fn(repo_details, pr_payload, diff_text)
    summary = build_review_summary(review_result)
    risk_level = str(review_result.get("risk_level") or "unknown").upper()
    policy = evaluate_review_policy(repo_id, risk_level)
    if not policy["allowed"]:
        summary = f"{summary}\n\nPolicy gate: {policy['decision'].upper()} - risk {risk_level} exceeds repo threshold {policy['threshold'].upper()}"
        send_policy_alert(repo_name, pr_number, risk_level, summary, policy)

    comment = comment_fn(repo_name, pr_number, token, summary)
    sha = (pr_head.get("sha") or (pr_data or {}).get("head", {}).get("sha") if isinstance(pr_data, dict) and isinstance((pr_data or {}).get("head"), dict) else "") or ""
    status = status_fn(repo_name, sha, token, risk_level)

    conn = get_db_fn()
    save_fn(
        conn,
        repo_id,
        pr_number,
        risk_level,
        "completed",
        summary,
        comment_url=(comment or {}).get("html_url"),
        check_run_id=(status or {}).get("id"),
    )
    conn.close()

    alert_payload = {
        "repo_name": repo_name,
        "pr_number": pr_number,
        "risk_level": risk_level,
        "verdict": review_result.get("risk_level") if review_result.get("risk_level") else "NO-GO" if policy.get("decision") == "fail" else "GO",
        "findings_count": len(review_result.get("review_result", {}).get("findings", [])) if isinstance(review_result.get("review_result"), dict) else 0,
        "summary": summary,
    }
    alert_payload["verdict"] = "NO-GO" if policy.get("decision") == "fail" else "GO"
    if isinstance(review_result.get("review_result"), dict):
        alert_payload["findings_count"] = len(review_result["review_result"].get("findings", []))
    alert_result = send_review_alerts(**alert_payload)

    return {
        "status": "reviewed",
        "repo_name": repo_name,
        "pr_number": pr_number,
        "risk_level": risk_level,
        "summary": summary,
        "review_result": review_result,
        "policy": policy,
        "alerts": alert_result,
    }
