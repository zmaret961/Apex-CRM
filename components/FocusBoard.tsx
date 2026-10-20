"use client";

import { useEffect, useState } from "react";
import type { FocusItem, IntelSummary, JobStatus, SequenceDue } from "@/lib/types";
import StatusPill from "./StatusPill";
import CompanyDrawer from "./CompanyDrawer";
import clsx from "clsx";

interface FocusData {
  items: FocusItem[];
  intel: IntelSummary;
  pipeline: Record<string, number>;
  digest: { pipelineMoves: number; researchRuns: number; imports: number; notes: number };
  sequenceDue: SequenceDue[];
}

const STAGE_ORDER = [
  "Identified",
  "Researched",
  "Engaged",
  "Demo Scheduled",
  "Proposal",
  "Closed Won",
];

const ACTION_TONE: Record<FocusItem["action"], string> = {
  "re-research": "border-amber-300/30 bg-amber-400/10 text-amber-300",
  advance: "border-accent/40 bg-accent/15 text-accent-soft",
  research: "border-violet-300/30 bg-violet-400/10 text-violet-300",
};

const SNOOZE_KEY = "apex-focus-snoozed";
const SNOOZE_DAYS = 7;

function loadSnoozed(): Map<number, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? "{}") as Record<string, number>;
    const now = Date.now();
    return new Map(
      Object.entries(raw)
        .map(([k, v]) => [Number(k), v] as [number, number])
        .filter(([, until]) => until > now)
    );
  } catch {
    return new Map();
  }
}

export default function FocusBoard() {
  const [data, setData] = useState<FocusData | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [snoozed, setSnoozed] = useState<Map<number, number>>(new Map());
  const [busy, setBusy] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [sweep, setSweep] = useState<JobStatus | null>(null);
  // Forgiving controls: completed "advance" actions keep the actual move
  // ({from, to} at click time) so a misclick can be put back in one click
  // even after the board data refreshes.
  const [undos, setUndos] = useState<Map<number, { from: string | null; to: string }>>(new Map());

  // Keep the pipeline strip truthful without a refetch. `from`/`to` are the
  // real stages involved — never a cached suggestion's stage.
  function adjustCounts(from: string | null, to: string | null) {
    setData((d) => {
      if (!d) return d;
      const pipeline = { ...d.pipeline };
      if (from) pipeline[from] = Math.max(0, (pipeline[from] ?? 0) - 1);
      if (to) pipeline[to] = (pipeline[to] ?? 0) + 1;
      return { ...d, pipeline };
    });
  }

  useEffect(() => {
    setSnoozed(loadSnoozed());
    // Reflect a sweep already running (e.g. started from Automation).
    fetch("/api/agent")
      .then((r) => r.json())
      .then((d) => {
        if (d.job?.running) setSweep(d.job);
      })
      .catch(() => {});
  }, []);

  async function startSweep() {
    const d = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).then((r) => r.json());
    if (d.job) setSweep(d.job);
  }

  // Poll a running sweep; refresh the board when it finishes.
  useEffect(() => {
    if (!sweep?.running) return;
    const t = setInterval(async () => {
      const d = await fetch(`/api/agent?jobId=${sweep.jobId}`).then((r) => r.json());
      setSweep(d.job ?? null);
      // job is null after completion (pruned) — refresh either way.
      if (!d.job || !d.job.running) load();
    }, 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sweep?.jobId, sweep?.running]);

  function snooze(id: number) {
    const until = Date.now() + SNOOZE_DAYS * 86400000;
    setSnoozed((m) => {
      const next = new Map(m).set(id, until);
      try {
        localStorage.setItem(SNOOZE_KEY, JSON.stringify(Object.fromEntries(next)));
      } catch { /* storage unavailable */ }
      return next;
    });
  }

  function unsnooze(id: number) {
    setSnoozed((m) => {
      const next = new Map(m);
      next.delete(id);
      try {
        localStorage.setItem(SNOOZE_KEY, JSON.stringify(Object.fromEntries(next)));
      } catch { /* storage unavailable */ }
      return next;
    });
  }

  async function load() {
    const d = await fetch("/api/focus").then((r) => r.json());
    setData(d);
  }
  useEffect(() => {
    load();
  }, []);

  async function act(item: FocusItem) {
    setBusy(item.companyId);
    if (item.action === "advance" && item.targetStage) {
      // Read the company's live stage first — the suggestion may be stale
      // (e.g. the deal was already advanced from its drawer).
      const before = await fetch(`/api/companies/${item.companyId}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      const actualPrev: string | null = before?.company?.pipelineStage ?? null;
      const r = await fetch(`/api/companies/${item.companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: item.targetStage }),
      });
      if (r.ok && actualPrev !== item.targetStage) {
        setUndos((m) => new Map(m).set(item.companyId, { from: actualPrev, to: item.targetStage! }));
        adjustCounts(actualPrev, item.targetStage);
      }
    } else {
      await fetch("/api/agent", {
        method: "POST",
        body: JSON.stringify({ action: "research", companyId: item.companyId }),
      });
    }
    setBusy(null);
    setDone((s) => new Set(s).add(item.companyId));
  }

  async function undoAdvance(item: FocusItem) {
    const move = undos.get(item.companyId);
    if (!move) return;
    setBusy(item.companyId);
    const r = await fetch(`/api/companies/${item.companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: move.from }),
    });
    setBusy(null);
    if (!r.ok) return; // keep the undo control and the current counts
    setUndos((m) => {
      const next = new Map(m);
      next.delete(item.companyId);
      return next;
    });
    adjustCounts(move.to, move.from);
    setDone((s) => {
      const next = new Set(s);
      next.delete(item.companyId);
      return next;
    });
  }

  const pending = (data?.items ?? []).filter(
    (i) => !done.has(i.companyId) && !snoozed.has(i.companyId)
  );
  const completed = (data?.items ?? []).filter((i) => done.has(i.companyId));
  const snoozedItems = (data?.items ?? []).filter((i) => snoozed.has(i.companyId));

  async function doneTouch(item: SequenceDue) {
    setBusy(item.companyId);
    const r = await fetch(`/api/companies/${item.companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sequenceStep: { index: item.stepIndex, done: true } }),
    });
    setBusy(null);
    if (!r.ok) return;
    setData((d) =>
      d
        ? {
            ...d,
            sequenceDue: d.sequenceDue.filter((s) => s.companyId !== item.companyId),
          }
        : d
    );
  }

  return (
    <div>
      {data && (
        <div className="glass mb-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl px-4 py-2.5 text-xs">
          <span className="font-semibold uppercase tracking-wider text-gray-500">
            Pipeline
          </span>
          {STAGE_ORDER.map((s) => (
            <span key={s} className="text-gray-400">
              {s.replace("Closed ", "")}{" "}
              <span className={clsx("font-medium", s === "Closed Won" ? "text-emerald-300" : "text-white")}>
                {data.pipeline[s] ?? 0}
              </span>
            </span>
          ))}
          {(data.digest.pipelineMoves + data.digest.researchRuns + data.digest.imports) > 0 && (
            <span className="text-gray-500" title="Activity in the last 7 days">
              7d: {data.digest.pipelineMoves} move{data.digest.pipelineMoves === 1 ? "" : "s"}
              {" · "}{data.digest.researchRuns} brief{data.digest.researchRuns === 1 ? "" : "s"}
              {" · "}{data.digest.imports} import{data.digest.imports === 1 ? "" : "s"}
            </span>
          )}
          <span className="ml-auto flex items-center gap-3 text-gray-500">
            {sweep?.running ? (
              <span className="text-violet-300">
                Sweep running · {sweep.done}/{sweep.total}
              </span>
            ) : (
              <button
                onClick={startSweep}
                className="interactive rounded-lg border border-violet-300/30 bg-violet-400/10 px-2.5 py-1 text-[11px] font-medium text-violet-300 hover:bg-violet-400/20"
                title="Queue research for every stale or unresearched account"
              >
                Run research sweep
              </button>
            )}
            {pending.length} suggestion{pending.length === 1 ? "" : "s"} open
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {!data && <div className="glass rounded-2xl p-8 text-center text-sm text-gray-500">Loading…</div>}
        {data && pending.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="text-3xl">✓</div>
            <p className="mt-2 text-sm text-gray-400">
              All caught up — every suggestion handled. New ones appear as research goes stale and
              deals advance.
            </p>
          </div>
        )}
        {(data?.sequenceDue ?? []).length > 0 && (
          <div className="glass rounded-2xl p-4">
            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Sequence touches due · {data!.sequenceDue.length}
            </div>
            <div className="space-y-1">
              {data!.sequenceDue.map((s) => (
                <div
                  key={`seq-${s.companyId}-${s.stepIndex}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm"
                >
                  <button
                    onClick={() => setSelected(s.companyId)}
                    className="min-w-0 flex-1 truncate text-left text-white hover:text-accent-soft"
                  >
                    {s.name}
                    <span className="ml-2 text-xs text-gray-500">
                      Day {s.day} · {s.label}
                    </span>
                  </button>
                  <span
                    className={clsx(
                      "shrink-0 text-[11px]",
                      s.overdue > 0 ? "font-medium text-amber-300/90" : "text-gray-500"
                    )}
                  >
                    {s.overdue > 0 ? `${s.overdue}d overdue` : "due today"}
                  </span>
                  <button
                    onClick={() => doneTouch(s)}
                    disabled={busy === s.companyId}
                    className="interactive shrink-0 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-40"
                  >
                    {busy === s.companyId ? "…" : "done"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {pending.map((item) => (
          <div key={`pending-${item.companyId}`} className="glass animate-fade-up flex items-center gap-4 rounded-2xl p-4">
            <button
              onClick={() => setSelected(item.companyId)}
              className="min-w-0 flex-1 text-left"
            >
              <div className="flex items-center gap-2.5">
                <span className="truncate font-medium text-white hover:text-accent-soft">
                  {item.name}
                </span>
                <StatusPill status={item.status} />
                {item.pipelineStage && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-gray-400">
                    {item.pipelineStage}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-gray-400">{item.reason}</p>
            </button>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <button
                onClick={() => act(item)}
                disabled={busy === item.companyId}
                className={clsx(
                  "interactive rounded-xl border px-3.5 py-2 text-xs font-medium",
                  ACTION_TONE[item.action]
                )}
              >
                {busy === item.companyId ? "Working…" : item.label}
              </button>
              <button
                onClick={() => snooze(item.companyId)}
                title={`Hide for ${SNOOZE_DAYS} days`}
                className="text-[11px] text-gray-600 hover:text-gray-400"
              >
                snooze {SNOOZE_DAYS}d
              </button>
            </div>
          </div>
        ))}
        {completed.map((item) => (
          <div
            key={`done-${item.companyId}`}
            className="glass flex items-center gap-4 rounded-2xl p-4 opacity-45"
          >
            <div className="min-w-0 flex-1">
              <span className="truncate text-sm text-gray-400 line-through">{item.name}</span>
            </div>
            {undos.has(item.companyId) && (
              <button
                onClick={() => undoAdvance(item)}
                disabled={busy === item.companyId}
                className="interactive shrink-0 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-300 hover:bg-amber-400/20 disabled:opacity-40"
              >
                {busy === item.companyId ? "…" : "undo"}
              </button>
            )}
            <span className="shrink-0 text-xs text-emerald-300">done</span>
          </div>
        ))}
        {snoozedItems.length > 0 && (
          <div className="glass rounded-2xl p-3">
            <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
              Snoozed · {snoozedItems.length}
            </div>
            {snoozedItems.map((item) => (
              <div
                key={`snoozed-${item.companyId}`}
                className="flex items-center justify-between rounded-lg px-2 py-1 text-xs"
              >
                <span className="truncate text-gray-500">{item.name}</span>
                <button
                  onClick={() => unsnooze(item.companyId)}
                  className="interactive ml-2 rounded px-1.5 py-0.5 text-[10px] text-accent-soft hover:bg-accent/10"
                >
                  restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Competitive intel rollup */}
      <div className="space-y-5">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white">Competitive surface</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">
            Aggregated AI-coding-tool mentions across all briefs and account signals.
          </p>
          <ul className="mt-4 space-y-3">
            {(data?.intel.tools ?? []).map((t) => (
              <li key={t.tool}>
                <div className="flex items-center justify-between text-sm">
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-200 hover:text-accent-soft"
                  >
                    {t.tool} ↗
                  </a>
                  <span className="flex items-center gap-2 text-xs text-gray-500">
                    <a
                      href={`/research?q=${encodeURIComponent(t.tool === "Claude Code" ? "claude" : t.tool.split(" ").pop()!.toLowerCase())}`}
                      className="text-accent-soft/80 hover:text-accent-soft hover:underline"
                    >
                      feed
                    </a>
                    {t.mentions} mentions
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-400/70 to-amber-400/70"
                    style={{
                      width: `${Math.min(100, (t.mentions / Math.max(1, data?.intel.tools[0]?.mentions ?? 1)) * 100)}%`,
                    }}
                  />
                </div>
                {t.accounts.length > 0 && (
                  <p className="mt-1 truncate text-[11px] text-gray-600">
                    {t.accounts.slice(0, 4).join(", ")}
                    {t.accounts.length > 4 && ` +${t.accounts.length - 4} more`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-2xl p-5 text-xs leading-relaxed text-gray-400">
          <h3 className="text-sm font-semibold text-white">How Focus works</h3>
          <p className="mt-2">
            Apex continuously scores your book and queues the highest-leverage next action —
            refresh stale pipeline research, advance deals that are ready, re-engage stuck
            deals, keep customer + competitor intel fresh, and research top-fit accounts with
            no brief on file.
          </p>
          <p className="mt-2 text-gray-500">
            Actions run the real workflows: research writes a cited brief; advancing updates the
            Opportunities board.
          </p>
        </div>
      </div>

      <CompanyDrawer companyId={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}
