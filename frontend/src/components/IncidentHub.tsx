"use client";

import React, { useState } from "react";
import { 
  Activity, 
  AlertOctagon, 
  Server, 
  CheckCircle2, 
  Flame, 
  Terminal, 
  Play, 
  ShieldAlert, 
  ArrowRight,
  GitPullRequest,
  Check,
  Copy
} from "lucide-react";

interface Incident {
  id: string;
  deployment_id: string;
  repo_id: string;
  repo_name: string;
  correlated_pr_id?: string;
  pr_title?: string;
  pr_number?: number;
  pr_author?: string;
  title: string;
  severity: string;
  status: string;
  telemetry: any;
  bob_analysis: any;
  remediation_runbook?: string;
  created_at: string;
  resolved_at?: string;
}

interface Deployment {
  id: string;
  repo_id: string;
  repo_name: string;
  pr_id?: string;
  pr_title?: string;
  pr_number?: number;
  environment: string;
  version: string;
  status: string;
  deployed_by: string;
  deployed_at: string;
}

interface IncidentHubProps {
  incidents: Incident[];
  deployments: Deployment[];
  onTriggerIncident: (type: string, title: string) => Promise<void>;
  onResolveIncident: (incidentId: string) => Promise<void>;
  onSelectPr: (prId: string) => void;
}

export const IncidentHub: React.FC<IncidentHubProps> = ({
  incidents,
  deployments,
  onTriggerIncident,
  onResolveIncident,
  onSelectPr
}) => {
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [copiedKillswitch, setCopiedKillswitch] = useState<string | null>(null);

  const handleSimulate = async (type: string, title: string) => {
    setIsSimulating(true);
    await onTriggerIncident(type, title);
    setIsSimulating(false);
  };

  const copyKillswitch = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedKillswitch(id);
    setTimeout(() => setCopiedKillswitch(null), 2000);
  };

  const activeIncidents = incidents.filter((i) => i.status !== "RESOLVED");

  return (
    <div className="space-y-8">
      {/* Simulation Controls Banner */}
      <div className="glass-panel p-6 rounded-2xl bg-gradient-to-r from-red-950/40 via-[#0d121d] to-amber-950/20 border border-[rgba(255,255,255,0.08)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-red-400 animate-pulse" />
            <h3 className="text-base font-bold text-white">
              Deployment Telemetry & Incident Analysis Agent Hub (Steps 10–12)
            </h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            When production anomalies occur, IBM Bob Incident Analysis Agent analyzes metrics, identifies the originating PR commit, and generates automated killswitch scripts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => handleSimulate("504_LATENCY_SPIKE", "P1: 504 Gateway Spike on Checkout API")}
            disabled={isSimulating}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-bold transition-all disabled:opacity-50"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Simulate 504 Gateway Spike</span>
          </button>

          <button
            onClick={() => handleSimulate("DB_LOCK_TIMEOUT", "P2: Postgres Table Lock Queue Backpressure")}
            disabled={isSimulating}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all disabled:opacity-50"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Simulate DB Lock Outage</span>
          </button>
        </div>
      </div>

      {/* Active Incidents Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span>Active Production Incidents ({activeIncidents.length})</span>
          </h3>
        </div>

        {activeIncidents.length === 0 ? (
          <div className="glass-panel p-8 text-center rounded-2xl bg-[#0d121d]/60 border border-[rgba(255,255,255,0.06)]">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">All Systems Operational</h4>
            <p className="text-xs text-slate-400 mt-1">
              Zero active incidents. Click a simulation button above to trigger an incident and watch the Bob Agent analyze it in real time.
            </p>
          </div>
        ) : (
          activeIncidents.map((inc) => (
            <div
              key={inc.id}
              className="glass-panel p-5 rounded-2xl bg-[#0f1422] border border-red-500/30 shadow-xl shadow-red-950/20 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 uppercase">
                    {inc.severity}
                  </span>
                  <h4 className="text-base font-bold text-white">{inc.title}</h4>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-400">{inc.repo_name}</span>
                  <button
                    onClick={() => onResolveIncident(inc.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolve Incident</span>
                  </button>
                </div>
              </div>

              {/* Correlation with PR */}
              {inc.correlated_pr_id && (
                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/30 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <GitPullRequest className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-slate-300">
                      Correlated Offending PR: <strong className="text-white">#{inc.pr_number} - {inc.pr_title}</strong> (by @{inc.pr_author})
                    </span>
                  </div>
                  <button
                    onClick={() => onSelectPr(inc.correlated_pr_id!)}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                  >
                    <span>View PR Diagnostics</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Bob Agent Analysis Output */}
              {inc.bob_analysis?.details_json && (
                <div className="p-4 rounded-xl bg-[#090d16] border border-white/5 space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      IBM Bob Incident Analysis Agent — Root Cause Diagnosis
                    </h5>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-mono">
                    {inc.bob_analysis.details_json.root_cause}
                  </p>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Emergency Killswitch Runbook
                    </span>
                    <div className="relative group">
                      <pre className="p-3 rounded-lg bg-[#05070d] text-cyan-300 font-mono text-xs overflow-x-auto border border-white/10">
                        <code>{inc.remediation_runbook || inc.bob_analysis.details_json.emergency_killswitch}</code>
                      </pre>
                      <button
                        onClick={() =>
                          copyKillswitch(
                            inc.remediation_runbook || inc.bob_analysis.details_json.emergency_killswitch,
                            inc.id
                          )
                        }
                        className="absolute right-2 top-2 p-1.5 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-opacity"
                        title="Copy Killswitch Command"
                      >
                        {copiedKillswitch === inc.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Deployment Monitoring List (Step 10) */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Server className="w-4 h-4 text-blue-400" />
          <span>Active Deployments & Releases (Step 10)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {deployments.map((dep) => (
            <div
              key={dep.id}
              className="glass-panel p-4 rounded-xl bg-[#0d121d]/80 border border-[rgba(255,255,255,0.06)] space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white">{dep.version}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 uppercase">
                  {dep.status}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-300">{dep.repo_name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Environment: <strong className="text-slate-200 capitalize">{dep.environment}</strong>
                </p>
              </div>

              {dep.pr_title && (
                <div className="text-[11px] text-cyan-400/90 truncate pt-1 border-t border-white/5">
                  PR #{dep.pr_number}: {dep.pr_title}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
