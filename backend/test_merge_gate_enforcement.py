from backend.github_review_service import enforce_review_policy


def test_enforce_review_policy_blocks_risky_prs(monkeypatch, tmp_path):
    db_path = tmp_path / 'merge_gate.db'
    import sqlite3
    from backend import github_review_service

    conn = sqlite3.connect(str(db_path))
    conn.execute(
        "CREATE TABLE repo_review_configs (id TEXT PRIMARY KEY, repo_id TEXT, auto_review_enabled BOOLEAN DEFAULT 1, severity_threshold TEXT DEFAULT 'medium', created_at TEXT, updated_at TEXT)"
    )
    conn.execute(
        "INSERT INTO repo_review_configs (id, repo_id, auto_review_enabled, severity_threshold, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
        ('cfg_1', 'repo_merge_gate', 1, 'medium'),
    )
    conn.commit()
    conn.close()

    monkeypatch.setattr(github_review_service, 'get_db', lambda: sqlite3.connect(str(db_path)))

    result = enforce_review_policy('repo_merge_gate', {'score': 62, 'level': 'HIGH', 'verdict': 'CONDITIONAL'})

    assert result['merge_gate_blocked'] is True
    assert result['effective_verdict'] == 'NO-GO'
    assert result['threshold'] == 'medium'
