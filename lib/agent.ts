import { getDb } from "./db";
import { log } from "./queries";
import { runResearchOn } from "./research";
import type { JobStatus } from "./types";

// In-process agent runner. A "sweep" queues every company that has never been
// researched or whose last research is older than `staleDays`, then processes
// them sequentially with realistic pacing so the console shows a live loop.

interface Job {
  jobId: string;
  running: boolean;
  items: { companyId: number; name: string; state: "queued" | "running" | "done" | "failed" }[];
  done: number;
  failed: number;
  timer?: NodeJS.Timeout;
}

const jobs = new Map<string, Job>();
let jobCounter = 0;
const MAX_JOBS = 25;

export function runningJob(): JobStatus | null {
  for (const job of jobs.values()) if (job.running) return status(job);
  return null;
}

export function startSweep(staleDays = 30): JobStatus {
  // Defensive: an invalid modifier makes datetime('now', ?) NULL, which
  // silently narrows the sweep to never-researched accounts only.
  if (!Number.isFinite(staleDays) || staleDays <= 0) staleDays = 30;
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name FROM companies
       WHERE discovered = 0 AND status != 'customer'
         AND (lastResearchAt IS NULL OR lastResearchAt < datetime('now', ?))
       ORDER BY fitScore DESC LIMIT 12`
    )
    .all(`-${staleDays} days`) as { id: number; name: string }[];

  const jobId = `sweep-${++jobCounter}-${Date.now().toString(36)}`;
  const job: Job = {
    jobId,
    running: true,
    items: rows.map((r) => ({ companyId: r.id, name: r.name, state: "queued" as const })),
    done: 0,
    failed: 0,
  };
  jobs.set(jobId, job);
  if (jobs.size > MAX_JOBS) {
    const oldest = jobs.keys().next().value;
    if (oldest && oldest !== jobId) jobs.delete(oldest);
  }

  log(jobId, "info", `Research sweep ${jobId} started — ${rows.length} accounts queued`);
  scheduleNext(job);
  return status(job);
}

function scheduleNext(job: Job) {
  const next = job.items.find((i) => i.state === "queued");
  if (!next) {
    job.running = false;
    log(job.jobId, "info", `Sweep ${job.jobId} complete — ${job.done} researched, ${job.failed} failed`);
    return;
  }
  next.state = "running";
  log(job.jobId, "info", `Researching ${next.name} — gathering public signals…`);
  // Pacing: briefs are synthesized deterministically; the delay simulates
  // fetch/analyze time so the console reads like a real agent loop.
  job.timer = setTimeout(() => {
    // A throwing research run (e.g. one malformed row) must not wedge the
    // sweep subsystem — mark the item failed and keep the queue moving.
    let ok = false;
    try {
      ok = runResearchOn(next.companyId, job.jobId);
    } catch (e) {
      log(job.jobId, "warn", `Research threw for ${next.name}: ${String(e).slice(0, 200)}`);
    }
    next.state = ok ? "done" : "failed";
    if (ok) job.done++;
    else {
      job.failed++;
      log(job.jobId, "warn", `Research failed for ${next.name}`);
    }
    scheduleNext(job);
  }, 1200 + Math.random() * 1600);
}

export function getJob(jobId: string): JobStatus | null {
  const job = jobs.get(jobId);
  return job ? status(job) : null;
}

export function latestJob(): JobStatus | null {
  const all = [...jobs.values()];
  const last = all[all.length - 1];
  return last ? status(last) : null;
}

// Single-account research run, used by the Focus page's "Research now" action.
export function researchNow(companyId: number): boolean {
  const jobId = `manual-${Date.now().toString(36)}`;
  log(jobId, "info", "Manual research run started");
  return runResearchOn(companyId, jobId);
}

function status(job: Job): JobStatus {
  return {
    jobId: job.jobId,
    running: job.running,
    total: job.items.length,
    done: job.done,
    failed: job.failed,
    items: job.items,
  };
}
