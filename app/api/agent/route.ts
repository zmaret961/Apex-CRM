import { NextRequest, NextResponse } from "next/server";
import { getJob, latestJob, startSweep } from "@/lib/agent";
import { importDiscovered, recentLog, stats } from "@/lib/queries";

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
  const job = startSweep(body.staleDays ?? 30);
  return NextResponse.json({ job });
}
