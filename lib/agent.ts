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

export function startSweep(staleDays = 30): JobStatus {
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
    const ok = runResearchOn(next.companyId, job.jobId);
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
