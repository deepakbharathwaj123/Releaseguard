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
  ChevronRight,
  Play,
  CheckCircle2,
  Sparkles,
  Zap,
  Activity,
  ArrowRight,
  SlidersHorizontal
} from "lucide-react";

interface WorkflowStep {
  step: number;
  label: string;
  category: "Git" | "Backend" | "Agents" | "Frontend" | "Runtime";
  icon: any;
  desc: string;
  subitems?: string[];
  interactiveAction?: {
    label: string;
    tabTarget?: string;
    actionType?: "sandbox" | "tab" | "pr";
  };
}

const STEPS: WorkflowStep[] = [
  {
    step: 1,
    label: "Developer Push / PR",
    category: "Git",
    icon: GitBranch,
    desc: "Developer pushes code changes or opens a Pull Request on GitHub/GitLab.",
    interactiveAction: { label: "View Monitored PRs", tabTarget: "prs", actionType: "tab" }
  },
  {
    step: 2,
    label: "GitHub Webhook",
    category: "Git",
    icon: Send,
    desc: "GitHub fires asynchronous 'pull_request' webhook event to ReleaseGuard listener.",
    interactiveAction: { label: "Webhook Settings in Repos", tabTarget: "repos", actionType: "tab" }
  },
  {
    step: 3,
    label: "Fetch Files & Metadata",
    category: "Backend",
    icon: Cpu,
    desc: "FastAPI backend extracts git tree, commit diff, and repository configuration.",
    interactiveAction: { label: "Test Git Diff in Sandbox", actionType: "sandbox" }
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
    ],
    interactiveAction: { label: "Test 7 Scanners in Sandbox", actionType: "sandbox" }
  },
  {
    step: 5,
    label: "Compute Risk Score",
    category: "Backend",
    icon: Scale,
    desc: "Heuristic and vector scoring engine aggregates findings into a 0-100 risk score and tier.",
    interactiveAction: { label: "View Risk Gauges in PR List", tabTarget: "prs", actionType: "tab" }
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
    ],
    interactiveAction: { label: "Inspect Bob Consensus on PRs", tabTarget: "prs", actionType: "tab" }
  },
  {
    step: 7,
    label: "Store Results in DB",
    category: "Backend",
    icon: Database,
    desc: "Persists findings, agent deliberations, risk scores, and rollback scripts in SQLite database.",
    interactiveAction: { label: "Explore Database Records", tabTarget: "prs", actionType: "tab" }
  },
  {
    step: 8,
    label: "Post PR Comment & Check",
    category: "Git",
    icon: MessageSquare,
    desc: "Publishes rich markdown summary and sets GitHub Commit Status Check (Success/Failure/Pending).",
    interactiveAction: { label: "Review PR Comments", tabTarget: "prs", actionType: "tab" }
  },
  {
    step: 9,
    label: "ReleaseGuard Next.js UI",
    category: "Frontend",
    icon: LayoutDashboard,
    desc: "Web dashboard visualizes Repos, PR risk tiers, scanner deep-dives, agent deliberations, and runbooks.",
    interactiveAction: { label: "Switch to Pull Requests", tabTarget: "prs", actionType: "tab" }
  },
  {
    step: 10,
    label: "Monitor Deployments",
    category: "Runtime",
    icon: Server,
    desc: "Tracks staging and production deployments linked back to their originating PRs.",
    interactiveAction: { label: "View Live Deployments", tabTarget: "incidents", actionType: "tab" }
  },
  {
    step: 11,
    label: "Bob Incident Analysis",
    category: "Runtime",
    icon: AlertOctagon,
    desc: "On production anomaly (504 spike, memory leak), Bob agent isolates the offending PR and root cause.",
    interactiveAction: { label: "Simulate Anomaly in Hub", tabTarget: "incidents", actionType: "tab" }
  },
  {
    step: 12,
    label: "Remediation Runbook",
    category: "Runtime",
    icon: FileCheck,
    desc: "Generates one-click automated rollback and killswitch commands to restore system health.",
    interactiveAction: { label: "Execute SRE Killswitch", tabTarget: "incidents", actionType: "tab" }
  }
];

interface WorkflowArchitectureBannerProps {
  onNavigateTab?: (tab: string) => void;
  onOpenSandbox?: () => void;
  onSelectPr?: () => void;
}

export const WorkflowArchitectureBanner: React.FC<WorkflowArchitectureBannerProps> = ({
  onNavigateTab,
  onOpenSandbox,
}) => {
  const [selectedStep, setSelectedStep] = useState<WorkflowStep>(STEPS[3]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simStep, setSimStep] = useState<number>(0);
  const [simLog, setSimLog] = useState<string>("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("ALL");

  const runEndToEndSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimStep(1);

    const stepDuration = 550;
    STEPS.forEach((s, idx) => {
      setTimeout(() => {
        setSimStep(s.step);
        setSelectedStep(s);
        setSimLog(`[STEP ${s.step}/12] Executing ${s.label}: ${s.desc.substring(0, 80)}...`);
        if (s.step === 12) {
          setTimeout(() => {
            setIsSimulating(false);
            setSimLog("✅ Complete 12-stage workflow simulation finished successfully.");
          }, 800);
        }
      }, idx * stepDuration);
    });
  };

  const filteredSteps = STEPS.filter((s) => {
    if (activeCategoryFilter === "ALL") return true;
    return s.category.toUpperCase() === activeCategoryFilter.toUpperCase();
  });

  const handleStepAction = () => {
    if (!selectedStep.interactiveAction) return;
    const { actionType, tabTarget } = selectedStep.interactiveAction;
    if (actionType === "sandbox" && onOpenSandbox) {
      onOpenSandbox();
    } else if (tabTarget && onNavigateTab) {
      onNavigateTab(tabTarget);
    }
  };

  return (
    <div className="glass-card p-6 border border-white/10 bg-[#0d1424]/90 rounded-2xl relative overflow-hidden shadow-2xl">
      {/* Decorative gradient background */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>End-to-End ReleaseGuard & IBM Bob Architecture Pipeline</span>
              <span className="text-xs font-bold tracking-wide px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                12 Stages Live
              </span>
            </h2>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            Visual execution path: Developer PR → 7 Code Scanners → Composite Risk Engine → IBM Bob Swarm → SRE Incident Diagnosis
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={runEndToEndSimulation}
            disabled={isSimulating}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg ${
              isSimulating
                ? "bg-cyan-500 text-black animate-pulse"
                : "bg-gradient-to-r from-[#0f62fe] to-[#06b6d4] text-white hover:scale-105 shadow-cyan-500/20"
            }`}
          >
            <Play className={`w-4 h-4 fill-current ${isSimulating ? "animate-spin" : ""}`} />
            <span>{isSimulating ? `Simulating Stage ${simStep}/12...` : "▶ Run Live Simulation"}</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 pt-4 overflow-x-auto pb-1 text-sm">
        {["ALL", "GIT", "BACKEND", "AGENTS", "FRONTEND", "RUNTIME"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategoryFilter(cat)}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
              activeCategoryFilter === cat
                ? "bg-white text-slate-900 font-bold shadow-md"
                : "bg-[#141b2c] text-slate-400 hover:text-white border border-white/5"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Steps Pipeline Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-4 pb-4">
        {filteredSteps.map((s) => {
          const Icon = s.icon;
          const isSelected = selectedStep.step === s.step;
          const isSimActive = isSimulating && simStep === s.step;
          const isSimDone = isSimulating && simStep > s.step;

          return (
            <button
              key={s.step}
              onClick={() => setSelectedStep(s)}
              className={`p-3.5 rounded-xl text-left transition-all border flex flex-col justify-between relative overflow-hidden group min-h-[96px] ${
                isSimActive
                  ? "bg-cyan-950 border-cyan-400 ring-2 ring-cyan-400 shadow-xl shadow-cyan-500/30 scale-105"
                  : isSelected
                  ? "bg-gradient-to-b from-[#0f62fe]/25 to-[#06b6d4]/15 border-cyan-400/80 shadow-lg shadow-cyan-500/10 scale-[1.02]"
                  : isSimDone
                  ? "bg-[#101b2a] border-emerald-500/40 text-slate-300"
                  : "bg-[#121826]/70 hover:bg-[#172033] border-white/5 text-slate-400"
              }`}
            >
              {isSimActive && (
                <span className="absolute inset-0 bg-cyan-400/10 animate-pulse pointer-events-none" />
              )}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isSimActive
                      ? "bg-cyan-400 text-black font-extrabold animate-bounce"
                      : isSimDone
                      ? "bg-emerald-500/30 text-emerald-300"
                      : isSelected
                      ? "bg-cyan-500 text-black font-extrabold"
                      : "bg-white/10 text-slate-300"
                  }`}
                >
                  {s.step}
                </span>
                <Icon
                  className={`w-4.5 h-4.5 transition-transform group-hover:scale-110 ${
                    isSimActive ? "text-cyan-300 animate-spin" : isSelected ? "text-cyan-400" : "text-slate-400"
                  }`}
                />
              </div>
              <p className={`text-sm font-semibold leading-snug ${isSelected ? "text-white" : "text-slate-300"}`}>
                {s.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Live Simulation Ticker / Log */}
      {isSimulating && (
        <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-sm font-mono text-cyan-300 flex items-center gap-2 animate-pulse mb-3">
          <Zap className="w-4 h-4 text-cyan-400 shrink-0 animate-bounce" />
          <span className="truncate">{simLog}</span>
        </div>
      )}

      {/* Active Step Deep-Dive Bar */}
      <div className="mt-2 p-5 rounded-xl bg-[#090d16]/95 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 shadow-md shadow-cyan-500/20">
            <selectedStep.icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/70 px-2.5 py-1 rounded border border-cyan-800/40">
                Step {selectedStep.step} of 12 • {selectedStep.category}
              </span>
              <h3 className="text-base font-bold text-white">{selectedStep.label}</h3>
            </div>
            <p className="text-sm text-slate-300 mt-1.5">{selectedStep.desc}</p>
            {selectedStep.subitems && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm text-slate-400">
                {selectedStep.subitems.map((sub, idx) => (
                  <span key={idx} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    <span>{sub}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
          {selectedStep.interactiveAction && (
            <button
              onClick={handleStepAction}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 text-black text-sm font-bold shadow-md shadow-cyan-500/20 hover:scale-105 transition-all"
            >
              <span>{selectedStep.interactiveAction.label}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              const nextIdx = selectedStep.step % STEPS.length;
              setSelectedStep(STEPS[nextIdx]);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-slate-300 hover:text-white border border-white/10 transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
