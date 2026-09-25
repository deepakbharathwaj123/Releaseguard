import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .seed_data import seed_database
from .routers import webhooks, repos, prs, deployments, demo, github

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB & Seed Demo Data if empty on startup
    init_db()
    seed_database()
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(webhooks.router)
app.include_router(repos.router)
app.include_router(prs.router)
app.include_router(deployments.router)
app.include_router(demo.router)

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
    return {
        "status": "healthy",
        "database": "connected",
        "ibm_watsonx_mode": "active" if os.getenv("IBM_CLOUD_API_KEY") and len(os.getenv("IBM_CLOUD_API_KEY")) > 10 and "DO_NOT_COMMIT" not in os.getenv("IBM_CLOUD_API_KEY") else "simulated_local_engine"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
