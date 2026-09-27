import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .database import get_db, init_db
from .routers import webhooks, repos, prs, deployments, demo, github, agent, auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB without inserting seeded demo repositories.
    init_db()
    yield

PORT = int(os.getenv("PORT", "8001"))
HOST = os.getenv("HOST", "127.0.0.1")

app = FastAPI(
    title="ReleaseGuard AI Backend",
    description="Automated DevSecOps Risk Assessment & IBM Bob Multi-Agent Release Governance Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend (port 3000, 3001, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def require_session_for_api(request: Request, call_next):
    path = request.url.path
    is_public = (
        request.method == "OPTIONS"
        or path == "/api/health"
        or path.startswith("/api/auth/")
        or path.startswith("/api/webhooks/")
    )
    if path.startswith("/api/") and not is_public:
        user = auth.get_session_user(request.cookies.get(auth.SESSION_COOKIE_NAME, ""))
        if user is None:
            return JSONResponse(status_code=401, content={"detail": "Authentication required"})
        context_token = auth.set_current_user_id(user["id"])
        try:
            parts = path.strip("/").split("/")
            repo_id = None
            pr_id = None
            incident_id = None
            if len(parts) >= 3 and parts[:2] == ["api", "repos"]:
                candidate = parts[2]
                if candidate not in {"policy-presets", "bulk-import", "connect"}:
                    repo_id = candidate
            elif len(parts) >= 3 and parts[:2] == ["api", "prs"]:
                candidate = parts[2]
                if candidate not in {"scan"}:
                    pr_id = candidate
            elif len(parts) >= 4 and parts[:2] == ["api", "deployments"]:
                if parts[2] in {"release-health", "release-timeline", "release-rollback"}:
                    repo_id = parts[3]
                elif parts[2] == "incidents" and parts[3] not in {"simulate"}:
                    incident_id = parts[3]

            if repo_id and not auth.user_owns_repository(user["id"], repo_id):
                return JSONResponse(status_code=404, content={"detail": "Repository not found"})
            if pr_id and not auth.user_owns_pull_request(user["id"], pr_id):
                return JSONResponse(status_code=404, content={"detail": "Pull request not found"})
            if incident_id and not auth.user_owns_incident(user["id"], incident_id):
                return JSONResponse(status_code=404, content={"detail": "Incident not found"})
            return await call_next(request)
        finally:
            auth.reset_current_user_id(context_token)
    return await call_next(request)

# Include Routers
app.include_router(webhooks.router)
app.include_router(repos.router)
app.include_router(prs.router)
app.include_router(deployments.router)
app.include_router(demo.router)
app.include_router(github.router)
app.include_router(agent.router)
app.include_router(auth.router)

@app.get("/")
def root():
    return {
        "service": "ReleaseGuard AI Backend",
        "status": "operational",
        "version": "1.0.0",
        "documentation": "/docs",
        "supported_scanners": [
            "secrets_scanner",
            "config_scanner",
            "iac_scanner",
            "ci_scanner",
            "test_scanner",
            "cost_scanner",
            "db_scanner"
        ],
        "ibm_bob_agents": [
            "Release Orchestrator Agent",
            "Security Subagent",
            "Infra/DevOps Subagent",
            "Rollback Planner Subagent",
            "Cost Subagent",
            "DB Migration Subagent",
            "Incident Analysis Agent"
        ]
    }

@app.get("/api/health")
def health_check():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as repo_count FROM repositories WHERE webhook_active = 1")
    repo_count = cursor.fetchone()["repo_count"]
    cursor.execute("SELECT COUNT(*) as pr_count FROM pull_requests WHERE repo_id IN (SELECT id FROM repositories WHERE webhook_active = 1)")
    pr_count = cursor.fetchone()["pr_count"]
    conn.close()

    return {
        "status": "healthy",
        "database": "connected",
        "seeded_data_loaded": repo_count > 0 and pr_count > 0,
        "repositories": repo_count,
        "pull_requests": pr_count,
        "ibm_watsonx_mode": "active" if os.getenv("IBM_CLOUD_API_KEY") and len(os.getenv("IBM_CLOUD_API_KEY")) > 10 and "DO_NOT_COMMIT" not in os.getenv("IBM_CLOUD_API_KEY") else "simulated_local_engine"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
