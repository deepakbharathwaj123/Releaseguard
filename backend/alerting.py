# =============================================================
# ReleaseGuard AI — Built with IBM Bob
# © IBM Bob | ibm.com/products/watsonx
# =============================================================


import json
import os
from typing import Any, Dict, Optional

import requests


def _env(name: str) -> str:
    return (os.getenv(name) or "").strip()


def build_slack_payload(repo_name: str, pr_number: int, risk_level: str, verdict: str, findings_count: int, summary: str) -> Dict[str, Any]:
    text = (
        "ReleaseGuard alert\n"
        f"Repo: {repo_name}\n"
        f"PR #{pr_number}\n"
        f"Risk: {risk_level}\n"
        f"Verdict: {verdict}\n"
        f"Findings: {findings_count}\n"
        f"Summary: {summary}"
    )
    return {"text": text}


def build_teams_payload(repo_name: str, pr_number: int, risk_level: str, verdict: str, findings_count: int, summary: str) -> Dict[str, Any]:
    content = (
        "<p><strong>ReleaseGuard alert</strong></p>"
        f"<p><strong>Repo:</strong> {repo_name}<br/>"
        f"<strong>PR #{pr_number}</strong><br/>"
        f"<strong>Risk:</strong> {risk_level}<br/>"
        f"<strong>Verdict:</strong> {verdict}<br/>"
        f"<strong>Findings:</strong> {findings_count}<br/>"
        f"<strong>Summary:</strong> {summary}</p>"
    )
    return {
        "type": "message",
        "attachments": [{
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": content,
        }],
    }


def send_review_alerts(repo_name: str, pr_number: int, risk_level: str, verdict: str, findings_count: int, summary: str) -> Dict[str, Any]:
    slack_url = _env("SLACK_ALERT_WEBHOOK_URL")
    teams_url = _env("TEAMS_ALERT_WEBHOOK_URL")
    results = []

    if slack_url:
        response = requests.post(
            slack_url,
            json=build_slack_payload(repo_name, pr_number, risk_level, verdict, findings_count, summary),
            timeout=20,
        )
        response.raise_for_status()
        results.append({"channel": "slack", "status": "sent", "url": slack_url})

    if teams_url:
        response = requests.post(
            teams_url,
            json=build_teams_payload(repo_name, pr_number, risk_level, verdict, findings_count, summary),
            timeout=20,
        )
        response.raise_for_status()
        results.append({"channel": "teams", "status": "sent", "url": teams_url})

    if not results:
        return {"status": "skipped", "reason": "No alert webhook configured"}

    return {"status": "sent", "channels": results}
