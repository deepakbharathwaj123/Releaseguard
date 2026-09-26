import sqlite3

from backend.github_review_service import build_review_summary
from backend.routers.github import review_pr_manually


def test_build_review_summary_includes_risk_and_findings():
    result = build_review_summary({
        "risk_level": "high",
        "findings": [
            {"title": "Public bucket"},
            {"title": "No rollback plan"},
            {"title": "Missing validation"},
        ],
    })

    assert "Risk: HIGH" in result
    assert "Findings: 3" in result
    assert "Public bucket" in result
    assert "request changes before merge" in result.lower()


def test_review_pr_manually_persists_review(monkeypatch, tmp_path):
    db_path = tmp_path / "reviewbot.db"
    conn = sqlite3.connect(db_path)
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
        CREATE TABLE pr_reviews (
            id TEXT PRIMARY KEY,
            repo_id TEXT NOT NULL,
            pr_number INTEGER NOT NULL,
            risk_level TEXT NOT NULL,
            status TEXT NOT NULL,
            summary_text TEXT NOT NULL,
            comment_url TEXT,
            check_run_id TEXT,
            created_at TEXT NOT NULL
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
    monkeypatch.setattr('backend.routers.github.fetch_github_open_prs', lambda token, repo_name, limit: [{"number": 12, "title": "Test PR", "body": "Body", "user": {"login": "alice"}, "head": {"ref": "feature/test", "sha": "abc123"}, "base": {"ref": "main"}}])
    monkeypatch.setattr('backend.routers.github.get_github_diff_text', lambda token, repo_name, pr_number: 'diff --git a/x b/x\n+console.log("hi")')
    monkeypatch.setattr('backend.routers.github.process_pr_pipeline', lambda repo_data, pr_data, diff_text: {"risk_level": "medium", "findings": [{"title": "Minor issue"}]})
    monkeypatch.setattr('backend.routers.github.post_pr_comment', lambda *args, **kwargs: {"html_url": "https://github.com/acme/live-app/pull/12#issuecomment-1"})
    monkeypatch.setattr('backend.routers.github.create_status_check', lambda *args, **kwargs: {"id": "status-123"})
    monkeypatch.setattr('backend.routers.github.save_review_record', lambda conn, repo_id, pr_number, risk_level, status, summary, comment_url=None, check_run_id=None: (
        conn.execute(
            "INSERT INTO pr_reviews (id, repo_id, pr_number, risk_level, status, summary_text, comment_url, check_run_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
            (f"review_{pr_number}", repo_id, pr_number, risk_level, status, summary, comment_url, check_run_id),
        ),
        conn.commit(),
    ))

    result = review_pr_manually({
        'token': 'abc',
        'repo_name': 'acme/live-app',
        'pr_number': 12,
    })

    assert result['status'] == 'reviewed'
    assert result['risk_level'] == 'MEDIUM'
    assert 'Minor issue' in result['summary']

    saved = sqlite3.connect(db_path).execute(
        "SELECT COUNT(*) FROM pr_reviews WHERE repo_id = ? AND pr_number = ?",
        ('repo_acme_live-app', 12),
    ).fetchone()[0]
    assert saved == 1
