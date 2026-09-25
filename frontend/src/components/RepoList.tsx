"use client";

import React from "react";
import { 
  FolderGit2, 
  GitBranch, 
  Radio, 
  GitPullRequest, 
  ShieldCheck, 
  Copy, 
  Check, 
  ExternalLink,
  Lock,
  Zap,
  ArrowRight
} from "lucide-react";

export interface RepoItem {
  id: string;
  name: string;
  full_name: string;
  description: string;
  default_branch: string;
  webhook_active: boolean;
  open_prs_count: number;
  average_risk_score: number;
  created_at: string;
}

interface RepoListProps {
  repos: RepoItem[];
  onSelectRepo: (repoId: string) => void;
}

export const RepoList: React.FC<RepoListProps> = ({ repos, onSelectRepo }) => {
  const [copiedUrl, setCopiedUrl] = React.useState<boolean>(false);
  const webhookUrl = "http://localhost:8000/api/webhooks/github";

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Webhook Configuration Banner */}
      <div className="glass-card p-6 relative overflow-hidden bg-gradient-to-r from-blue-950/40 via-[#0a0f1e] to-cyan-950/30 border border-cyan-500/20 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="text-base font-extrabold text-white tracking-tight">
                ReleaseGuard GitHub Live Webhook Ingestion Listener
              </h3>
            </div>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Add this payload URL in your GitHub repo settings under <code className="text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded">Settings → Webhooks → Add Webhook</code> with <code className="text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded">pull_request</code> event.
            </p>
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <code className="text-xs font-mono text-cyan-300 bg-[#040711] px-4 py-2 rounded-xl border border-white/10 select-all overflow-x-auto shadow-inner">
              {webhookUrl}
            </code>
            <button
              onClick={copyWebhook}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all hover:scale-105 shrink-0 shadow-md"
              title="Copy Webhook URL"
            >
              {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Repositories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {repos.map((repo) => (
          <div
            key={repo.id}
            onClick={() => onSelectRepo(repo.id)}
            className="glass-card-interactive p-5 rounded-2xl flex flex-col justify-between space-y-4 group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-md">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <span className="flex items-center space-x-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Webhook Heartbeat: OK</span>
                </span>
              </div>

              <div>
                <h4 className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors tracking-tight">
                  {repo.full_name}
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                  {repo.description}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-1.5">
                <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-mono text-[11px] text-slate-300 font-semibold">{repo.default_branch}</span>
              </div>

              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1 font-bold text-white">
                  <GitPullRequest className="w-3.5 h-3.5 text-blue-400" />
                  <span>{repo.open_prs_count} PRs</span>
                </span>
                <span className="flex items-center space-x-1 font-bold text-cyan-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Avg {repo.average_risk_score}</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
