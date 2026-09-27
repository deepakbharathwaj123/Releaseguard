import os
import json
import sqlite3
from contextvars import ContextVar
from typing import Dict, Any, List, Optional
from datetime import datetime

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "releaseguard.db")
CURRENT_USER_ID: ContextVar[Optional[str]] = ContextVar("current_user_id", default=None)

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def get_current_user_id():
    return CURRENT_USER_ID.get()

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash)")

    # Repositories table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS repositories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        full_name TEXT NOT NULL,
        description TEXT,
        default_branch TEXT DEFAULT 'main',
        webhook_active BOOLEAN DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    repository_columns = {row["name"] for row in cursor.execute("PRAGMA table_info(repositories)")}
    if "owner_id" not in repository_columns:
        cursor.execute("ALTER TABLE repositories ADD COLUMN owner_id TEXT REFERENCES users(id) ON DELETE SET NULL")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_repositories_owner_id ON repositories(owner_id)")

    # Pull Requests table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pull_requests (
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
        updated_at TEXT NOT NULL,
        FOREIGN KEY (repo_id) REFERENCES repositories(id)
    );
    """)

    # Scanner Findings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS findings (
        id TEXT PRIMARY KEY,
        pr_id TEXT NOT NULL,
        scanner_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        file_path TEXT,
        line_number INTEGER,
        snippet TEXT,
        remediation TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (pr_id) REFERENCES pull_requests(id)
    );
    """)

    # IBM Bob Agent Outputs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agent_outputs (
        id TEXT PRIMARY KEY,
        pr_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        agent_role TEXT NOT NULL,
        status TEXT NOT NULL,
        summary TEXT NOT NULL,
        verdict TEXT,
        details_json TEXT,
        confidence REAL DEFAULT 0.95,
        created_at TEXT NOT NULL,
        FOREIGN KEY (pr_id) REFERENCES pull_requests(id)
    );
    """)

    # PR Comments / Status Checks
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pr_comments (
        id TEXT PRIMARY KEY,
        pr_id TEXT NOT NULL,
        comment_body TEXT NOT NULL,
        status_check_state TEXT NOT NULL,
        status_check_description TEXT,
        posted_at TEXT NOT NULL,
        FOREIGN KEY (pr_id) REFERENCES pull_requests(id)
    );
    """)

    # GitHub PR review bot history
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pr_reviews (
        id TEXT PRIMARY KEY,
        repo_id TEXT NOT NULL,
        pr_number INTEGER NOT NULL,
        risk_level TEXT NOT NULL,
        status TEXT NOT NULL,
        summary_text TEXT NOT NULL,
        comment_url TEXT,
        check_run_id TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # Repo review config
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS repo_review_configs (
        id TEXT PRIMARY KEY,
        repo_id TEXT NOT NULL,
        auto_review_enabled BOOLEAN DEFAULT 1,
        severity_threshold TEXT DEFAULT 'medium',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # Team policy presets
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS team_policy_presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        severity_threshold TEXT DEFAULT 'medium',
        auto_review_enabled BOOLEAN DEFAULT 1,
        alert_channel TEXT DEFAULT 'slack',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # Deployments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS deployments (
        id TEXT PRIMARY KEY,
        repo_id TEXT NOT NULL,
        pr_id TEXT,
        environment TEXT NOT NULL,
        version TEXT NOT NULL,
        status TEXT NOT NULL,
        deployed_by TEXT NOT NULL,
        deployed_at TEXT NOT NULL,
        FOREIGN KEY (repo_id) REFERENCES repositories(id),
        FOREIGN KEY (pr_id) REFERENCES pull_requests(id)
    );
    """)

    # Runtime Incidents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        deployment_id TEXT,
        repo_id TEXT NOT NULL,
        correlated_pr_id TEXT,
        title TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        telemetry_json TEXT,
        bob_analysis_json TEXT,
        remediation_runbook TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        FOREIGN KEY (deployment_id) REFERENCES deployments(id),
        FOREIGN KEY (repo_id) REFERENCES repositories(id),
        FOREIGN KEY (correlated_pr_id) REFERENCES pull_requests(id)
    );
    """)

    # Project Agent Chat History
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agent_chat_history (
        id TEXT PRIMARY KEY,
        project TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # Project Agent Memory Snapshot
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agent_project_memory (
        project TEXT PRIMARY KEY,
        memory_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # Project Agent Action Log
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agent_action_log (
        id TEXT PRIMARY KEY,
        project TEXT NOT NULL,
        action_type TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata_json TEXT,
        created_at TEXT NOT NULL
    );
    """)

    conn.commit()
    conn.close()
