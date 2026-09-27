import sqlite3

from backend.routers import repos as repos_router


def test_create_and_list_policy_presets(monkeypatch, tmp_path):
    db_path = tmp_path / 'policy_presets.db'
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE team_policy_presets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            severity_threshold TEXT DEFAULT 'medium',
            auto_review_enabled BOOLEAN DEFAULT 1,
            alert_channel TEXT DEFAULT 'slack',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()

    monkeypatch.setattr(repos_router, 'get_db', lambda: sqlite3.connect(db_path))

    created = repos_router.create_team_policy_preset({
        'name': 'platform-strict',
        'description': 'Default for platform repos',
        'severity_threshold': 'high',
        'auto_review_enabled': True,
        'alert_channel': 'slack'
    })

    assert created['name'] == 'platform-strict'
    assert created['severity_threshold'] == 'high'

    rows = repos_router.list_team_policy_presets()
    assert [row['name'] for row in rows] == ['platform-strict']


def test_apply_preset_to_repo_updates_review_policy(monkeypatch, tmp_path):
    db_path = tmp_path / 'apply_preset.db'
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE team_policy_presets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            severity_threshold TEXT DEFAULT 'medium',
            auto_review_enabled BOOLEAN DEFAULT 1,
            alert_channel TEXT DEFAULT 'slack',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE repo_review_configs (
            id TEXT PRIMARY KEY,
            repo_id TEXT NOT NULL,
            auto_review_enabled BOOLEAN DEFAULT 1,
            severity_threshold TEXT DEFAULT 'medium',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE repositories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            full_name TEXT NOT NULL,
            description TEXT,
            default_branch TEXT DEFAULT 'main',
            webhook_active BOOLEAN DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        "INSERT INTO repositories (id, name, full_name, description, default_branch, webhook_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ('repo_dev', 'checkout-api', 'platform/checkout-api', 'Connected repo', 'main', 1, '2024-01-02T00:00:00Z', '2024-01-02T00:00:00Z'),
    )
    conn.execute(
        "INSERT INTO team_policy_presets (id, name, description, severity_threshold, auto_review_enabled, alert_channel, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ('preset_1', 'release-safe', 'Safer release gate', 'medium', 1, 'teams', '2024-01-02T00:00:00Z', '2024-01-02T00:00:00Z'),
    )
    conn.commit()
    conn.close()

    monkeypatch.setattr(repos_router, 'get_db', lambda: sqlite3.connect(db_path))

    result = repos_router.apply_policy_preset_to_repo('repo_dev', {'preset_name': 'release-safe'})

    assert result['repo_id'] == 'repo_dev'
    assert result['severity_threshold'] == 'medium'
    assert result['alert_channel'] == 'teams'
