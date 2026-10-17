import { getDb } from "./db";
import type { Company, ResearchBrief, Claim, LogEntry, PipelineStage } from "./types";

export function listCompanies(opts: {
  q?: string;
  industry?: string;
  status?: string;
  minFit?: number;
  discovered?: boolean;
}): Company[] {
  const db = getDb();
  const where: string[] = ["discovered = ?"];
  const args: unknown[] = [opts.discovered ? 1 : 0];
  if (opts.q) {
    where.push("(name LIKE ? OR domain LIKE ? OR description LIKE ?)");
    const q = `%${opts.q}%`;
    args.push(q, q, q);
  }
  if (opts.industry) {
    where.push("industry = ?");
    args.push(opts.industry);
  }
  if (opts.status) {
    where.push("status = ?");
    args.push(opts.status);
  }
  if (opts.minFit != null) {
    where.push("fitScore >= ?");
    args.push(opts.minFit);
  }
  const rows = db
    .prepare(`SELECT * FROM companies WHERE ${where.join(" AND ")} ORDER BY fitScore DESC`)
    .all(...args) as RawCompany[];
  return rows.map(hydrate);
}

export function getCompany(id: number): Company | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM companies WHERE id = ?").get(id) as RawCompany | undefined;
  return row ? hydrate(row) : null;
}

export function updatePipeline(id: number, stage: PipelineStage | null) {
  const db = getDb();
  db.prepare(
    "UPDATE companies SET pipelineStage = ?, updatedAt = datetime('now') WHERE id = ?"
  ).run(stage, id);
}

export function markResearched(id: number) {
  const db = getDb();
  db.prepare(
    "UPDATE companies SET lastResearchAt = datetime('now'), updatedAt = datetime('now') WHERE id = ?"
  ).run(id);
}

export function setStatus(id: number, status: string) {
  const db = getDb();
  db.prepare("UPDATE companies SET status = ?, updatedAt = datetime('now') WHERE id = ?").run(
    status,
    id
  );
}

export function importDiscovered(): number {
  const db = getDb();
  const r = db.prepare("UPDATE companies SET discovered = 0 WHERE discovered = 1").run();
  return r.changes;
}

export function listBriefs(limit = 50): ResearchBrief[] {
  const db = getDb();
  const briefs = db
    .prepare(
      `SELECT rb.*, c.name as companyName, c.status as companyStatus
       FROM research_briefs rb JOIN companies c ON c.id = rb.companyId
       ORDER BY rb.createdAt DESC LIMIT ?`
    )
    .all(limit) as (Omit<ResearchBrief, "claims"> & { id: number })[];
  const claimsStmt = db.prepare("SELECT * FROM research_claims WHERE briefId = ? ORDER BY id");
  return briefs.map((b) => ({
    ...b,
    claims: claimsStmt.all(b.id) as Claim[],
  }));
}

export function briefsFor(companyId: number): ResearchBrief[] {
  const db = getDb();
  const briefs = db
    .prepare("SELECT * FROM research_briefs WHERE companyId = ? ORDER BY createdAt DESC")
    .all(companyId) as (Omit<ResearchBrief, "claims"> & { id: number })[];
  const claimsStmt = db.prepare("SELECT * FROM research_claims WHERE briefId = ? ORDER BY id");
  return briefs.map((b) => ({
    ...b,
    claims: claimsStmt.all(b.id) as Claim[],
  }));
}

export function insertBrief(
  companyId: number,
  whatTheyDo: string,
  whyNow: string,
  claims: { category: string; text: string; sourceUrl?: string }[]
) {
  const db = getDb();
  const r = db
    .prepare("INSERT INTO research_briefs (companyId, whatTheyDo, whyNow) VALUES (?, ?, ?)")
    .run(companyId, whatTheyDo, whyNow);
  const briefId = Number(r.lastInsertRowid);
  const stmt = db.prepare(
    "INSERT INTO research_claims (briefId, category, text, sourceUrl) VALUES (?, ?, ?, ?)"
  );
  for (const c of claims) stmt.run(briefId, c.category, c.text, c.sourceUrl ?? null);
  return briefId;
}

export function log(jobId: string, level: string, message: string) {
  const db = getDb();
  db.prepare("INSERT INTO activity_log (jobId, level, message) VALUES (?, ?, ?)").run(
    jobId,
    level,
    message
  );
}

export function recentLog(limit = 100): LogEntry[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM activity_log ORDER BY id DESC LIMIT ?")
    .all(limit) as LogEntry[];
}

export function stats() {
  const db = getDb();
  return {
    total: (db.prepare("SELECT COUNT(*) c FROM companies WHERE discovered = 0").get() as { c: number }).c,
    customers: (db.prepare("SELECT COUNT(*) c FROM companies WHERE status='customer' AND discovered=0").get() as { c: number }).c,
    prospects: (db.prepare("SELECT COUNT(*) c FROM companies WHERE status='prospect' AND discovered=0").get() as { c: number }).c,
    discovered: (db.prepare("SELECT COUNT(*) c FROM companies WHERE discovered=1").get() as { c: number }).c,
    briefs: (db.prepare("SELECT COUNT(*) c FROM research_briefs").get() as { c: number }).c,
    inPipeline: (db.prepare("SELECT COUNT(*) c FROM companies WHERE pipelineStage IS NOT NULL AND pipelineStage NOT IN ('Closed Won','Closed Lost') AND discovered=0").get() as { c: number }).c,
  };
}

interface RawCompany extends Omit<Company, "sources" | "signals"> {
  sources: string;
  signals: string;
}

function hydrate(row: RawCompany): Company {
  return {
    ...row,
    sources: JSON.parse(row.sources || "[]"),
    signals: JSON.parse(row.signals || "[]"),
  };
}
