"use client";

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
  ArrowRight
} from "lucide-react";

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
}

export const PRDetailModal: React.FC<PRDetailModalProps> = ({ pr, onClose }) => {
  const [activeTab, setActiveTab] = useState<string>("findings");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [selectedScannerFilter, setSelectedScannerFilter] = useState<string>("ALL");

  if (!pr) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const rollbackAgent = pr.agent_outputs.find((a) => a.agent_name.includes("Rollback"));
  const costAgent = pr.agent_outputs.find((a) => a.agent_name.includes("Cost"));
  const orchestrator = pr.agent_outputs.find((a) => a.agent_name.includes("Orchestrator"));

  const filteredFindings = pr.findings.filter((f) => {
    if (selectedScannerFilter === "ALL") return true;
    return f.scanner_type.toLowerCase() === selectedScannerFilter.toLowerCase();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
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
            { id: "agents", label: `IBM Bob Swarm (${pr.agent_outputs.length})`, icon: Bot },
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
                    ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
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
              {/* Category Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                {["ALL", "SECRETS", "CONFIG", "IAC", "CI", "TESTS", "COST", "DB"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedScannerFilter(cat)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
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
                <div className="p-8 text-center rounded-xl bg-[#121826]/50 border border-[rgba(255,255,255,0.06)]">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">No findings in this category!</p>
                  <p className="text-xs text-slate-400 mt-0.5">Code passed all checks for {selectedScannerFilter.toLowerCase()} scanner.</p>
                </div>
              ) : (
                filteredFindings.map((f) => (
                  <div
                    key={f.id}
                    className="p-4 rounded-xl bg-[#101625] border border-[rgba(255,255,255,0.08)] space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
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
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 uppercase">
                            {f.scanner_type} Scanner
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1.5">{f.title}</h4>
                      </div>
                      <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-1 rounded border border-cyan-800/30 shrink-0">
                        {f.file_path}:{f.line_number}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">{f.description}</p>

                    {f.snippet && (
                      <div className="p-2.5 rounded-lg bg-[#070a12] border border-[rgba(255,255,255,0.06)] font-mono text-xs text-red-300 overflow-x-auto">
                        <code>{f.snippet}</code>
                      </div>
                    )}

                    {f.remediation && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/30 flex items-start space-x-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-emerald-200">
                          <span className="font-bold">Remediation: </span>
                          <span>{f.remediation}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: IBM BOB AGENT SWARM */}
          {activeTab === "agents" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/40 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Bot className="w-5 h-5 text-blue-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">IBM Bob Swarm Consensus Engine</span>
                    <span className="text-[11px] text-slate-400">Granite 3-8B Instruct / watsonx multi-agent orchestration</span>
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
                        <p className="text-[11px] text-cyan-400 font-medium">{agent.agent_role}</p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
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

                    {/* Agent Checklist / Metadata */}
                    {agent.details_json?.checklist && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
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
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          Compliance Flags
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                          {Object.entries(agent.details_json.compliance_matrix).map(([k, v]) => (
                            <span key={k} className="p-1 rounded bg-[#090d16] text-slate-400">
                              <b className="text-slate-200">{k.toUpperCase()}:</b> {String(v)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-[rgba(255,255,255,0.04)]">
                      <span>Confidence: {Math.round(agent.confidence * 100)}%</span>
                      <span>Model: IBM Granite / Bob Engine</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ROLLBACK RUNBOOK */}
          {activeTab === "rollback" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/30 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                    <RotateCcw className="w-4 h-4 text-purple-400" />
                    <span>Zero-RTO Automated Rollback Runbook</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pre-generated step-by-step commands to restore previous healthy production state within 90 seconds.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const steps = rollbackAgent?.details_json?.steps || [];
                    const script = steps.map((s: any) => `# Step ${s.step}: ${s.title}\n${s.command}`).join("\n\n");
                    copyToClipboard(script);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? "Copied Script!" : "Copy Full Script"}</span>
                </button>
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
                      <span className="text-[11px] text-slate-400">{step.description}</span>
                    </div>

                    <div className="relative group">
                      <pre className="p-3 rounded-lg bg-[#07090e] border border-[rgba(255,255,255,0.06)] text-cyan-300 font-mono text-xs overflow-x-auto">
                        <code>{step.command}</code>
                      </pre>
                      <button
                        onClick={() => copyToClipboard(step.command)}
                        className="absolute right-2 top-2 p-1.5 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-opacity opacity-0 group-hover:opacity-100"
                        title="Copy command"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: COST & FINOPS */}
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
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">FinOps Status</span>
                  <span className="text-sm font-bold text-white">{costAgent?.verdict || "APPROVED"}</span>
                </div>
              </div>

              {costAgent?.details_json?.cost_breakdown && (
                <div className="p-4 rounded-xl bg-[#111728] border border-[rgba(255,255,255,0.08)] space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Expenditure Breakdown by Layer</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {Object.entries(costAgent.details_json.cost_breakdown).map(([k, v]) => (
                      <div key={k} className="p-3 rounded-lg bg-[#090d16] border border-white/5">
                        <span className="text-[11px] text-slate-400 block">{k}</span>
                        <span className="text-base font-bold text-cyan-300 mt-0.5 block">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: GITHUB COMMENT PREVIEW */}
          {activeTab === "comment" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">Live GitHub Pull Request Bot Comment</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                  Status Check: {pr.pr_comment?.status_check_state?.toUpperCase() || "SUCCESS"}
                </span>
              </div>

              <div className="p-5 rounded-xl bg-[#0d1117] border border-[#30363d] text-slate-200 font-sans space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-[#30363d]">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                    RG
                  </div>
                  <span className="text-xs font-bold text-white">releaseguard-bot</span>
                  <span className="text-[11px] text-slate-400">commented just now</span>
                </div>

                <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-3">
                  <pre className="whitespace-pre-wrap font-sans text-xs bg-transparent p-0 m-0 text-slate-300">
                    {pr.pr_comment?.comment_body || "Generating GitHub PR comment..."}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: RAW GIT DIFF */}
          {activeTab === "diff" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Unified Patch Diff</span>
                <button
                  onClick={() => copyToClipboard(pr.diff_content || "")}
                  className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Diff</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#07090e] border border-[rgba(255,255,255,0.08)] font-mono text-xs overflow-x-auto max-h-[500px]">
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

                  return (
                    <div key={idx} className={`${bgClass} px-1.5 py-0.5 rounded leading-relaxed`}>
                      <span className={`${colorClass}`}>{line || " "}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[rgba(255,255,255,0.08)] bg-[#0d121d] flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Automated evaluation completed with 7 active scanners and IBM Bob Swarm.
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
  );
};
