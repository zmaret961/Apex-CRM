import { NextResponse } from "next/server";
import { intelSummary, pipelineCounts, suggestedActions, weeklyDigest } from "@/lib/queries";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    items: suggestedActions(12),
    intel: intelSummary(),
    pipeline: pipelineCounts(),
    digest: weeklyDigest(),
  });
}
