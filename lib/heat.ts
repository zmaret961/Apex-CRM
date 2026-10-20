import type { Company } from "./types";

export const STAGE_HEAT: Record<string, number> = {
  Identified: 2,
  Researched: 4,
  Engaged: 9,
  "Demo Scheduled": 14,
  Proposal: 18,
  "Closed Won": -100,
  "Closed Lost": -100,
};

// Shared "how hot is this account" score — fit + signal volume + pipeline
// momentum. Customers and competitors are pushed below zero so any
// threshold keeps them out. Used by Hot Leads and the map's Hot filter.
export function heat(c: Company): number {
  let h = c.fitScore;
  h += Math.min(c.signals.length * 4, 16);
  h += STAGE_HEAT[c.pipelineStage ?? ""] ?? 0;
  if (c.status === "customer") h -= 100;
  if (c.status === "competitor") h -= 100;
  return h;
}

export const HOT_THRESHOLD = 85;
