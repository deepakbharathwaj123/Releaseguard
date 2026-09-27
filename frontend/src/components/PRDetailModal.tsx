"use client";

import { apiFetch } from "@/lib/api";
import React, { useState } from "react";
import { 
  X, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  FileCode, 
  Bot, 
  RotateCcw, 
  DollarSign, 
  MessageSquare, 
  Copy, 
  Check, 
  Terminal, 
  ExternalLink,
  Lock,
  Layers,
  Zap,
  Send,
  ArrowRight,
  UserCheck
} from "lucide-react";
import { TerminalModal } from "./TerminalModal";

interface Finding {
  id: string;
  scanner_type: string;
  severity: string;
  title: string;
  description: string;
  file_path: string;
  line_number: number;
  snippet: string;
  remediation: string;
}

interface AgentOutput {
  id: string;
  agent_name: string;
  agent_role: string;
  status: string;
  summary: string;
  verdict?: string;
  details_json: any;
  confidence: number;
}

interface PRDetail {
  id: string;
  repo_id: string;
  repo_name: string;
  repo_full_name: string;
  pr_number: number;
  title: string;
  description: string;
  author: string;
  source_branch: string;
  target_branch: string;
  status: string;
  risk_score: number;
  risk_level: string;
  verdict: string;
  comment_posted: boolean;
  diff_content?: string;
  created_at: string;
  updated_at: string;
  findings: Finding[];
  agent_outputs: AgentOutput[];
  pr_comment?: {
    comment_body: string;
    status_check_state: string;
    status_check_description: string;
    posted_at: string;
  };
}

interface PRDetailModalProps {
  pr: PRDetail | null;
  onClose: () => void;
  onRefreshPr?: () => void;
}

export const PRDetailModal: React.FC<PRDetailModalProps> = ({ pr, onClose, onRefreshPr }) => {
  const [activeTab, setActiveTab] = useState<string>("findings");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [selectedScannerFilter, setSelectedScannerFilter] = useState<string>("ALL");
  const [showTerminal, setShowTerminal] = useState<boolean>(false);

  // Chat with Bob Swarm state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    {
      sender: "Bob AI",
      text: "I’m checking the PR against the repo rules and release guardrails. Ask about the verdict, findings, or rollback plan.",
      time: "Just now"
    }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatThinking, setIsChatThinking] = useState<boolean>(false);

  // Override state
  const [showOverrideDialog, setShowOverrideDialog] = useState<boolean>(false);
  const [overrideNotes, setOverrideNotes] = useState<string>("");
  const [isSubmittingOverride, setIsSubmittingOverride] = useState<boolean>(false);

  if (!pr) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendChat = async (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim()) return;

    const userMsg = { sender: "You", text: textToSend, time: "Just now" };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetText) setChatInput("");
    setIsChatThinking(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001";
      const res = await apiFetch(`${apiBase}/api/prs/${pr.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend })
      });
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { sender: data.author || "Bob AI", text: data.reply, time: "Just now" }
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "Bob AI",
          text: "Review connection is interrupted, but the repo gate is still enforcing checks.",
          time: "Just now"
        }
      ]);
    } finally {
      setIsChatThinking(false);
    }
  };

  const handleApplyOverride = async () => {
    if (!overrideNotes.trim()) {
      alert("Please provide an authorization justification for the override.");
      return;
    }
    setIsSubmittingOverride(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001";
      await apiFetch(`${apiBase}/api/prs/${pr.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verdict: "GO",
          justification: overrideNotes,
          reviewer: "Security Champion (Manual Override)"
        })
      });
      setShowOverrideDialog(false);
      if (onRefreshPr) onRefreshPr();
      pr.verdict = "GO";
    } catch (err) {
      console.error("Override failed:", err);
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const rollbackAgent = pr.agent_outputs.find((a) => a.agent_name.includes("Rollback"));
  const costAgent = pr.agent_outputs.find((a) => a.agent_name.includes("Cost"));
  const orchestrator = pr.agent_outputs.find((a) => a.agent_name.includes("Orchestrator"));

  const filteredFindings = pr.findings.filter((f) => {
    if (selectedScannerFilter === "ALL") return true;
    return f.scanner_type.toLowerCase() === selectedScannerFilter.toLowerCase();
  });

  const getFindingImpact = (finding: Finding) => {
    const title = finding.title.toLowerCase();
    if (title.includes("secret") || title.includes("token") || title.includes("key")) {
      return "Potential credential exposure can allow unauthorized access, release tampering, or compromised cloud resources.";
    }
    if (title.includes("privileged") || title.includes("open") || title.includes("public") || title.includes("insecure")) {
      return "This weakens the operating boundary and increases blast radius if the workload is compromised.";
    }
    if (title.includes("migration") || title.includes("drop") || title.includes("schema")) {
      return "This can cause irreversible data loss, outage windows, or failed production rollback paths.";
    }
    if (title.includes("timeout") || title.includes("script") || title.includes("ci")) {
      return "This can cause unbounded execution, unsafe automation, or upstream process drift in CI/CD.";
    }
    return "This issue can degrade release safety, increase runtime risk, and complicate recovery during deployment.";
  };

  const getRemediationSteps = (finding: Finding) => {
    const base = finding.remediation || "Review and correct the risky change before merging.";
    const steps = base
      .split(/[.;]\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (steps.length === 0) {
      return [base];
    }

    return steps.slice(0, 3);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
        <div className="bg-[#0b0f19] border border-[rgba(255,255,255,0.12)] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
          
          {/* Modal Header */}
          <div className="p-5 border-b border-[rgba(255,255,255,0.08)] bg-[#0d1322] flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-800/40">
                  PR #{pr.pr_number}
                </span>
                <span className="text-xs text-slate-400 font-medium">{pr.repo_full_name}</span>
                
                {/* Risk Level Badge */}
                <span
                  className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wide border ${
                    pr.risk_level === "CRITICAL"
                      ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                      : pr.risk_level === "HIGH"
                      ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                      : pr.risk_level === "MEDIUM"
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  }`}
                >
                  Risk Index: {pr.risk_score}/100 • {pr.risk_level}
                </span>

                {/* Verdict Badge */}
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1 ${
                    pr.verdict === "GO"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : pr.verdict === "CONDITIONAL"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}
                >
                  {pr.verdict === "GO" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {pr.verdict === "CONDITIONAL" && <AlertTriangle className="w-3.5 h-3.5" />}
                  {pr.verdict === "NO-GO" && <XCircle className="w-3.5 h-3.5" />}
                  <span>Release Verdict: {pr.verdict}</span>
                </span>

                {/* Override Action */}
                {pr.verdict !== "GO" && (
                  <button
                    onClick={() => setShowOverrideDialog(true)}
                    className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    <UserCheck className="w-3 h-3 text-cyan-400" />
                    <span>Tech Lead Override</span>
                  </button>
                )}
              </div>

              <h2 className="text-lg font-bold text-white tracking-tight">{pr.title}</h2>
              <p className="text-xs text-slate-400 line-clamp-1">{pr.description}</p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Navigation Tabs */}
          <div className="flex items-center space-x-1 px-5 border-b border-[rgba(255,255,255,0.06)] bg-[#090d16] overflow-x-auto">
            {[
              { id: "findings", label: `Findings (${pr.findings.length})`, icon: ShieldAlert },
              { id: "agents", label: `Bob AI review (${pr.agent_outputs.length})`, icon: Bot },
              { id: "chat", label: "Ask Bob AI", icon: Zap },
              { id: "rollback", label: "Rollback Runbook", icon: RotateCcw },
              { id: "cost", label: "Cost & FinOps", icon: DollarSign },
              { id: "comment", label: "GitHub PR Comment", icon: MessageSquare },
              { id: "diff", label: "Git Diff", icon: FileCode },
            ].map((tab) => {
              const Icon = tab.icon;
              const isTabActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-3.5 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                    isTabActive
                      ? "border-cyan-400 text-cyan-400 bg-cyan-950/20 font-bold"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Modal Body Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">

            {/* TAB 1: SCANNER FINDINGS */}
            {activeTab === "findings" && (
              <div className="space-y-4">
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                  {["ALL", "SECRETS", "CONFIG", "IAC", "CI", "TESTS", "COST", "DB"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedScannerFilter(cat)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                        selectedScannerFilter === cat
                          ? "bg-cyan-500 text-black font-bold"
                          : "bg-[#141b2b] text-slate-400 hover:text-white border border-[rgba(255,255,255,0.06)]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {filteredFindings.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#121826]/60 border border-emerald-500/20">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-white">No issues detected in this category.</p>
                        <p className="mt-1 text-xs text-slate-300">
                          The {selectedScannerFilter.toLowerCase() === "all" ? "active" : selectedScannerFilter.toLowerCase()} checks passed for this PR, so the release gate is not blocked by this scanner.
                        </p>
                        <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-300">Recommended follow-up</p>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-emerald-100">
                            <li>Keep the repo in the current review state while the release checks remain green.</li>
                            <li>Confirm the related team policy check still matches the production baseline.</li>
                            <li>Re-run the repo validation before final merge or deployment.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  filteredFindings.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 rounded-xl bg-[#101625] border border-[rgba(255,255,255,0.08)] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                f.severity === "CRITICAL"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                                  : f.severity === "HIGH"
                                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                                  : f.severity === "MEDIUM"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                  : "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                              }`}
                            >
                              {f.severity}
                            </span>
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 uppercase">
                              {f.scanner_type} Scanner
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white mt-1.5">{f.title}</h4>
                        </div>
                        <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-1 rounded border border-cyan-800/30 shrink-0">
                          {f.file_path}:{f.line_number}
                        </span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-white/5 bg-[#090d16] p-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Issue</p>
                          <p className="mt-1 text-xs text-slate-200">{f.description}</p>
                        </div>
                        <div className="rounded-lg border border-white/5 bg-[#090d16] p-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Impact</p>
                          <p className="mt-1 text-xs text-slate-200">{getFindingImpact(f)}</p>
                        </div>
                        <div className="rounded-lg border border-white/5 bg-[#090d16] p-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Fix steps</p>
                          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-emerald-200">
                            {getRemediationSteps(f).map((step, idx) => (
                              <li key={`${f.id}-step-${idx}`}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {f.snippet && (
                        <div className="p-2.5 rounded-lg bg-[#070a12] border border-[rgba(255,255,255,0.06)] font-mono text-xs text-red-300 overflow-x-auto">
                          <code>{f.snippet}</code>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: IBM BOB SWARM */}
            {activeTab === "agents" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/40 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Bot className="w-5 h-5 text-blue-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">Bob AI review engine</span>
                      <span className="text-xs text-slate-400">Release verdict and review notes from the repo checks</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {pr.agent_outputs.length} Agents Deliberated
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pr.agent_outputs.map((agent) => (
                    <div
                      key={agent.id}
                      className="p-4 rounded-xl bg-[#111728] border border-[rgba(255,255,255,0.08)] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-bold text-white">{agent.agent_name}</h4>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                agent.status === "SUCCESS"
                                  ? "bg-emerald-400"
                                  : agent.status === "WARNING"
                                  ? "bg-amber-400"
                                  : "bg-red-400 animate-ping"
                              }`}
                            />
                          </div>
                          <p className="text-xs text-cyan-400 font-medium">{agent.agent_role}</p>
                        </div>

                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                            agent.status === "SUCCESS"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : agent.status === "WARNING"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {agent.verdict || agent.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed bg-[#0a0e18] p-3 rounded-lg border border-[rgba(255,255,255,0.04)]">
                        {agent.summary}
                      </p>

                      {agent.details_json?.checklist && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                            Verification Checklist
                          </span>
                          {agent.details_json.checklist.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center space-x-2 text-xs">
                              {item.checked ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-400" />
                              )}
                              <span className={item.checked ? "text-slate-300" : "text-red-300 font-medium"}>
                                {item.item}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {agent.details_json?.compliance_matrix && (
                        <div className="space-y-1 pt-1">
                          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                            Compliance Flags
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                            {Object.entries(agent.details_json.compliance_matrix).map(([k, v]) => (
                              <span key={k} className="p-1 rounded bg-[#090d16] text-slate-400">
                                <b className="text-slate-200">{k.toUpperCase()}:</b> {String(v)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: CHAT WITH IBM BOB SWARM */}
            {activeTab === "chat" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Ask Bob AI</h4>
                      <p className="text-xs text-slate-400">Direct interactive consultation with the Release Orchestrator & subagents</p>
                    </div>
                  </div>
                </div>

                {/* Pre-canned Prompt Pills */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={() => handleSendChat("Why is this release verdict currently blocked?")}
                    className="px-3 py-1.5 rounded-lg bg-[#141d30] hover:bg-[#1a2640] text-cyan-300 border border-cyan-500/20 transition-colors"
                  >
                    💬 Why is this release blocked?
                  </button>
                  <button
                    onClick={() => handleSendChat("Can we safely canary deploy with 5% traffic?")}
                    className="px-3 py-1.5 rounded-lg bg-[#141d30] hover:bg-[#1a2640] text-cyan-300 border border-cyan-500/20 transition-colors"
                  >
                    🚀 Can we canary deploy with 5% traffic?
                  </button>
                  <button
                    onClick={() => handleSendChat("What is the step-by-step remediation for exposed secrets?")}
                    className="px-3 py-1.5 rounded-lg bg-[#141d30] hover:bg-[#1a2640] text-cyan-300 border border-cyan-500/20 transition-colors"
                  >
                    🔑 Remediation steps for secrets?
                  </button>
                  <button
                    onClick={() => handleSendChat("What is the zero-downtime database migration advice?")}
                    className="px-3 py-1.5 rounded-lg bg-[#141d30] hover:bg-[#1a2640] text-cyan-300 border border-cyan-500/20 transition-colors"
                  >
                    🗄️ Database migration strategy?
                  </button>
                </div>

                {/* Message Log */}
                <div className="space-y-3 p-4 rounded-xl bg-[#090d16] border border-white/5 max-h-72 overflow-y-auto">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl text-xs space-y-1 ${
                        msg.sender === "You"
                          ? "bg-blue-600/20 border border-blue-500/30 text-blue-200 ml-8"
                          : "bg-[#101726] border border-white/10 text-slate-200 mr-8"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-xs text-cyan-400">
                        <span>{msg.sender}</span>
                        <span className="text-slate-500 font-normal">{msg.time}</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  ))}
                  {isChatThinking && (
                    <div className="p-3 rounded-xl bg-[#101726] text-xs text-cyan-400 animate-pulse flex items-center space-x-2">
                      <Bot className="w-4 h-4 animate-spin" />
                      <span>Bob AI is reviewing the release checks...</span>
                    </div>
                  )}
                </div>

                {/* Chat Input Bar */}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Ask Bob Swarm anything about this PR (e.g. Can we canary deploy with 5% traffic?)..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendChat();
                    }}
                    className="flex-1 bg-[#101726] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={() => handleSendChat()}
                    disabled={isChatThinking}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center space-x-1.5"
                  >
                    <span>Ask Bob</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: ROLLBACK RUNBOOK */}
            {activeTab === "rollback" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-purple-950/25 border border-purple-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                      <RotateCcw className="w-4 h-4 text-purple-400" />
                      <span>Zero-RTO Automated Rollback Runbook</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pre-computed recovery runbook to restore healthy production baseline in under 90s.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowTerminal(true)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all shadow-md shadow-cyan-500/10"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>⚡ Run in Web Terminal</span>
                    </button>

                    <button
                      onClick={() => {
                        const steps = rollbackAgent?.details_json?.steps || [];
                        const script = steps.map((s: any) => `# Step ${s.step}: ${s.title}\n${s.command}`).join("\n\n");
                        copyToClipboard(script);
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold transition-colors"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? "Copied!" : "Copy Script"}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {(rollbackAgent?.details_json?.steps || []).map((step: any) => (
                    <div
                      key={step.step}
                      className="p-4 rounded-xl bg-[#111728] border border-[rgba(255,255,255,0.08)] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center">
                            {step.step}
                          </span>
                          <h5 className="text-xs font-bold text-white">{step.title}</h5>
                        </div>
                        <span className="text-xs text-slate-400">{step.description}</span>
                      </div>

                      <div className="relative group">
                        <pre className="p-3 rounded-lg bg-[#07090e] border border-[rgba(255,255,255,0.06)] text-cyan-300 font-mono text-xs overflow-x-auto">
                          <code>{step.command}</code>
                        </pre>
                        <button
                          onClick={() => copyToClipboard(step.command)}
                          className="absolute right-2 top-2 p-1.5 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-opacity opacity-0 group-hover:opacity-100"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: COST & FINOPS */}
            {activeTab === "cost" && (
              <div className="space-y-4">
                <div className="glass-panel p-6 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-cyan-950/20 border border-[rgba(255,255,255,0.08)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-400 font-medium">Estimated Monthly Cloud Spend Impact</span>
                    <div className="flex items-baseline space-x-2 mt-1">
                      <span className="text-3xl font-extrabold text-emerald-400">
                        +${costAgent?.details_json?.estimated_monthly_delta_usd?.toLocaleString() || "45"}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ month (AWS & IBM Cloud)</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-2">
                      {costAgent?.summary || "Nominal budget impact. Within normal operating range."}
                    </p>
                  </div>

                  <div className="px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-right">
                    <span className="text-xs text-slate-400 uppercase font-semibold block">FinOps Status</span>
                    <span className="text-sm font-bold text-white">{costAgent?.verdict || "APPROVED"}</span>
                  </div>
                </div>

                {costAgent?.details_json?.cost_breakdown && (
                  <div className="p-4 rounded-xl bg-[#111728] border border-[rgba(255,255,255,0.08)] space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Expenditure Breakdown by Layer</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {Object.entries(costAgent.details_json.cost_breakdown).map(([k, v]) => (
                        <div key={k} className="p-3 rounded-lg bg-[#090d16] border border-white/5">
                          <span className="text-xs text-slate-400 block">{k}</span>
                          <span className="text-base font-bold text-cyan-300 mt-0.5 block">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: GITHUB COMMENT */}
            {activeTab === "comment" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">Live GitHub Pull Request Bot Comment</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-mono bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                    Status Check: {pr.pr_comment?.status_check_state?.toUpperCase() || "SUCCESS"}
                  </span>
                </div>

                <div className="p-5 rounded-xl bg-[#0d1117] border border-[#30363d] text-slate-200 font-sans space-y-4">
                  <div className="flex items-center space-x-2 pb-3 border-b border-[#30363d]">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                      RG
                    </div>
                    <span className="text-xs font-bold text-white">releaseguard-bot</span>
                    <span className="text-xs text-slate-400">commented just now</span>
                  </div>

                  <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-3">
                    <pre className="whitespace-pre-wrap font-sans text-xs bg-transparent p-0 m-0 text-slate-300">
                      {pr.pr_comment?.comment_body || "Generating GitHub PR comment..."}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: GIT DIFF WITH INLINE ANNOTATIONS */}
            {activeTab === "diff" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Unified Patch Diff with Inline Security Annotations</span>
                  <button
                    onClick={() => copyToClipboard(pr.diff_content || "")}
                    className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Diff</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#07090e] border border-[rgba(255,255,255,0.08)] font-mono text-xs overflow-x-auto max-h-[500px] space-y-0.5">
                  {(pr.diff_content || "No diff available.").split("\n").map((line, idx) => {
                    let colorClass = "text-slate-400";
                    let bgClass = "";
                    if (line.startsWith("+") && !line.startsWith("+++")) {
                      colorClass = "text-emerald-300";
                      bgClass = "bg-emerald-950/20";
                    } else if (line.startsWith("-") && !line.startsWith("---")) {
                      colorClass = "text-red-300";
                      bgClass = "bg-red-950/20";
                    } else if (line.startsWith("@@")) {
                      colorClass = "text-cyan-400 font-bold";
                      bgClass = "bg-cyan-950/20";
                    } else if (line.startsWith("diff ") || line.startsWith("---") || line.startsWith("+++")) {
                      colorClass = "text-blue-400 font-semibold";
                    }

                    // Check if this line triggers a finding
                    const matchedFinding = pr.findings.find(
                      (f) => f.snippet && line.includes(f.snippet.substring(0, 25))
                    );

                    return (
                      <React.Fragment key={idx}>
                        <div className={`${bgClass} px-2 py-0.5 rounded leading-relaxed flex items-center justify-between`}>
                          <span className={colorClass}>{line || " "}</span>
                          {matchedFinding && (
                            <span className="text-xs font-bold px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/40 uppercase ml-2 shrink-0">
                              {matchedFinding.scanner_type}: {matchedFinding.severity}
                            </span>
                          )}
                        </div>
                        {matchedFinding && (
                          <div className="p-2.5 my-1 ml-4 rounded-lg bg-red-950/30 border border-red-500/40 text-xs font-sans text-red-200 space-y-1">
                            <div className="font-bold flex items-center space-x-1.5">
                              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                              <span>{matchedFinding.title}</span>
                            </div>
                            <p className="text-xs text-slate-300">{matchedFinding.description}</p>
                            <p className="text-xs text-emerald-300 font-medium">💡 Fix: {matchedFinding.remediation}</p>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-[rgba(255,255,255,0.08)] bg-[#0d121d] flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Evaluated with repo checks and Bob AI review.
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
            >
              Close Inspector
            </button>
          </div>

        </div>
      </div>

      {/* Terminal Modal for Web Rollback */}
      <TerminalModal
        isOpen={showTerminal}
        onClose={() => setShowTerminal(false)}
        prNumber={pr.pr_number}
        prId={pr.id}
      />

      {/* Override Dialog Modal */}
      {showOverrideDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0b0f19] border border-cyan-500/40 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Manual Release Gate Override</h3>
            </div>
            <p className="text-xs text-slate-300">
              Overriding this release verdict will unlock deployment for PR #{pr.pr_number}. You must log a compliance justification for the audit trail.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Verified with Security Champion: Token is scoped to sandbox read-only role. Scheduled rotation ticket SEC-9021."
              value={overrideNotes}
              onChange={(e) => setOverrideNotes(e.target.value)}
              className="w-full bg-[#121826] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowOverrideDialog(false)}
                className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyOverride}
                disabled={isSubmittingOverride}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-black shadow-md shadow-cyan-500/20"
              >
                {isSubmittingOverride ? "Applying..." : "Confirm Override (GO)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
