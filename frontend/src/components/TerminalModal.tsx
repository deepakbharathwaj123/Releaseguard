"use client";

import React, { useState, useEffect } from "react";
import { Terminal, X, CheckCircle2, RotateCcw, Copy, Check, Play } from "lucide-react";

interface TerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  prNumber: number;
  prId: string;
}

export const TerminalModal: React.FC<TerminalModalProps> = ({
  isOpen,
  onClose,
  prNumber,
  prId
}) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsRunning(true);
    setLogs([]);

    // Execute rollback endpoint
    fetch(`http://localhost:8000/api/prs/${prId}/execute-rollback`, {
      method: "POST"
    })
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        const allLogs = data.logs || [];
        
        // Sequentially stream logs into terminal with small delays for authentic execution feel
        allLogs.forEach((logItem: any, idx: number) => {
          setTimeout(() => {
            if (mounted) {
              setLogs((prev) => [...prev, logItem]);
              if (idx === allLogs.length - 1) {
                setIsRunning(false);
              }
            }
          }, (idx + 1) * 350);
        });
      })
      .catch((err) => {
        console.error("Rollback execution error:", err);
        setIsRunning(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, prId]);

  if (!isOpen) return null;

  const copyLogText = () => {
    const text = logs.map((l) => `[${l.time}] [${l.level}] ${l.msg}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="bg-[#05070d] border border-cyan-500/40 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
        
        {/* Terminal Header */}
        <div className="p-3.5 bg-[#0a0e1a] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 mr-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-white">
              ReleaseGuard SRE Runner • Rollback Execution PR #{prNumber}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={copyLogText}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs transition-colors"
              title="Copy Output"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Output Body */}
        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-slate-300 space-y-2 bg-[#05070d]">
          <div className="text-slate-500 pb-2 border-b border-white/5 flex items-center justify-between">
            <span>Cluster Context: prod-us-east-1 • Node Pool: m5.2xlarge</span>
            <span className={isRunning ? "text-cyan-400 animate-pulse" : "text-emerald-400 font-bold"}>
              {isRunning ? "● EXECUTING..." : "✔ RUNBOOK SUCCEEDED"}
            </span>
          </div>

          {logs.map((log, idx) => {
            let color = "text-slate-300";
            if (log.level === "SUCCESS" || log.level === "DONE") color = "text-emerald-300 font-bold";
            if (log.level === "EXEC") color = "text-cyan-400";
            if (log.level === "INIT") color = "text-amber-300";

            return (
              <div key={idx} className="flex items-start space-x-2 leading-relaxed">
                <span className="text-slate-600 select-none text-[11px] shrink-0">[{log.time}]</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 select-none ${
                    log.level === "SUCCESS" || log.level === "DONE"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : log.level === "EXEC"
                      ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                      : "bg-white/5 text-slate-400"
                  }`}
                >
                  {log.level}
                </span>
                <span className={color}>{log.msg}</span>
              </div>
            );
          })}

          {isRunning && (
            <div className="flex items-center space-x-2 text-cyan-400 pt-2 animate-pulse">
              <span className="w-2 h-4 bg-cyan-400 inline-block animate-ping" />
              <span>Streaming cluster response...</span>
            </div>
          )}
        </div>

        {/* Terminal Footer */}
        <div className="p-3 bg-[#0a0e1a] border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            Target Deployment: <code>deployment/api-server</code> • Namespace: <code>prod</code>
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
