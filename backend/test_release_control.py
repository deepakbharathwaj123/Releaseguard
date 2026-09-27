import sqlite3

from backend.routers import deployments as deployments_router


def test_release_health_summary_aggregates_risk_and_rollbacks(monkeypatch, tmp_path):
    db_path = tmp_path / "release_control.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        "CREATE TABLE repositories (id TEXT PRIMARY KEY, name TEXT, full_name TEXT, description TEXT, default_branch TEXT, webhook_active BOOLEAN, created_at TEXT, updated_at TEXT)"
    )
    conn.execute(
        "CREATE TABLE pull_requests (id TEXT PRIMARY KEY, repo_id TEXT, pr_number INTEGER, title TEXT, author TEXT, source_branch TEXT, target_branch TEXT, status TEXT, risk_score INTEGER, risk_level TEXT, verdict TEXT, comment_posted BOOLEAN, diff_content TEXT, files_changed_json TEXT, created_at TEXT, updated_at TEXT)"
    )
    conn.execute(
        "CREATE TABLE deployments (id TEXT PRIMARY KEY, repo_id TEXT, pr_id TEXT, environment TEXT, version TEXT, status TEXT, deployed_by TEXT, deployed_at TEXT)"
    )
    conn.execute(
        "CREATE TABLE incidents (id TEXT PRIMARY KEY, deployment_id TEXT, repo_id TEXT, correlated_pr_id TEXT, title TEXT, severity TEXT, status TEXT, telemetry_json TEXT, bob_analysis_json TEXT, remediation_runbook TEXT, created_at TEXT, resolved_at TEXT)"
    )
    conn.execute(
        "INSERT INTO repositories (id, name, full_name, description, default_branch, webhook_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        ("repo_release", "payments-api", "acme/payments-api", "Payments API", "main", 1),
    )
    conn.execute(
        "INSERT INTO pull_requests (id, repo_id, pr_number, title, author, source_branch, target_branch, status, risk_score, risk_level, verdict, comment_posted, diff_content, files_changed_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        ("pr_1", "repo_release", 42, "Add new auth flow", "alice", "feature/auth", "main", "open", 82, "CRITICAL", "NO-GO", 1, "diff", "[]"),
    )
    conn.execute(
        "INSERT INTO deployments (id, repo_id, pr_id, environment, version, status, deployed_by, deployed_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))",
        ("dep_1", "repo_release", "pr_1", "production", "v2.1.0", "FAILED", "release-bot"),
    )
    conn.execute(
        "INSERT INTO incidents (id, deployment_id, repo_id, correlated_pr_id, title, severity, status, telemetry_json, bob_analysis_json, remediation_runbook, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), NULL)",
        ("inc_1", "dep_1", "repo_release", "pr_1", "Checkout latency spike", "CRITICAL", "INVESTIGATING", "{}", "{}", "Rollback release",),
    )
    conn.commit()
    conn.close()

    monkeypatch.setattr(deployments_router, "get_db", lambda: sqlite3.connect(str(db_path)))

    summary = deployments_router.get_release_health_summary("repo_release")

    assert summary["state"] == "RED"
    assert summary["rollback_recommended"] is True
    assert summary["release_decision"] == "BLOCKED"
    assert summary["risk_score"] >= 80


def test_release_timeline_and_rollback_are_generated(monkeypatch, tmp_path):
    db_path = tmp_path / "release_control_timeline.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        "CREATE TABLE repositories (id TEXT PRIMARY KEY, name TEXT, full_name TEXT, description TEXT, default_branch TEXT, webhook_active BOOLEAN, created_at TEXT, updated_at TEXT)"
    )
    conn.execute(
        "CREATE TABLE pull_requests (id TEXT PRIMARY KEY, repo_id TEXT, pr_number INTEGER, title TEXT, author TEXT, source_branch TEXT, target_branch TEXT, status TEXT, risk_score INTEGER, risk_level TEXT, verdict TEXT, comment_posted BOOLEAN, diff_content TEXT, files_changed_json TEXT, created_at TEXT, updated_at TEXT)"
    )
    conn.execute(
        "CREATE TABLE deployments (id TEXT PRIMARY KEY, repo_id TEXT, pr_id TEXT, environment TEXT, version TEXT, status TEXT, deployed_by TEXT, deployed_at TEXT)"
    )
    conn.execute(
        "CREATE TABLE incidents (id TEXT PRIMARY KEY, deployment_id TEXT, repo_id TEXT, correlated_pr_id TEXT, title TEXT, severity TEXT, status TEXT, telemetry_json TEXT, bob_analysis_json TEXT, remediation_runbook TEXT, created_at TEXT, resolved_at TEXT)"
    )
    conn.execute(
        "INSERT INTO repositories (id, name, full_name, description, default_branch, webhook_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        ("repo_release_timeline", "payments-api", "acme/payments-api", "Payments API", "main", 1),
    )
    conn.execute(
        "INSERT INTO pull_requests (id, repo_id, pr_number, title, author, source_branch, target_branch, status, risk_score, risk_level, verdict, comment_posted, diff_content, files_changed_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        ("pr_2", "repo_release_timeline", 10, "Ship auth fix", "bob", "feature/auth", "main", "merged", 70, "HIGH", "NO-GO", 1, "diff", "[]"),
    )
    conn.execute(
        "INSERT INTO deployments (id, repo_id, pr_id, environment, version, status, deployed_by, deployed_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))",
        ("dep_2", "repo_release_timeline", "pr_2", "production", "v2.1.1", "FAILED", "release-bot"),
    )
    conn.execute(
        "INSERT INTO incidents (id, deployment_id, repo_id, correlated_pr_id, title, severity, status, telemetry_json, bob_analysis_json, remediation_runbook, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), NULL)",
        ("inc_2", "dep_2", "repo_release_timeline", "pr_2", "Failed checkout API", "HIGH", "INVESTIGATING", "{}", "{}", "Rollback release",),
    )
    conn.commit()
    conn.close()

    monkeypatch.setattr(deployments_router, "get_db", lambda: sqlite3.connect(str(db_path)))

    timeline = deployments_router.get_release_timeline("repo_release_timeline")
    assert len(timeline["events"]) >= 2
    assert timeline["health_state"] in {"RED", "AMBER"}

    rollback = deployments_router.execute_release_rollback("repo_release_timeline")
    assert rollback["status"] == "ROLLBACK_COMPLETED"
    assert len(rollback["logs"]) >= 4
