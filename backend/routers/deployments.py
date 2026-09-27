import json
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..models import IncidentCreateRequest
from ..agents import run_incident_agent

router = APIRouter(prefix="/api/deployments", tags=["deployments"])


def _release_state_for_score(score: int) -> str:
    if score >= 80:
        return "RED"
    if score >= 55:
        return "AMBER"
    return "GREEN"


def get_release_health_summary(repo_id: str):
    conn = get_db()
    conn.row_factory = __import__('sqlite3').Row
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT p.risk_score, p.risk_level, p.verdict, p.pr_number, p.title
        FROM pull_requests p
        WHERE p.repo_id = ?
        ORDER BY p.updated_at DESC
        LIMIT 10
        """,
        (repo_id,),
    )
    pr_rows = cursor.fetchall()

    cursor.execute(
        """
        SELECT COUNT(*) as active_incidents
        FROM incidents
        WHERE repo_id = ? AND status != 'RESOLVED'
        """,
        (repo_id,),
    )
    incident_count = cursor.fetchone()["active_incidents"]

    cursor.execute(
        """
        SELECT COUNT(*) as failed_deployments
        FROM deployments
        WHERE repo_id = ? AND status = 'FAILED'
        """,
        (repo_id,),
    )
    failed_deploys = cursor.fetchone()["failed_deployments"]

    if not pr_rows:
        conn.close()
        return {
            "repo_id": repo_id,
            "state": "GREEN",
            "risk_score": 0,
            "risk_level": "LOW",
            "release_decision": "READY",
            "rollback_recommended": False,
            "open_prs": 0,
            "active_incidents": 0,
            "failed_deployments": 0,
            "summary": "No active pull requests or active release issues for this repo.",
        }

    risk_scores = [int(row["risk_score"]) for row in pr_rows]
    highest_pr = pr_rows[0]
    pr_risk_score = int(highest_pr["risk_score"]) if highest_pr and highest_pr["risk_score"] is not None else 0
    overall_score = max(0, min(100, round((sum(risk_scores) / len(risk_scores)) * 0.7 + pr_risk_score * 0.3)))
    state = _release_state_for_score(overall_score)
    risk_level = "CRITICAL" if overall_score >= 80 else "HIGH" if overall_score >= 55 else "MEDIUM" if overall_score >= 30 else "LOW"

    blocked = (
        overall_score >= 80
        or failed_deploys > 0
        or incident_count > 0
        or any((row["verdict"] or "").upper() == "NO-GO" for row in pr_rows)
    )

    release_decision = "BLOCKED" if blocked else "READY"
    rollback_recommended = blocked and (failed_deploys > 0 or incident_count > 0 or overall_score >= 80)

    summary_text = (
        f"Current release health is {state}. "
        f"Repo risk score is {overall_score}/100 with {incident_count} active incidents and {failed_deploys} failed deployments. "
        f"Highest-risk PR is #{highest_pr['pr_number']} ({highest_pr['title']}) at {highest_pr['risk_level']} risk."
    )

    conn.close()

    return {
        "repo_id": repo_id,
        "state": state,
        "risk_score": overall_score,
        "risk_level": risk_level,
        "release_decision": release_decision,
        "rollback_recommended": rollback_recommended,
        "open_prs": len(pr_rows),
        "active_incidents": incident_count,
        "failed_deployments": failed_deploys,
        "summary": summary_text,
        "top_pr": {
            "pr_number": highest_pr["pr_number"],
            "title": highest_pr["title"],
            "risk_level": highest_pr["risk_level"],
            "verdict": highest_pr["verdict"],
        },
    }


@router.get("")
def list_deployments():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT d.*, r.name as repo_name, p.title as pr_title, p.pr_number
        FROM deployments d
        JOIN repositories r ON d.repo_id = r.id
        LEFT JOIN pull_requests p ON d.pr_id = p.id
        ORDER BY d.deployed_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append(dict(r))
    return result

@router.get("/release-health/{repo_id}")
def get_release_health(repo_id: str):
    return get_release_health_summary(repo_id)


def get_release_timeline(repo_id: str):
    conn = get_db()
    conn.row_factory = __import__('sqlite3').Row
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT p.pr_number, p.title, p.risk_level, p.verdict, p.updated_at as ts
        FROM pull_requests p
        WHERE p.repo_id = ?
        ORDER BY p.updated_at DESC
        LIMIT 5
        """,
        (repo_id,),
    )
    pr_events = cursor.fetchall()

    cursor.execute(
        """
        SELECT d.version, d.status, d.deployed_at as ts, d.environment
        FROM deployments d
        WHERE d.repo_id = ?
        ORDER BY d.deployed_at DESC
        LIMIT 5
        """,
        (repo_id,),
    )
    deployment_events = cursor.fetchall()

    cursor.execute(
        """
        SELECT i.title, i.severity, i.status, i.created_at as ts
        FROM incidents i
        WHERE i.repo_id = ?
        ORDER BY i.created_at DESC
        LIMIT 5
        """,
        (repo_id,),
    )
    incident_events = cursor.fetchall()

    events = []
    for row in pr_events:
        events.append({
            "kind": "pull_request",
            "label": f"PR #{row['pr_number']}",
            "title": row['title'],
            "status": row['verdict'] or row['risk_level'],
            "timestamp": row['ts'],
        })
    for row in deployment_events:
        events.append({
            "kind": "deployment",
            "label": row['environment'],
            "title": f"Deploy {row['version']}",
            "status": row['status'],
            "timestamp": row['ts'],
        })
    for row in incident_events:
        events.append({
            "kind": "incident",
            "label": row['severity'],
            "title": row['title'],
            "status": row['status'],
            "timestamp": row['ts'],
        })

    events.sort(key=lambda item: item["timestamp"] or "", reverse=True)
    health = get_release_health_summary(repo_id)
    conn.close()

    return {
        "repo_id": repo_id,
        "health_state": health["state"],
        "events": events[:8],
    }


@router.get("/release-timeline/{repo_id}")
def get_release_timeline_route(repo_id: str):
    return get_release_timeline(repo_id)


@router.post("/release-rollback/{repo_id}")
def execute_release_rollback(repo_id: str):
    health = get_release_health_summary(repo_id)
    logs = [
        {"time": "00:00.10", "level": "INIT", "msg": f"Releasing rollback control for repo {repo_id}..."},
        {"time": "00:00.80", "level": "INFO", "msg": f"Decision: {health['release_decision']} - traffic is being routed back to the last known stable release."},
        {"time": "00:02.10", "level": "EXEC", "msg": "kubectl rollout undo deployment --all --namespace=prod"},
        {"time": "00:03.30", "level": "SUCCESS", "msg": "Stable deployment restored and health probes are green."},
    ]
    return {
        "status": "ROLLBACK_COMPLETED",
        "repo_id": repo_id,
        "release_decision": health["release_decision"],
        "logs": logs,
    }


@router.get("/incidents")
def list_incidents():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT i.*, r.name as repo_name, p.title as pr_title, p.pr_number, p.author as pr_author
        FROM incidents i
        JOIN repositories r ON i.repo_id = r.id
        LEFT JOIN pull_requests p ON i.correlated_pr_id = p.id
        ORDER BY i.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        telemetry = {}
        bob_analysis = {}
        try:
            telemetry = json.loads(r["telemetry_json"]) if r["telemetry_json"] else {}
        except Exception:
            telemetry = {}
        try:
            bob_analysis = json.loads(r["bob_analysis_json"]) if r["bob_analysis_json"] else {}
        except Exception:
            bob_analysis = {}

        result.append({
            "id": r["id"],
            "deployment_id": r["deployment_id"],
            "repo_id": r["repo_id"],
            "repo_name": r["repo_name"],
            "correlated_pr_id": r["correlated_pr_id"],
            "pr_title": r["pr_title"],
            "pr_number": r["pr_number"],
            "pr_author": r["pr_author"],
            "title": r["title"],
            "severity": r["severity"],
            "status": r["status"],
            "telemetry": telemetry,
            "bob_analysis": bob_analysis,
            "remediation_runbook": r["remediation_runbook"],
            "created_at": r["created_at"],
            "resolved_at": r["resolved_at"]
        })
    return result

@router.post("/incidents/simulate")
def simulate_incident(req: IncidentCreateRequest):
    """
    Step 11: On incident, calls IBM Bob Incident Analysis Agent,
    Step 12: Stores incident report and links to PR and deployment.
    """
    conn = get_db()
    cursor = conn.cursor()

    # Find the most recently deployed PR for this repo
    cursor.execute("""
        SELECT p.* FROM pull_requests p
        WHERE p.repo_id = ?
        ORDER BY p.updated_at DESC
        LIMIT 1
    """, (req.repo_id,))
    correlated_pr = cursor.fetchone()

    pr_dict = dict(correlated_pr) if correlated_pr else None

    # Call Bob Incident Analysis Agent
    bob_incident_res = run_incident_agent(
        incident_title=req.title,
        severity=req.severity,
        telemetry_type=req.telemetry_type,
        correlated_pr=pr_dict,
        deployment_info={"id": req.deployment_id or "dep_current", "version": "v4.2.1"}
    )

    incident_id = f"inc_{uuid.uuid4().hex[:8]}"
    now = datetime.now().isoformat()

    telemetry_data = {
        "telemetry_type": req.telemetry_type,
        "trigger": "Prometheus Alertmanager / Datadog Webhook",
        "error_threshold": "High Error Rate (> 15%)",
        "p99_latency_ms": 14200 if "504" in req.telemetry_type else 3500,
        "impact": "Degraded Service in Production"
    }

    cursor.execute("""
        INSERT INTO incidents (
            id, deployment_id, repo_id, correlated_pr_id, title, severity,
            status, telemetry_json, bob_analysis_json, remediation_runbook, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'INVESTIGATING', ?, ?, ?, ?)
    """, (
        incident_id, req.deployment_id or "dep_live_prod", req.repo_id,
        pr_dict["id"] if pr_dict else None, req.title, req.severity,
        json.dumps(telemetry_data), json.dumps(bob_incident_res),
        bob_incident_res["details_json"]["emergency_killswitch"], now
    ))

    conn.commit()
    conn.close()

    return {
        "incident_id": incident_id,
        "status": "INCIDENT_RECORDED",
        "bob_analysis": bob_incident_res
    }

@router.post("/incidents/{incident_id}/resolve")
def resolve_incident(incident_id: str):
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now().isoformat()

    cursor.execute("UPDATE incidents SET status = 'RESOLVED', resolved_at = ? WHERE id = ?", (now, incident_id))
    conn.commit()
    conn.close()

    return {"status": "RESOLVED", "incident_id": incident_id, "resolved_at": now}

@router.get("/telemetry")
def get_live_telemetry():
    """
    Returns time-series telemetry metrics for live Grafana-style visual charts
    in the SRE Incident Hub.
    """
    import random
    from datetime import datetime, timedelta

    points = []
    base_time = datetime.now() - timedelta(minutes=30)
    
    # Generate 15 intervals of telemetry points
    for i in range(16):
        t = (base_time + timedelta(minutes=i*2)).strftime("%H:%M")
        # Simulate normal vs spike
        if i >= 10 and i <= 14:
            p99 = random.randint(12000, 15500)
            p95 = random.randint(8500, 11000)
            p50 = random.randint(1200, 2400)
            err_rate = round(random.uniform(15.2, 22.8), 1)
            rps = random.randint(3200, 4800)
        else:
            p99 = random.randint(180, 260)
            p95 = random.randint(95, 140)
            p50 = random.randint(28, 45)
            err_rate = round(random.uniform(0.01, 0.05), 2)
            rps = random.randint(2400, 3100)

        points.append({
            "timestamp": t,
            "p50_latency_ms": p50,
            "p95_latency_ms": p95,
            "p99_latency_ms": p99,
            "error_rate_pct": err_rate,
            "requests_per_sec": rps
        })

    return {
        "cluster": "production-us-east-1",
        "mesh": "Istio Service Mesh v1.21",
        "active_version": "v4.2.1-rc1",
        "canary_weight": 0,
        "stable_weight": 100,
        "points": points
    }

