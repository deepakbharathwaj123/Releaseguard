"use client";

import React, { useState } from "react";
import { 
  Shield, 
  Sparkles, 
  RefreshCw, 
  PlusCircle, 
  Activity, 
  GitPullRequest, 
  Search, 
  FolderGit2,
  ChevronDown,
  LogOut,
  KeyRound,
  ShieldCheck,
  Bot
} from "lucide-react";
import { UserProfile, DEMO_USERS } from "@/types/auth";

interface HeaderProps {
  onOpenSandbox: () => void;
  onRefresh: () => void;
  onResetDb: () => void;
  onOpenCommandPalette: () => void;
  onOpenAuthModal: () => void;
  currentUser: UserProfile | null;
  onSwitchUser: (user: UserProfile) => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  loading: boolean;
  totalPrs: number;
  blockedCount: number;
  reposCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSandbox,
  onRefresh,
  onResetDb,
  onOpenCommandPalette,
  onOpenAuthModal,
  currentUser,
  onSwitchUser,
  onLogout,
  activeTab,
  setActiveTab,
  loading,
  totalPrs,
  blockedCount,
  reposCount = 3
}) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  return (
    <header className="border-b border-white/10 bg-[#070b14]/95 sticky top-0 z-40 backdrop-blur-xl shadow-lg shadow-black/40">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* Main header row */}
        <div className="flex items-center justify-between h-[68px] gap-4">
          
          {/* Logo & Brand */}
          <div 
            className="flex items-center gap-3 cursor-pointer shrink-0" 
            onClick={() => setActiveTab("prs")}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0f62fe] to-[#06b6d4] flex items-center justify-center shadow-lg shadow-cyan-500/25 ring-1 ring-white/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                  Release<span className="text-[#06b6d4]">Guard</span>
                </span>
                <span className="hidden sm:flex text-xs font-bold tracking-wide px-2.5 py-1 rounded-full bg-blue-500/15 text-[#38bdf8] border border-blue-500/30 items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>IBM Bob Swarm</span>
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-400 font-medium">Enterprise DevSecOps & Release Governance</p>
            </div>
          </div>

          {/* Navigation Tabs Bar — desktop */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#0d1424] p-1.5 rounded-2xl border border-white/10 shadow-inner">
            <button
              onClick={() => setActiveTab("prs")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === "prs"
                  ? "bg-[#0f62fe] text-white shadow-md shadow-blue-600/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <GitPullRequest className="w-4 h-4" />
              <span>Pull Requests</span>
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-white/20 text-white font-mono">
                {totalPrs}
              </span>
              {blockedCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs bg-red-500/30 text-red-300 border border-red-500/40 animate-pulse">
                  {blockedCount} Blocked
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("repos")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === "repos"
                  ? "bg-[#0f62fe] text-white shadow-md shadow-blue-600/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <FolderGit2 className="w-4 h-4" />
              <span>Repositories</span>
            </button>

            <button
              onClick={() => setActiveTab("workflow")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === "workflow"
                  ? "bg-[#0f62fe] text-white shadow-md shadow-blue-600/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Workflow</span>
            </button>

            <button
              onClick={() => setActiveTab("incidents")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === "incidents"
                  ? "bg-[#0f62fe] text-white shadow-md shadow-blue-600/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Incidents</span>
            </button>

            <button
              onClick={() => setActiveTab("agent")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === "agent"
                  ? "bg-[#0f62fe] text-white shadow-md shadow-blue-600/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>Project Agent</span>
            </button>

            <button
              onClick={() => setActiveTab("auth")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === "auth"
                  ? "bg-[#0f62fe] text-white shadow-md shadow-blue-600/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Access & Auth</span>
              {currentUser && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            {/* Command Palette Trigger */}
            <button
              onClick={onOpenCommandPalette}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#12192c] hover:bg-[#1a233b] border border-white/10 text-slate-400 hover:text-white text-sm transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs text-slate-300 font-mono">⌘K</kbd>
            </button>

            {/* Refresh / Reset DB */}
            <button
              onClick={onResetDb}
              title="Reset Demo Data"
              className="p-2 rounded-xl bg-[#12192c] hover:bg-[#1a233b] border border-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>

            {/* Test Sandbox Trigger */}
            <button
              onClick={onOpenSandbox}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0f62fe] to-[#06b6d4] text-white text-sm font-bold hover:opacity-95 shadow-md shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Test Sandbox</span>
            </button>

            {/* User Profile / Login Dropdown */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-[#101728] hover:bg-[#172138] border border-white/15 transition-all text-left group"
                >
                  <div className="relative">
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-lg object-cover border border-cyan-400/60"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#070b14]" />
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-sm font-bold text-white block leading-tight truncate max-w-[110px]">
                      {currentUser.name}
                    </span>
                    <span className="text-xs text-cyan-400 font-semibold block leading-none">
                      {currentUser.roleTitle.split("&")[0].trim()}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white" />
                </button>

                {/* Dropdown Menu */}
                {showProfileDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowProfileDropdown(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-[#0c1220] border border-cyan-500/30 rounded-2xl shadow-2xl z-50 p-4 space-y-4 animate-in fade-in zoom-in-95">
                      <div className="flex items-center gap-3 p-3 bg-[#12192e] rounded-xl border border-white/5">
                        <img
                          src={currentUser.avatar}
                          alt={currentUser.name}
                          className="w-11 h-11 rounded-xl object-cover border border-cyan-400/50"
                        />
                        <div className="space-y-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                          <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                          <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {currentUser.clearanceLevel.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-xs text-slate-400 uppercase font-bold tracking-wider px-1">
                          Switch Role Persona
                        </span>
                        {DEMO_USERS.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              onSwitchUser(u);
                              setShowProfileDropdown(false);
                            }}
                            className={`w-full p-2.5 rounded-xl text-left text-sm transition-all flex items-center justify-between ${
                              u.id === currentUser.id
                                ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                                : "text-slate-300 hover:bg-white/5"
                            }`}
                          >
                            <span className="truncate">{u.roleTitle.split("&")[0].trim()}</span>
                            {u.id === currentUser.id && (
                              <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm px-1">
                        <button
                          onClick={() => {
                            setActiveTab("auth");
                            setShowProfileDropdown(false);
                          }}
                          className="text-cyan-400 hover:text-cyan-300 font-semibold"
                        >
                          Access Center
                        </button>
                        <button
                          onClick={() => {
                            onLogout();
                            setShowProfileDropdown(false);
                          }}
                          className="text-red-400 hover:text-red-300 font-semibold flex items-center gap-1.5"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Log Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-bold hover:opacity-95 shadow-md shadow-blue-500/20 transition-all"
              >
                <KeyRound className="w-4 h-4" />
                <span>Login</span>
              </button>
            )}

          </div>

        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex lg:hidden items-center gap-1 overflow-x-auto py-2 border-t border-white/5 text-sm">
          {[
            { id: "prs", label: `PRs (${totalPrs})` },
            { id: "repos", label: "Repos" },
            { id: "workflow", label: "Workflow" },
            { id: "incidents", label: "Incidents" },
            { id: "agent", label: "Agent" },
            { id: "auth", label: "Auth" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-[#0f62fe] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>
    </header>
  );
};
