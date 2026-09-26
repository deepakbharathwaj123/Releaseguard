from backend.routers.agent import chat_with_project_agent


def test_chat_triggers_scan_for_project_health_questions(monkeypatch):
    def fake_get_project_memory(project_name):
        return {
            "project": project_name,
            "repo_count": 2,
            "pr_count": 3,
            "incident_count": 1,
            "blocker_count": 1,
            "top_pr": {"title": "Fix auth flow", "risk_level": "HIGH", "verdict": "NO-GO"},
            "repo_names": "acme/api, acme/payments",
            "findings_summary": "Secrets leak in config",
        }

    captured = {}

    def fake_auto_scan(project_name, message, memory):
        captured["project"] = project_name
        captured["message"] = message
        captured["memory"] = memory["repo_count"]
        return {"status": "scan-ran", "pr_number": 42, "risk_level": "MEDIUM"}

    monkeypatch.setattr("backend.routers.agent.get_project_memory", fake_get_project_memory)
    monkeypatch.setattr("backend.routers.agent._stored_memory", lambda *args, **kwargs: None)
    monkeypatch.setattr("backend.routers.agent._save_chat_message", lambda *args, **kwargs: None)
    monkeypatch.setattr("backend.routers.agent._save_action", lambda *args, **kwargs: None)
    monkeypatch.setattr("backend.routers.agent._read_chat_history", lambda *args, **kwargs: [])
    monkeypatch.setattr("backend.routers.agent._maybe_auto_scan_project", fake_auto_scan)

    result = chat_with_project_agent({"message": "Analyze project health and scan the repo", "project": "demo"})

    assert result["scan_triggered"] is True
    assert result["scan_result"]["status"] == "scan-ran"
    assert captured["project"] == "demo"


def test_chat_does_not_trigger_scan_for_general_smalltalk(monkeypatch):
    def fake_get_project_memory(project_name):
        return {
            "project": project_name,
            "repo_count": 1,
            "pr_count": 1,
            "incident_count": 0,
            "blocker_count": 0,
            "top_pr": {"title": None, "risk_level": None, "verdict": None},
            "repo_names": "acme/api",
            "findings_summary": "No findings",
        }

    monkeypatch.setattr("backend.routers.agent.get_project_memory", fake_get_project_memory)
    monkeypatch.setattr("backend.routers.agent._stored_memory", lambda *args, **kwargs: None)
    monkeypatch.setattr("backend.routers.agent._save_chat_message", lambda *args, **kwargs: None)
    monkeypatch.setattr("backend.routers.agent._save_action", lambda *args, **kwargs: None)
    monkeypatch.setattr("backend.routers.agent._read_chat_history", lambda *args, **kwargs: [])

    result = chat_with_project_agent({"message": "Tell me a joke", "project": "demo"})

    assert result.get("scan_triggered") is False
    assert result.get("scan_result") in (None, {})
