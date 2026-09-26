import sqlite3

import pytest

from backend.github_review_service import evaluate_review_policy
from backend.routers.repos import get_review_policy, set_review_policy


def test_set_review_policy_persists_config(monkeypatch, tmp_path):
    db_path = tmp_path / 'review_policy.db'
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
        "INSERT INTO repositories (id, name, full_name, description, default_branch, webhook_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        ('repo_demo_123', 'demo', 'demo/demo', 'demo repo', 'main', 1),
    )
    conn.commit()
    conn.close()

    def fake_get_db():
        db = sqlite3.connect(db_path)
        db.row_factory = sqlite3.Row
        return db

    monkeypatch.setattr('backend.routers.repos.get_db', fake_get_db)

    result = set_review_policy('repo_demo_123', {'auto_review_enabled': False, 'severity_threshold': 'high'})

    assert result['auto_review_enabled'] is False
    assert result['severity_threshold'] == 'high'

    saved = get_review_policy('repo_demo_123')
    assert saved['auto_review_enabled'] is False
    assert saved['severity_threshold'] == 'high'


def test_get_review_policy_defaults_to_enabled_medium(monkeypatch, tmp_path):
    db_path = tmp_path / 'review_policy_default.db'
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
        "INSERT INTO repositories (id, name, full_name, description, default_branch, webhook_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        ('repo_default_123', 'demo2', 'demo2/demo2', 'repo', 'main', 1),
    )
    conn.commit()
    conn.close()

    def fake_get_db():
        db = sqlite3.connect(db_path)
        db.row_factory = sqlite3.Row
        return db

    monkeypatch.setattr('backend.routers.repos.get_db', fake_get_db)

    result = get_review_policy('repo_default_123')
    assert result['auto_review_enabled'] is True
    assert result['severity_threshold'] == 'medium'


def test_evaluate_review_policy_enforces_severity_threshold(monkeypatch, tmp_path):
    db_path = tmp_path / 'review_policy_gate.db'
    conn = sqlite3.connect(db_path)
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
        "INSERT INTO repo_review_configs (id, repo_id, auto_review_enabled, severity_threshold, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
        ('cfg_1', 'repo_gate_123', 1, 'high',),
    )
    conn.commit()
    conn.close()

    def fake_get_db():
        db = sqlite3.connect(db_path)
        db.row_factory = sqlite3.Row
        return db

    monkeypatch.setattr('backend.github_review_service.get_db', fake_get_db)

    low_result = evaluate_review_policy('repo_gate_123', 'low')
    medium_result = evaluate_review_policy('repo_gate_123', 'medium')
    critical_result = evaluate_review_policy('repo_gate_123', 'critical')

    assert low_result['allowed'] is True
    assert low_result['decision'] == 'pass'
    assert medium_result['allowed'] is True
    assert medium_result['decision'] == 'pass'
    assert critical_result['allowed'] is False
    assert critical_result['decision'] == 'fail'
