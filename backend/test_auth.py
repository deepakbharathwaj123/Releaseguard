import sqlite3

from fastapi.testclient import TestClient

from backend import database
from backend.main import app


def test_register_login_and_logout_persist_hashed_credentials(monkeypatch, tmp_path):
    monkeypatch.setattr(database, "DB_FILE", str(tmp_path / "auth.db"))
    database.init_db()

    client = TestClient(app)
    response = client.post(
        "/api/auth/register",
        json={"name": "Ada Lovelace", "email": "Ada@example.com", "password": "correct horse battery staple"},
    )

    assert response.status_code == 201
    assert response.json()["email"] == "ada@example.com"
    assert "httponly" in response.headers["set-cookie"].lower()
    assert client.get("/api/repos").status_code == 200

    with sqlite3.connect(database.DB_FILE) as conn:
        stored_hash = conn.execute("SELECT password_hash FROM users WHERE email = ?", ("ada@example.com",)).fetchone()[0]
        session_count = conn.execute("SELECT COUNT(*) FROM user_sessions").fetchone()[0]
    assert stored_hash.startswith("scrypt$")
    assert "correct horse battery staple" not in stored_hash
    assert session_count == 1

    client.post("/api/auth/logout")
    assert client.get("/api/repos").status_code == 401

    login = client.post(
        "/api/auth/login",
        json={"email": "ADA@example.com", "password": "correct horse battery staple"},
    )
    assert login.status_code == 200
    assert client.get("/api/auth/me").json()["id"] == response.json()["id"]


def test_application_api_requires_a_session(monkeypatch, tmp_path):
    monkeypatch.setattr(database, "DB_FILE", str(tmp_path / "auth.db"))
    database.init_db()

    response = TestClient(app).get("/api/repos")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required"}


def test_repositories_are_scoped_to_the_account_that_claimed_them(monkeypatch, tmp_path):
    monkeypatch.setattr(database, "DB_FILE", str(tmp_path / "owner.db"))
    database.init_db()
    with sqlite3.connect(database.DB_FILE) as conn:
        conn.execute(
            """
            INSERT INTO repositories (id, name, full_name, created_at, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
            """,
            ("repo_legacy", "legacy", "acme/legacy"),
        )

    first_account = TestClient(app)
    first_account.post(
        "/api/auth/register",
        json={"name": "First User", "email": "first@example.com", "password": "first password long"},
    )
    assert [repo["id"] for repo in first_account.get("/api/repos").json()] == ["repo_legacy"]

    second_account = TestClient(app)
    second_account.post(
        "/api/auth/register",
        json={"name": "Second User", "email": "second@example.com", "password": "second password long"},
    )
    assert second_account.get("/api/repos").json() == []
    assert second_account.get("/api/repos/repo_legacy").status_code == 404