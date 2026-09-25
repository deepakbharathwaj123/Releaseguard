"use client";

import React, { useState } from "react";
import { 
  GitPullRequest, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  User,
  ArrowUpRight,
  Key,
  Database,
  Cpu,
  DollarSign,
  Activity,
  Layers,
  Sparkles
} from "lucide-react";

export interface PRSummary {
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
  findings_count: number;
  created_at: string;
  updated_at: string;
}

interface PRListProps {
  prs: PRSummary[];
  onSelectPr: (prId: string) => void;
  selectedPrId: string | null;
}

export const PRList: React.FC<PRListProps> = ({ prs, onSelectPr, selectedPrId }) => {
  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>(" ");

  const filtered = prs.filter((p) => {
    const matchesTier = filterTier === "ALL" || p.risk_level === filterTier;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchesTier;
    const matchesSearch =
      p.title.toLowerCase().includes(q) ||
      p.author.toLowerCase().includes(q) ||
      p.repo_name.toLowerCase().includes(q) ||
      String(p.pr_number).includes(q);
    return matchesTier && matchesSearch;
  });

  const criticalCount = prs.filter((p) => p.risk_level === "CRITICAL").length;
  const highCount = prs.filter((p) => p.risk_level === "HIGH").length;
  const safeCount = prs.filter((p) => p.risk_level === "LOW").length;
  const avgRisk = prs.length ? Math.round(prs.reduce((acc, curr) => acc + curr.risk_score, 0) / prs.length) : 0;

  // Modern SVG circular gauge component
  const renderRiskGauge = (score: number, level: string) => {
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    let strokeColor = "#10b981"; // emerald
    let glowColor = "rgba(16, 185, 129, 0.3)";
    if (level === "CRITICAL") {
      strokeColor = "#ef4444";
      glowColor = "rgba(239, 68, 68, 0.4)";
    } else if (level === "HIGH") {
      strokeColor = "#f97316";
      glowColor = "rgba(249, 115, 22, 0.4)";
    } else if (level === "MEDIUM") {
      strokeColor = "#f59e0b";
      glowColor = "rgba(245, 158, 11, 0.4)";
    }

    return (
      <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
        <svg className="w-14 h-14 -rotate-90 transform" viewBox="0 0 56 56">
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="4"
            fill="transparent"
          />
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke={strokeColor}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              filter: `drop-shadow(0 0 6px ${glowColor})`,
              transition: "stroke-dashoffset 0.8s ease-in-out"
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-black tracking-tight text-white leading-none">{score}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-0.5">Risk</span>
        </div>
      </div>
    );
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "GO":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>GO: APPROVED</span>
          </span>
        );
      case "CONDITIONAL":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>CONDITIONAL</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-300 border border-red-500/40 shadow-sm shadow-red-500/20 animate-pulse">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span>NO-GO: BLOCKED</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold tracking-wide uppercase">Monitored PRs</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <GitPullRequest className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-2 tracking-tight">{prs.length}</p>
          <span className="text-[11px] text-slate-400 font-medium">Active Pull Requests</span>
        </div>

        <div className="glass-card p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold tracking-wide uppercase">Critical Blockers</span>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-red-400 mt-2 tracking-tight">{criticalCount}</p>
          <span className="text-[11px] text-red-400/90 font-medium">Release Gates Locked</span>
        </div>

        <div className="glass-card p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold tracking-wide uppercase">High Risk (Supervised)</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-orange-400 mt-2 tracking-tight">{highCount}</p>
          <span className="text-[11px] text-orange-400/90 font-medium">Rollback Plan Armed</span>
        </div>

        <div className="glass-card p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold tracking-wide uppercase">Average Risk Index</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-cyan-400 mt-2 tracking-tight">{avgRisk}<span className="text-sm font-normal text-slate-500">/100</span></p>
          <span className="text-[11px] text-slate-400 font-medium">Across all connected repositories</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 bg-[#070c18] p-1 rounded-xl border border-white/5">
          {[
            { id: "ALL", label: `All PRs (${prs.length})` },
            { id: "CRITICAL", label: `Critical (${criticalCount})` },
            { id: "HIGH", label: `High (${highCount})` },
            { id: "MEDIUM", label: `Medium` },
            { id: "LOW", label: `Low (${safeCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTier(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterTier === tab.id
                  ? "bg-white text-slate-950 font-bold shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search PR title, author, repo, #142..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 shadow-inner"
          />
        </div>
      </div>

      {/* PR Cards Grid */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <GitPullRequest className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">No pull requests match this filter.</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting the filter or test a new PR in the Sandbox.</p>
          </div>
        ) : (
          filtered.map((pr) => {
            const isSelected = selectedPrId === pr.id;
            return (
              <div
                key={pr.id}
                onClick={() => onSelectPr(pr.id)}
                className={`glass-card p-4 sm:p-5 rounded-2xl cursor-pointer transition-all border relative overflow-hidden group ${
                  isSelected
                    ? "bg-[#0e172a] border-cyan-400/80 shadow-2xl shadow-cyan-500/15 ring-1 ring-cyan-400/50"
                    : "hover:border-cyan-500/40 hover:bg-[#0c1324] hover:shadow-xl hover:shadow-cyan-500/5"
                }`}
              >
                {/* Subtle specular top highlight line */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Gauge + Metadata */}
                  <div className="flex items-start sm:items-center space-x-4 min-w-0 flex-1">
                    {renderRiskGauge(pr.risk_score, pr.risk_level)}

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-950/60 px-2.5 py-0.5 rounded-md border border-cyan-800/40">
                          PR #{pr.pr_number}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 truncate">
                          {pr.repo_full_name}
                        </span>
                        <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                          {pr.risk_level}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                        {pr.title}
                      </h3>

                      <div className="flex items-center space-x-4 text-xs text-slate-400 flex-wrap gap-y-1">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center text-[9px] font-bold text-white">
                            {pr.author.charAt(0).toUpperCase()}
                          </div>
                          <span>@{pr.author}</span>
                        </div>

                        <div className="flex items-center space-x-1 font-mono text-[11px] text-slate-300">
                          <code className="bg-black/30 px-1.5 py-0.5 rounded text-cyan-300">{pr.source_branch}</code>
                          <span>→</span>
                          <code className="bg-black/30 px-1.5 py-0.5 rounded text-slate-400">{pr.target_branch}</code>
                        </div>

                        <span className="text-xs text-slate-400">
                          🛡️ <strong className="text-slate-200">{pr.findings_count}</strong> scanner findings
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Bob Verdict & Action Button */}
                  <div className="flex items-center space-x-4 self-end sm:self-center shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
                        IBM Bob Consensus
                      </span>
                      {getVerdictBadge(pr.verdict)}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPr(pr.id);
                      }}
                      className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 hover:border-cyan-500/40 text-xs font-bold transition-all hover:scale-105 shadow-md"
                    >
                      <span>Inspect</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
