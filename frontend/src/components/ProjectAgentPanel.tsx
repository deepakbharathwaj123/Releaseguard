"use client";

import { apiFetch } from "@/lib/api";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  BrainCircuit,
  ChevronRight,
  Download,
  FileSearch,
  ShieldAlert,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { UserProfile } from "@/types/auth";

interface RepoLike {
  id: string;
  name?: string;
  full_name?: string;
  description?: string;
}

interface PrLike {
  id: string;
  title: string;
  risk_score?: number;
  risk_level?: string;
  verdict?: string;
  author?: string;
}

interface IncidentLike {
  id: string;
  title?: string;
  severity?: string;
}

interface ProjectAgentPanelProps {
  repos: RepoLike[];
  prs: PrLike[];
  incidents: IncidentLike[];
  currentUser: UserProfile | null;
}

const quickPrompts = [
  "Analyze repo health and list the biggest risks.",
  "Summarize current PR blockers and why they are failing.",
  "Suggest the best next remediation steps for this sprint.",
  "What should I prioritize before the next release?",
];

export const ProjectAgentPanel: React.FC<ProjectAgentPanelProps> = ({
  repos,
  prs,
  incidents,
  currentUser,
}) => {
  const [query, setQuery] = useState<string>("Analyze repo health and list the biggest risks.");
  const [answer, setAnswer] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [memoryMode, setMemoryMode] = useState<boolean>(false);
  const [memoryData, setMemoryData] = useState<any>(null);
  const [timeline, setTimeline] = useState<Array<{ id: string; type: string; message: string; timestamp: string }>>([]);
  const [chatHistory, setChatHistory] = useState<Array<{ id: string; role: string; content: string; timestamp: string }>>([]);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001";
  const projectKey = (repos[0]?.full_name || repos[0]?.name || "workspace").replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();

  const persistProjectMemory = async (summary: any, eventMessage: string, eventType: string) => {
    const nextMemory = summary || memoryData || { project: projectKey };
    localStorage.setItem(`releaseguard-agent-memory-${projectKey}`, JSON.stringify(nextMemory));
    setMemoryData(nextMemory);

    try {
      await apiFetch(`${API_BASE}/api/agent/memory/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectKey, memory: nextMemory }),
      });
    } catch (error) {
      console.warn("Backend memory sync failed; local memory is still preserved.", error);
    }

    const nextEvent = {
      id: `${eventType}-${Date.now()}`,
      type: eventType,
      message: eventMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const existingEvents = JSON.parse(localStorage.getItem(`releaseguard-agent-timeline-${projectKey}`) || "[]");
    const nextTimeline = [nextEvent, ...existingEvents].slice(0, 8);
    localStorage.setItem(`releaseguard-agent-timeline-${projectKey}`, JSON.stringify(nextTimeline));
    setTimeline(nextTimeline);

    try {
      await apiFetch(`${API_BASE}/api/agent/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: projectKey,
          action_type: eventType,
          message: eventMessage,
          metadata: nextMemory,
        }),
      });
    } catch (error) {
      console.warn("Backend action log sync failed; local timeline remains available.", error);
    }
  };

  const loadMemory = async () => {
    try {
      const response = await apiFetch(`${API_BASE}/api/agent/memory?project=${encodeURIComponent(projectKey)}`);
      if (!response.ok) {
        throw new Error(`Memory fetch failed: ${response.status}`);
      }
      const data = await response.json();
      const storedMemory = JSON.parse(localStorage.getItem(`releaseguard-agent-memory-${projectKey}`) || "null");
      const storedTimeline = JSON.parse(localStorage.getItem(`releaseguard-agent-timeline-${projectKey}`) || "[]");
      const mergedMemory = storedMemory || data.memory || null;
      setMemoryData(mergedMemory);
      setTimeline(storedTimeline);

      const historyResponse = await apiFetch(`${API_BASE}/api/agent/history?project=${encodeURIComponent(projectKey)}`);
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setChatHistory(historyData.history || []);
      }
    } catch (error) {
      console.error("Failed to load project memory:", error);
      const storedMemory = JSON.parse(localStorage.getItem(`releaseguard-agent-memory-${projectKey}`) || "null");
      const storedTimeline = JSON.parse(localStorage.getItem(`releaseguard-agent-timeline-${projectKey}`) || "[]");
      setMemoryData(storedMemory);
      setTimeline(storedTimeline);
    }
  };

  const exportMemory = async () => {
    const data = memoryData || { project: projectKey };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${projectKey}-memory.json`;
    anchor.click();
    URL.revokeObjectURL(url);

    try {
      await apiFetch(`${API_BASE}/api/agent/memory/export?project=${encodeURIComponent(projectKey)}`);
    } catch (error) {
      console.warn("Backend export endpoint unavailable; local JSON file still downloaded.", error);
    }
  };

  const importMemory = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const normalized = { project: projectKey, ...parsed, projectKey };
      setMemoryData(normalized);
      localStorage.setItem(`releaseguard-agent-memory-${projectKey}`, JSON.stringify(normalized));
      await apiFetch(`${API_BASE}/api/agent/memory/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectKey, memory: normalized }),
      });
      setAnswer(`Imported project memory from ${file.name}.`);
    } catch (error) {
      console.error("Import failed:", error);
      setAnswer("The project memory file could not be imported. Ensure it contains valid JSON.");
    } finally {
      event.target.value = "";
    }
  };

  useEffect(() => {
    loadMemory();
  }, [projectKey]);

  const metrics = useMemo(() => {
    const highRisk = prs.filter(
      (pr) => (pr.risk_level || "").toUpperCase() === "CRITICAL" || (pr.verdict || "").toUpperCase() === "NO-GO"
    );

    const topPr = prs.reduce<PrLike | null>((best, pr) => {
      const score = pr.risk_score || 0;
      if (!best || score > (best.risk_score || 0)) return pr;
      return best;
    }, null);

    return {
      repoCount: repos.length,
      prCount: prs.length,
      incidentCount: incidents.length,
      blockerCount: highRisk.length,
      topPr,
    };
  }, [prs, repos, incidents]);

  const runAnalysis = async (promptOverride?: string) => {
    const prompt = (promptOverride || query || "Analyze repo health and list the biggest risks.").trim();

    try {
      setIsLoading(true);
      const response = await apiFetch(`${API_BASE}/api/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: prompt }),
      });

      if (!response.ok) {
        throw new Error(`Project agent request failed: ${response.status}`);
      }

      const data = await response.json();
      setAnswer(data.reply || "The Project Agent could not produce an answer for that prompt.");
      if (data.summary) {
        persistProjectMemory(data.summary, `Analysis: ${prompt}`, "analysis");
      }
      if (Array.isArray(data.history)) {
        setChatHistory(data.history);
      }
    } catch (error) {
      console.error("Project agent request failed:", error);
      setAnswer("The Project Agent is temporarily unavailable. Check that the backend is running on http://localhost:8001 and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunScan = async () => {
    try {
      const repoName = repos[0]?.full_name || "ops-pilot/core-banking-service";
      const res = await apiFetch(`${API_BASE}/api/prs/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_name: repoName,
          title: "feat(project-agent): run live workspace scan",
          description: "Project Agent triggered a live repository scan to validate current risk.",
          author: currentUser?.name || "project-agent",
          source_branch: "agent/live-scan",
          target_branch: "main",
          diff_content: "diff --git a/README.md b/README.md\n@@\n-Project health summary\n+Project health summary and live review\n",
        }),
      });
      if (!res.ok) throw new Error(`scan failed: ${res.status}`);
      const data = await res.json();
      const message = `Live scan triggered successfully. ${data.pr_id ? `PR ${data.pr_id} was queued for evaluation.` : "The scan completed."}`;
      setAnswer(message);
      persistProjectMemory({
        project: projectKey,
        repo_count: repos.length,
        pr_count: prs.length,
        incident_count: incidents.length,
        blocker_count: metrics.blockerCount,
      }, message, "scan");
    } catch (error) {
      console.error("Live scan failed:", error);
      setAnswer("The live scan action could not be completed. Confirm the API server is running and try again.");
    }
  };

  const handleSimulateIncident = async () => {
    try {
      const repoId = repos[0]?.id || "repo_core_banking";
      const response = await apiFetch(`${API_BASE}/api/deployments/incidents/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_id: repoId,
          title: "Project Agent: synthetic prod incident",
          severity: "HIGH",
          telemetry_type: "latency_spike",
        }),
      });
      if (!response.ok) throw new Error(`incident simulate failed: ${response.status}`);
      const data = await response.json();
      const message = `Incident simulation was triggered. ${data.incident_id ? `Incident ${data.incident_id} was recorded.` : "The incident has been logged."}`;
      setAnswer(message);
      persistProjectMemory({
        project: projectKey,
        repo_count: repos.length,
        pr_count: prs.length,
        incident_count: incidents.length + 1,
        blocker_count: metrics.blockerCount,
      }, message, "incident");
    } catch (error) {
      console.error("Simulate incident failed:", error);
      setAnswer("Incident simulation failed. Ensure the backend is running and the repo metadata is available.");
    }
  };

  const handleRollback = async () => {
    try {
      const prId = (memoryData?.top_pr && memoryData.top_pr.id) || (prs[0]?.id);
      if (!prId) {
        throw new Error("No PR is available for rollback simulation.");
      }
      const response = await apiFetch(`${API_BASE}/api/prs/${prId}/execute-rollback`, { method: "POST" });
      if (!response.ok) throw new Error(`rollback failed: ${response.status}`);
      const data = await response.json();
      const message = `Rollback simulation completed. ${data.status || "Rollback executed successfully."}`;
      setAnswer(message);
      persistProjectMemory({
        project: projectKey,
        repo_count: repos.length,
        pr_count: prs.length,
        incident_count: incidents.length,
        blocker_count: metrics.blockerCount,
      }, message, "rollback");
    } catch (error) {
      console.error("Rollback failed:", error);
      setAnswer("Rollback simulation could not run because no actionable PR was found. Trigger a live scan first.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 rounded-2xl border border-cyan-500/20 bg-[#0d121d]/90">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 text-black flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Project Agent</h3>
              <p className="text-xs text-slate-400">
                AI teammate for repo health, PR analysis, action guidance, and release prioritization.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-cyan-300">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1">
              <Sparkles className="w-3.5 h-3.5" />
              Active workspace analysis
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-white/10 bg-[#0c1220]/80">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Repos</div>
          <div className="mt-3 text-2xl font-black text-white">{metrics.repoCount}</div>
          <div className="mt-1 text-xs text-slate-400">Tracked repositories</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/10 bg-[#0c1220]/80">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">PRs</div>
          <div className="mt-3 text-2xl font-black text-white">{metrics.prCount}</div>
          <div className="mt-1 text-xs text-slate-400">Open review queue</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/10 bg-[#0c1220]/80">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Blockers</div>
          <div className="mt-3 text-2xl font-black text-amber-300">{metrics.blockerCount}</div>
          <div className="mt-1 text-xs text-slate-400">Critical or NO-GO items</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/10 bg-[#0c1220]/80">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Incidents</div>
          <div className="mt-3 text-2xl font-black text-rose-300">{metrics.incidentCount}</div>
          <div className="mt-1 text-xs text-slate-400">Signals in observation</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="glass-card p-5 rounded-2xl border border-cyan-500/20 bg-[#0d121d]/90">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold text-white">Workspace insight chat</h4>
            </div>
            <span className="text-xs text-slate-400">Agent mode: analysis + guidance</span>
          </div>

          <div className="mt-4 space-y-3">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  setQuery(prompt);
                  runAnalysis(prompt);
                }}
                className="w-full text-left rounded-xl border border-white/10 bg-[#0b1320] hover:border-cyan-500/30 hover:bg-[#0e1a2a] p-3 text-xs text-slate-300 transition-all"
              >
                <span className="flex items-center justify-between gap-2">
                  {prompt}
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5">
            <label className="text-xs uppercase tracking-[0.18em] text-slate-400 block mb-2">
              Custom prompt
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-[#090f1a] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 outline-none"
              placeholder="Ask the project agent about repo status, blockers, release risk, or remediation."
            />

            <div className="mt-3 flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => setMemoryMode((v) => !v)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-[#0b1320] text-[#dbeafe] text-xs font-semibold"
              >
                {memoryMode ? "Hide memory" : "Agent memory"}
              </button>
              <button
                onClick={exportMemory}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                Export memory
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-200 text-xs font-semibold"
              >
                <Upload className="w-3.5 h-3.5" />
                Import memory
              </button>
              <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={importMemory} />
              <button
                onClick={() => runAnalysis()}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-black text-xs font-bold shadow-md shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Wand2 className="w-3.5 h-3.5" />
                {isLoading ? "Analyzing..." : "Analyze workspace"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 justify-end">
              <button onClick={handleRunScan} className="px-3 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 text-xs font-semibold">Run live scan</button>
              <button onClick={handleSimulateIncident} className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 text-xs font-semibold">Simulate incident</button>
              <button onClick={handleRollback} className="px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-xs font-semibold">Run rollback</button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-5 rounded-2xl border border-emerald-500/20 bg-[#0d1714]/90">
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
              <FileSearch className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Agent summary</h4>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-[#09131a] p-3 text-xs text-slate-300 leading-relaxed min-h-[160px]">
              {isLoading ? "Analyzing workspace data and risk signals..." : (answer || "The Project Agent is ready. Ask it to assess repo health, release risk, or the most important next action.")}
            </div>

            {memoryMode && (
              <div className="mt-4 space-y-3 rounded-xl border border-cyan-500/20 bg-[#071722] p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-cyan-300">Agent memory</div>
                <div className="text-xs text-slate-200 font-semibold">Project: {memoryData?.project || projectKey || "workspace"}</div>

                {memoryData && (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-300">
                      <span className="font-semibold text-white">Top PR:</span> {memoryData.top_pr?.title || "N/A"}
                    </div>
                    <div className="text-xs text-slate-300">
                      <span className="font-semibold text-white">Findings:</span> {memoryData.top_pr_findings?.length ? memoryData.top_pr_findings.map((f: any) => `${f.severity}: ${f.title}`).join(" • ") : memoryData.findings_summary || "No findings available"}
                    </div>
                    <div className="text-xs text-slate-300">
                      <span className="font-semibold text-white">Incidents:</span> {memoryData.incident_links?.length ? memoryData.incident_links.map((i: any) => `${i.incident_title} → ${i.pr_title || "Unlinked PR"}`).join(" • ") : "No active incidents linked"}
                    </div>
                    <div className="text-xs text-slate-300">
                      <span className="font-semibold text-white">Focus:</span> {memoryData.focus_areas?.join(" • ") || "Release and security review"}
                    </div>
                  </div>
                )}

                {(timeline.length > 0 || chatHistory.length > 0) && (
                  <div className="pt-2 border-t border-white/10 space-y-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-2">Action timeline</div>
                      <div className="space-y-2">
                        {timeline.map((event) => (
                          <div key={event.id} className="rounded-lg border border-white/10 bg-[#0b1320] px-2.5 py-2">
                            <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                              <span className="uppercase tracking-[0.12em]">{event.type}</span>
                              <span>{event.timestamp}</span>
                            </div>
                            <div className="mt-1 text-xs text-slate-200">{event.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-2">Chat history</div>
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {chatHistory.map((entry) => (
                          <div key={entry.id} className="rounded-lg border border-white/10 bg-[#0b1320] px-2.5 py-2">
                            <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                              <span className="uppercase tracking-[0.12em]">{entry.role}</span>
                              <span>{entry.timestamp}</span>
                            </div>
                            <div className="mt-1 text-xs text-slate-200 whitespace-pre-wrap">{entry.content}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="glass-card p-5 rounded-2xl border border-amber-500/20 bg-[#17130d]/90">
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white">Priority actions</h4>
            </div>

            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Resolve the highest-risk PR findings before the next release gate.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                Validate secret/config exposures and rollback runbooks.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Confirm active incidents are correlated to the right PR and branch.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="glass-card p-4 rounded-2xl border border-white/10 bg-[#0d121d]/90 text-xs text-slate-400">
        Signed in as <span className="text-cyan-300 font-semibold">{currentUser?.name || "Guest workspace operator"}</span> • Project Agent is in analysis mode and can guide release decisions with the repo and PR telemetry available in this session.
      </div>
    </div>
  );
};
