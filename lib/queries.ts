import { getDb } from "./db";
import { PIPELINE_STAGES } from "./types";
import type {
  Company,
  SearchHit,
  CompanyEvent,
  CompanyStatus,
  ResearchBrief,
  Claim,
  LogEntry,
  PipelineStage,
  FocusItem,
  IntelSummary,
} from "./types";

export const VALID_STATUSES: CompanyStatus[] = ["customer", "prospect", "researched"];

export function isPipelineStage(v: unknown): v is PipelineStage {
  return typeof v === "string" && (PIPELINE_STAGES as readonly string[]).includes(v);
}

export function isCompanyStatus(v: unknown): v is CompanyStatus {
  return typeof v === "string" && VALID_STATUSES.includes(v as CompanyStatus);
}

export function listCompanies(opts: {
  q?: string;
  industry?: string;
  status?: string;
  minFit?: number;
  discovered?: boolean;
}): Company[] {
  const db = getDb();
  const where: string[] = ["c.discovered = ?"];
  const args: unknown[] = [opts.discovered ? 1 : 0];
  if (opts.q) {
    where.push("(c.name LIKE ? OR c.domain LIKE ? OR c.description LIKE ?)");
    const q = `%${opts.q}%`;
    args.push(q, q, q);
  }
  if (opts.industry) {
    where.push("c.industry = ?");
    args.push(opts.industry);
  }
  if (opts.status) {
    where.push("c.status = ?");
    args.push(opts.status);
  }
  if (opts.minFit != null) {
    where.push("c.fitScore >= ?");
    args.push(opts.minFit);
  }
  const rows = db
    .prepare(
      `SELECT c.*,
         (SELECT MAX(ce.ts) FROM company_events ce
           WHERE ce.companyId = c.id AND ce.type = 'pipeline') AS stageChangedAt
       FROM companies c WHERE ${where.join(" AND ")} ORDER BY c.fitScore DESC`
    )
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
  const prev = db.prepare("SELECT pipelineStage, name FROM companies WHERE id = ?").get(id) as
    | { pipelineStage: PipelineStage | null; name: string }
    | undefined;
  db.prepare(
    "UPDATE companies SET pipelineStage = ?, updatedAt = datetime('now') WHERE id = ?"
  ).run(stage, id);
  if (prev && prev.pipelineStage !== stage) {
    const text = stage
      ? prev.pipelineStage
        ? `Moved ${prev.pipelineStage} → ${stage}`
        : `Added to pipeline — ${stage}`
      : `Removed from pipeline (was ${prev.pipelineStage})`;
    addEvent(id, "pipeline", text);
    log("crm", "info", `${prev.name}: ${text}`);
  }
}

export function addEvent(companyId: number, type: CompanyEvent["type"], text: string) {
  const db = getDb();
  db.prepare("INSERT INTO company_events (companyId, type, text) VALUES (?, ?, ?)").run(
    companyId,
    type,
    text
  );
}

export function eventsFor(companyId: number): CompanyEvent[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM company_events WHERE companyId = ? ORDER BY id DESC LIMIT 50")
    .all(companyId) as CompanyEvent[];
}

export function markResearched(id: number) {
  const db = getDb();
  db.prepare(
    "UPDATE companies SET lastResearchAt = datetime('now'), updatedAt = datetime('now') WHERE id = ?"
  ).run(id);
}

export function setStatus(id: number, status: CompanyStatus) {
  const db = getDb();
  db.prepare("UPDATE companies SET status = ?, updatedAt = datetime('now') WHERE id = ?").run(
    status,
    id
  );
  addEvent(id, "status", `Status set to ${status}`);
}

export function importDiscovered(): number {
  const db = getDb();
  const names = db
    .prepare("SELECT id, name FROM companies WHERE discovered = 1")
    .all() as { id: number; name: string }[];
  for (const n of names) addEvent(n.id, "import", "Imported from auto-discovery queue");
  const r = db.prepare("UPDATE companies SET discovered = 0 WHERE discovered = 1").run();
  log("import", "success", `Imported ${r.changes} discovered enterprises into accounts`);
  return r.changes;
}

export function listBriefs(limit = 50): ResearchBrief[] {
  const db = getDb();
  const briefs = db
    .prepare(
      `SELECT rb.*, c.name as companyName, c.status as companyStatus,
        c.pipelineStage as companyPipelineStage
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

// Next-best-action engine: the CRM tells the seller what to do instead of
// waiting to be queried. Rules, in priority order:
//  1. Pipeline account whose research is stale (>30d) or missing → re-research
//  2. Pipeline account sitting in an early stage with fresh research → advance
//  3. High-fit prospect never researched → research it
export function suggestedActions(limit = 12): FocusItem[] {
  const db = getDb();
  const items: FocusItem[] = [];

  const stalePipeline = db
    .prepare(
      `SELECT id AS companyId, name, status, fitScore, industry, pipelineStage FROM companies
       WHERE discovered = 0 AND pipelineStage IS NOT NULL
         AND pipelineStage NOT IN ('Closed Won','Closed Lost')
         AND (lastResearchAt IS NULL OR lastResearchAt < datetime('now','-30 days'))
       ORDER BY fitScore DESC`
    )
    .all() as Omit<FocusItem, "action" | "label" | "reason">[];
  for (const c of stalePipeline) {
    items.push({
      ...c,
      action: "re-research",
      label: "Refresh research",
      reason: `In ${c.pipelineStage} but research is stale — walk into the next touch knowing what changed.`,
    });
  }

  const advanceable = db
    .prepare(
      `SELECT id AS companyId, name, status, fitScore, industry, pipelineStage FROM companies
       WHERE discovered = 0 AND pipelineStage IN ('Identified','Researched')
         AND lastResearchAt IS NOT NULL AND lastResearchAt >= datetime('now','-30 days')
       ORDER BY fitScore DESC`
    )
    .all() as Omit<FocusItem, "action" | "label" | "reason" | "targetStage">[];
  for (const c of advanceable) {
    const target = c.pipelineStage === "Identified" ? "Researched" : "Engaged";
    items.push({
      ...c,
      action: "advance",
      label: `Move to ${target}`,
      targetStage: target,
      reason:
        target === "Researched"
          ? "Fresh research is on file — mark it researched so the board stays honest."
          : "Researched and sourced — time for outreach before the signal goes cold.",
    });
  }

  const customers = db
    .prepare(
      `SELECT id AS companyId, name, status, fitScore, industry, pipelineStage FROM companies
       WHERE discovered = 0 AND status = 'customer'
         AND (lastResearchAt IS NULL OR lastResearchAt < datetime('now','-45 days'))
       ORDER BY fitScore DESC LIMIT 3`
    )
    .all() as Omit<FocusItem, "action" | "label" | "reason">[];
  for (const c of customers) {
    items.push({
      ...c,
      action: "re-research",
      label: "Refresh customer intel",
      reason:
        "Existing Devin customer with stale intel — look for the next expansion team before your check-in.",
    });
  }

  const unresearched = db
    .prepare(
      `SELECT id AS companyId, name, status, fitScore, industry, pipelineStage FROM companies
       WHERE discovered = 0 AND status = 'prospect' AND lastResearchAt IS NULL
       ORDER BY fitScore DESC LIMIT ?`
    )
    .all(Math.max(limit - items.length, 5)) as Omit<FocusItem, "action" | "label" | "reason">[];
  for (const c of unresearched) {
    items.push({
      ...c,
      action: "research",
      label: "Research now",
      reason: `Fit ${c.fitScore}/100 ${c.industry} prospect with no brief on file — highest-value unresearched account.`,
    });
  }

  return items.slice(0, limit);
}

const KNOWN_TOOLS: { tool: string; url: string; re: RegExp }[] = [
  { tool: "GitHub Copilot", url: "https://github.com/features/copilot", re: /copilot/gi },
  { tool: "Cursor", url: "https://cursor.com", re: /\bcursor\b/gi },
  { tool: "Claude Code", url: "https://www.anthropic.com/claude-code", re: /claude code|claude\b/gi },
  { tool: "OpenAI Codex", url: "https://openai.com/codex/", re: /codex/gi },
  { tool: "Windsurf", url: "https://windsurf.com", re: /windsurf|codeium/gi },
];

// Aggregates every competitor/AI-tooling mention across briefs and company
// signals into a per-tool picture of the competitive surface.
export function intelSummary(): IntelSummary {
  const db = getDb();
  const claims = db
    .prepare(
      `SELECT rc.text, c.name as companyName FROM research_claims rc
       JOIN research_briefs rb ON rb.id = rc.briefId
       JOIN companies c ON c.id = rb.companyId
       WHERE rc.category IN ('Competitor mention','AI tooling','Devin mention')`
    )
    .all() as { text: string; companyName: string }[];

  const signalRows = db
    .prepare("SELECT name, signals FROM companies WHERE discovered = 0")
    .all() as { name: string; signals: string }[];

  const map = new Map<string, { tool: string; url: string; mentions: number; accounts: Set<string> }>();
  for (const t of KNOWN_TOOLS) map.set(t.tool, { ...t, mentions: 0, accounts: new Set() });

  const scan = (text: string, company: string) => {
    for (const t of KNOWN_TOOLS) {
      if (t.re.test(text)) {
        const e = map.get(t.tool)!;
        e.mentions++;
        e.accounts.add(company);
      }
      t.re.lastIndex = 0;
    }
  };

  for (const c of claims) scan(c.text, c.companyName);
  for (const r of signalRows) {
    try {
      for (const s of JSON.parse(r.signals || "[]") as { text: string }[]) scan(s.text, r.name);
    } catch {
      /* malformed signals JSON — skip */
    }
  }

  const tools = [...map.values()]
    .map((t) => ({ tool: t.tool, url: t.url, mentions: t.mentions, accounts: [...t.accounts].sort() }))
    .sort((a, b) => b.mentions - a.mentions);

  return {
    tools,
    competitorClaims: claims.filter((c) => !/devin/i.test(c.text)).length,
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

// Full-text-ish search across sourced research — surfaces which accounts'
// research mentions a term (e.g. "Copilot", "hiring"). LIKE-escaped, capped.
export function searchResearch(q: string, limit = 8): SearchHit[] {
  const needle = `%${q.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
  const db = getDb();
  return db
    .prepare(
      `SELECT c.id AS companyId, c.name, c.status, c.fitScore,
              substr(cl.text, 1, 140) AS snippet, 'claim' AS kind
       FROM research_claims cl
       JOIN research_briefs rb ON rb.id = cl.briefId
       JOIN companies c ON c.id = rb.companyId
       WHERE cl.text LIKE ? ESCAPE '\\'
       UNION ALL
       SELECT c.id AS companyId, c.name, c.status, c.fitScore,
              substr(rb.whyNow, 1, 140) AS snippet, 'brief' AS kind
       FROM research_briefs rb
       JOIN companies c ON c.id = rb.companyId
       WHERE rb.whyNow LIKE ? ESCAPE '\\' OR rb.whatTheyDo LIKE ? ESCAPE '\\'
       ORDER BY fitScore DESC
       LIMIT ?`
    )
    .all(needle, needle, needle, limit) as SearchHit[];
}
