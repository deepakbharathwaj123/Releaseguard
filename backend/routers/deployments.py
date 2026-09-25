import json
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..models import IncidentCreateRequest
from ..agents import run_incident_agent

router = APIRouter(prefix="/api/deployments", tags=["deployments"])

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
