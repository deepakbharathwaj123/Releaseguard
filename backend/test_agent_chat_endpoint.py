import pytest
from fastapi.testclient import TestClient

from backend import database
from backend.main import app



@pytest.fixture
def client(monkeypatch, tmp_path):
    monkeypatch.setattr(database, "DB_FILE", str(tmp_path / "agent.db"))
    with TestClient(app) as test_client:
        test_client.post(
            "/api/auth/register",
            json={"name": "Agent Tester", "email": "agent@example.com", "password": "agent test password"},
        )
        yield test_client


def test_agent_chat_endpoint_returns_reply(client):
    response = client.post(
        "/api/agent/chat",
        json={"message": "Analyze repo health and list the biggest risks.", "project": "demo-project"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert "reply" in payload
    assert isinstance(payload["reply"], str)
    assert len(payload["reply"]) > 0


def test_agent_history_endpoint_returns_items(client):
    project_name = "demo-project-history"
    client.post(
        "/api/agent/chat",
        json={"message": "Check the project history.", "project": project_name},
    )

    history_response = client.get(f"/api/agent/history?project={project_name}")
    assert history_response.status_code == 200
    history = history_response.json()
    assert "history" in history
    assert isinstance(history["history"], list)
    assert len(history["history"]) >= 1


def test_agent_memory_roundtrip_export_import(client):
    project_name = "demo-project-memory"
    memory_payload = {
        "project": project_name,
        "status": "stable",
        "focus_areas": ["security", "db"],
        "notes": "Keep this memory for the project.",
    }

    import_response = client.post(
        "/api/agent/memory/import",
        json={"project": project_name, "memory": memory_payload},
    )
    assert import_response.status_code == 200

    export_response = client.get(f"/api/agent/memory/export?project={project_name}")
    assert export_response.status_code == 200
    exported = export_response.json()
    assert exported["project"] == project_name
    assert exported["memory"]["status"] == "stable"


def test_agent_action_log_persistence(client):
    project_name = "demo-project-actions"
    response = client.post(
        "/api/agent/actions",
        json={
            "project": project_name,
            "action_type": "scan",
            "message": "Triggered a live scan",
            "metadata": {"repo": "demo/repo"},
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["project"] == project_name
    assert payload["action_type"] == "scan"
