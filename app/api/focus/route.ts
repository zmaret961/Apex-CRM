import { NextResponse } from "next/server";
import {
  intelSummary,
  neverEngagedHot,
  noChampionDeals,
  noSequenceDeals,
  pipelineCounts,
  sequencesDue,
  suggestedActions,
  weeklyDigest,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    items: suggestedActions(12),
    intel: intelSummary(),
    pipeline: pipelineCounts(),
    digest: weeklyDigest(),
    sequenceDue: sequencesDue(),
    noChampion: noChampionDeals(),
    noSequence: noSequenceDeals(),
    neverEngaged: neverEngagedHot(),
  });
}
