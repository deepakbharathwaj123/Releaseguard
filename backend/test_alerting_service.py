import os

from backend import alerting


def test_build_slack_payload_uses_repo_and_pr_details():
    payload = alerting.build_slack_payload(
        repo_name="acme/payments-api",
        pr_number=42,
        risk_level="CRITICAL",
        verdict="NO-GO",
        findings_count=3,
        summary="Blocked by secrets and IaC issues",
    )

    assert payload["text"].startswith("ReleaseGuard")
    assert "acme/payments-api" in payload["text"]
    assert "PR #42" in payload["text"]
    assert "CRITICAL" in payload["text"]
    assert "NO-GO" in payload["text"]


def test_build_teams_payload_uses_markdown_cards():
    payload = alerting.build_teams_payload(
        repo_name="acme/payments-api",
        pr_number=42,
        risk_level="HIGH",
        verdict="NO-GO",
        findings_count=2,
        summary="Blocked by config drift",
    )

    assert payload["type"] == "message"
    assert "acme/payments-api" in payload["attachments"][0]["content"]
    assert "PR #42" in payload["attachments"][0]["content"]
    assert "HIGH" in payload["attachments"][0]["content"]


def test_send_review_alerts_uses_configured_webhooks(monkeypatch):
    calls = []

    monkeypatch.setenv("SLACK_ALERT_WEBHOOK_URL", "https://hooks.slack.test/alerts")
    monkeypatch.setenv("TEAMS_ALERT_WEBHOOK_URL", "https://example.test/teams")

    class FakeResponse:
        def __init__(self):
            self.status_code = 200

        def raise_for_status(self):
            return None

    def fake_post(url, json=None, data=None, headers=None, timeout=None):
        calls.append({"url": url, "json": json, "data": data, "headers": headers, "timeout": timeout})
        return FakeResponse()

    monkeypatch.setattr(alerting.requests, "post", fake_post)

    alerting.send_review_alerts(
        repo_name="acme/payments-api",
        pr_number=42,
        risk_level="CRITICAL",
        verdict="NO-GO",
        findings_count=3,
        summary="Blocked by secrets and IaC issues",
    )

    assert len(calls) == 2
    assert calls[0]["url"] == "https://hooks.slack.test/alerts"
    assert calls[1]["url"] == "https://example.test/teams"
