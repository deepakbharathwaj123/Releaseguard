# =============================================================
# ReleaseGuard AI — Built with IBM Bob
# © IBM Bob | ibm.com/products/watsonx
# =============================================================


from typing import Dict, Any, List

def generate_github_pr_comment(
    pr_number: int,
    risk_info: Dict[str, Any],
    findings: List[Dict[str, Any]],
    agent_outputs: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Constructs a GitHub Pull Request comment markdown body and status check payload
    as specified in Step 8 of ReleaseGuard workflow.
    """
    score = risk_info.get("score", 0)
    level = risk_info.get("level", "LOW")
    verdict = risk_info.get("verdict", "GO")

    badge_emoji = "✅" if verdict == "GO" else ("⚠️" if verdict == "CONDITIONAL" else "⛔")
    badge_title = "APPROVED" if verdict == "GO" else ("CONDITIONAL REVIEW" if verdict == "CONDITIONAL" else "BLOCKED")
    
    # Status check description for GitHub commit status
    if verdict == "GO":
        status_state = "success"
        status_desc = f"ReleaseGuard: {level} Risk ({score}/100) - Ready for automated merge"
    elif verdict == "CONDITIONAL":
        status_state = "pending"
        status_desc = f"ReleaseGuard: {level} Risk ({score}/100) - Requires Tech Lead signoff"
    else:
        status_state = "failure"
        status_desc = f"ReleaseGuard: {level} Risk ({score}/100) - Critical guardrail violations found"

    lines = [
        f"## {badge_emoji} Release Decision: **{badge_title}**",
        "",
        f"> **Risk Score:** `{score}/100` (`{level}`) | **Scanned Guardrails:** 7 active checks | **Verdict:** {verdict}",
        "",
        "### Scanner Findings Summary",
        "",
        "| Scanner Category | Severity | Title | File & Line |",
        "| :--- | :--- | :--- | :--- |"
    ]

    if not findings:
        lines.append("| *All Scanners* | `CLEAN` | No policy or security violations discovered | — |")
    else:
        for f in findings[:6]:
            sev_badge = f"`{f.get('severity')}`"
            lines.append(f"| {f.get('scanner_type').upper()} | {sev_badge} | {f.get('title')} | `{f.get('file_path')}:{f.get('line_number')}` |")
        if len(findings) > 6:
            lines.append(f"| ... and {len(findings) - 6} more findings | | | |")

    lines.extend([
        "",
        "### Review Outcome",
        ""
    ])

    for agent in agent_outputs:
        agent_status_icon = "🟢" if agent.get("status") == "SUCCESS" else ("🟡" if agent.get("status") == "WARNING" else "🔴")
        lines.append(f"- **{agent_status_icon} {agent.get('agent_name')}** ({agent.get('agent_role')}): {agent.get('summary')}")

    # Rollback runbook highlight
    rollback_agent = next((a for a in agent_outputs if "Rollback" in a.get("agent_name", "")), None)
    if rollback_agent:
        steps = rollback_agent.get("details_json", {}).get("steps", [])
        lines.extend([
            "",
            "<details>",
            "<summary><b>🔄 View Pre-Computed Automated Rollback Runbook</b></summary>",
            "",
            "```bash"
        ])
        for s in steps:
            lines.append(f"# Step {s.get('step')}: {s.get('title')}")
            lines.append(s.get("command", ""))
        lines.extend([
            "```",
            "</details>",
            ""
        ])

    lines.extend([
        "---",
        "*Repository review based on the current diff and scanner output for this PR.*"
    ])

    comment_markdown = "\n".join(lines)

    return {
        "comment_body": comment_markdown,
        "status_check_state": status_state,
        "status_check_description": status_desc,
        "posted": True
    }
