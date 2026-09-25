"use client";

import React from "react";
import { Shield, Sparkles, RefreshCw, PlusCircle, Activity, GitPullRequest } from "lucide-react";

interface HeaderProps {
  onOpenSandbox: () => void;
  onRefresh: () => void;
  onResetDb: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  loading: boolean;
  totalPrs: number;
  blockedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSandbox,
  onRefresh,
  onResetDb,
  activeTab,
  setActiveTab,
  loading,
  totalPrs,
  blockedCount
}) => {
  return (
    <header className="border-b border-[rgba(255,255,255,0.08)] bg-[#090d16]/90 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("prs")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0f62fe] to-[#06b6d4] flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  Release<span className="text-[#06b6d4]">Guard</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-[#38bdf8] border border-blue-500/30">
                  AI Swarm
                </span>
              </div>
              <p className="text-xs text-slate-400">Autonomous DevSecOps & IBM Bob Release Governance</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-[#0d121d] p-1 rounded-xl border border-[rgba(255,255,255,0.08)]">
            <button
              onClick={() => setActiveTab("prs")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === "prs"
                  ? "bg-[#0f62fe] text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>Pull Requests ({totalPrs})</span>
              {blockedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/20 text-red-400 border border-red-500/30">
                  {blockedCount} Blocked
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("repos")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "repos"
                  ? "bg-[#0f62fe] text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Repositories
            </button>

            <button
              onClick={() => setActiveTab("workflow")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 ${
                activeTab === "workflow"
                  ? "bg-[#0f62fe] text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Workflow Engine</span>
            </button>

            <button
              onClick={() => setActiveTab("incidents")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 ${
                activeTab === "incidents"
                  ? "bg-[#0f62fe] text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Runtime Incidents</span>
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onResetDb}
              title="Reset Demo Data"
              className="p-2 rounded-lg bg-[#121826] hover:bg-[#1a2337] border border-[rgba(255,255,255,0.08)] text-slate-300 hover:text-white text-xs transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={onOpenSandbox}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#0f62fe] to-[#06b6d4] text-white text-xs font-semibold hover:opacity-95 shadow-md shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Test PR / Webhook Sandbox</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
