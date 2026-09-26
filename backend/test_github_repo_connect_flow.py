import os
import sqlite3

import pytest
from fastapi import HTTPException

from backend.routers.github import authorize_github_repo, scan_github_pr


def test_authorize_persists_connected_repo(monkeypatch, tmp_path):
    db_path = tmp_path / 'releaseguard.db'
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

    def fake_get_db():
        db = sqlite3.connect(db_path)
        db.row_factory = sqlite3.Row
        return db

    monkeypatch.setattr('backend.routers.github.get_db', fake_get_db)
    monkeypatch.setattr('backend.routers.github.normalize_repository_name', lambda repo_name: 'acme/live-app')
    monkeypatch.setattr(
        'backend.routers.github.fetch_github_repo_metadata',
        lambda token, repo_name: {
            'name': 'live-app',
            'full_name': 'acme/live-app',
            'description': 'Connected repo',
            'default_branch': 'main',
            'private': False,
        },
    )

    result = authorize_github_repo({'token': 'abc', 'repo_name': 'acme/live-app'})

    assert result['status'] == 'authorized'
    assert result['repo_name'] == 'acme/live-app'
    stored = sqlite3.connect(db_path)
    row = stored.execute('SELECT full_name FROM repositories WHERE id = ?', ('repo_acme_live-app',)).fetchone()
    stored.close()
    assert row is not None
    assert row[0] == 'acme/live-app'


def test_scan_uses_latest_open_pr_when_no_pr_number_is_given(monkeypatch):
    captured = {}

    def fake_fetch_open_prs(token, repo_name, limit=5):
        return [{
            'number': 7,
            'title': 'feat: live simulation',
            'body': 'simulate repo health',
            'user': {'login': 'deepa'},
            'head': {'ref': 'feature/live'},
            'base': {'ref': 'main'},
        }]

    monkeypatch.setattr('backend.routers.github.normalize_repository_name', lambda repo_name: 'acme/live-app')
    monkeypatch.setattr('backend.routers.github.fetch_github_open_prs', fake_fetch_open_prs)
    monkeypatch.setattr('backend.routers.github.get_github_diff_text', lambda token, repo_name, pr_number: 'diff --git a/README.md b/README.md\n+live scan')
    monkeypatch.setattr(
        'backend.routers.github.process_pr_pipeline',
        lambda repo_data, pr_data, diff_text: {'status': 'ok', 'repo_name': repo_data['full_name'], 'pr_number': pr_data['number'], 'risk_level': 'MEDIUM', 'verdict': 'REVIEW'}
    )

    result = scan_github_pr({'token': 'abc', 'repo_name': 'acme/live-app'})

    assert result['status'] == 'ok'
    assert result['pr_number'] == 7
    assert result['risk_level'] == 'MEDIUM'


def test_authorize_rejects_bad_repo_format_with_http_400(monkeypatch):
    monkeypatch.setattr('backend.routers.github.normalize_repository_name', lambda repo_name: (_ for _ in ()).throw(ValueError('Use the format owner/repo (for example: octo/demo-app)')))

    with pytest.raises(HTTPException) as exc:
        authorize_github_repo({'token': 'abc', 'repo_name': 'bad-format'})

    assert exc.value.status_code == 400
    assert 'owner/repo' in str(exc.value.detail)


def test_scan_rejects_github_token_permission_error(monkeypatch):
    monkeypatch.setattr('backend.routers.github.normalize_repository_name', lambda repo_name: 'acme/live-app')
    monkeypatch.setattr(
        'backend.routers.github.fetch_github_open_prs',
        lambda token, repo_name, limit=5: (_ for _ in ()).throw(RuntimeError('Resource not accessible by personal access token')),
    )

    with pytest.raises(HTTPException) as exc:
        scan_github_pr({'token': 'bad-token', 'repo_name': 'acme/live-app', 'pr_number': 2})

    assert exc.value.status_code == 403
    assert 'personal access token' in str(exc.value.detail).lower()
