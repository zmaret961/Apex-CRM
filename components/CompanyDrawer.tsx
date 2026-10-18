"use client";

import { useEffect, useState } from "react";
import type { Company, CompanyEvent, PipelineStage, ResearchBrief } from "@/lib/types";
import { PIPELINE_STAGES } from "@/lib/types";
import StatusPill from "./StatusPill";
import FitScore from "./FitScore";

interface Props {
  companyId: number | null;
  onClose: () => void;
  onAdded?: () => void;
}

const EVENT_TONE: Record<CompanyEvent["type"], string> = {
  pipeline: "text-accent-soft",
  research: "text-violet-300",
  note: "text-amber-300",
  status: "text-emerald-300",
  import: "text-cyan-300",
};

const EVENT_LABEL: Record<CompanyEvent["type"], string> = {
  pipeline: "Pipeline",
  research: "Research",
  note: "Note",
  status: "Status",
  import: "Import",
};

export default function CompanyDrawer({ companyId, onClose, onAdded }: Props) {
  const [company, setCompany] = useState<Company | null>(null);
  const [briefs, setBriefs] = useState<ResearchBrief[]>([]);
  const [events, setEvents] = useState<CompanyEvent[]>([]);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

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
        setEvents(d.events ?? []);
      });
  }, [companyId]);

  // Esc closes the drawer.
  useEffect(() => {
    if (companyId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [companyId, onClose]);

  async function patch(body: Record<string, unknown>) {
    if (!company) return;
    await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await fetch(`/api/companies/${company.id}`).then((r) => r.json());
    setCompany(d.company);
    setEvents(d.events ?? []);
  }

  async function addToPipeline() {
    if (!company) return;
    setAdding(true);
    await patch({ pipelineStage: "Identified" });
    setAdding(false);
    setAdded(true);
    onAdded?.();
  }

  async function removeFromPipeline() {
    await patch({ pipelineStage: null });
    onAdded?.();
  }

  async function saveNote() {
    const text = note.trim();
    if (!text || !company) return;
    setSavingNote(true);
    await patch({ note: text });
    setNote("");
    setSavingNote(false);
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
                  rel="noreferrer"
                  className="text-sm text-accent-soft hover:underline"
                >
                  {company.domain} ↗
                </a>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
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
              <Row
                label="Deal value"
                value={company.estimatedValue ?? "unconfirmed"}
                valueClass={company.estimatedValue ? "text-emerald-300" : "text-gray-500"}
              />
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
                        rel="noreferrer"
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
                          <a
                            href={c.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 text-accent-soft hover:underline"
                          >
                            source ↗
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Activity
              </h3>
              <div className="glass max-h-52 space-y-2 overflow-y-auto rounded-xl p-4">
                {events.length === 0 && (
                  <p className="text-sm text-gray-600">No activity yet.</p>
                )}
                {events.map((e) => (
                  <div key={e.id} className="flex gap-3 text-sm">
                    <span
                      className={`mt-0.5 shrink-0 text-[10px] font-medium uppercase tracking-wide ${EVENT_TONE[e.type]}`}
                    >
                      {EVENT_LABEL[e.type]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug text-gray-300">{e.text}</p>
                      <p className="text-[11px] text-gray-600">
                        {new Date(e.ts + "Z").toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveNote()}
                  placeholder="Add a note — call outcome, next step…"
                  className="interactive flex-1 rounded-lg border border-white/10 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-gray-600 focus:border-accent/50"
                />
                <button
                  onClick={saveNote}
                  disabled={!note.trim() || savingNote}
                  className="interactive rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-300 hover:text-white disabled:opacity-40"
                >
                  {savingNote ? "…" : "Save"}
                </button>
              </div>
            </section>

            {company.sources.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Sources
                </h3>
                <ul className="space-y-1 text-sm">
                  {company.sources.map((s) => (
                    <li key={s}>
                      <a
                        href={s}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent-soft hover:underline"
                      >
                        {hostname(s)} ↗
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
            {company.pipelineStage != null && nextStage(company.pipelineStage) && (
              <button
                onClick={() => patch({ pipelineStage: nextStage(company.pipelineStage!) })}
                className="interactive -mt-3 w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-400/20"
              >
                Advance → {nextStage(company.pipelineStage)}
              </button>
            )}
            {company.pipelineStage != null && (
              <button
                onClick={removeFromPipeline}
                className="interactive -mt-3 w-full rounded-xl border border-white/10 py-2 text-xs text-gray-500 hover:border-rose-400/30 hover:text-rose-300"
              >
                Remove from pipeline
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

function nextStage(stage: PipelineStage): PipelineStage | null {
  const i = PIPELINE_STAGES.indexOf(stage);
  if (i < 0 || stage === "Closed Won" || stage === "Closed Lost") return null;
  return PIPELINE_STAGES[i + 1];
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-gray-500">{label}</span>
      <span className={`${valueClass ?? "text-gray-200"} text-right`}>{value}</span>
    </div>
  );
}
