"use client";

import React, { useState } from "react";
import { 
  GitPullRequest, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  ArrowUpRight,
  Filter,
  ArrowUpDown,
  FolderGit2,
  X,
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
  selectedRepoFilter?: string | null;
  onClearRepoFilter?: () => void;
}

export const PRList: React.FC<PRListProps> = ({ 
  prs, 
  onSelectPr, 
  selectedPrId,
  selectedRepoFilter,
  onClearRepoFilter
}) => {
  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"risk_desc" | "risk_asc" | "findings" | "newest">("risk_desc");
  const [localRepoFilter, setLocalRepoFilter] = useState<string>("ALL");

  // Unique repo names
  const repoNames = Array.from(new Set(prs.map((p) => p.repo_full_name || p.repo_name)));

  // Combine parent repo filter and local repo filter
  const activeRepo = selectedRepoFilter || (localRepoFilter !== "ALL" ? localRepoFilter : null);

  const filtered = prs
    .filter((p) => {
      const matchesTier = filterTier === "ALL" || p.risk_level === filterTier;
      const matchesRepo = !activeRepo || p.repo_full_name === activeRepo || p.repo_name === activeRepo;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesTier && matchesRepo;
      const matchesSearch =
        p.title.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.repo_name.toLowerCase().includes(q) ||
        String(p.pr_number).includes(q);
      return matchesTier && matchesRepo && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "risk_desc") return b.risk_score - a.risk_score;
      if (sortBy === "risk_asc") return a.risk_score - b.risk_score;
      if (sortBy === "findings") return b.findings_count - a.findings_count;
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });

  const criticalCount = prs.filter((p) => p.risk_level === "CRITICAL").length;
  const highCount = prs.filter((p) => p.risk_level === "HIGH").length;
  const safeCount = prs.filter((p) => p.risk_level === "LOW").length;
  const avgRisk = prs.length ? Math.round(prs.reduce((acc, curr) => acc + curr.risk_score, 0) / prs.length) : 0;

  // SVG circular gauge component
  const renderRiskGauge = (score: number, level: string) => {
    const radius = 24;
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
      <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
        <svg className="w-16 h-16 -rotate-90 transform" viewBox="0 0 60 60">
          <circle
            cx="30"
            cy="30"
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="4"
            fill="transparent"
          />
          <circle
            cx="30"
            cy="30"
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
          <span className="text-sm font-black tracking-tight text-white leading-none">{score}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mt-0.5">Risk</span>
        </div>
      </div>
    );
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "GO":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>GO: APPROVED</span>
          </span>
        );
      case "CONDITIONAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>CONDITIONAL</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/15 text-red-300 border border-red-500/40 shadow-sm shadow-red-500/20 animate-pulse">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span>NO-GO: BLOCKED</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold tracking-wide uppercase">Monitored PRs</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <GitPullRequest className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-4xl font-black text-white mt-2 tracking-tight">{prs.length}</p>
          <span className="text-sm text-slate-400 font-medium">Active Pull Requests</span>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold tracking-wide uppercase">Critical Blockers</span>
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-4xl font-black text-red-400 mt-2 tracking-tight">{criticalCount}</p>
          <span className="text-sm text-red-400/90 font-medium">Release Gates Locked</span>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold tracking-wide uppercase">High Risk</span>
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-4xl font-black text-orange-400 mt-2 tracking-tight">{highCount}</p>
          <span className="text-sm text-orange-400/90 font-medium">Rollback Plan Armed</span>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold tracking-wide uppercase">Average Risk Index</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-4xl font-black text-cyan-400 mt-2 tracking-tight">
            {avgRisk}<span className="text-base font-normal text-slate-500">/100</span>
          </p>
          <span className="text-sm text-slate-400 font-medium">Across connected repositories</span>
        </div>
      </div>

      {/* Filter, Search, and Sort Control Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Risk Tier Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 bg-[#070c18] p-1.5 rounded-xl border border-white/5">
            {[
              { id: "ALL", label: `All (${prs.length})` },
              { id: "CRITICAL", label: `Critical (${criticalCount})` },
              { id: "HIGH", label: `High (${highCount})` },
              { id: "MEDIUM", label: `Medium` },
              { id: "LOW", label: `Low (${safeCount})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTier(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  filterTier === tab.id
                    ? "bg-white text-slate-950 font-bold shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search, Repo Filter & Sort */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search title, author, #PR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl pl-10 pr-8 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Repo Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-sm">
              <FolderGit2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <select
                value={activeRepo || "ALL"}
                onChange={(e) => {
                  if (onClearRepoFilter) onClearRepoFilter();
                  setLocalRepoFilter(e.target.value);
                }}
                className="bg-transparent text-white focus:outline-none text-sm cursor-pointer"
              >
                <option value="ALL" className="bg-[#0a0f1d] text-white">All Repositories</option>
                {repoNames.map((r) => (
                  <option key={r} value={r} className="bg-[#0a0f1d] text-white">
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-sm">
              <ArrowUpDown className="w-4 h-4 text-blue-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-sm cursor-pointer"
              >
                <option value="risk_desc" className="bg-[#0a0f1d] text-white">Highest Risk</option>
                <option value="risk_asc" className="bg-[#0a0f1d] text-white">Lowest Risk</option>
                <option value="findings" className="bg-[#0a0f1d] text-white">Most Findings</option>
                <option value="newest" className="bg-[#0a0f1d] text-white">Newest PRs</option>
              </select>
            </div>
          </div>

        </div>

        {/* Active Repo Filter Chip */}
        {activeRepo && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 font-medium">Active filter:</span>
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 font-mono text-xs">
              <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{activeRepo}</span>
              <button
                onClick={() => {
                  if (onClearRepoFilter) onClearRepoFilter();
                  setLocalRepoFilter("ALL");
                }}
                className="hover:text-white ml-1"
                title="Clear filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* PR Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-card p-12 text-center space-y-3">
            <GitPullRequest className="w-10 h-10 text-slate-500 mx-auto" />
            <p className="text-base font-semibold text-slate-300">No pull requests match the current filters.</p>
            <p className="text-sm text-slate-500">
              Try clearing filters or search query to view all pull requests.
            </p>
            <button
              onClick={() => {
                setFilterTier("ALL");
                setSearchQuery("");
                setLocalRepoFilter("ALL");
                if (onClearRepoFilter) onClearRepoFilter();
              }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors"
            >
              Reset All Filters
            </button>
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
                {/* Specular top highlight */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Gauge + Metadata */}
                  <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                    {renderRiskGauge(pr.risk_score, pr.risk_level)}

                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-800/40">
                          PR #{pr.pr_number}
                        </span>
                        <span className="text-sm font-semibold text-slate-400 truncate">
                          {pr.repo_full_name || pr.repo_name}
                        </span>
                        <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                          {pr.risk_level}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                        {pr.title}
                      </h3>

                      <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
                            {pr.author.charAt(0).toUpperCase()}
                          </div>
                          <span>@{pr.author}</span>
                        </div>

                        <div className="flex items-center gap-1 font-mono text-xs text-slate-300">
                          <code className="bg-black/30 px-1.5 py-0.5 rounded text-cyan-300">{pr.source_branch}</code>
                          <span>→</span>
                          <code className="bg-black/30 px-1.5 py-0.5 rounded text-slate-400">{pr.target_branch}</code>
                        </div>

                        <span className="text-sm text-slate-400">
                          🛡️ <strong className="text-slate-200">{pr.findings_count}</strong> scanner findings
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Bob Verdict & Action Button */}
                  <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 uppercase font-bold tracking-wider block mb-1.5">
                        IBM Bob Consensus
                      </span>
                      {getVerdictBadge(pr.verdict)}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPr(pr.id);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 hover:border-cyan-500/40 text-sm font-bold transition-all hover:scale-105 shadow-md"
                    >
                      <span>Inspect</span>
                      <ArrowUpRight className="w-4 h-4 text-cyan-400" />
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
