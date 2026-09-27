"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Bot,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  GitPullRequest,
  KeyRound,
  LayoutDashboard,
  Shield,
  Sparkles,
  SquareTerminal,
} from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { TeamAuthTab } from "@/components/TeamAuthTab";
import { WorkflowArchitectureBanner } from "@/components/WorkflowArchitectureBanner";
import { PRList, PRSummary } from "@/components/PRList";
import { RepoList, RepoItem } from "@/components/RepoList";
import { PRDetailModal } from "@/components/PRDetailModal";
import { ScannerSandboxModal } from "@/components/ScannerSandboxModal";
import { IncidentHub } from "@/components/IncidentHub";
import { ProjectAgentPanel } from "@/components/ProjectAgentPanel";
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
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [selectedRepoName, setSelectedRepoName] = useState<string>("");
  const [releaseHealth, setReleaseHealth] = useState<any>(null);
  const [releaseTimeline, setReleaseTimeline] = useState<any>(null);
  const [showSandbox, setShowSandbox] = useState<boolean>(false);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [iconOnlyMode, setIconOnlyMode] = useState<boolean>(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001";

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setApiError(null);
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
      setApiError("ReleaseGuard backend is offline or unreachable. Start the API server on http://localhost:8001 to restore dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("releaseguard-user");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Failed to restore saved user:", error);
      }
    }
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
    localStorage.setItem("releaseguard-user", JSON.stringify(user));
    setIsAuthModalOpen(false);
    setActiveTab("prs");
  };

  const handleSwitchUser = (user: UserProfile) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("releaseguard-user");
    setIsAuthModalOpen(true);
    setActiveTab("auth");
  };

  const handleResetDb = async () => {
    if (confirm("Reset ReleaseGuard live state to a clean baseline?")) {
      try {
        await fetch(`${API_BASE}/api/demo/reset-db`, { method: "POST" });
        await fetchAllData();
      } catch (err) {
        console.error("Reset failed:", err);
      }
    }
  };

  const handleSelectRepo = async (repoId: string, repoFullName: string) => {
    setSelectedRepoId(repoId);
    setSelectedRepoName(repoFullName);
    setActiveTab("prs");

    try {
      const [healthRes, timelineRes] = await Promise.all([
        fetch(`${API_BASE}/api/deployments/release-health/${repoId}`),
        fetch(`${API_BASE}/api/deployments/release-timeline/${repoId}`),
      ]);

      if (healthRes.ok) setReleaseHealth(await healthRes.json());
      if (timelineRes.ok) setReleaseTimeline(await timelineRes.json());
    } catch (err) {
      console.error("Failed to load release health:", err);
    }
  };

  const handleDeleteRepo = async (repoId: string) => {
    const repo = repos.find((item) => item.id === repoId);
    const repoName = repo?.full_name || repo?.name || "this repository";

    if (!confirm(`Delete ${repoName} from the ReleaseGuard database and dashboard?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/repos/${repoId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to delete repository");
      }
      await fetchAllData();
    } catch (err) {
      console.error("Delete repo failed:", err);
      alert(err instanceof Error ? err.message : "Failed to delete repository");
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
  const isCompactSidebar = sidebarCollapsed || iconOnlyMode;
  const navItems = [
    { id: "prs", label: "Pull requests", count: prs.length, accent: "cyan", icon: GitPullRequest },
    { id: "repos", label: "Repositories", count: repos.length, accent: "blue", icon: FolderGit2 },
    { id: "policies", label: "Policies", count: 1, accent: "violet", icon: Shield },
    { id: "workflow", label: "Workflow", count: 12, accent: "violet", icon: LayoutDashboard },
    { id: "incidents", label: "Incidents", count: incidents.length, accent: "amber", icon: Activity },
    { id: "agent", label: "Project agent", count: 1, accent: "emerald", icon: Bot },
    { id: "auth", label: "Access", count: currentUser ? 1 : 0, accent: "rose", icon: KeyRound },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 selection:bg-cyan-500 selection:text-black">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-3 px-2 py-2 xl:flex-row xl:px-3 xl:py-3">
        <aside className={`xl:sticky xl:top-3 xl:h-[calc(100vh-1.5rem)] xl:flex-none ${isCompactSidebar ? "xl:w-[88px]" : "xl:w-[270px]"}`}>
          <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#0b1220]/90 p-2.5 shadow-2xl shadow-[#020817]/35 backdrop-blur-xl">
            <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className={`${isCompactSidebar ? "hidden" : "block"}`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Operations</p>
                <h2 className="mt-1 text-lg font-bold text-white">Release dashboard</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIconOnlyMode((prev) => !prev)}
                  className="rounded-lg border border-white/10 bg-[#121c2d] p-1.5 text-slate-300 transition hover:bg-white/5 hover:text-white"
                  title={iconOnlyMode ? "Show labels" : "Icon-only mode"}
                >
                  <SquareTerminal className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setSidebarCollapsed((prev) => !prev)}
                  className="rounded-lg border border-white/10 bg-[#121c2d] p-1.5 text-slate-300 transition hover:bg-white/5 hover:text-white"
                  title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className={`${isCompactSidebar ? "mb-2 flex justify-center" : "mb-2.5 flex justify-between"}`}>
              <div className={`flex items-center gap-2 ${isCompactSidebar ? "flex-col" : "flex-row"}`}>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                {!isCompactSidebar && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">ReleaseGuard</p>
                    <p className="text-[10px] text-slate-400">ops console</p>
                  </div>
                )}
              </div>
              {!isCompactSidebar && (
                <button
                  onClick={fetchAllData}
                  className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-2 py-1.5 text-[10px] font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
                >
                  Refresh
                </button>
              )}
            </div>

            <nav className="space-y-1.5">
              {navItems.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.label}
                    className={`flex w-full items-center justify-between rounded-xl border px-2 py-2 text-left transition-all ${
                      isActive
                        ? "border-cyan-500/40 bg-cyan-500/10 text-white shadow-lg shadow-cyan-500/10"
                        : "border-white/5 bg-[#0f172a] text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
                    } ${isCompactSidebar ? "justify-center px-2" : ""}`}
                  >
                    <span className={`flex items-center ${isCompactSidebar ? "justify-center" : "gap-3"}`}>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/20">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      {!isCompactSidebar && <span className="font-medium">{tab.label}</span>}
                    </span>
                    {!isCompactSidebar && (
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {!isCompactSidebar && (
              <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-[#0d1727] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Status</p>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">Live</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/5 bg-[#0b1423] p-2.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Risk</p>
                    <p className="mt-2 text-xl font-bold text-white">{prs.filter((p) => p.verdict === "NO-GO").length}</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-[#0b1423] p-2.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Repos</p>
                    <p className="mt-2 text-xl font-bold text-white">{repos.length}</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-[#0b1423] p-2.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Deploy</p>
                    <p className="mt-2 text-xl font-bold text-white">{deployments.length}</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-[#0b1423] p-2.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Alerts</p>
                    <p className="mt-2 text-xl font-bold text-white">{incidents.filter((i) => i.status !== "RESOLVED").length}</p>
                  </div>
                </div>
              </div>
            )}

            <div className={`mt-auto rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 ${isCompactSidebar ? "p-2" : "p-3"}`}>
              {!isCompactSidebar && (
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Quick action</p>
              )}
              <button
                onClick={() => setShowSandbox(true)}
                className={`${isCompactSidebar ? "flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#0f62fe] to-[#06b6d4] px-2 py-2.5 text-white" : "mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0f62fe] to-[#06b6d4] px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01]"}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {!isCompactSidebar && <span>{selectedRepoName ? `Run ${selectedRepoName}` : "Run repo check"}</span>}
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 space-y-3 xl:min-w-0">
          {apiError && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {apiError}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-[#0d1422] p-3.5 shadow-lg shadow-black/20">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Open PRs</p>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-2xl font-bold text-white">{prs.length}</span>
                <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-300">Live</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0d1422] p-3.5 shadow-lg shadow-black/20">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Blocked</p>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-2xl font-bold text-white">{blockedCount}</span>
                <span className="rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-300">Gate</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0d1422] p-3.5 shadow-lg shadow-black/20">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Active repos</p>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-2xl font-bold text-white">{repos.length}</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">Connected</span>
              </div>
            </div>
          </div>

          <WorkflowArchitectureBanner />

          {selectedRepoId && releaseHealth && (
            <div className="rounded-2xl border border-white/10 bg-[#0d1422] p-4 shadow-lg shadow-black/20">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Release control</p>
                  <h3 className="mt-1 text-lg font-bold text-white">{selectedRepoName}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                    releaseHealth.state === "RED"
                      ? "border-red-500/40 bg-red-500/15 text-red-300"
                      : releaseHealth.state === "AMBER"
                        ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                        : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  }`}>
                    {releaseHealth.state}
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                    releaseHealth.release_decision === "BLOCKED"
                      ? "border-red-500/40 bg-red-500/15 text-red-300"
                      : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  }`}>
                    {releaseHealth.release_decision}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-white/5 bg-[#0b1320] p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Risk score</p>
                  <p className="mt-2 text-2xl font-bold text-white">{releaseHealth.risk_score}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#0b1320] p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Risk level</p>
                  <p className="mt-2 text-2xl font-bold text-white">{releaseHealth.risk_level}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#0b1320] p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Active incidents</p>
                  <p className="mt-2 text-2xl font-bold text-white">{releaseHealth.active_incidents}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#0b1320] p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Rollback</p>
                  <p className="mt-2 text-lg font-bold text-white">{releaseHealth.rollback_recommended ? "Recommended" : "Not needed"}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5 text-sm text-cyan-100">
                {releaseHealth.summary}
              </div>

              {releaseTimeline && (
                <div className="mt-4 rounded-xl border border-white/10 bg-[#0b1320] p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Release timeline</p>
                    <button
                      onClick={async () => {
                        const res = await fetch(`${API_BASE}/api/deployments/release-rollback/${selectedRepoId}`, { method: "POST" });
                        if (res.ok) {
                          const data = await res.json();
                          alert(data.status === "ROLLBACK_COMPLETED" ? "Rollback executed." : "Rollback not triggered.");
                        }
                      }}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-red-200"
                    >
                      Trigger rollback
                    </button>
                  </div>
                  <div className="space-y-2">
                    {releaseTimeline.events.map((event: any, idx: number) => (
                      <div key={`${event.kind}-${idx}`} className="flex items-start gap-3 rounded-lg border border-white/5 bg-[#0d1728] p-2.5">
                        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${event.kind === "incident" ? "bg-red-400" : event.kind === "deployment" ? "bg-emerald-400" : "bg-cyan-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white">{event.title}</p>
                            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{event.status}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">{event.label} • {event.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Tab 1: Pull Requests Dashboard (Step 9) */}
        {activeTab === "prs" && (
          <PRList
            prs={prs}
            onSelectPr={handleSelectPr}
            selectedPrId={selectedPrId}
            selectedRepoFilter={selectedRepoName || null}
            onClearRepoFilter={() => setSelectedRepoName("")}
          />
        )}

        {/* Tab 2: Repositories List (Step 9) */}
        {activeTab === "repos" && (
          <RepoList
            repos={repos}
            onSelectRepo={(repoId, repoFullName) => handleSelectRepo(repoId, repoFullName)}
            onDeleteRepo={handleDeleteRepo}
            onRefreshRepos={fetchAllData}
          />
        )}

        {activeTab === "policies" && (
          <RepoList
            repos={repos}
            onSelectRepo={(repoId, repoFullName) => handleSelectRepo(repoId, repoFullName)}
            onDeleteRepo={handleDeleteRepo}
            onRefreshRepos={fetchAllData}
          />
        )}

        {/* Tab 3: Dedicated Workflow Engine View */}
        {activeTab === "workflow" && (
          <div className="space-y-6">
            <div className="glass-card p-6 rounded-2xl bg-[#0d121d]/90 border border-white/10 space-y-5">
              <h3 className="text-xl font-bold text-white">
                Release workflow and review checks
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                This workflow watches connected repos, checks PR changes, scores risk, and blocks releases when the repo fails the team’s guardrails.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                <div className="p-5 rounded-xl bg-[#121826] border border-white/5 space-y-3">
                  <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
                    Review checks
                  </h4>
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li>• <strong>Secrets:</strong> exposed credentials, tokens, and private keys</li>
                    <li>• <strong>Config:</strong> weak env values, permissive access, and missing timeouts</li>
                    <li>• <strong>Infra:</strong> open ingress, root containers, and insecure defaults</li>
                    <li>• <strong>CI/CD:</strong> unverified scripts and risky automation paths</li>
                    <li>• <strong>Tests:</strong> skipped coverage and brittle release validation</li>
                    <li>• <strong>Cost:</strong> oversized resources and avoidable cloud spend</li>
                    <li>• <strong>DB:</strong> risky migration patterns and destructive schema changes</li>
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-[#121826] border border-white/5 space-y-3">
                  <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider">
                    Bob AI review flow
                  </h4>
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li>• <strong>Orchestrator:</strong> decides GO, HOLD, or rollback based on repo health</li>
                    <li>• <strong>Security:</strong> checks auth, secrets, and risky config changes</li>
                    <li>• <strong>Infra:</strong> reviews runtime and deploy safety</li>
                    <li>• <strong>Rollback:</strong> prepares a safe fallback plan</li>
                    <li>• <strong>Cost:</strong> flags expensive or noisy infrastructure changes</li>
                    <li>• <strong>DB:</strong> assesses migration safety and downtime risk</li>
                    <li>• <strong>Incident:</strong> correlates deploy issues to the relevant PR</li>
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

        {/* Tab 5: Project Agent */}
        {activeTab === "agent" && (
          <ProjectAgentPanel
            repos={repos}
            prs={prs}
            incidents={incidents}
            currentUser={currentUser}
          />
        )}

        {/* Tab 6: Access & Auth Governance */}
        {activeTab === "auth" && (
          <TeamAuthTab
            currentUser={currentUser}
            onOpenLoginModal={() => setIsAuthModalOpen(true)}
            onSwitchUser={handleSwitchUser}
            onLogout={handleLogout}
          />
        )}

        </main>
      </div>

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
          repoOptions={repos.map((repo) => ({ id: repo.id, name: repo.full_name || repo.name }))}
          defaultRepoName={selectedRepoName || repos[0]?.full_name || repos[0]?.name || "Select connected repo"}
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
    </div>
  );
}
