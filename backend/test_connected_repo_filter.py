import sqlite3

from backend.routers import repos as repos_router


def test_delete_repository_removes_it_from_db_and_list(monkeypatch, tmp_path):
    db_path = tmp_path / 'repo_delete.db'
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
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
        """
        CREATE TABLE pull_requests (
            id TEXT PRIMARY KEY,
            repo_id TEXT NOT NULL,
            pr_number INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            author TEXT NOT NULL,
            source_branch TEXT NOT NULL,
            target_branch TEXT NOT NULL,
            status TEXT DEFAULT 'open',
            risk_score INTEGER DEFAULT 0,
            risk_level TEXT DEFAULT 'LOW',
            verdict TEXT DEFAULT 'PENDING',
            comment_posted BOOLEAN DEFAULT 0,
            diff_content TEXT,
            files_changed_json TEXT,
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
        "INSERT INTO repositories (id, name, full_name, description, default_branch, webhook_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ('repo_live', 'live-app', 'acme/live-app', 'connected repo', 'main', 1, '2024-01-02T00:00:00Z', '2024-01-02T00:00:00Z'),
    )
    conn.execute(
        "INSERT INTO repo_review_configs (id, repo_id, auto_review_enabled, severity_threshold, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        ('cfg_live', 'repo_live', 1, 'medium', '2024-01-02T00:00:00Z', '2024-01-02T00:00:00Z'),
    )
    conn.commit()

    monkeypatch.setattr(repos_router, 'get_db', lambda: sqlite3.connect(db_path))

    result = repos_router.delete_repository('repo_live')
    assert result['status'] == 'deleted'
    assert repos_router.list_repositories() == []

    with sqlite3.connect(db_path) as check_conn:
        remaining = check_conn.execute("SELECT COUNT(*) FROM repositories WHERE id = ?", ('repo_live',)).fetchone()[0]
    assert remaining == 0


def test_list_repositories_only_returns_connected_repos(monkeypatch):
    conn = sqlite3.connect(':memory:')
    conn.row_factory = sqlite3.Row
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
        """
        CREATE TABLE pull_requests (
            id TEXT PRIMARY KEY,
            repo_id TEXT NOT NULL,
            pr_number INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            author TEXT NOT NULL,
            source_branch TEXT NOT NULL,
            target_branch TEXT NOT NULL,
            status TEXT DEFAULT 'open',
            risk_score INTEGER DEFAULT 0,
            risk_level TEXT DEFAULT 'LOW',
            verdict TEXT DEFAULT 'PENDING',
            comment_posted BOOLEAN DEFAULT 0,
            diff_content TEXT,
            files_changed_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        "INSERT INTO repositories (id, name, full_name, description, default_branch, webhook_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ('repo_dummy', 'dummy-app', 'demo/dummy-app', 'demo repo', 'main', 0, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
    )
    conn.execute(
        "INSERT INTO repositories (id, name, full_name, description, default_branch, webhook_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ('repo_live', 'live-app', 'acme/live-app', 'connected repo', 'main', 1, '2024-01-02T00:00:00Z', '2024-01-02T00:00:00Z'),
    )
    conn.execute(
        "INSERT INTO pull_requests (id, repo_id, pr_number, title, description, author, source_branch, target_branch, status, risk_score, risk_level, verdict, comment_posted, diff_content, files_changed_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ('pr_1', 'repo_dummy', 1, 'Dummy PR', 'demo', 'dev', 'feature/demo', 'main', 'open', 10, 'LOW', 'PENDING', 0, 'diff', '[]', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
    )
    conn.execute(
        "INSERT INTO pull_requests (id, repo_id, pr_number, title, description, author, source_branch, target_branch, status, risk_score, risk_level, verdict, comment_posted, diff_content, files_changed_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ('pr_2', 'repo_live', 2, 'Live PR', 'real', 'dev', 'feature/live', 'main', 'open', 20, 'MEDIUM', 'PENDING', 0, 'diff', '[]', '2024-01-02T00:00:00Z', '2024-01-02T00:00:00Z'),
    )
    conn.commit()

    monkeypatch.setattr(repos_router, 'get_db', lambda: conn)

    rows = repos_router.list_repositories()

    assert [row['full_name'] for row in rows] == ['acme/live-app']
    assert len(rows) == 1
