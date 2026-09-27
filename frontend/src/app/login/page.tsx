// =============================================================
// ReleaseGuard AI — Built with IBM Bob
// © IBM Bob | ibm.com/products/watsonx
// =============================================================


"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { apiFetch, API_BASE } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await apiFetch(`${API_BASE}/api/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.detail || "Unable to authenticate");
      }
      router.replace("/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to reach the ReleaseGuard API");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuest = async () => {
    setError("");
    setGuestLoading(true);
    try {
      const response = await apiFetch(`${API_BASE}/api/auth/guest`, { method: "POST" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result?.detail || "Could not start guest session");
      }
      router.replace("/");
    } catch (guestError) {
      setError(guestError instanceof Error ? guestError.message : "Unable to reach the ReleaseGuard API");
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
      <div className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-blue-500/10 blur-[100px]" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#090e18]/95 shadow-2xl shadow-black/50 lg:grid-cols-[1fr_0.9fr]">
        <section className="hidden flex-col justify-between border-r border-white/10 bg-[#0d1420] p-10 lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400 text-[#071018]"><ShieldCheck size={21} /></span>
              <span className="text-lg font-bold tracking-wide">ReleaseGuard</span>
            </div>
            <p className="mt-24 max-w-sm text-4xl font-semibold leading-tight text-white">Release decisions start with a clear view of risk.</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">Sign in to your workspace to review repositories, pull requests, and release controls.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-400" />Local credential storage is protected with salted scrypt hashes.</div>
        </section>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400 text-[#071018]"><ShieldCheck size={21} /></span>
            <span className="text-lg font-bold">ReleaseGuard</span>
          </div>

          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Workspace access</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="mt-2 text-sm text-slate-400">{mode === "login" ? "Sign in with your ReleaseGuard credentials." : "Your account and connected repositories are stored in the workspace database."}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "register" && (
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-300">Name</label>
                <input id="name" autoComplete="name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-white/15 bg-[#0d1420] px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-400" />
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">Email</label>
              <input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-white/15 bg-[#0d1420] px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-400" />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-300">Password</label>
              <input id="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} required minLength={mode === "register" ? 12 : 1} maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-white/15 bg-[#0d1420] px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-400" />
              {mode === "register" && <p className="text-xs text-slate-500">Use at least 12 characters.</p>}
            </div>

            {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3.5 py-3 text-sm text-rose-200">{error}</p>}

            <button type="submit" disabled={submitting || guestLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-3 text-sm font-bold text-[#071018] transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">
              {mode === "login" ? <KeyRound size={17} /> : <ShieldCheck size={17} />}
              <span>{submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}</span>
              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-slate-500">or</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGuest}
            disabled={guestLoading || submitting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/40 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
          >
            <UserRound size={17} />
            <span>{guestLoading ? "Starting guest session..." : "Continue as Guest"}</span>
          </button>

          <p className="mt-6 text-center text-xs text-slate-500">Guest access is read-only and shared. Do not enter real credentials.</p>

          <p className="mt-5 text-center text-sm text-slate-400">
            {mode === "login" ? "New to ReleaseGuard?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => { setError(""); setMode(mode === "login" ? "register" : "login"); }} className="font-semibold text-cyan-300 hover:text-cyan-200">
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}