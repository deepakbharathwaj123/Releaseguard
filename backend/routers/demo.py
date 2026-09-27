# =============================================================
# ReleaseGuard AI — Built with IBM Bob
# © IBM Bob | ibm.com/products/watsonx
# =============================================================


from fastapi import APIRouter
from fastapi import HTTPException
from ..seed_data import (
    SAMPLE_DIFF_CRITICAL,
    SAMPLE_DIFF_HIGH,
    SAMPLE_DIFF_MEDIUM,
    SAMPLE_DIFF_LOW,
    seed_database
)

router = APIRouter(prefix="/api/demo", tags=["demo"])

@router.get("/scenarios")
def get_demo_scenarios():
    return [
        {
            "id": "critical_auth_secret",
            "name": "🚨 Critical Security Leak & Privileged Pod",
            "risk_tier": "CRITICAL",
            "repo_name": "ops-pilot/auth-identity-provider",
            "title": "fix(jwt): Hardcode root secrets & elevate pod privileges",
            "description": "Exposes live AWS / IBM Cloud API keys in auth handler and grants container root host privileges.",
            "diff": SAMPLE_DIFF_CRITICAL
        },
        {
            "id": "high_db_migration",
            "name": "💥 Destructive DB Migration & High-Cost GPU",
            "risk_tier": "HIGH",
            "repo_name": "ops-pilot/core-banking-service",
            "title": "feat(ledger): DROP TABLE legacy_audit_ledger & scale RDS tier",
            "description": "Performs destructive DROP TABLE without fallback and provisions enterprise multi-AZ database tier.",
            "diff": SAMPLE_DIFF_HIGH
        },
        {
            "id": "medium_gateway_ci",
            "name": "⚠️ Missing Timeout & Untrusted Script Piping",
            "risk_tier": "MEDIUM",
            "repo_name": "ops-pilot/core-banking-service",
            "title": "perf(payments): Add external payment gateway integration & script setup",
            "description": "Omits HTTP client timeout and executes unverified remote script in CI pipeline.",
            "diff": SAMPLE_DIFF_MEDIUM
        },
        {
            "id": "low_clean_docs",
            "name": "✅ Safe Clean Pull Request (Passing All Gates)",
            "risk_tier": "LOW",
            "repo_name": "ops-pilot/core-banking-service",
            "title": "docs(architecture): Update healthz test coverage & system runbook",
            "description": "Safe architectural documentation update and new unit test assertions with zero security regressions.",
            "diff": SAMPLE_DIFF_LOW
        }
    ]

@router.post("/reset-db")
def reset_database():
    import os
    if os.getenv("ENABLE_DEMO_RESET", "").lower() != "true":
        raise HTTPException(status_code=403, detail="Destructive demo reset is disabled")
    from ..database import DB_FILE
    if os.path.exists(DB_FILE):
        try:
            os.remove(DB_FILE)
        except Exception:
            pass
    seed_database()
    return {"status": "success", "message": "Database reset and seeded with fresh demo data!"}
