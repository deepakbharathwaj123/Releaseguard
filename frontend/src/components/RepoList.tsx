"use client";

import React from "react";
import { 
  FolderGit2, 
  GitBranch, 
  Radio, 
  GitPullRequest, 
  ShieldCheck, 
  ShieldAlert, 
  Copy, 
  Check, 
  ExternalLink 
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
      <div className="glass-panel p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 to-slate-900 border border-[rgba(255,255,255,0.08)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white">ReleaseGuard Live GitHub Webhook Listener</h3>
          </div>
          <p className="text-xs text-slate-300">
            Configure this Webhook URL in your GitHub repository settings under <code>Webhooks → Add webhook</code> with <code>pull_request</code> event.
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <code className="text-xs font-mono text-cyan-300 bg-[#090d16] px-3 py-1.5 rounded-lg border border-white/10 select-all overflow-x-auto">
            {webhookUrl}
          </code>
          <button
            onClick={copyWebhook}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors shrink-0"
            title="Copy Webhook URL"
          >
            {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Repositories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {repos.map((repo) => (
          <div
            key={repo.id}
            onClick={() => onSelectRepo(repo.id)}
            className="glass-panel p-5 rounded-2xl bg-[#0d121d]/80 hover:bg-[#131a2b] border border-[rgba(255,255,255,0.08)] cursor-pointer transition-all hover:scale-[1.02] hover:border-cyan-400/40 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <span className="flex items-center space-x-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Webhook Active</span>
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white hover:text-cyan-300 transition-colors">
                  {repo.full_name}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {repo.description}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-1">
                <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-mono text-[11px] text-slate-300">{repo.default_branch}</span>
              </div>

              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <GitPullRequest className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-bold text-white">{repo.open_prs_count} PRs</span>
                </span>
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-bold text-cyan-400">Avg {repo.average_risk_score}</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
