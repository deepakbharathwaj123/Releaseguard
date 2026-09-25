"use client";

import React, { useState } from "react";
import { 
  GitBranch, 
  Send, 
  Cpu, 
  Search, 
  Scale, 
  Bot, 
  Database, 
  MessageSquare, 
  LayoutDashboard, 
  Server, 
  AlertOctagon, 
  FileCheck,
  ChevronRight
} from "lucide-react";

interface WorkflowStep {
  step: number;
  label: string;
  category: "Git" | "Backend" | "Agents" | "Frontend" | "Runtime";
  icon: any;
  desc: string;
  subitems?: string[];
}

const STEPS: WorkflowStep[] = [
  {
    step: 1,
    label: "Developer Push / PR",
    category: "Git",
    icon: GitBranch,
    desc: "Developer pushes code changes or opens a Pull Request on GitHub/GitLab."
  },
  {
    step: 2,
    label: "GitHub Webhook",
    category: "Git",
    icon: Send,
    desc: "GitHub fires asynchronous 'pull_request' webhook event to ReleaseGuard listener."
  },
  {
    step: 3,
    label: "Fetch Files & Metadata",
    category: "Backend",
    icon: Cpu,
    desc: "FastAPI backend extracts git tree, commit diff, and repository configuration."
  },
  {
    step: 4,
    label: "7 Code Scanners",
    category: "Backend",
    icon: Search,
    desc: "Parallel static AST and pattern analyzers audit the changes across 7 dimensions:",
    subitems: [
      "1. Secrets (Keys, JWT, PGP)",
      "2. Config & Env (CORS, Debug)",
      "3. IaC (Docker root, K8s)",
      "4. CI/CD (curl | bash, actions)",
      "5. Tests & Regressions",
      "6. FinOps Cloud Cost Spikes",
      "7. DB Migrations & DDL Locks"
    ]
  },
  {
    step: 5,
    label: "Compute Risk Score",
    category: "Backend",
    icon: Scale,
    desc: "Heuristic and vector scoring engine aggregates findings into a 0-100 risk score and tier."
  },
  {
    step: 6,
    label: "IBM Bob Agent Swarm",
    category: "Agents",
    icon: Bot,
    desc: "Orchestrates multi-agent deliberation using IBM watsonx / IBM Bob Swarm:",
    subitems: [
      "• Release Orchestrator Agent (Verdict: GO/NO-GO)",
      "• Security Subagent (SOC2/PCI compliance)",
      "• Infra/DevOps Subagent (K8s pod safety)",
      "• Rollback Planner Subagent (Zero-RTO runbook)",
      "• Cost Subagent (FinOps delta)",
      "• DB Migration Subagent (Table locks)"
    ]
  },
  {
    step: 7,
    label: "Store Results in DB",
    category: "Backend",
    icon: Database,
    desc: "Persists findings, agent deliberations, risk scores, and rollback scripts in SQLite database."
  },
  {
    step: 8,
    label: "Post PR Comment & Status Check",
    category: "Git",
    icon: MessageSquare,
    desc: "Publishes rich markdown summary and sets GitHub Commit Status Check (Success/Failure/Pending)."
  },
  {
    step: 9,
    label: "ReleaseGuard Next.js UI",
    category: "Frontend",
    icon: LayoutDashboard,
    desc: "Web dashboard visualizes Repos, PR risk tiers, scanner deep-dives, agent deliberations, and runbooks."
  },
  {
    step: 10,
    label: "Monitor Deployments",
    category: "Runtime",
    icon: Server,
    desc: "Tracks staging and production deployments linked back to their originating PRs."
  },
  {
    step: 11,
    label: "Bob Incident Analysis Agent",
    category: "Runtime",
    icon: AlertOctagon,
    desc: "On production anomaly (504 spike, memory leak), Bob agent isolates the offending PR and root cause."
  },
  {
    step: 12,
    label: "Emergency Remediation Runbook",
    category: "Runtime",
    icon: FileCheck,
    desc: "Generates one-click automated rollback and killswitch commands to restore system health."
  }
];

export const WorkflowArchitectureBanner: React.FC = () => {
  const [selectedStep, setSelectedStep] = useState<WorkflowStep>(STEPS[3]);

  return (
    <div className="glass-panel p-6 mb-8 border border-[rgba(255,255,255,0.08)] bg-[#0d121d]/80 rounded-2xl relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-[rgba(255,255,255,0.06)] gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              End-to-End ReleaseGuard & IBM Bob Architecture Pipeline
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            12-Stage Automated Workflow: from Developer PR opening to IBM Bob Multi-Agent Deliberation and Post-Deploy Incident Recovery
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
            FastAPI Backend
          </span>
          <span className="px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
            IBM Bob Agents
          </span>
          <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
            Next.js Frontend
          </span>
        </div>
      </div>

      {/* Step Horizontal Scroller / Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-5 pb-4">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const isSelected = selectedStep.step === s.step;
          return (
            <button
              key={s.step}
              onClick={() => setSelectedStep(s)}
              className={`p-3 rounded-xl text-left transition-all border flex flex-col justify-between ${
                isSelected
                  ? "bg-gradient-to-b from-[#0f62fe]/20 to-[#06b6d4]/10 border-cyan-400/50 shadow-lg shadow-cyan-500/10 scale-[1.02]"
                  : "bg-[#121826]/70 hover:bg-[#172033] border-[rgba(255,255,255,0.06)] text-slate-400"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected ? "bg-cyan-500 text-black font-extrabold" : "bg-white/10 text-slate-300"
                  }`}
                >
                  Step {s.step}
                </span>
                <Icon className={`w-4 h-4 ${isSelected ? "text-cyan-400" : "text-slate-400"}`} />
              </div>
              <p className={`text-xs font-semibold line-clamp-1 ${isSelected ? "text-white" : "text-slate-300"}`}>
                {s.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Step Deep-Dive Bar */}
      <div className="mt-3 p-4 rounded-xl bg-[#090d16]/90 border border-[rgba(255,255,255,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
            <selectedStep.icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                Step {selectedStep.step} of 12 • {selectedStep.category}
              </span>
              <h3 className="text-sm font-bold text-white">{selectedStep.label}</h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">{selectedStep.desc}</p>
            {selectedStep.subitems && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                {selectedStep.subitems.map((sub, idx) => (
                  <span key={idx} className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>{sub}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center space-x-2 self-end md:self-center">
          <button
            onClick={() => {
              const nextIdx = (selectedStep.step % STEPS.length);
              setSelectedStep(STEPS[nextIdx]);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white border border-white/10 transition-colors"
          >
            <span>Next Stage</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
