import { NextRequest, NextResponse } from "next/server";
import { getJob, latestJob, researchNow, runningJob, startSweep } from "@/lib/agent";
import { importDiscovered, log, recentLog, stats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  const job = jobId ? getJob(jobId) : latestJob();
  return NextResponse.json({
    job,
    log: recentLog(80),
    stats: stats(),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body.action === "import") {
    const n = importDiscovered();
    return NextResponse.json({ imported: n, stats: stats() });
  }
  if (body.action === "research" && Number.isFinite(body.companyId)) {
    const ok = researchNow(Number(body.companyId));
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
  }
  // Only an explicit/absent sweep request may start a sweep — a malformed or
  // unknown action must 400, not kick off an expensive job by accident.
  if (body.action !== undefined && body.action !== null && body.action !== "sweep") {
    return NextResponse.json({ error: `unknown action "${String(body.action)}"` }, { status: 400 });
  }
  if (body.action === "research") {
    return NextResponse.json({ error: "research action requires companyId" }, { status: 400 });
  }
  const staleDays =
    body.staleDays === undefined ? 30 : Number(body.staleDays);
  if (!Number.isFinite(staleDays) || staleDays <= 0 || staleDays > 3650) {
    return NextResponse.json({ error: "staleDays must be a positive number" }, { status: 400 });
  }
  const running = runningJob();
  if (running) {
    log("crm", "warn", "Sweep request ignored — a research sweep is already running");
    return NextResponse.json({ job: running, alreadyRunning: true });
  }
  const job = startSweep(staleDays);
  return NextResponse.json({ job });
}
