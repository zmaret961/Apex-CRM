"use client";

import { useEffect, useState } from "react";
import type { Company, ResearchBrief } from "@/lib/types";
import StatusPill from "./StatusPill";
import FitScore from "./FitScore";

interface Props {
  companyId: number | null;
  onClose: () => void;
  onAdded?: () => void;
}

export default function CompanyDrawer({ companyId, onClose, onAdded }: Props) {
  const [company, setCompany] = useState<Company | null>(null);
  const [briefs, setBriefs] = useState<ResearchBrief[]>([]);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (companyId == null) {
      setCompany(null);
      return;
    }
    setAdded(false);
    fetch(`/api/companies/${companyId}`)
      .then((r) => r.json())
      .then((d) => {
        setCompany(d.company);
        setBriefs(d.briefs ?? []);
      });
  }, [companyId]);

  async function addToPipeline() {
    if (!company) return;
    setAdding(true);
    await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: "Identified" }),
    });
    setAdding(false);
    setAdded(true);
    onAdded?.();
  }

  const open = companyId != null;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      )}
      <aside
        className={`glass-deep fixed inset-y-0 right-0 z-50 w-full max-w-md transform overflow-y-auto border-l p-6 transition-transform duration-500 ease-spring ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {!company ? (
          <div className="flex h-full items-center justify-center text-gray-500">Loading…</div>
        ) : (
          <div className="animate-fade-up space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">{company.name}</h2>
                <a
                  href={`https://${company.domain}`}
                  target="_blank"
                  className="text-sm text-accent-soft hover:underline"
                >
                  {company.domain} ↗
                </a>
              </div>
              <button
                onClick={onClose}
                className="interactive rounded-lg border border-white/10 px-2.5 py-1 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3">
              <StatusPill status={company.status} />
              <FitScore score={company.fitScore} />
            </div>

            <p className="text-sm leading-relaxed text-gray-300">{company.description}</p>

            <div className="glass space-y-2 rounded-xl p-4 text-sm">
              <Row label="HQ / NYC office" value={company.address} />
              <Row label="Employees" value={company.employees.toLocaleString()} />
              <Row label="Industry" value={company.industry} />
              <Row label="Funding" value={company.funding} />
              {company.estimatedValue && (
                <Row
                  label="Deal value"
                  value={company.estimatedValue}
                  valueClass="text-emerald-300"
                />
              )}
              <Row
                label="Last research"
                value={
                  company.lastResearchAt
                    ? new Date(company.lastResearchAt).toLocaleDateString()
                    : "Never"
                }
              />
            </div>

            {company.signals.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Key signals
                </h3>
                <ul className="space-y-2">
                  {company.signals.map((s, i) => (
                    <li key={i} className="glass rounded-lg px-3 py-2 text-sm text-gray-300">
                      {s.text}
                      <a
                        href={s.source}
                        target="_blank"
                        className="ml-2 text-accent-soft hover:underline"
                      >
                        source ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {briefs.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Latest research
                </h3>
                <div className="glass space-y-3 rounded-xl p-4 text-sm">
                  <p className="leading-relaxed text-gray-300">
                    <span className="font-medium text-white">Why now: </span>
                    {briefs[0].whyNow}
                  </p>
                  <ul className="space-y-1.5 border-t border-white/5 pt-2">
                    {briefs[0].claims.slice(0, 4).map((c) => (
                      <li key={c.id} className="flex justify-between gap-2 text-gray-400">
                        <span className="text-[11px] uppercase tracking-wide text-gray-500">
                          {c.category}
                        </span>
                        {c.sourceUrl && (
                          <a href={c.sourceUrl} target="_blank" className="shrink-0 text-accent-soft hover:underline">
                            source ↗
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {company.sources.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Sources
                </h3>
                <ul className="space-y-1 text-sm">
                  {company.sources.map((s) => (
                    <li key={s}>
                      <a href={s} target="_blank" className="text-accent-soft hover:underline">
                        {new URL(s).hostname} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <button
              onClick={addToPipeline}
              disabled={adding || added || company.pipelineStage != null}
              className="interactive w-full rounded-xl border border-accent/40 bg-accent/15 py-2.5 text-sm font-medium text-accent-soft hover:bg-accent/25 disabled:cursor-default disabled:border-emerald-400/30 disabled:bg-emerald-400/10 disabled:text-emerald-300"
            >
              {company.pipelineStage != null
                ? `In pipeline — ${company.pipelineStage}`
                : added
                ? "✓ Added to Opportunities"
                : adding
                ? "Adding…"
                : "Add to Opportunities"}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className={valueClass ?? "text-gray-200"}>{value}</span>
    </div>
  );
}
