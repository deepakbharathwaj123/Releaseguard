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
  ArrowUpRight
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
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filtered = prs.filter((p) => {
    const matchesTier = filterTier === "ALL" || p.risk_level === filterTier;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.repo_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(p.pr_number).includes(searchQuery);
    return matchesTier && matchesSearch;
  });

  const criticalCount = prs.filter((p) => p.risk_level === "CRITICAL").length;
  const highCount = prs.filter((p) => p.risk_level === "HIGH").length;
  const safeCount = prs.filter((p) => p.risk_level === "LOW").length;
  const avgRisk = prs.length ? Math.round(prs.reduce((acc, curr) => acc + curr.risk_score, 0) / prs.length) : 0;

  const getRiskBadge = (level: string, score: number) => {
    switch (level) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>Score: {score} • CRITICAL</span>
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span>Score: {score} • HIGH</span>
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Score: {score} • MEDIUM</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Score: {score} • LOW</span>
          </span>
        );
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "GO":
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>GO</span>
          </span>
        );
      case "CONDITIONAL":
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-bold text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>CONDITIONAL</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-bold text-red-400">
            <XCircle className="w-4 h-4" />
            <span>NO-GO</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 bg-[#0d121d]/80 rounded-xl border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Monitored PRs</span>
            <GitPullRequest className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-white mt-1">{prs.length}</p>
          <span className="text-[11px] text-slate-400">Active pull requests</span>
        </div>

        <div className="glass-panel p-4 bg-[#0d121d]/80 rounded-xl border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Critical Blockers</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-extrabold text-red-400 mt-1">{criticalCount}</p>
          <span className="text-[11px] text-red-400/80">Releases locked</span>
        </div>

        <div className="glass-panel p-4 bg-[#0d121d]/80 rounded-xl border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">High Risk (Supervised)</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl font-extrabold text-orange-400 mt-1">{highCount}</p>
          <span className="text-[11px] text-orange-400/80">Rollback plan armed</span>
        </div>

        <div className="glass-panel p-4 bg-[#0d121d]/80 rounded-xl border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Average Risk Index</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-extrabold text-cyan-400 mt-1">{avgRisk}/100</p>
          <span className="text-[11px] text-slate-400">Across all repos</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((tier) => (
            <button
              key={tier}
              onClick={() => setFilterTier(tier)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterTier === tier
                  ? "bg-white text-slate-900 shadow-md font-bold"
                  : "bg-[#121826] text-slate-400 hover:text-white border border-[rgba(255,255,255,0.06)]"
              }`}
            >
              {tier === "ALL" ? "All Pull Requests" : tier}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search PR title, author, repo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121826] border border-[rgba(255,255,255,0.08)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* PR List Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-[rgba(255,255,255,0.06)]">
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
                className={`glass-panel p-4 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? "bg-[#161f33] border-cyan-400/60 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/40"
                    : "bg-[#0d121d]/80 hover:bg-[#131b2c] border-[rgba(255,255,255,0.06)]"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Left: PR info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                      <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                        PR #{pr.pr_number}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        {pr.repo_full_name}
                      </span>
                      {getRiskBadge(pr.risk_level, pr.risk_score)}
                    </div>

                    <h3 className="text-sm font-bold text-white hover:text-cyan-300 transition-colors truncate">
                      {pr.title}
                    </h3>

                    <div className="flex items-center space-x-4 text-xs text-slate-400 pt-0.5">
                      <span className="flex items-center space-x-1">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>@{pr.author}</span>
                      </span>
                      <span>
                        <code className="text-slate-300 text-[11px]">{pr.source_branch}</code> → <code className="text-slate-300 text-[11px]">{pr.target_branch}</code>
                      </span>
                      <span>{pr.findings_count} findings detected</span>
                    </div>
                  </div>

                  {/* Right: Verdict & Action */}
                  <div className="flex items-center space-x-4 self-end md:self-center shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Bob Verdict</span>
                      {getVerdictBadge(pr.verdict)}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPr(pr.id);
                      }}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#0f62fe]/20 hover:bg-[#0f62fe]/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all hover:scale-105"
                    >
                      <span>Inspect</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
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
