"use client";

import React, { useState } from "react";
import { 
  X, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Building2, 
  UserCheck, 
  Cpu, 
  Fingerprint,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { UserProfile, DEMO_USERS } from "@/types/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLogin: (user: UserProfile) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<"roles" | "sso" | "credentials">("roles");
  const [emailInput, setEmailInput] = useState("sarah.chen@releaseguard.enterprise");
  const [passwordInput, setPasswordInput] = useState("••••••••••••");
  const [mfaCode, setMfaCode] = useState("492810");
  const [githubUsername, setGithubUsername] = useState("deepakbharathwaj123");
  const [githubEmail, setGithubEmail] = useState("deepakbala2007@gmail.com");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPersona = (user: UserProfile) => {
    setIsAuthenticating(true);
    setTimeout(() => {
      onLogin(user);
      setIsAuthenticating(false);
      setAuthSuccessMsg(`Authenticated as ${user.name} (${user.roleTitle})`);
      setTimeout(() => {
        setAuthSuccessMsg(null);
        onClose();
      }, 700);
    }, 450);
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setTimeout(() => {
      // Find matching user or fallback to Sarah Chen
      const matched = DEMO_USERS.find(
        (u) => u.email.toLowerCase() === emailInput.trim().toLowerCase()
      ) || DEMO_USERS[0];
      onLogin(matched);
      setIsAuthenticating(false);
      setAuthSuccessMsg(`Logged in as ${matched.name}`);
      setTimeout(() => {
        setAuthSuccessMsg(null);
        onClose();
      }, 700);
    }, 600);
  };

  const handleSsoSubmit = (providerName: string) => {
    setIsAuthenticating(true);
    setTimeout(() => {
      const user = providerName.includes("IBM") ? DEMO_USERS[0] : DEMO_USERS[1];
      onLogin(user);
      setIsAuthenticating(false);
      setAuthSuccessMsg(`Single Sign-On Verified via ${providerName}`);
      setTimeout(() => {
        setAuthSuccessMsg(null);
        onClose();
      }, 700);
    }, 650);
  };

  const handleGithubSignIn = () => {
    const username = githubUsername.trim() || "deepakbharathwaj123";
    const email = githubEmail.trim() || `${username}@github.com`;
    const githubUser: UserProfile = {
      ...DEMO_USERS[0],
      id: "github-user-1",
      name: username,
      email,
      roleTitle: "GitHub Repository Owner",
      department: "Engineering & Source Control",
      organization: "GitHub",
      permissions: {
        ...DEMO_USERS[0].permissions,
        canConfigureWebhooks: true,
        canTriggerSimulations: true,
      },
      lastLogin: "Active Now",
    };

    setIsAuthenticating(true);
    setTimeout(() => {
      onLogin(githubUser);
      setIsAuthenticating(false);
      setAuthSuccessMsg(`GitHub login verified for ${username}`);
      setTimeout(() => {
        setAuthSuccessMsg(null);
        onClose();
      }, 700);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0a0f1d] border border-cyan-500/30 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-5 border-b border-white/10 bg-[#0d1424] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0f62fe] to-[#06b6d4] flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  ReleaseGuard Enterprise Auth
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  SOC2 Certified
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Identity & Access Management • Multi-Agent Release Governance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-5 border-b border-white/10 bg-[#070b14]">
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "roles"
                ? "border-cyan-400 text-cyan-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>1-Click Personas</span>
          </button>

          <button
            onClick={() => setActiveTab("sso")}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "sso"
                ? "border-cyan-400 text-cyan-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Enterprise SSO</span>
          </button>

          <button
            onClick={() => setActiveTab("credentials")}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "credentials"
                ? "border-cyan-400 text-cyan-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Work Credentials</span>
          </button>
        </div>

        {/* Success Alert */}
        {authSuccessMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{authSuccessMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: 1-Click Role Personas */}
          {activeTab === "roles" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Select an enterprise role persona to immediately test role-based permissions, governance overrides, and telemetry actions:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {DEMO_USERS.map((user) => {
                  const isCurrent = currentUser?.id === user.id;
                  return (
                    <div
                      key={user.id}
                      onClick={() => handleSelectPersona(user)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                        isCurrent
                          ? "bg-cyan-950/40 border-cyan-400/80 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/40"
                          : "bg-[#0f1525] border-white/10 hover:border-cyan-500/40 hover:bg-[#131b30]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-xl object-cover border border-white/20 shrink-0"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                              {user.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              {user.clearanceLevel.replace("_", " ")}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 truncate font-medium">
                            {user.roleTitle}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {user.department} • {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          disabled={isAuthenticating}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            isCurrent
                              ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                              : "bg-white/10 group-hover:bg-cyan-500/20 text-slate-300 group-hover:text-cyan-300"
                          }`}
                        >
                          <span>{isCurrent ? "Signed In" : "Select Role"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Enterprise SSO */}
          {activeTab === "sso" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect using your corporate Identity Provider. All authentication tokens are secured with zero-trust posture checks.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleSsoSubmit("IBM Cloud watsonx IAM")}
                  disabled={isAuthenticating}
                  className="w-full p-4 rounded-xl bg-[#11192e] hover:bg-[#16213c] border border-blue-500/30 hover:border-blue-400 text-left transition-all flex items-center justify-between group shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-black">
                      IBM
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white group-hover:text-blue-300">
                        Sign in with IBM Cloud watsonx IAM
                      </span>
                      <span className="text-xs text-slate-400 block">
                        Enterprise FedRAMP & Granite 3 Swarm Gatekeeper
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-white" />
                </button>

                <div className="p-3.5 rounded-xl bg-[#11192e] border border-white/15 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/10 text-white flex items-center justify-center font-bold">
                      GH
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">
                        Sign in with GitHub
                      </div>
                      <div className="text-xs text-slate-400">
                        Repository owner access & PR audit clearance
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <input
                      value={githubUsername}
                      onChange={(e) => setGithubUsername(e.target.value)}
                      placeholder="GitHub username"
                      className="w-full bg-[#09111c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                    <input
                      type="email"
                      value={githubEmail}
                      onChange={(e) => setGithubEmail(e.target.value)}
                      placeholder="GitHub email"
                      className="w-full bg-[#09111c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <button
                    onClick={handleGithubSignIn}
                    disabled={isAuthenticating}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black text-xs font-bold hover:opacity-95 transition-all"
                  >
                    {isAuthenticating ? "Verifying GitHub session..." : "Continue with GitHub"}
                  </button>
                </div>

                <button
                  onClick={() => handleSsoSubmit("Okta / SAML 2.0")}
                  disabled={isAuthenticating}
                  className="w-full p-4 rounded-xl bg-[#11192e] hover:bg-[#16213c] border border-white/15 hover:border-white/30 text-left transition-all flex items-center justify-between group shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold">
                      OK
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white group-hover:text-cyan-300">
                        Sign in with Okta / SAML 2.0
                      </span>
                      <span className="text-xs text-slate-400 block">
                        Corporate Directory SSO & Device Trust
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-white" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Work Credentials */}
          {activeTab === "credentials" && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Enterprise Work Email
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. sarah.chen@releaseguard.enterprise"
                  className="w-full bg-[#111827] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Corporate SSO Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-[#111827] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                    <span>MFA Hardware Token / Authenticator Code</span>
                  </label>
                  <span className="text-[10px] text-cyan-400 font-mono">6-Digit TOTP</span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full bg-[#111827] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-400 tracking-widest text-center"
                />
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0f62fe] to-[#06b6d4] text-white text-xs font-bold hover:opacity-95 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                <span>{isAuthenticating ? "Authenticating Session..." : "Authorize ReleaseGuard Session"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-[#070b14] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SSO Token Validated • End-to-End Encrypted</span>
          </div>

          {currentUser && (
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="text-red-400 hover:text-red-300 font-semibold"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
