from backend.comment_generator import generate_github_pr_comment


def test_generate_github_pr_comment_uses_real_findings_only():
    findings = [
        {
            "severity": "HIGH",
            "scanner_type": "secrets",
            "title": "Hardcoded AWS access key detected",
            "file_path": "backend/auth/jwt_handler.py",
            "line_number": 13,
        },
        {
            "severity": "MEDIUM",
            "scanner_type": "iac",
            "title": "Container runs as root",
            "file_path": "k8s/deployment.yaml",
            "line_number": 27,
        },
    ]
    risk_info = {"score": 87, "level": "HIGH", "verdict": "NO-GO"}
    agent_outputs = [
        {
            "agent_name": "Security Agent",
            "agent_role": "Security review",
            "status": "FAILED",
            "summary": "Hardcoded secret present in auth flow.",
            "details_json": {"steps": [{"step": 1, "title": "Remove secret", "command": "secret rotation"}]},
        }
    ]

    comment = generate_github_pr_comment(42, risk_info, findings, agent_outputs)
    body = comment["comment_body"]

    assert "Hardcoded AWS access key detected" in body
    assert "Container runs as root" in body
    assert "IBM Bob" not in body
    assert "Powered by ReleaseGuard AI" not in body
    assert "Multi-Agent Swarm" not in body
