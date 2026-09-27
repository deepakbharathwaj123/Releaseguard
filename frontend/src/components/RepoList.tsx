// =============================================================
// ReleaseGuard AI — Built with IBM Bob
// © IBM Bob | ibm.com/products/watsonx
// =============================================================


"use client";

import { apiFetch } from "@/lib/api";
import React, { useEffect, useState } from "react";
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
  AlertCircle,
  Trash2,
  Layers3,
  Plus,
  UploadCloud,
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
  onDeleteRepo?: (repoId: string) => void;
  onRefreshRepos?: () => void;
  loading?: boolean;
}

export const RepoList: React.FC<RepoListProps> = ({ repos, onSelectRepo, onDeleteRepo, onRefreshRepos, loading = false }) => {
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [repoInput, setRepoInput] = useState<string>("");
  const [prNumberInput, setPrNumberInput] = useState<string>("1");
  const [tokenInput, setTokenInput] = useState<string>("");
  const [gitUsername, setGitUsername] = useState<string>("deepakbharathwaj123");
  const [gitEmail, setGitEmail] = useState<string>("deepakbala2007@gmail.com");
  const [gitLoginStatus, setGitLoginStatus] = useState<string>("");
  const [authStatus, setAuthStatus] = useState<string>("");
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);
  const [isPreparingGitLogin, setIsPreparingGitLogin] = useState<boolean>(false);
  const [presets, setPresets] = useState<any[]>([]);
  const [presetName, setPresetName] = useState<string>("platform-strict");
  const [presetDescription, setPresetDescription] = useState<string>("Default policy for high-signal repos");
  const [presetThreshold, setPresetThreshold] = useState<string>("high");
  const [presetAlertChannel, setPresetAlertChannel] = useState<string>("slack");
  const [presetAutoReview, setPresetAutoReview] = useState<boolean>(true);
  const [presetStatus, setPresetStatus] = useState<string>("");
  const [bulkRepoList, setBulkRepoList] = useState<string>("acme/payments-api\nacme/worker-service");
  const [bulkImportStatus, setBulkImportStatus] = useState<string>("");
  const [isBulkImporting, setIsBulkImporting] = useState<boolean>(false);
  const [isCreatingPreset, setIsCreatingPreset] = useState<boolean>(false);
  const [selectedPresetName, setSelectedPresetName] = useState<string>("platform-strict");
  const [repoForPreset, setRepoForPreset] = useState<string>(repos[0]?.id || "");
  const [isApplyingPreset, setIsApplyingPreset] = useState<boolean>(false);
  const webhookUrl = `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"}/api/webhooks/github`;

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"}/api/repos/policy-presets`);
        if (!res.ok) return;
        const data = await res.json();
        setPresets(data || []);
        if (data?.[0]?.name) {
          setSelectedPresetName(data[0].name);
          setPresetName(data[0].name);
        }
      } catch (error) {
        console.error("Failed to load policy presets:", error);
      }
    };

    fetchPresets();
  }, []);

  useEffect(() => {
    if (repos[0]?.id) {
      setRepoForPreset((current) => current || repos[0].id);
    }
  }, [repos]);

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
      const authRes = await apiFetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"}/api/github/authorize`, {
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
        const scanRes = await apiFetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"}/api/github/scan`, {
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
      const loginRes = await apiFetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"}/api/github/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: gitUsername.trim(),
          repo_name: repoInput.trim() || "owner/repo",
          remote_url: `https://github.com/${repoInput.trim() || "owner/repo"}.git`,
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

  const handleCreatePreset = async () => {
    try {
      setIsCreatingPreset(true);
      setPresetStatus("");
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"}/api/repos/policy-presets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: presetName.trim(),
          description: presetDescription.trim(),
          severity_threshold: presetThreshold,
          auto_review_enabled: presetAutoReview,
          alert_channel: presetAlertChannel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Preset creation failed");
      }

      setSelectedPresetName(data.name);
      setPresetStatus(`Preset “${data.name}” saved.`);
      const updated = await apiFetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"}/api/repos/policy-presets`);
      if (updated.ok) {
        const list = await updated.json();
        setPresets(list || []);
      }
    } catch (error) {
      setPresetStatus(error instanceof Error ? error.message : "Preset creation failed.");
    } finally {
      setIsCreatingPreset(false);
    }
  };

  const handleApplyPresetToRepo = async () => {
    if (!repoForPreset) {
      setPresetStatus("Choose a repo before applying a preset.");
      return;
    }

    try {
      setIsApplyingPreset(true);
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"}/api/repos/${repoForPreset}/apply-policy-preset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset_name: selectedPresetName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to apply preset");
      }

      setPresetStatus(`Preset applied to ${data.repo_id} with threshold ${data.severity_threshold}.`);
      if (onRefreshRepos) onRefreshRepos();
    } catch (error) {
      setPresetStatus(error instanceof Error ? error.message : "Failed to apply preset.");
    } finally {
      setIsApplyingPreset(false);
    }
  };

  const handleBulkImport = async () => {
    const reposToImport = bulkRepoList
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!tokenInput.trim() || reposToImport.length === 0) {
      setBulkImportStatus("Provide a GitHub PAT and at least one repo in owner/repo format.");
      return;
    }

    try {
      setIsBulkImporting(true);
      setBulkImportStatus("");
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"}/api/repos/bulk-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput, repos: reposToImport }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Bulk import failed");
      }

      setBulkImportStatus(`Imported ${data.count} repo(s).`);
      if (onRefreshRepos) onRefreshRepos();
    } catch (error) {
      setBulkImportStatus(error instanceof Error ? error.message : "Bulk import failed.");
    } finally {
      setIsBulkImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="glass-card h-28 rounded-2xl bg-white/5 p-6" />
        <div className="glass-card h-44 rounded-2xl bg-white/5 p-5" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="glass-card h-48 space-y-4 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-xl bg-white/5" />
                <div className="h-4 w-20 rounded bg-white/10" />
              </div>
              <div className="h-4 w-40 rounded bg-white/10" />
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-3/4 rounded bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Webhook Configuration Banner */}
      <div className="glass-card p-6 relative overflow-hidden bg-gradient-to-r from-blue-950/40 via-[#0a0f1e] to-cyan-950/30 border border-cyan-500/20 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="text-base font-extrabold text-white tracking-tight">
                ReleaseGuard GitHub Live Webhook Ingestion Listener
              </h3>
            </div>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Add this payload URL in your GitHub repo settings under <code className="text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded text-xs">Settings → Webhooks → Add Webhook</code> with <code className="text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded text-xs">pull_request</code> event.
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
            <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-black flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Authorize GitHub Repository</h3>
              <p className="text-xs text-slate-400">Use a GitHub PAT to connect a real repo and trigger ReleaseGuard.</p>
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
            <label className="text-xs uppercase tracking-[0.14em] text-slate-400 block mb-1.5 font-semibold">GitHub repo</label>
            <input
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="owner/repo"
              className="w-full bg-[#070c14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 outline-none"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs uppercase tracking-[0.14em] text-slate-400 block mb-1.5 font-semibold">PR number</label>
            <input
              value={prNumberInput}
              onChange={(e) => setPrNumberInput(e.target.value)}
              placeholder="1"
              className="w-full bg-[#070c14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 outline-none"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs uppercase tracking-[0.14em] text-slate-400 block mb-1.5 font-semibold">GitHub PAT</label>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_xxxxxxxxx"
              className="w-full bg-[#070c14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 outline-none"
            />
          </div>
        </div>

        {authStatus && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5 text-sm text-cyan-200">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="leading-relaxed">{authStatus}</p>
          </div>
        )}
      </div>

      <div className="glass-card p-5 rounded-2xl border border-emerald-500/20 bg-[#0c1412]/90">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <h3 className="text-sm font-extrabold text-white">Git identity & login setup</h3>
            <p className="text-xs text-slate-400">Set your GitHub username and repo remote so local push/pull commands work properly.</p>
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
            <label className="text-xs uppercase tracking-[0.14em] text-slate-400 block mb-1.5 font-semibold">GitHub username</label>
            <input
              value={gitUsername}
              onChange={(e) => setGitUsername(e.target.value)}
              className="w-full bg-[#070c14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-400 outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.14em] text-slate-400 block mb-1.5 font-semibold">Git email</label>
            <input
              type="email"
              value={gitEmail}
              onChange={(e) => setGitEmail(e.target.value)}
              className="w-full bg-[#070c14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-400 outline-none"
            />
          </div>
        </div>

        {gitLoginStatus && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-200">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="leading-relaxed">{gitLoginStatus}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="glass-card p-5 rounded-2xl border border-violet-500/20 bg-[#0d121d]/90">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white flex items-center justify-center">
                <Layers3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Team policy presets</h3>
                <p className="text-xs text-slate-400">Create reusable review gates and alert routing rules.</p>
              </div>
            </div>
            <button
              onClick={handleCreatePreset}
              disabled={isCreatingPreset}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-bold disabled:opacity-60"
            >
              {isCreatingPreset ? "Saving..." : "Save preset"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-[0.14em] text-slate-400 block mb-1.5 font-semibold">Preset name</label>
              <input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="w-full bg-[#070c14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.14em] text-slate-400 block mb-1.5 font-semibold">Alert channel</label>
              <select
                value={presetAlertChannel}
                onChange={(e) => setPresetAlertChannel(e.target.value)}
                className="w-full bg-[#070c14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-violet-400 outline-none"
              >
                <option value="slack">Slack</option>
                <option value="teams">Teams</option>
                <option value="both">Slack + Teams</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.14em] text-slate-400 block mb-1.5 font-semibold">Severity threshold</label>
              <select
                value={presetThreshold}
                onChange={(e) => setPresetThreshold(e.target.value)}
                className="w-full bg-[#070c14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-violet-400 outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#070c14] px-3 py-2.5 text-sm text-slate-200">
              <span>Auto review</span>
              <button
                type="button"
                onClick={() => setPresetAutoReview((value) => !value)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${presetAutoReview ? "bg-emerald-500" : "bg-slate-700"}`}
                aria-label="Toggle auto review"
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${presetAutoReview ? "translate-x-5" : "translate-x-1"}`} />
              </button>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-[0.14em] text-slate-400 block mb-1.5 font-semibold">Description</label>
              <input
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                className="w-full bg-[#070c14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-400 outline-none"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <select
              value={selectedPresetName}
              onChange={(e) => setSelectedPresetName(e.target.value)}
              className="flex-1 bg-[#070c14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-violet-400 outline-none"
            >
              {presets.length === 0 && <option value="platform-strict">platform-strict</option>}
              {presets.map((preset) => (
                <option key={preset.name} value={preset.name}>{preset.name}</option>
              ))}
            </select>
            <select
              value={repoForPreset}
              onChange={(e) => setRepoForPreset(e.target.value)}
              className="flex-1 bg-[#070c14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-violet-400 outline-none"
            >
              {repos.length === 0 && <option value="">No repos</option>}
              {repos.map((repo) => (
                <option key={repo.id} value={repo.id}>{repo.full_name || repo.name}</option>
              ))}
            </select>
            <button
              onClick={handleApplyPresetToRepo}
              disabled={isApplyingPreset || !repoForPreset}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-black text-xs font-bold disabled:opacity-60"
            >
              {isApplyingPreset ? "Applying..." : "Apply"}
            </button>
          </div>

          {presetStatus && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2.5 text-sm text-violet-200">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="leading-relaxed">{presetStatus}</p>
            </div>
          )}
        </div>

        <div className="glass-card p-5 rounded-2xl border border-emerald-500/20 bg-[#0c1412]/90">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white flex items-center justify-center">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Bulk repo import</h3>
                <p className="text-xs text-slate-400">Import multiple GitHub repos in one action.</p>
              </div>
            </div>
            <button
              onClick={handleBulkImport}
              disabled={isBulkImporting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black text-xs font-bold disabled:opacity-60"
            >
              {isBulkImporting ? "Importing..." : "Import repos"}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <label className="text-xs uppercase tracking-[0.14em] text-slate-400 block mb-1.5 font-semibold">Repo list</label>
            <textarea
              value={bulkRepoList}
              onChange={(e) => setBulkRepoList(e.target.value)}
              rows={6}
              className="w-full bg-[#070c14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-400 outline-none"
              placeholder="owner/repo\nowner/another-repo"
            />
          </div>

          {bulkImportStatus && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-200">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="leading-relaxed">{bulkImportStatus}</p>
            </div>
          )}
        </div>
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
                <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
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
                <span className="font-mono text-xs text-slate-300 font-semibold">{repo.default_branch}</span>
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

            {onDeleteRepo && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteRepo(repo.id);
                }}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-600/10 px-2.5 py-2 text-[11px] font-semibold text-red-200 hover:bg-red-600/20 transition-colors"
                title={`Delete ${repo.full_name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete repo
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
