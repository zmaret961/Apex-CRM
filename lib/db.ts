import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { COMPANIES, DISCOVERED_COMPANIES, SEED_BRIEFS } from "../data/dataset";

const DB_PATH = path.join(process.cwd(), "data", "apex.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  migrate(db);
  const count = (db.prepare("SELECT COUNT(*) as c FROM companies").get() as { c: number }).c;
  if (count === 0) seed(db);
  _db = db;
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      industry TEXT NOT NULL,
      address TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      employees INTEGER NOT NULL DEFAULT 0,
      funding TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'prospect',
      fitScore INTEGER NOT NULL DEFAULT 50,
      pipelineStage TEXT,
      estimatedValue TEXT,
      lastResearchAt TEXT,
      description TEXT NOT NULL DEFAULT '',
      sources TEXT NOT NULL DEFAULT '[]',
      signals TEXT NOT NULL DEFAULT '[]',
      discovered INTEGER NOT NULL DEFAULT 0,
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS research_briefs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      companyId INTEGER NOT NULL REFERENCES companies(id),
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      whatTheyDo TEXT NOT NULL DEFAULT '',
      whyNow TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS research_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      briefId INTEGER NOT NULL REFERENCES research_briefs(id),
      category TEXT NOT NULL,
      text TEXT NOT NULL,
      sourceUrl TEXT
    );
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL DEFAULT (datetime('now')),
      jobId TEXT NOT NULL DEFAULT '',
      level TEXT NOT NULL DEFAULT 'info',
      message TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS company_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      companyId INTEGER NOT NULL REFERENCES companies(id),
      ts TEXT NOT NULL DEFAULT (datetime('now')),
      type TEXT NOT NULL DEFAULT 'note',
      text TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_briefs_company ON research_briefs(companyId);
    CREATE INDEX IF NOT EXISTS idx_claims_brief ON research_claims(briefId);
    CREATE INDEX IF NOT EXISTS idx_log_ts ON activity_log(ts DESC);
    CREATE INDEX IF NOT EXISTS idx_events_company ON company_events(companyId);
  `);
}

function seed(db: Database.Database) {
  const insertCompany = db.prepare(`
    INSERT INTO companies (name, domain, industry, address, lat, lng, employees, funding, status, fitScore, pipelineStage, estimatedValue, lastResearchAt, description, sources, signals, discovered)
    VALUES (@name, @domain, @industry, @address, @lat, @lng, @employees, @funding, @status, @fitScore, @pipelineStage, @estimatedValue, @lastResearchAt, @description, @sources, @signals, @discovered)
  `);
  const insertBrief = db.prepare(
    `INSERT INTO research_briefs (companyId, createdAt, whatTheyDo, whyNow) VALUES (?, ?, ?, ?)`
  );
  const insertClaim = db.prepare(
    `INSERT INTO research_claims (briefId, category, text, sourceUrl) VALUES (?, ?, ?, ?)`
  );

  const all = [...COMPANIES, ...DISCOVERED_COMPANIES];
  const byName = new Map<string, number>();
  const tx = db.transaction(() => {
    for (const c of all) {
      const r = insertCompany.run({
        ...c,
        pipelineStage: c.pipelineStage ?? null,
        estimatedValue: c.estimatedValue ?? null,
        lastResearchAt: c.lastResearchAt ?? null,
        discovered: c.discovered ?? 0,
        sources: JSON.stringify(c.sources ?? []),
        signals: JSON.stringify(c.signals ?? []),
      });
      byName.set(c.name, Number(r.lastInsertRowid));
    }
    for (const brief of SEED_BRIEFS) {
      const companyId = byName.get(brief.company);
      if (!companyId) continue;
      const r = insertBrief.run(companyId, brief.createdAt, brief.whatTheyDo, brief.whyNow);
      const briefId = Number(r.lastInsertRowid);
      for (const claim of brief.claims) {
        insertClaim.run(briefId, claim.category, claim.text, claim.sourceUrl ?? null);
      }
    }
  });
  tx();
}
