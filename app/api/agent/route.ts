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
  const running = runningJob();
  if (running) {
    log("crm", "warn", "Sweep request ignored — a research sweep is already running");
    return NextResponse.json({ job: running, alreadyRunning: true });
  }
  const job = startSweep(body.staleDays ?? 30);
  return NextResponse.json({ job });
}
