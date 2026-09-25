from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class RepoBase(BaseModel):
    name: str
    full_name: str
    description: Optional[str] = None
    default_branch: str = "main"

class RepoResponse(RepoBase):
    id: str
    webhook_active: bool
    created_at: str
    updated_at: str
    open_prs_count: Optional[int] = 0
    average_risk_score: Optional[float] = 0.0

class Finding(BaseModel):
    id: Optional[str] = None
    scanner_type: str # secrets, config, iac, ci, tests, cost, db
    severity: str # CRITICAL, HIGH, MEDIUM, LOW, INFO
    title: str
    description: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    snippet: Optional[str] = None
    remediation: Optional[str] = None
    created_at: Optional[str] = None

class AgentOutput(BaseModel):
    id: Optional[str] = None
    agent_name: str # Release Orchestrator, Security Subagent, Infra/DevOps Subagent, Rollback Planner, Cost Subagent, DB Migration Subagent
    agent_role: str
    status: str # SUCCESS, WARNING, FAILED, RUNNING
    summary: str
    verdict: Optional[str] = None # GO, NO-GO, CONDITIONAL
    details_json: Dict[str, Any] = {}
    confidence: float = 0.95
    created_at: Optional[str] = None

class PRDetailResponse(BaseModel):
    id: str
    repo_id: str
    repo_name: Optional[str] = None
    pr_number: int
    title: str
    description: str
    author: str
    source_branch: str
    target_branch: str
    status: str
    risk_score: int
    risk_level: str
    verdict: str
    comment_posted: bool
    diff_content: Optional[str] = None
    files_changed: List[str] = []
    created_at: str
    updated_at: str
    findings: List[Finding] = []
    agent_outputs: List[AgentOutput] = []
    pr_comment: Optional[Dict[str, Any]] = None

class WebhookPRPayload(BaseModel):
    action: str = "opened" # opened, synchronize, reopened
    repository: Dict[str, Any]
    pull_request: Dict[str, Any]

class ManualScanRequest(BaseModel):
    repo_name: str = "ops-pilot/core-banking"
    title: str
    description: str
    author: str = "deepak-dev"
    source_branch: str = "feature/migration"
    target_branch: str = "main"
    diff_content: str

class IncidentCreateRequest(BaseModel):
    repo_id: str
    deployment_id: Optional[str] = None
    title: str
    severity: str = "HIGH"
    telemetry_type: str = "504_LATENCY_SPIKE" # MEMORY_LEAK, DB_LOCK_TIMEOUT, 504_LATENCY_SPIKE
    details: Optional[str] = None
