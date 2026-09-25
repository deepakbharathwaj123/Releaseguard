"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { AuthModal } from "@/components/AuthModal";
import { TeamAuthTab } from "@/components/TeamAuthTab";
import { WorkflowArchitectureBanner } from "@/components/WorkflowArchitectureBanner";
import { PRList, PRSummary } from "@/components/PRList";
import { RepoList, RepoItem } from "@/components/RepoList";
import { PRDetailModal } from "@/components/PRDetailModal";
import { ScannerSandboxModal } from "@/components/ScannerSandboxModal";
import { IncidentHub } from "@/components/IncidentHub";
import { CommandPalette } from "@/components/CommandPalette";
import { UserProfile } from "@/types/auth";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("prs");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(true);
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [prs, setPrs] = useState<PRSummary[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedPrId, setSelectedPrId] = useState<string | null>(null);
  const [selectedPrDetail, setSelectedPrDetail] = useState<any | null>(null);
  const [showSandbox, setShowSandbox] = useState<boolean>(false);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001";

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [reposRes, prsRes, depsRes, incsRes] = await Promise.all([
        fetch(`${API_BASE}/api/repos`),
        fetch(`${API_BASE}/api/prs`),
        fetch(`${API_BASE}/api/deployments`),
        fetch(`${API_BASE}/api/deployments/incidents`),
      ]);

      if (reposRes.ok) setRepos(await reposRes.json());
      if (prsRes.ok) setPrs(await prsRes.json());
      if (depsRes.ok) setDeployments(await depsRes.json());
      if (incsRes.ok) setIncidents(await incsRes.json());
    } catch (err) {
      console.error("Error fetching data from ReleaseGuard API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSelectPr = async (prId: string) => {
    setSelectedPrId(prId);
    try {
      const res = await fetch(`${API_BASE}/api/prs/${prId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPrDetail(data);
      }
    } catch (err) {
      console.error("Failed to load PR detail:", err);
    }
  };

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    setActiveTab("prs");
  };

  const handleSwitchUser = (user: UserProfile) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthModalOpen(true);
    setActiveTab("auth");
  };

  const handleResetDb = async () => {
    if (confirm("Reset ReleaseGuard demo database to fresh sample state?")) {
      try {
        await fetch(`${API_BASE}/api/demo/reset-db`, { method: "POST" });
        await fetchAllData();
      } catch (err) {
        console.error("Reset failed:", err);
      }
    }
  };

  const handleTriggerIncident = async (type: string, title: string) => {
    try {
      const defaultRepo = repos[0]?.id || "repo_core_banking";
      await fetch(`${API_BASE}/api/deployments/incidents/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_id: defaultRepo,
          title,
          severity: "CRITICAL",
          telemetry_type: type
        })
      });
      await fetchAllData();
    } catch (err) {
      console.error("Trigger incident failed:", err);
    }
  };

  const handleResolveIncident = async (incidentId: string) => {
    try {
      await fetch(`${API_BASE}/api/deployments/incidents/${incidentId}/resolve`, {
        method: "POST"
      });
      await fetchAllData();
    } catch (err) {
      console.error("Resolve incident failed:", err);
    }
  };

  const handleScanCompleted = async (newPrId: string) => {
    setShowSandbox(false);
    await fetchAllData();
    setActiveTab("prs");
    await handleSelectPr(newPrId);
  };

  const blockedCount = prs.filter((p) => p.risk_level === "CRITICAL" || p.verdict === "NO-GO").length;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSandbox={() => setShowSandbox(true)}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        onRefresh={fetchAllData}
        onResetDb={handleResetDb}
        loading={loading}
        totalPrs={prs.length}
        blockedCount={blockedCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* End-to-End Workflow Pipeline Visualizer Banner */}
        <WorkflowArchitectureBanner />

        {/* Tab 1: Pull Requests Dashboard (Step 9) */}
        {activeTab === "prs" && (
          <PRList
            prs={prs}
            onSelectPr={handleSelectPr}
            selectedPrId={selectedPrId}
          />
        )}

        {/* Tab 2: Repositories List (Step 9) */}
        {activeTab === "repos" && (
          <RepoList
            repos={repos}
            onSelectRepo={(repoId) => {
              setActiveTab("prs");
            }}
          />
        )}

        {/* Tab 3: Dedicated Workflow Engine View */}
        {activeTab === "workflow" && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl bg-[#0d121d]/90 border border-white/10 space-y-4">
              <h3 className="text-lg font-bold text-white">
                ReleaseGuard DevSecOps & Multi-Agent Swarm Specifications
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                ReleaseGuard is an autonomous gatekeeper that intercepts pull requests via GitHub webhooks, runs 7 static code & architecture scanners, computes normalized risk scores, and orchestrates an IBM Bob multi-agent swarm before code reaches production.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-[#121826] border border-white/5 space-y-2">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    7-Category Static Scanners
                  </h4>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• <strong>Secrets:</strong> AWS/IBM/Stripe keys, Private keys, JWT tokens</li>
                    <li>• <strong>Config & Env:</strong> Debug mode enabled, permissive CORS, no timeouts</li>
                    <li>• <strong>IaC:</strong> Container running as root, 0.0.0.0/0 ingress, unpinned images</li>
                    <li>• <strong>CI/CD:</strong> Unverified curl-to-bash, untrusted pull_request_target</li>
                    <li>• <strong>Tests:</strong> Skipped tests, lowered coverage threshold</li>
                    <li>• <strong>Cost & FinOps:</strong> Expensive instance tiers, uncapped autoscaling</li>
                    <li>• <strong>DB Migrations:</strong> DROP TABLE, table locks, missing CONCURRENTLY</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-[#121826] border border-white/5 space-y-2">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    IBM Bob Multi-Agent Swarm
                  </h4>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• <strong>Release Orchestrator:</strong> Master Gatekeeper & GO/NO-GO verdict</li>
                    <li>• <strong>Security Subagent:</strong> SOC2, PCI-DSS, Cryptographic audit</li>
                    <li>• <strong>Infra/DevOps Subagent:</strong> Kubernetes Pod Security Standards</li>
                    <li>• <strong>Rollback Planner Subagent:</strong> Zero-RTO executable runbooks</li>
                    <li>• <strong>Cost Subagent:</strong> Monthly cloud budget impact ($/month)</li>
                    <li>• <strong>DB Migration Subagent:</strong> Schema lock time and zero-downtime safety</li>
                    <li>• <strong>Incident Analysis Agent:</strong> Post-deploy root cause correlation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Runtime Incidents & Deployment Monitoring (Steps 10-12) */}
        {activeTab === "incidents" && (
          <IncidentHub
            incidents={incidents}
            deployments={deployments}
            onTriggerIncident={handleTriggerIncident}
            onResolveIncident={handleResolveIncident}
            onSelectPr={handleSelectPr}
          />
        )}

        {/* Tab 5: Access & Auth Governance */}
        {activeTab === "auth" && (
          <TeamAuthTab
            currentUser={currentUser}
            onOpenLoginModal={() => setIsAuthModalOpen(true)}
            onSwitchUser={handleSwitchUser}
            onLogout={handleLogout}
          />
        )}

      </main>

      {/* PR Detail Modal Inspector */}
      {selectedPrDetail && (
        <PRDetailModal
          pr={selectedPrDetail}
          onClose={() => {
            setSelectedPrDetail(null);
            setSelectedPrId(null);
          }}
          onRefreshPr={() => {
            if (selectedPrId) handleSelectPr(selectedPrId);
            fetchAllData();
          }}
        />
      )}

      {/* PR Sandbox Modal */}
      {showSandbox && (
        <ScannerSandboxModal
          onClose={() => setShowSandbox(false)}
          onScanCompleted={handleScanCompleted}
        />
      )}

      {/* Professional Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        prs={prs}
        repos={repos}
        onSelectPr={handleSelectPr}
        onOpenSandbox={() => setShowSandbox(true)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onTriggerIncident={handleTriggerIncident}
      />

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.06)] bg-[#090d16] py-6 text-center text-xs text-slate-500">
        <p>ReleaseGuard AI Governance Platform • IBM watsonx / Bob Multi-Agent Hackathon Architecture</p>
      </footer>
    </div>
  );
}
