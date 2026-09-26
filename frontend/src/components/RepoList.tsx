"use client";

import React, { useState } from "react";
import { 
  FolderGit2, 
  GitBranch, 
  GitPullRequest, 
  ShieldCheck, 
  Copy, 
  Check, 
  ArrowRight,
  KeyRound,
  Rocket,
  AlertCircle
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
  onSelectRepo: (repoId: string, repoFullName: string) => void;
}

export const RepoList: React.FC<RepoListProps> = ({ repos, onSelectRepo }) => {
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [repoInput, setRepoInput] = useState<string>("owner/repo-name");
  const [prNumberInput, setPrNumberInput] = useState<string>("1");
  const [tokenInput, setTokenInput] = useState<string>("");
  const [gitUsername, setGitUsername] = useState<string>("deepakbharathwaj123");
  const [gitEmail, setGitEmail] = useState<string>("deepakbala2007@gmail.com");
  const [gitLoginStatus, setGitLoginStatus] = useState<string>("");
  const [authStatus, setAuthStatus] = useState<string>("");
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);
  const [isPreparingGitLogin, setIsPreparingGitLogin] = useState<boolean>(false);
  const webhookUrl = `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"}/api/webhooks/github`;

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleAuthorizeGithub = async () => {
    if (!repoInput.trim() || !tokenInput.trim()) {
      setAuthStatus("Please enter a GitHub repo and a PAT before authorizing.");
      return;
    }

    try {
      setIsAuthorizing(true);
      setAuthStatus("Authorizing GitHub repository with ReleaseGuard...");
      const authRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"}/api/github/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput, repo_name: repoInput.trim() }),
      });

      const authData = await authRes.json();
      if (!authRes.ok) {
        throw new Error(authData?.detail || "GitHub authorization failed");
      }

      const prNumber = Number(prNumberInput || 0);
      if (prNumber > 0) {
        setAuthStatus(`Repository authorized. Running ReleaseGuard on ${repoInput.trim()}#${prNumber}...`);
        const scanRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"}/api/github/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenInput, repo_name: repoInput.trim(), pr_number: prNumber }),
        });

        const scanData = await scanRes.json();
        if (!scanRes.ok) {
          throw new Error(scanData?.detail || "GitHub scan failed");
        }

        setAuthStatus(`ReleaseGuard scan completed for ${repoInput.trim()}#${prNumber}. Risk ${scanData.risk_level || "review"}.`);
      } else {
        setAuthStatus(`Repository authorized successfully: ${authData.repo_name}. Add a PR number to run the ReleaseGuard scan.`);
      }
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "GitHub authorization failed.");
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handlePrepareGitLogin = async () => {
    if (!gitUsername.trim()) {
      setGitLoginStatus("Please enter your GitHub username before generating the login commands.");
      return;
    }

    try {
      setIsPreparingGitLogin(true);
      const loginRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"}/api/github/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: gitUsername.trim(),
          repo_name: repoInput.trim() || "owner/repo-name",
          remote_url: `https://github.com/${repoInput.trim() || "owner/repo-name"}.git`,
        }),
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error(loginData?.detail || "Git login instructions failed");
      }

      const commandBlock = loginData.commands.join("\n");
      await navigator.clipboard.writeText(commandBlock);
      setGitLoginStatus(`Git login commands ready. Copied to clipboard for ${loginData.username}.`);
      setGitEmail(loginData.username.includes("@") ? loginData.username : gitEmail);
    } catch (error) {
      setGitLoginStatus(error instanceof Error ? error.message : "Git login setup failed.");
    } finally {
      setIsPreparingGitLogin(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Webhook Configuration Banner */}
      <div className="glass-card p-6 relative overflow-hidden bg-gradient-to-r from-blue-950/40 via-[#0a0f1e] to-cyan-950/30 border border-cyan-500/20 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="text-base font-extrabold text-white tracking-tight">
                ReleaseGuard GitHub Live Webhook Ingestion Listener
              </h3>
            </div>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Add this payload URL in your GitHub repo settings under <code className="text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded">Settings → Webhooks → Add Webhook</code> with <code className="text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded">pull_request</code> event.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
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

      <div className="glass-card p-5 rounded-2xl border border-cyan-500/20 bg-[#0d121d]/90">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-black flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Authorize GitHub Repository</h3>
              <p className="text-[11px] text-slate-400">Use a GitHub PAT to connect a real repo and trigger ReleaseGuard.</p>
            </div>
          </div>
          <button
            onClick={handleAuthorizeGithub}
            disabled={isAuthorizing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-black text-xs font-bold shadow-md shadow-cyan-500/20 disabled:opacity-60"
          >
            <span className="flex items-center gap-2">
              <Rocket className="w-3.5 h-3.5" />
              {isAuthorizing ? "Authorizing..." : "Authorize & Scan"}
            </span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="text-[10px] uppercase tracking-[0.18em] text-slate-400 block mb-1.5">GitHub repo</label>
            <input
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="owner/repo-name"
              className="w-full bg-[#070c14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 outline-none"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-[10px] uppercase tracking-[0.18em] text-slate-400 block mb-1.5">PR number</label>
            <input
              value={prNumberInput}
              onChange={(e) => setPrNumberInput(e.target.value)}
              placeholder="1"
              className="w-full bg-[#070c14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 outline-none"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-[10px] uppercase tracking-[0.18em] text-slate-400 block mb-1.5">GitHub PAT</label>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_xxxxxxxxx"
              className="w-full bg-[#070c14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 outline-none"
            />
          </div>
        </div>

        {authStatus && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-200">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="leading-relaxed">{authStatus}</p>
          </div>
        )}
      </div>

      <div className="glass-card p-5 rounded-2xl border border-emerald-500/20 bg-[#0c1412]/90">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <h3 className="text-sm font-extrabold text-white">Git identity & login setup</h3>
            <p className="text-[11px] text-slate-400">Set your GitHub username and repo remote so local push/pull commands work properly.</p>
          </div>
          <button
            onClick={handlePrepareGitLogin}
            disabled={isPreparingGitLogin}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black text-xs font-bold shadow-md shadow-emerald-500/20 disabled:opacity-60"
          >
            {isPreparingGitLogin ? "Preparing..." : "Generate Git Login"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-[0.18em] text-slate-400 block mb-1.5">GitHub username</label>
            <input
              value={gitUsername}
              onChange={(e) => setGitUsername(e.target.value)}
              className="w-full bg-[#070c14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-400 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.18em] text-slate-400 block mb-1.5">Git email</label>
            <input
              type="email"
              value={gitEmail}
              onChange={(e) => setGitEmail(e.target.value)}
              className="w-full bg-[#070c14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-400 outline-none"
            />
          </div>
        </div>

        {gitLoginStatus && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="leading-relaxed">{gitLoginStatus}</p>
          </div>
        )}
      </div>

      {/* Repositories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {repos.map((repo) => (
          <div
            key={repo.id}
            onClick={() => onSelectRepo(repo.id, repo.full_name || repo.name)}
            className="glass-card-interactive p-5 rounded-2xl flex flex-col justify-between gap-4 group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-md">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Webhook OK</span>
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
              <div className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-mono text-[11px] text-slate-300 font-semibold">{repo.default_branch}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-bold text-white">
                  <GitPullRequest className="w-3.5 h-3.5 text-blue-400" />
                  <span>{repo.open_prs_count} PRs</span>
                </span>
                <span className="flex items-center gap-1 font-bold text-cyan-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Avg {repo.average_risk_score}</span>
                </span>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-xs text-cyan-400 font-semibold group-hover:text-cyan-300">
              <span>View & Filter PRs</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
