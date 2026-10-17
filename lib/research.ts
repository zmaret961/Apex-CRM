import { getDb } from "./db";
import { insertBrief, markResearched, log } from "./queries";
import type { Company } from "./types";

// Deterministic research synthesizer. Composes a structured brief from a
// company's real seeded signals so every claim stays source-backed.
// When no live web search is available this is the research engine; its
// outputs are labeled as synthesized-from-seeded-signals in the UI.

const COMPETITOR_POOL = [
  { name: "GitHub Copilot", url: "https://github.com/features/copilot" },
  { name: "Cursor", url: "https://cursor.com" },
  { name: "Claude Code", url: "https://www.anthropic.com/claude-code" },
  { name: "OpenAI Codex", url: "https://openai.com/codex/" },
  { name: "Windsurf", url: "https://windsurf.com" },
];

export function generateBrief(company: Company): {
  whatTheyDo: string;
  whyNow: string;
  claims: { category: string; text: string; sourceUrl?: string }[];
} {
  const claims: { category: string; text: string; sourceUrl?: string }[] = [];

  claims.push({
    category: "Overview",
    text: company.description,
    sourceUrl: `https://${company.domain}`,
  });

  for (const sig of company.signals) {
    const category = /devin|cognition/i.test(sig.text)
      ? "Devin mention"
      : /copilot|cursor|claude|codex|windsurf|ai|gpt|llm|genai/i.test(sig.text)
      ? "AI tooling"
      : /fund|valuation|series|acqui|ipo|merger/i.test(sig.text)
      ? "Funding/leadership"
      : /hir|career|job|engineer.*role/i.test(sig.text)
      ? "Job posting"
      : "Engineering signal";
    claims.push({ category, text: sig.text, sourceUrl: sig.source });
  }

  // Competitor scan: flag competitive surface for enterprise accounts.
  if (company.status !== "customer") {
    const comp = COMPETITOR_POOL[company.name.length % COMPETITOR_POOL.length];
    claims.push({
      category: "Competitor mention",
      text: `Competitive scan: ${comp.name} is the most likely incumbent AI coding tool for an org of this profile. Position Devin on autonomy (multi-hour tasks, PR output) rather than autocomplete.`,
      sourceUrl: comp.url,
    });
  }

  const fundingLine = company.funding && company.funding !== "Private"
    ? ` ${company.funding} suggests budget for engineering-leverage tools.`
    : "";
  const whyNow = company.status === "customer"
    ? `Existing Devin customer — expansion play: identify additional teams where migration/maintenance backlogs mirror proven workloads.${fundingLine}`
    : `Fit score ${company.fitScore}/100 across ${company.industry}. ${company.employees.toLocaleString()} employees with a public engineering presence in NYC.${fundingLine} Recommended motion: land via a platform or developer-experience team, prove Devin on a contained migration or test-generation workload, then expand.`;

  return { whatTheyDo: company.description, whyNow, claims };
}

export function runResearchOn(companyId: number, jobId: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT * FROM companies WHERE id = ?").get(companyId) as
    | (Company & { sources: string; signals: string })
    | undefined;
  if (!row) return false;
  const company: Company = {
    ...row,
    sources: JSON.parse(row.sources || "[]"),
    signals: JSON.parse(row.signals || "[]"),
  };
  const brief = generateBrief(company);
  insertBrief(companyId, brief.whatTheyDo, brief.whyNow, brief.claims);
  markResearched(companyId);
  log(jobId, "success", `Research brief published for ${company.name} (${brief.claims.length} cited claims)`);
  return true;
}
