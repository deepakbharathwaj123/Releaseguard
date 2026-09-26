"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  GitPullRequest, 
  Sparkles, 
  AlertOctagon, 
  FolderGit2, 
  RefreshCw, 
  X, 
  Command, 
  ArrowRight,
  ShieldAlert,
  Flame
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  prs: any[];
  repos: any[];
  onSelectPr: (prId: string) => void;
  onOpenSandbox: () => void;
  onNavigateTab: (tab: string) => void;
  onTriggerIncident: (type: string, title: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  prs,
  repos,
  onSelectPr,
  onOpenSandbox,
  onNavigateTab,
  onTriggerIncident
}) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery("");
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredPrs = prs.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      String(p.pr_number).includes(query) ||
      p.author.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b0f19] border border-cyan-500/30 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Search Input Bar */}
        <div className="p-4 border-b border-white/10 flex items-center space-x-3 bg-[#0e1424]">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command, search PRs (#142), repos, or trigger actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 rounded bg-white/10 text-xs text-slate-300 font-mono">ESC</kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4">
          
          {/* Quick Actions */}
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 block">
              Quick Actions
            </span>
            <button
              onClick={() => {
                onOpenSandbox();
                onClose();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-left text-xs text-slate-200 hover:text-white transition-colors group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold block">Open PR & Webhook Sandbox</span>
                  <span className="text-xs text-slate-400">Test presets or custom git diffs</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </button>

            <button
              onClick={() => {
                onTriggerIncident("504_LATENCY_SPIKE", "P1: 504 Gateway Spike on Checkout API");
                onNavigateTab("incidents");
                onClose();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-left text-xs text-slate-200 hover:text-white transition-colors group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold block">Simulate 504 Gateway Production Outage</span>
                  <span className="text-xs text-slate-400">Triggers Bob Incident Analysis Agent</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition-colors" />
            </button>
          </div>

          {/* Pull Requests */}
          {filteredPrs.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 block">
                Pull Requests ({filteredPrs.length})
              </span>
              {filteredPrs.slice(0, 5).map((pr) => (
                <button
                  key={pr.id}
                  onClick={() => {
                    onSelectPr(pr.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-left text-xs text-slate-200 hover:text-white transition-colors group"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <GitPullRequest className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-cyan-400 font-bold">#{pr.pr_number}</span>
                        <span className="font-semibold truncate">{pr.title}</span>
                      </div>
                      <span className="text-xs text-slate-400 block truncate">
                        Score: {pr.risk_score} • Verdict: {pr.verdict} • @{pr.author}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                      pr.risk_level === "CRITICAL"
                        ? "bg-red-500/20 text-red-400"
                        : pr.risk_level === "HIGH"
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {pr.risk_level}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Navigation Views */}
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 block">
              Views
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onNavigateTab("workflow");
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-[#121826] hover:bg-[#182033] text-left text-xs text-slate-300 hover:text-white"
              >
                <span className="font-semibold block">Workflow Engine</span>
                <span className="text-xs text-slate-400">12-Stage Visual Map</span>
              </button>
              <button
                onClick={() => {
                  onNavigateTab("incidents");
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-[#121826] hover:bg-[#182033] text-left text-xs text-slate-300 hover:text-white"
              >
                <span className="font-semibold block">Incident Hub</span>
                <span className="text-xs text-slate-400">Runtime Telemetry & SRE</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-[#090d16] flex items-center justify-between text-xs text-slate-400">
          <span>ReleaseGuard Command Center</span>
          <div className="flex items-center space-x-2">
            <span>Navigate with</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">↓</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">↵</kbd>
          </div>
        </div>

      </div>
    </div>
  );
};
