"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  Building2, 
  KeyRound, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  LogOut, 
  RefreshCw, 
  Fingerprint, 
  ShieldAlert, 
  Users, 
  Clock, 
  FileCheck,
  Terminal,
  Activity,
  Layers,
  ArrowRight
} from "lucide-react";
import { UserProfile, DEMO_USERS } from "@/types/auth";

interface TeamAuthTabProps {
  currentUser: UserProfile | null;
  onOpenLoginModal: () => void;
  onSwitchUser: (user: UserProfile) => void;
  onLogout: () => void;
}

export const TeamAuthTab: React.FC<TeamAuthTabProps> = ({
  currentUser,
  onOpenLoginModal,
  onSwitchUser,
  onLogout,
}) => {
  const [copiedToken, setCopiedToken] = useState(false);

  const mockToken = "rg_live_jwt_99482_bob_watsonx_094820485918239485";

  const copyToken = () => {
    navigator.clipboard.writeText(mockToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const getClearanceBadge = (clearance: string) => {
    switch (clearance) {
      case "TIER_1_RESTRICTED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/40 uppercase tracking-wider">
            Tier 1: Master Clearance
          </span>
        );
      case "TIER_2_AUDIT":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 uppercase tracking-wider">
            Tier 2: Security Auditor
          </span>
        );
      case "TIER_3_ELEVATED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
            Tier 3: Platform Architect
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/20 text-slate-300 border border-slate-500/40 uppercase tracking-wider">
            Tier 4: Contributor
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner: Enterprise Identity & Zero-Trust Governance */}
      <div className="glass-card p-6 relative overflow-hidden bg-gradient-to-r from-blue-950/40 via-[#0a0f1e] to-cyan-950/30 border border-cyan-500/20 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>ReleaseGuard Identity & Role-Based Access Governance</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Active IAM
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Enforce least-privilege release operations across the IBM Bob multi-agent swarm. Authenticated personas govern release gate overrides, emergency rollback execution, and incident diagnostics.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0f62fe] to-[#06b6d4] text-white text-xs font-bold hover:opacity-95 shadow-md shadow-cyan-500/20 transition-all hover:scale-105"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Switch / Re-Authenticate</span>
            </button>

            {currentUser && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold transition-colors"
                title="Sign out of active session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Current Profile & Permissions Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Active User Session Card */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Current Active Session
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Verified Active</span>
              </span>
            </div>

            {currentUser ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/20 shrink-0"
                  />
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-lg font-bold text-white tracking-tight truncate">
                      {currentUser.name}
                    </h4>
                    <p className="text-xs text-cyan-300 font-semibold leading-tight">
                      {currentUser.roleTitle}
                    </p>
                    <div className="pt-1">{getClearanceBadge(currentUser.clearanceLevel)}</div>
                  </div>
                </div>

                <div className="space-y-2 text-xs bg-[#080d19] p-4 rounded-xl border border-white/5 font-mono">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Email:</span>
                    <span className="text-slate-200">{currentUser.email}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Department:</span>
                    <span className="text-slate-200">{currentUser.department}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Org:</span>
                    <span className="text-slate-200">{currentUser.organization}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">MFA Status:</span>
                    <span className={currentUser.mfaEnabled ? "text-emerald-400" : "text-amber-400"}>
                      {currentUser.mfaEnabled ? "Hardware TOTP Armed" : "Standard"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Session ID:</span>
                    <span className="text-cyan-400">sess_live_49182</span>
                  </div>
                </div>

                {/* Session Token Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>OAuth Bearer Token</span>
                    <button
                      onClick={copyToken}
                      className="text-cyan-400 hover:text-cyan-300 font-bold"
                    >
                      {copiedToken ? "Copied!" : "Copy Token"}
                    </button>
                  </div>
                  <code className="block p-2 rounded-lg bg-black/40 border border-white/10 text-[10px] text-slate-400 truncate font-mono">
                    {mockToken}
                  </code>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <Lock className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-sm font-bold text-white">No Active User Session</h4>
                <p className="text-xs text-slate-400">
                  Sign in or select a demo persona to unlock high-clearance actions.
                </p>
                <button
                  onClick={onOpenLoginModal}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs shadow-md shadow-cyan-500/20"
                >
                  Enterprise Sign In
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
            <span>SSO Protocol: OIDC / SAML 2.0</span>
            <span className="text-cyan-400 font-mono">v3.8-gov</span>
          </div>
        </div>

        {/* Right Column (2 cols): Interactive Role Switcher & RBAC Matrix */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Role Switcher */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Switch Active Team Role Persona</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Toggle between roles to see how governance permissions and override capabilities adapt instantly:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {DEMO_USERS.map((user) => {
                const isCurrent = currentUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => onSwitchUser(user)}
                    className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between group relative overflow-hidden ${
                      isCurrent
                        ? "bg-gradient-to-br from-blue-950/50 to-cyan-950/40 border-cyan-400/80 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/40"
                        : "bg-[#0c1220] border-white/10 hover:border-cyan-500/30 hover:bg-[#10182c]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                            {user.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-cyan-500 text-black">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 font-medium truncate">
                          {user.roleTitle}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {user.department}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">{user.clearanceLevel.replace("_", " ")}</span>
                      <span className={`font-bold flex items-center gap-1 ${isCurrent ? "text-cyan-300" : "text-slate-400 group-hover:text-white"}`}>
                        <span>{isCurrent ? "Active Role" : "Switch to Role"}</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role-Based Permissions Matrix */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Role-Based Access Control (RBAC) Entitlements</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2.5 pr-4 font-semibold">Governance Capability</th>
                    <th className="py-2.5 px-3 font-semibold text-center">SRE Commander</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Security Lead</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Platform Architect</th>
                    <th className="py-2.5 pl-3 font-semibold text-center">Developer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  <tr>
                    <td className="py-2.5 pr-4 font-medium flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Tech Lead PR Gate Override (GO)</span>
                    </td>
                    <td className="py-2.5 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-2.5 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-2.5 px-3 text-center"><XCircle className="w-4 h-4 text-slate-600 mx-auto" /></td>
                    <td className="py-2.5 pl-3 text-center"><XCircle className="w-4 h-4 text-slate-600 mx-auto" /></td>
                  </tr>

                  <tr>
                    <td className="py-2.5 pr-4 font-medium flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-purple-400" />
                      <span>Execute Emergency Rollback Runbook</span>
                    </td>
                    <td className="py-2.5 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-2.5 px-3 text-center"><XCircle className="w-4 h-4 text-slate-600 mx-auto" /></td>
                    <td className="py-2.5 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-2.5 pl-3 text-center"><XCircle className="w-4 h-4 text-slate-600 mx-auto" /></td>
                  </tr>

                  <tr>
                    <td className="py-2.5 pr-4 font-medium flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-amber-400" />
                      <span>Trigger Incident Anomaly Simulation</span>
                    </td>
                    <td className="py-2.5 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-2.5 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-2.5 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-2.5 pl-3 text-center"><XCircle className="w-4 h-4 text-slate-600 mx-auto" /></td>
                  </tr>

                  <tr>
                    <td className="py-2.5 pr-4 font-medium flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span>Configure GitHub Webhook Listener</span>
                    </td>
                    <td className="py-2.5 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-2.5 px-3 text-center"><XCircle className="w-4 h-4 text-slate-600 mx-auto" /></td>
                    <td className="py-2.5 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-2.5 pl-3 text-center"><XCircle className="w-4 h-4 text-slate-600 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
