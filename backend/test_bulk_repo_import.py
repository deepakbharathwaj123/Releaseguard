import sqlite3

from backend.routers import repos as repos_router


def test_bulk_import_creates_connected_repos(monkeypatch, tmp_path):
    db_path = tmp_path / 'bulk_import.db'
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
    conn.commit()
    conn.close()

    monkeypatch.setattr(repos_router, 'get_db', lambda: sqlite3.connect(db_path))
    monkeypatch.setattr(
        repos_router,
        'fetch_github_repo_metadata',
        lambda token, repo_name: {
            'name': repo_name.split('/')[-1],
            'full_name': repo_name,
            'description': 'Imported repo',
            'default_branch': 'main'
        },
    )

    result = repos_router.bulk_import_repositories({
        'token': 'abc',
        'repos': ['acme/payments-api', 'acme/worker-service'],
    })

    assert result['status'] == 'imported'
    assert result['count'] == 2
    assert [repo['full_name'] for repo in result['repos']] == ['acme/payments-api', 'acme/worker-service']
