// =============================================================
// ReleaseGuard AI — Built with IBM Bob
// © IBM Bob | ibm.com/products/watsonx
// =============================================================


"use client";

import React from "react";
import {
  Activity,
  CheckCircle2,
  DollarSign,
  FileCheck,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  XCircle,
} from "lucide-react";
import { UserProfile } from "@/types/auth";

interface TeamAuthTabProps {
  currentUser: UserProfile | null;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const TeamAuthTab: React.FC<TeamAuthTabProps> = ({
  currentUser,
  onOpenLogin,
  onLogout,
}) => (
  <div className="space-y-5 animate-in fade-in">
    <section className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Workspace identity</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Account and session</h2>
      </div>
      <button onClick={onLogout} className="flex items-center justify-center gap-2 rounded-lg border border-rose-400/30 px-3.5 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/10">
        <LogOut size={16} />
        Sign out
      </button>
    </section>

    {currentUser ? (
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="border-b border-white/10 pb-5 lg:border-b-0 lg:border-r lg:pr-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-xl font-bold text-cyan-200">
              {currentUser.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-white">{currentUser.name}</h3>
              <p className="truncate text-sm text-slate-400">{currentUser.email}</p>
            </div>
          </div>
          <dl className="mt-6 grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Account</dt><dd className="mt-0.5 break-all font-mono text-xs text-slate-300">{currentUser.id}</dd></div>
            <div><dt className="text-slate-500">Access level</dt><dd className="mt-0.5 text-slate-300">Workspace member</dd></div>
          </dl>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Credential and session storage</h3>
          <div className="flex gap-3 border-b border-white/10 pb-4">
            <Lock className="mt-0.5 shrink-0 text-cyan-300" size={18} />
            <div><p className="text-sm font-medium text-slate-200">Password</p><p className="mt-1 text-xs leading-5 text-slate-400">Stored as a salted scrypt hash in the local SQLite database.</p></div>
          </div>
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-emerald-300" size={18} />
            <div><p className="text-sm font-medium text-slate-200">Session</p><p className="mt-1 text-xs leading-5 text-slate-400">An opaque, revocable HTTP-only cookie expires after seven days.</p></div>
          </div>

          <div className="glass-card space-y-4 rounded-2xl p-6">
            <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
              <FileCheck className="h-4 w-4 text-emerald-400" />
              <span>Role-Based Access Control (RBAC) Entitlements</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2.5 pr-4 font-semibold">Governance Capability</th>
                    <th className="px-3 py-2.5 text-center font-semibold">SRE Commander</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Security Lead</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Platform Architect</th>
                    <th className="py-2.5 pl-3 text-center font-semibold">Developer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  <tr>
                    <td className="flex items-center gap-2 py-2.5 pr-4 font-medium"><ShieldAlert className="h-3.5 w-3.5 text-cyan-400" /><span>Tech Lead PR Gate Override (GO)</span></td>
                    <td className="px-3 py-2.5 text-center"><CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" /></td>
                    <td className="px-3 py-2.5 text-center"><CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" /></td>
                    <td className="px-3 py-2.5 text-center"><XCircle className="mx-auto h-4 w-4 text-slate-600" /></td>
                    <td className="py-2.5 pl-3 text-center"><XCircle className="mx-auto h-4 w-4 text-slate-600" /></td>
                  </tr>
                  <tr>
                    <td className="flex items-center gap-2 py-2.5 pr-4 font-medium"><Terminal className="h-3.5 w-3.5 text-purple-400" /><span>Execute Emergency Rollback Runbook</span></td>
                    <td className="px-3 py-2.5 text-center"><CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" /></td>
                    <td className="px-3 py-2.5 text-center"><XCircle className="mx-auto h-4 w-4 text-slate-600" /></td>
                    <td className="px-3 py-2.5 text-center"><CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" /></td>
                    <td className="py-2.5 pl-3 text-center"><XCircle className="mx-auto h-4 w-4 text-slate-600" /></td>
                  </tr>
                  <tr>
                    <td className="flex items-center gap-2 py-2.5 pr-4 font-medium"><Activity className="h-3.5 w-3.5 text-amber-400" /><span>Trigger Incident Anomaly Simulation</span></td>
                    <td className="px-3 py-2.5 text-center"><CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" /></td>
                    <td className="px-3 py-2.5 text-center"><CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" /></td>
                    <td className="px-3 py-2.5 text-center"><CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" /></td>
                    <td className="py-2.5 pl-3 text-center"><XCircle className="mx-auto h-4 w-4 text-slate-600" /></td>
                  </tr>
                  <tr>
                    <td className="flex items-center gap-2 py-2.5 pr-4 font-medium"><Layers className="h-3.5 w-3.5 text-blue-400" /><span>Configure GitHub Webhook Listener</span></td>
                    <td className="px-3 py-2.5 text-center"><CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" /></td>
                    <td className="px-3 py-2.5 text-center"><XCircle className="mx-auto h-4 w-4 text-slate-600" /></td>
                    <td className="px-3 py-2.5 text-center"><CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" /></td>
                    <td className="py-2.5 pl-3 text-center"><XCircle className="mx-auto h-4 w-4 text-slate-600" /></td>
                  </tr>
                  <tr>
                    <td className="flex items-center gap-2 py-2.5 pr-4 font-medium"><DollarSign className="h-3.5 w-3.5 text-emerald-400" /><span>Approve FinOps Cloud Budget Overruns</span></td>
                    <td className="px-3 py-2.5 text-center"><CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" /></td>
                    <td className="px-3 py-2.5 text-center"><XCircle className="mx-auto h-4 w-4 text-slate-600" /></td>
                    <td className="px-3 py-2.5 text-center"><CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" /></td>
                    <td className="py-2.5 pl-3 text-center"><XCircle className="mx-auto h-4 w-4 text-slate-600" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    ) : (
      <section className="flex flex-col items-start gap-4 py-6">
        <p className="text-sm text-slate-400">Sign in to view your account and workspace.</p>
        <button onClick={onOpenLogin} className="flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-bold text-[#071018] hover:bg-cyan-300">
          <KeyRound size={16} />
          Sign in
        </button>
      </section>
    )}
  </div>
);