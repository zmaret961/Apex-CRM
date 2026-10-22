import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";
import {
  COMPANIES,
  COMPANIES_V5,
  DISCOVERED_COMPANIES,
  DISCOVERED_COMPANIES_V2,
  DISCOVERED_COMPANIES_V3,
  DISCOVERED_COMPANIES_V4,
  SEED_BRIEFS,
  SEED_EXECS,
  type SeedCompany,
} from "../data/dataset";

// Serverless hosts (Vercel) have a read-only project dir — the only writable
// path is the per-instance tmp dir, so the DB is ephemeral there.
const DB_PATH = process.env.VERCEL
  ? path.join(os.tmpdir(), "apex.db")
  : path.join(process.cwd(), "data", "apex.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  migrate(db);
  const count = (db.prepare("SELECT COUNT(*) as c FROM companies").get() as { c: number }).c;
  if (count === 0) seed(db);
  applyDataMigrations(db);
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
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      companyId INTEGER NOT NULL REFERENCES companies(id),
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      champion INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS execs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      companyId INTEGER NOT NULL REFERENCES companies(id),
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS sequences (
      companyId INTEGER PRIMARY KEY REFERENCES companies(id),
      startedAt TEXT NOT NULL DEFAULT (datetime('now')),
      steps TEXT NOT NULL DEFAULT '[]'
    );
    CREATE INDEX IF NOT EXISTS idx_briefs_company ON research_briefs(companyId);
    CREATE INDEX IF NOT EXISTS idx_claims_brief ON research_claims(briefId);
    CREATE INDEX IF NOT EXISTS idx_log_ts ON activity_log(ts DESC);
    CREATE INDEX IF NOT EXISTS idx_events_company ON company_events(companyId);
    CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(companyId);
    CREATE INDEX IF NOT EXISTS idx_execs_company ON execs(companyId);
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

  const all = [...COMPANIES, ...COMPANIES_V5, ...DISCOVERED_COMPANIES];
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

// One-shot data migrations, versioned via PRAGMA user_version so existing
// local databases pick up dataset corrections without a reseed.
const COMPETITOR_DOMAINS = [
  "openai.com", "anthropic.com", "microsoft.com", "google.com",
];

function applyDataMigrations(db: Database.Database) {
  const v = (db.pragma("user_version") as { user_version: number }[])[0].user_version;
  if (v < 1) {
    const marks = COMPETITOR_DOMAINS.map(() => "?").join(",");
    db.prepare(
      `UPDATE companies SET status = 'competitor', pipelineStage = NULL
       WHERE domain IN (${marks})`
    ).run(...COMPETITOR_DOMAINS);
    db.pragma("user_version = 1");
  }
  if (v < 2) {
    // Newly added discovered companies join the auto-import queue without a
    // full reseed (domains already present — imported or queued — are skipped).
    const insert = db.prepare(
      `INSERT INTO companies (name, domain, industry, address, lat, lng, employees, funding, status, fitScore, pipelineStage, estimatedValue, lastResearchAt, description, sources, signals, discovered)
       SELECT @name, @domain, @industry, @address, @lat, @lng, @employees, @funding, @status, @fitScore, NULL, NULL, NULL, @description, @sources, @signals, 1
       WHERE NOT EXISTS (SELECT 1 FROM companies WHERE domain = @domain)`
    );
    const tx = db.transaction(() => {
      for (const c of DISCOVERED_COMPANIES) {
        insert.run({
          ...c,
          sources: JSON.stringify(c.sources ?? []),
          signals: JSON.stringify(c.signals ?? []),
        });
      }
    });
    tx();
    db.pragma("user_version = 2");
  }
  const insertDiscovered = (batch: SeedCompany[], discovered = 1) => {
    const insert = db.prepare(
      `INSERT INTO companies (name, domain, industry, address, lat, lng, employees, funding, status, fitScore, pipelineStage, estimatedValue, lastResearchAt, description, sources, signals, discovered)
       SELECT @name, @domain, @industry, @address, @lat, @lng, @employees, @funding, @status, @fitScore, NULL, NULL, NULL, @description, @sources, @signals, @discovered
       WHERE NOT EXISTS (SELECT 1 FROM companies WHERE domain = @domain)`
    );
    const tx = db.transaction(() => {
      for (const c of batch) {
        insert.run({
          ...c,
          discovered,
          sources: JSON.stringify(c.sources ?? []),
          signals: JSON.stringify(c.signals ?? []),
        });
      }
    });
    tx();
  };
  if (v < 3) {
    // Batch 2 of the auto-import queue for databases already at v2.
    insertDiscovered(DISCOVERED_COMPANIES_V2);
    db.pragma("user_version = 3");
  }
  if (v < 4) {
    // Batch 3 — global banks, trading firms, NYC health systems.
    insertDiscovered(DISCOVERED_COMPANIES_V3);
    db.pragma("user_version = 4");
  }
  if (v < 5) {
    // Batch 4 — more NYC HQs: banks/insurers, media groups, utility.
    insertDiscovered(DISCOVERED_COMPANIES_V4);
    db.pragma("user_version = 5");
  }
  if (v < 6) {
    // Remove batch-4 queue duplicates of companies already tracked under a
    // different domain spelling (Marsh McLennan, New York Life, Estée Lauder,
    // Fox Corp) — dedupe is by domain, so the name-spelling variants slipped in.
    db.prepare(
      `DELETE FROM companies
       WHERE discovered = 1 AND domain IN ('mmmc.com','nylife.com','fox.com','esteelauder.com')`
    ).run();
    // Batch 5 — real estate, publishing, luxury, insurance, health + adtech
    // enterprises; tracked directly (not queued).
    insertDiscovered(COMPANIES_V5, 0);
    db.pragma("user_version = 6");
  }
  if (v < 7) {
    // Sourced executive org charts for the top of the book.
    const insertExec = db.prepare(
      `INSERT INTO execs (companyId, name, role)
       SELECT c.id, @name, @role FROM companies c
       WHERE c.domain = @domain
         AND NOT EXISTS (SELECT 1 FROM execs e WHERE e.companyId = c.id AND e.name = @name)`
    );
    for (const entry of SEED_EXECS) {
      for (const ex of entry.execs) {
        insertExec.run({ domain: entry.domain, name: ex.name, role: ex.role });
      }
    }
    db.pragma("user_version = 7");
  }
  if (v < 8) {
    // Exec coverage batch 2 — same idempotent domain-keyed insert; safe to
    // re-run because of the NOT EXISTS guard.
    const insertExec = db.prepare(
      `INSERT INTO execs (companyId, name, role)
       SELECT c.id, @name, @role FROM companies c
       WHERE c.domain = @domain
         AND NOT EXISTS (SELECT 1 FROM execs e WHERE e.companyId = c.id AND e.name = @name)`
    );
    for (const entry of SEED_EXECS) {
      for (const ex of entry.execs) {
        insertExec.run({ domain: entry.domain, name: ex.name, role: ex.role });
      }
    }
    db.pragma("user_version = 8");
  }
  if (v < 9) {
    // Data-quality sweep from the audit: purge dead/absorbed accounts,
    // correct stale funding/address fields, refresh changed exec roles.
    const DEAD = [
      "boweryfarming.com", // shut down 2024
      "outbrain.com",      // merged into Taboola (already tracked)
      "innovid.com",       // acquired by Mediaocean (already tracked)
      "interpublic.com",   // merged into Omnicom (already tracked)
      "chronosphere.io",   // acquired by Palo Alto Networks (already tracked)
      "wiz.io",            // acquired by Google (already tracked, competitor)
      "moneylion.com",     // acquired by Gen Digital
    ];
    const marks = DEAD.map(() => "?").join(",");
    const purge = db.transaction(() => {
      db.prepare(`DELETE FROM execs WHERE companyId IN (SELECT id FROM companies WHERE domain IN (${marks}))`).run(...DEAD);
      db.prepare(`DELETE FROM research_claims WHERE briefId IN (SELECT id FROM research_briefs WHERE companyId IN (SELECT id FROM companies WHERE domain IN (${marks})))`).run(...DEAD);
      db.prepare(`DELETE FROM research_briefs WHERE companyId IN (SELECT id FROM companies WHERE domain IN (${marks}))`).run(...DEAD);
      db.prepare(`DELETE FROM company_events WHERE companyId IN (SELECT id FROM companies WHERE domain IN (${marks}))`).run(...DEAD);
      db.prepare(`DELETE FROM contacts WHERE companyId IN (SELECT id FROM companies WHERE domain IN (${marks}))`).run(...DEAD);
      db.prepare(`DELETE FROM sequences WHERE companyId IN (SELECT id FROM companies WHERE domain IN (${marks}))`).run(...DEAD);
      db.prepare(`DELETE FROM companies WHERE domain IN (${marks})`).run(...DEAD);
    });
    purge();

    const upd = db.prepare(`UPDATE companies SET funding = ? WHERE domain = ?`);
    const set = (domain: string, _col: string, val: string) =>
      upd.run(val, domain);
    set("ramp.com", "funding", "~$22.5B valuation (Jul 2025)");
    set("openai.com", "funding", "~$500B valuation (Oct 2025)");
    set("anthropic.com", "funding", "~$183B valuation (Sep 2025)");
    set("bilt.com", "funding", "~$10.75B valuation (2025)");
    set("paramount.com", "funding", "Public (NASDAQ: PSKY)");
    set("codecademy.com", "funding", "Acquired by Skillsoft (2022)");
    set("complex.com", "funding", "Acquired by NTWRK (2024)");
    set("squarespace.com", "funding", "Private — Permira take-private ~$7.2B (2024)");

    const hq = (
      domain: string,
      address: string,
      lat: number,
      lng: number
    ) => db
      .prepare(`UPDATE companies SET address = ?, lat = ?, lng = ? WHERE domain = ?`)
      .run(address, lat, lng, domain);
    hq("pfizer.com", "66 Hudson Blvd (The Spiral), New York, NY 10001", 40.7537, -74.0013);
    hq("hsbc.com", "66 Hudson Blvd (The Spiral), New York, NY 10001", 40.7537, -74.0013);
    hq("ibm.com", "One Madison Ave, New York, NY 10010", 40.7423, -73.9865);
    hq("sothebys.com", "945 Madison Ave, New York, NY 10021", 40.7738, -73.9642);
    hq("uipath.com", "One Vanderbilt Ave, New York, NY 10017", 40.7530, -73.9785);
    hq("unileverusa.com", "111 River St, Hoboken, NJ 07030", 40.7369, -74.0289);

    // Exec role refreshes (all public announcements).
    db.prepare(
      `UPDATE execs SET role = 'Co-founder & Executive Chairman'
       WHERE name = 'Daniel Ek' AND companyId = (SELECT id FROM companies WHERE domain = 'spotify.com')`
    ).run();
    db.prepare(
      `UPDATE execs SET role = 'Co-CEO'
       WHERE name = 'Gustav Söderström' AND companyId = (SELECT id FROM companies WHERE domain = 'spotify.com')`
    ).run();
    db.prepare(
      `INSERT INTO execs (companyId, name, role)
       SELECT c.id, 'Alex Norström', 'Co-CEO' FROM companies c
       WHERE c.domain = 'spotify.com'
         AND NOT EXISTS (SELECT 1 FROM execs e WHERE e.companyId = c.id AND e.name = 'Alex Norström')`
    ).run();
    db.prepare(
      `UPDATE execs SET name = 'Markus Strobel', role = 'Executive Chairman & Interim CEO'
       WHERE name = 'Sue Nabi' AND companyId = (SELECT id FROM companies WHERE domain = 'coty.com')`
    ).run();
    db.prepare(
      `UPDATE execs SET role = 'Interim President & CEO'
       WHERE name = 'Dev Ittycheria' AND companyId = (SELECT id FROM companies WHERE domain = 'mongodb.com')`
    ).run();

    db.pragma("user_version = 9");
  }
  if (v < 10) {
    // Exec org-chart batch 3 — same idempotent domain-keyed insert; the
    // NOT EXISTS guard makes it safe alongside every earlier batch.
    const insertExec = db.prepare(
      `INSERT INTO execs (companyId, name, role)
       SELECT c.id, @name, @role FROM companies c
       WHERE c.domain = @domain
         AND NOT EXISTS (SELECT 1 FROM execs e WHERE e.companyId = c.id AND e.name = @name)`
    );
    for (const entry of SEED_EXECS) {
      for (const ex of entry.execs) {
        insertExec.run({ domain: entry.domain, name: ex.name, role: ex.role });
      }
    }
    db.pragma("user_version = 10");
  }
  if (v < 11) {
    // Purge fabricated "most likely incumbent" claims written before the
    // research generator stopped inventing incumbent guesses (rule-1 fix).
    db.prepare("DELETE FROM research_claims WHERE text LIKE '%most likely incumbent%'").run();
    db.pragma("user_version = 11");
  }
}
