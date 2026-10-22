"use client";

import { useEffect, useRef, useState } from "react";
import type { Company, JobStatus, LogEntry } from "@/lib/types";
import CompanyDrawer from "./CompanyDrawer";
import clsx from "clsx";

interface AgentState {
  job: JobStatus | null;
  log: LogEntry[];
  stats: {
    total: number;
    customers: number;
    prospects: number;
    discovered: number;
    briefs: number;
    inPipeline: number;
    lastSweep: { ts: string; result: string } | null;
  };
}

function ago(ts: string): string {
  const s = Math.max(0, (Date.now() - new Date(ts.replace(" ", "T") + "Z").getTime()) / 1000);
  if (s < 90) return `${Math.floor(s)}s ago`;
  if (s < 5400) return `${Math.floor(s / 60)}m ago`;
  if (s < 129600) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts.replace(" ", "T") + "Z").toLocaleDateString();
}

export default function AutomationConsole() {
  const [state, setState] = useState<AgentState | null>(null);
  const [importing, setImporting] = useState(false);
  const [discovered, setDiscovered] = useState<Company[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  async function poll() {
    if (document.hidden) return;
    const data = await fetch("/api/agent").then((r) => r.json());
    setState(data);
    const n = data?.stats?.discovered ?? 0;
    if (n > 0) {
      fetch("/api/companies?discovered=1").then((r) => r.json()).then(setDiscovered);
    } else {
      setDiscovered((prev) => (prev.length ? [] : prev));
    }
    return data;
  }

  useEffect(() => {
    poll();
    const t = setInterval(poll, 1500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [state?.log.length]);

  async function runSweep() {
    await fetch("/api/agent", { method: "POST", body: "{}" });
    await poll();
  }

  async function importAll() {
    setImporting(true);
    await fetch("/api/agent", {
      method: "POST",
      body: JSON.stringify({ action: "import" }),
    });
    await poll();
    setImporting(false);
  }

  const job = state?.job;
  const running = job?.running ?? false;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* left: controls + queue */}
      <div className="space-y-5">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white">Research agent</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">
            Queues accounts with stale or missing research, gathers public signals,
            and writes cited briefs. Runs continuously in this process.
          </p>
          <button
            onClick={runSweep}
            disabled={running}
            className="interactive mt-4 w-full rounded-xl border border-accent/40 bg-accent/15 py-2.5 text-sm font-medium text-accent-soft hover:bg-accent/25 disabled:opacity-40"
          >
            {running ? "Sweep running…" : "Run research sweep"}
          </button>
          {state && state.stats.discovered > 0 && (
            <>
              <ul className="mt-3 space-y-1 text-xs text-gray-500">
                {discovered.slice(0, 10).map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelected(c.id)}
                      title="Preview before importing"
                      className="interactive -mx-1 w-full truncate rounded px-1 text-left hover:bg-white/5"
                    >
                      <span className="text-gray-300 hover:text-accent-soft">{c.name}</span>
                      <span className="text-gray-600"> · {c.industry} · fit {c.fitScore}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={importAll}
                disabled={importing}
                className="interactive mt-2 w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-400/20"
              >
                {importing ? "Importing…" : `Import ${state.stats.discovered} discovered enterprises`}
              </button>
            </>
          )}
        </div>

        {state && (
          <div className="glass grid grid-cols-2 gap-3 rounded-2xl p-5 text-center">
            <Stat label="Accounts" value={state.stats.total} />
            <Stat label="Customers" value={state.stats.customers} accent="text-emerald-300" />
            <Stat label="In pipeline" value={state.stats.inPipeline} accent="text-accent-soft" />
            <Stat label="Briefs" value={state.stats.briefs} accent="text-violet-300" />
          </div>
        )}

        {state?.stats.lastSweep && (
          <div className="glass rounded-2xl px-5 py-3 text-xs text-gray-400">
            Last sweep:{" "}
            <span className="text-gray-200">{state.stats.lastSweep.result}</span>
            <span className="text-gray-600"> · {ago(state.stats.lastSweep.ts)}</span>
          </div>
        )}

        {job && (
          <div className="glass rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Queue — {job.jobId}</h3>
              <span className="text-xs text-gray-500">
                {job.done}/{job.total}
              </span>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-700"
                style={{ width: `${job.total ? (job.done / job.total) * 100 : 0}%` }}
              />
            </div>
            <ul className="max-h-64 space-y-1.5 overflow-y-auto text-sm">
              {job.items.map((i) => (
                <li key={i.companyId} className="flex items-center justify-between">
                  <span className="text-gray-300">{i.name}</span>
                  <span
                    className={clsx(
                      "text-xs",
                      i.state === "done" && "text-emerald-300",
                      i.state === "running" && "animate-pulse text-accent-soft",
                      i.state === "queued" && "text-gray-600",
                      i.state === "failed" && "text-rose-300"
                    )}
                  >
                    {i.state === "running" ? "researching…" : i.state}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* right: live log */}
      <div className="glass flex min-h-[480px] flex-col rounded-2xl p-5 lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Activity log</h3>
          {running && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-300">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" />
              live
            </span>
          )}
        </div>
        <div
          ref={logRef}
          className="flex-1 space-y-2 overflow-y-auto font-mono text-[13px] leading-relaxed"
        >
          {(state?.log ?? []).map((e) => (
            <div key={e.id} className="flex gap-3">
              <span className="shrink-0 text-gray-600">
                {new Date(e.ts.replace(" ", "T") + "Z").toLocaleTimeString()}
              </span>
              <span
                className={clsx(
                  e.level === "success" && "text-emerald-300",
                  e.level === "warn" && "text-amber-300",
                  e.level === "info" && "text-gray-300"
                )}
              >
                {e.message}
              </span>
            </div>
          ))}
          {(state?.log.length ?? 0) === 0 && (
            <div className="pt-8 text-center text-gray-600">
              No activity yet — run a sweep.
            </div>
          )}
        </div>
      </div>
      <CompanyDrawer companyId={selected} onClose={() => setSelected(null)} onAdded={poll} />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div>
      <div className={clsx("text-xl font-semibold", accent ?? "text-white")}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}
