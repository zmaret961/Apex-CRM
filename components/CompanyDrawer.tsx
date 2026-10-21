"use client";

import { useEffect, useRef, useState } from "react";
import type { AccountIntel, Company, CompanyEvent, Contact, Exec, FocusItem, PipelineStage, ResearchBrief, Sequence } from "@/lib/types";
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [execs, setExecs] = useState<Exec[]>([]);
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [intel, setIntel] = useState<AccountIntel[]>([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactDraft, setContactDraft] = useState({ name: "", role: "", url: "" });
  const [savingContact, setSavingContact] = useState(false);
  const [showRoi, setShowRoi] = useState(false);
  const [engCount, setEngCount] = useState(0);
  const [avgComp, setAvgComp] = useState(185000);
  const [hoursSaved, setHoursSaved] = useState(5);
  const [outreach, setOutreach] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [copied, setCopied] = useState(false);
  const [suggestion, setSuggestion] = useState<FocusItem | null>(null);
  const [acting, setActing] = useState(false);
  const [editingValue, setEditingValue] = useState(false);
  const [valueDraft, setValueDraft] = useState("");
  const [removedStage, setRemovedStage] = useState<PipelineStage | null>(null);
  const [advancedFrom, setAdvancedFrom] = useState<PipelineStage | null>(null);
  const [restoring, setRestoring] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (companyId == null) {
      setCompany(null);
      return;
    }
    setAdded(false);
    setRemovedStage(null);
    setAdvancedFrom(null);
    setSequence(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    fetch(`/api/companies/${companyId}`)
      .then((r) => r.json())
      .then((d) => {
        setCompany(d.company);
        setBriefs(d.briefs ?? []);
        setEvents(d.events ?? []);
        setContacts(d.contacts ?? []);
        setExecs(d.execs ?? []);
        setSequence(d.sequence ?? null);
        setIntel(d.intel ?? []);
      });
    fetch("/api/focus")
      .then((r) => r.json())
      .then((d) => {
        const items: FocusItem[] = d.items ?? [];
        setSuggestion(items.find((i) => i.companyId === companyId) ?? null);
      })
      .catch(() => setSuggestion(null));
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
    setContacts(d.contacts ?? []);
    setExecs(d.execs ?? []);
    setSequence(d.sequence ?? null);
    setIntel(d.intel ?? []);
  }

  function draftOutreach() {
    if (!company) return;
    const champion = contacts.find((c) => c.champion) ?? contacts[0];
    const firstName = champion ? champion.name.split(" ")[0] : "there";
    const exec = execs.find((e) => /cto|chief techn|engineering/i.test(e.role)) ?? execs[0];
    const hook =
      company.signals[0]?.text ?? briefs[0]?.whyNow ?? `${company.industry} engineering at scale`;
    const who = exec ? `${exec.name} (${exec.role})` : `your ${company.industry.toLowerCase()} eng org`;
    const estEng = engCount || Math.max(50, Math.round((company.employees || 500) * 0.2));
    const est = fmtMoney(roiValue(estEng, avgComp, hoursSaved));
    const rival = intel[0];
    const diffLine = rival
      ? `If ${rival.tool} is in the eval too — the honest difference: copilots and editors speed up keystrokes; Devin closes whole tickets end-to-end and opens the PR for review. Different category, not a bake-off.`
      : null;
    const text = [
      `Subject: ${company.name} — more eng output without more headcount`,
      ``,
      `Hi ${firstName},`,
      ``,
      `${hook} — which is why I thought of ${company.name}. ${who} is exactly who we built Devin for: an autonomous software engineer that takes scoped tickets end-to-end (PRs, migrations, test fixes) so senior engineers stay on roadmap work.`,
      ``,
      ...(diffLine ? [diffLine, ``] : []),
      `Back of the envelope for ~${estEng.toLocaleString()} engineers: roughly ${est} a year in shipped-work capacity back. Happy to walk through the math.`,
      ``,
      `NYC customers like Goldman Sachs run it on real backlog today. Every claim I send cites a source — happy to share the enterprise playbook.`,
      ``,
      `20 minutes this week?`,
      ``,
      `Zachary`,
    ].join("\n");
    setOutreach(text);
  }

  async function copyOutreach() {
    if (!outreach) return;
    try {
      await navigator.clipboard.writeText(outreach);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = outreach;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveContact() {
    if (!company || !contactDraft.name.trim()) return;
    setSavingContact(true);
    await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact: contactDraft }),
    });
    const d = await fetch(`/api/companies/${company.id}`).then((r) => r.json());
    setContacts(d.contacts ?? []);
    setEvents(d.events ?? []);
    setContactDraft({ name: "", role: "", url: "" });
    setShowContactForm(false);
    setSavingContact(false);
  }

  async function removeContact(id: number) {
    if (!company) return;
    await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteContact: id }),
    });
    setContacts((cs) => cs.filter((c) => c.id !== id));
  }

  async function toggleChampion(c: Contact) {
    if (!company) return;
    setContacts((cs) =>
      cs
        .map((x) => (x.id === c.id ? { ...x, champion: c.champion ? 0 : 1 } : x))
        .sort((a, b) => b.champion - a.champion || a.id - b.id)
    );
    await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ championContact: c.id, champion: !c.champion }),
    });
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
    if (!company || company.pipelineStage == null) return;
    const prev = company.pipelineStage;
    await patch({ pipelineStage: null });
    setRemovedStage(prev);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setRemovedStage(null), 6000);
    onAdded?.();
  }

  async function undoRemove() {
    if (!removedStage || restoring) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const stage = removedStage;
    setRestoring(true);
    await patch({ pipelineStage: stage });
    setRestoring(false);
    setRemovedStage(null);
    onAdded?.();
  }

  async function advanceTo(stage: PipelineStage) {
    if (!company || company.pipelineStage == null) return;
    const prev = company.pipelineStage;
    await patch({ pipelineStage: stage });
    setAdvancedFrom(prev);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setAdvancedFrom(null), 6000);
    onAdded?.();
  }

  async function undoAdvance() {
    if (!advancedFrom || restoring) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const stage = advancedFrom;
    setRestoring(true);
    await patch({ pipelineStage: stage });
    setRestoring(false);
    setAdvancedFrom(null);
    onAdded?.();
  }

  async function runSuggestion() {
    if (!company || !suggestion) return;
    setActing(true);
    if (suggestion.action === "advance" && suggestion.targetStage) {
      await advanceTo(suggestion.targetStage);
    } else {
      await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "research", companyId: company.id }),
      });
      const d = await fetch(`/api/companies/${company.id}`).then((r) => r.json());
      setCompany(d.company);
      setBriefs(d.briefs ?? []);
      setEvents(d.events ?? []);
    }
    setSuggestion(null);
    setActing(false);
  }

  async function saveNote() {
    const text = note.trim();
    if (!text || !company) return;
    setSavingNote(true);
    await patch({ note: text });
    setNote("");
    setSavingNote(false);
  }

  async function deleteNote(eventId: number) {
    if (!company) return;
    await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteNote: eventId }),
    });
    setEvents((es) => es.filter((e) => e.id !== eventId));
  }

  async function copyOutreachBrief() {
    if (!company) return;
    const lines: string[] = [
      `# ${company.name} — outreach brief`,
      ``,
      `- Status: ${company.status}${company.pipelineStage ? ` / ${company.pipelineStage}` : ""}`,
      `- Fit score: ${company.fitScore}/100`,
      `- Industry: ${company.industry} · ${company.employees > 0 ? company.employees.toLocaleString() + " employees" : "size unconfirmed"}`,
      `- NYC office: ${company.address}`,
      `- Site: https://${company.domain}`,
      ``,
      company.description,
    ];
    if (company.signals.length > 0) {
      lines.push(``, `## Key signals`);
      for (const s of company.signals) lines.push(`- ${s.text} (${s.source})`);
    }
    const brief = briefs[0];
    if (brief) {
      lines.push(``, `## Why now`, brief.whyNow, ``, `## Evidence`);
      for (const c of brief.claims)
        lines.push(`- [${c.category}] ${c.text}${c.sourceUrl ? ` (${c.sourceUrl})` : ""}`);
    }
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const open = companyId != null;

  const researchAgeDays =
    company?.lastResearchAt == null
      ? null
      : Math.floor(
          (Date.now() -
            new Date(company.lastResearchAt.replace(" ", "T") + "Z").getTime()) /
            86400000
        );

  const stageDaysN =
    company?.pipelineStage == null || company.stageChangedAt == null
      ? null
      : Math.max(
          0,
          Math.floor(
            (Date.now() -
              new Date(company.stageChangedAt.replace(" ", "T") + "Z").getTime()) /
              86400000
          )
        );

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
                <a
                  href={`/?focus=${company.id}`}
                  className="mt-0.5 block text-xs text-gray-500 hover:text-accent-soft"
                >
                  View on map ↗
                </a>
                <a
                  href={`/call-sheet/${company.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 block text-xs text-gray-500 hover:text-accent-soft"
                >
                  Call sheet ↗
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
              <button
                onClick={copyOutreachBrief}
                className="interactive ml-auto rounded-lg border border-white/10 px-2.5 py-1 text-xs text-gray-400 hover:border-accent/40 hover:text-white"
                title="Copy a markdown outreach brief for this account"
              >
                {copied ? "Copied ✓" : "Copy brief"}
              </button>
              <button
                onClick={draftOutreach}
                className="interactive rounded-lg border border-accent/40 bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent-soft"
                title="Draft a personalized outreach email from this account's signals"
              >
                Draft outreach
              </button>
            </div>
            {outreach !== null && (
              <div className="-mt-2 animate-fade-up rounded-xl border border-accent/25 bg-accent/8 p-3.5">
                <textarea
                  value={outreach}
                  onChange={(e) => setOutreach(e.target.value)}
                  rows={14}
                  className="interactive w-full resize-y rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-[11px] leading-relaxed text-gray-300 outline-none focus:border-accent/50"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={copyOutreach}
                    className="interactive rounded-lg border border-accent/40 bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent-soft"
                  >
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                  <button
                    onClick={() => setOutreach(null)}
                    className="interactive rounded-lg border border-white/10 px-2.5 py-1 text-xs text-gray-400"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
            <p className="-mt-3 text-[11px] text-gray-500">{fitRationale(company)}</p>

            {suggestion && (
              <div className="animate-fade-up rounded-xl border border-accent/25 bg-accent/8 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-accent-soft">
                    Suggested next
                  </div>
                  <button
                    onClick={runSuggestion}
                    disabled={acting}
                    className="interactive rounded-lg border border-accent/40 bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent-soft"
                  >
                    {acting ? "Working…" : suggestion.label}
                  </button>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-400">
                  {suggestion.reason}
                </p>
              </div>
            )}

            <p className="text-sm leading-relaxed text-gray-300">{company.description}</p>

            <section>
              <button
                onClick={() => {
                  setShowRoi(!showRoi);
                  if (!engCount) setEngCount(Math.max(50, Math.round((company.employees || 500) * 0.2)));
                }}
                className="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-300"
              >
                ROI estimate {showRoi ? "▾" : "▸"}
                {!showRoi && (
                  <span className="normal-case text-emerald-300/80">
                    ~{fmtMoney(roiValue(engCount || Math.max(50, Math.round((company.employees || 500) * 0.2)), avgComp, hoursSaved))}/yr
                  </span>
                )}
              </button>
              {showRoi && (
                <div className="glass animate-fade-up space-y-3 rounded-xl p-4 text-sm">
                  <RoiRow label="Engineers" value={engCount} set={setEngCount} min={10} max={20000} step={10} fmt={(v) => v.toLocaleString()} />
                  <RoiRow label="Avg fully-loaded comp" value={avgComp} set={setAvgComp} min={80000} max={400000} step={5000} fmt={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <RoiRow label="Hours saved / dev / wk" value={hoursSaved} set={setHoursSaved} min={1} max={15} step={0.5} fmt={(v) => `${v}h`} />
                  <div className="border-t border-white/10 pt-2 text-right">
                    <p className="text-lg font-semibold text-emerald-300">
                      {fmtMoney(roiValue(engCount, avgComp, hoursSaved))}/yr
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {(engCount * hoursSaved * 48).toLocaleString()} dev-hours back · estimate, not a quote
                    </p>
                  </div>
                </div>
              )}
            </section>

            {execs.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Leadership
                </h3>
                <div className="glass rounded-xl p-4">
                  <OrgNode exec={execs[0]} company={company.name} head />
                  {execs.length > 1 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                      {execs.slice(1).map((e) => (
                        <OrgNode key={e.id} exec={e} company={company.name} />
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-[10px] text-gray-600">
                    Public leadership — verify before outreach.
                  </p>
                </div>
              </section>
            )}

            {intel.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  You&apos;re up against
                </h3>
                <div className="space-y-2">
                  {intel.map((t) => (
                    <div key={t.tool} className="glass rounded-xl p-3">
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-rose-300 hover:underline"
                      >
                        {t.tool}
                      </a>
                      <ul className="mt-1.5 space-y-1">
                        {t.evidence.map((e, i) => (
                          <li key={i} className="text-xs leading-relaxed text-gray-500">
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Outreach sequence
                </h3>
                {sequence && (
                  <button
                    onClick={() => patch({ endSequence: true })}
                    title="End and remove this sequence"
                    className="interactive rounded px-1.5 py-0.5 text-[11px] text-gray-600 hover:text-gray-300"
                  >
                    End
                  </button>
                )}
              </div>
              {sequence ? (
                <div className="glass rounded-xl p-3">
                  <div className="mb-2 flex items-center justify-between px-1 text-[11px] text-gray-500">
                    <span>
                      {sequence.steps.filter((s) => s.done).length}/{sequence.steps.length} touches done
                    </span>
                    <span>started {new Date(sequence.startedAt.replace(" ", "T") + "Z").toLocaleDateString()}</span>
                  </div>
                  <ol className="space-y-1">
                    {sequence.steps.map((s, i) => {
                      const due = new Date(
                        new Date(sequence.startedAt.replace(" ", "T") + "Z").getTime() +
                          s.day * 86400000
                      );
                      return (
                        <li key={i}>
                          <label className="interactive flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-white/[0.03]">
                            <input
                              type="checkbox"
                              checked={s.done}
                              onChange={(e) =>
                                patch({ sequenceStep: { index: i, done: e.target.checked } })
                              }
                              className="shrink-0 accent-accent"
                            />
                            <span className="w-16 shrink-0 text-[11px] text-gray-600">
                              Day {s.day} · {due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                            <span className={s.done ? "text-gray-600 line-through" : "text-gray-300"}>
                              {s.label}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : (
                <button
                  onClick={() => patch({ startSequence: true })}
                  className="interactive w-full rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-left text-sm text-gray-400 hover:border-accent/40 hover:text-gray-200"
                >
                  Start a 5-touch sequence — email → LinkedIn → follow-up → value-add → break-up
                </button>
              )}
            </section>

            <div className="glass space-y-2 rounded-xl p-4 text-sm">
              <Row label="HQ / NYC office" value={company.address} />
              <Row
                label="Employees"
                value={company.employees > 0 ? company.employees.toLocaleString() : "unconfirmed"}
              />
              <Row label="Industry" value={company.industry} />
              <Row label="Funding" value={company.funding} />
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Deal value</span>
                {editingValue ? (
                  <input
                    autoFocus
                    value={valueDraft}
                    onChange={(e) => setValueDraft(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        const v = valueDraft.trim();
                        await patch({ estimatedValue: v === "" ? null : v });
                        setEditingValue(false);
                      } else if (e.key === "Escape") {
                        setEditingValue(false);
                      }
                    }}
                    onBlur={async () => {
                      const v = valueDraft.trim();
                      await patch({ estimatedValue: v === "" ? null : v });
                      setEditingValue(false);
                    }}
                    placeholder="e.g. $120k est."
                    className="w-40 rounded-md border border-accent/40 bg-transparent px-2 py-0.5 text-right text-sm text-white outline-none placeholder:text-gray-600"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setValueDraft(company.estimatedValue ?? "");
                      setEditingValue(true);
                    }}
                    title="Click to set a deal estimate"
                    className={`interactive -my-1 -mx-1 rounded px-2 py-1 text-right ${
                      company.estimatedValue ? "text-emerald-300" : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {company.estimatedValue ?? "unconfirmed — click to set"}
                  </button>
                )}
              </div>
              {stageDaysN !== null && (
                <Row
                  label="In stage"
                  value={`${company.pipelineStage} · ${stageDaysN === 0 ? "moved today" : `${stageDaysN}d`}`}
                  valueClass={stageDaysN > 30 ? "text-amber-300" : undefined}
                />
              )}
              <Row
                label="Last research"
                value={
                  company.lastResearchAt
                    ? `${new Date(company.lastResearchAt.replace(" ", "T") + "Z").toLocaleDateString()}${
                        researchAgeDays !== null && researchAgeDays > 30 ? " · stale" : ""
                      }`
                    : "Never — needs a brief"
                }
                valueClass={
                  researchAgeDays === null || researchAgeDays > 30 ? "text-amber-300" : undefined
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
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Contacts
                </h3>
                {!showContactForm && (
                  <button
                    onClick={() => setShowContactForm(true)}
                    className="interactive rounded-lg border border-white/10 px-2 py-0.5 text-xs text-gray-400 hover:text-white"
                  >
                    + Contact
                  </button>
                )}
              </div>
              <div className="glass space-y-2 rounded-xl p-4">
                {contacts.length === 0 && !showContactForm && (
                  <p className="text-sm text-gray-600">
                    No people tracked — add the champion you&apos;re selling through.
                  </p>
                )}
                {contacts.map((c) => (
                  <div key={c.id} className="group flex items-start gap-2 text-sm">
                    <button
                      onClick={() => toggleChampion(c)}
                      title={c.champion ? "Champion — click to unmark" : "Mark as champion"}
                      className={`interactive mt-0.5 shrink-0 rounded px-1 ${
                        c.champion ? "text-amber-300" : "text-gray-600 hover:text-amber-200"
                      }`}
                    >
                      ★
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-200">
                        {c.name}
                        {c.champion ? (
                          <span className="ml-1.5 text-[10px] uppercase tracking-wide text-amber-300/80">
                            champion
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-gray-500">{c.role || "role unknown"}</p>
                      {c.url && (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-accent-soft hover:underline"
                        >
                          profile ↗
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => removeContact(c.id)}
                      title="Remove contact"
                      className="interactive shrink-0 rounded px-1.5 py-0.5 text-xs text-gray-600 opacity-0 transition-opacity hover:text-rose-300 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {showContactForm && (
                  <div className="space-y-2 border-t border-white/5 pt-2">
                    <input
                      autoFocus
                      value={contactDraft.name}
                      onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveContact();
                        if (e.key === "Escape") setShowContactForm(false);
                      }}
                      maxLength={120}
                      placeholder="Name — e.g. VP of Engineering"
                      className="interactive w-full rounded-lg border border-white/10 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-gray-600 focus:border-accent/50"
                    />
                    <input
                      value={contactDraft.role}
                      onChange={(e) => setContactDraft({ ...contactDraft, role: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && saveContact()}
                      maxLength={160}
                      placeholder="Role / title (optional)"
                      className="interactive w-full rounded-lg border border-white/10 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-gray-600 focus:border-accent/50"
                    />
                    <input
                      value={contactDraft.url}
                      onChange={(e) => setContactDraft({ ...contactDraft, url: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && saveContact()}
                      maxLength={500}
                      placeholder="LinkedIn or profile URL (optional)"
                      className="interactive w-full rounded-lg border border-white/10 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-gray-600 focus:border-accent/50"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveContact}
                        disabled={!contactDraft.name.trim() || savingContact}
                        className="interactive rounded-lg border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-medium text-accent-soft disabled:opacity-40"
                      >
                        {savingContact ? "Saving…" : "Save contact"}
                      </button>
                      <button
                        onClick={() => setShowContactForm(false)}
                        className="interactive rounded-lg border border-white/10 px-3 py-1 text-xs text-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Activity
              </h3>
              <div className="glass max-h-52 space-y-2 overflow-y-auto rounded-xl p-4">
                {events.length === 0 && (
                  <p className="text-sm text-gray-600">No activity yet.</p>
                )}
                {events.map((e) => (
                  <div key={e.id} className="group flex gap-3 text-sm">
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
                    {e.type === "note" && (
                      <button
                        onClick={() => deleteNote(e.id)}
                        title="Delete note"
                        className="interactive -my-1 shrink-0 self-start rounded px-1.5 py-0.5 text-xs text-gray-600 opacity-0 transition-opacity hover:text-rose-300 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveNote()}
                  maxLength={2000}
                  placeholder="Add a note — call outcome, next step…"
                  className="interactive flex-1 rounded-lg border border-white/10 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-gray-600 focus:border-accent/50"
                />
                {note.length > 1800 && (
                  <span className="text-[10px] tabular-nums text-amber-300/80">
                    {2000 - note.length}
                  </span>
                )}
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

            {company.status === "competitor" && company.pipelineStage == null ? (
              <div className="w-full rounded-xl border border-rose-400/20 bg-rose-400/5 py-2.5 text-center text-sm text-rose-300/80">
                Competitor — intel only
              </div>
            ) : (
            <button
              onClick={addToPipeline}
              disabled={adding || added || company.pipelineStage != null}
              className="interactive w-full rounded-xl border border-accent/40 bg-accent/15 py-2.5 text-sm font-medium text-accent-soft hover:bg-accent/25 disabled:cursor-default disabled:border-emerald-400/30 disabled:bg-emerald-400/10 disabled:text-emerald-300"
            >
              {company.pipelineStage != null
                ? `In pipeline — ${company.pipelineStage}${
                    company.stageChangedAt
                      ? ` · ${Math.max(0, Math.floor((Date.now() - new Date(company.stageChangedAt + "Z").getTime()) / 86400000))}d`
                      : ""
                  }`
                : added
                ? "✓ Added to Opportunities"
                : adding
                ? "Adding…"
                : "Add to Opportunities"}
            </button>
            )}
            {company.pipelineStage != null && nextStage(company.pipelineStage) && (
              <button
                onClick={() => advanceTo(nextStage(company.pipelineStage!)!)}
                className="interactive -mt-3 w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-400/20"
              >
                Advance → {nextStage(company.pipelineStage)}
              </button>
            )}
            {advancedFrom != null && company.pipelineStage != null && (
              <button
                onClick={undoAdvance}
                disabled={restoring}
                className="interactive -mt-3 w-full rounded-xl border border-amber-400/30 bg-amber-400/10 py-2 text-xs font-medium text-amber-300 hover:bg-amber-400/20"
              >
                {restoring ? "Restoring…" : `Moved to ${company.pipelineStage} — Undo (was ${advancedFrom})`}
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
            {company.pipelineStage == null && removedStage != null && (
              <button
                onClick={undoRemove}
                disabled={restoring}
                className="interactive -mt-3 w-full rounded-xl border border-amber-400/30 bg-amber-400/10 py-2 text-xs font-medium text-amber-300 hover:bg-amber-400/20"
              >
                {restoring ? "Restoring…" : `Removed from pipeline — Undo (was ${removedStage})`}
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

const TARGET_VERTICALS = new Set([
  "Finance", "Fintech", "Data Infrastructure", "Dev Tools", "Security", "AI / ML", "Enterprise Software",
]);

// Explains the fit score using only fields already on the record — a
// derived rationale, not a factual claim, so no citation is needed.
function fitRationale(c: Company): string {
  const parts: string[] = [];
  if (c.employees >= 10000) parts.push("very large eng org");
  else if (c.employees >= 1000) parts.push("large eng org");
  if (TARGET_VERTICALS.has(c.industry)) parts.push("target vertical");
  if (c.signals.length >= 3) parts.push("rich public signals");
  if (c.fitScore >= 85) parts.push("top-tier Devin fit");
  else if (c.fitScore >= 60) parts.push("solid Devin fit");
  return parts.length ? `Why ${c.fitScore}: ${parts.join(" · ")}` : "Limited public signals — fit is provisional.";
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

function fmtMoney(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
}

// engCount * hoursSaved/wk * 48 wk * hourly rate (comp / 2080h)
function roiValue(engCount: number, avgComp: number, hoursSaved: number): number {
  return engCount * hoursSaved * 48 * (avgComp / 2080);
}

function RoiRow({
  label,
  value,
  set,
  min,
  max,
  step,
  fmt,
}: {
  label: string;
  value: number;
  set: (v: number) => void;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-gray-500">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="interactive h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-soft"
      />
      <span className="w-16 shrink-0 text-right text-gray-200 tabular-nums">{fmt(value)}</span>
    </label>
  );
}

function linkedinSearch(name: string, company: string): string {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
    `${name} ${company}`
  )}`;
}

function OrgNode({ exec, company, head }: { exec: Exec; company: string; head?: boolean }) {
  return (
    <a
      href={linkedinSearch(exec.name, company)}
      target="_blank"
      rel="noreferrer"
      title={`${exec.name} — ${exec.role} · find on LinkedIn`}
      className={`interactive block rounded-lg border p-2.5 ${
        head
          ? "border-accent/30 bg-accent/10 text-center"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p className={`font-medium text-white ${head ? "text-sm" : "text-xs"}`}>{exec.name}</p>
      <p className={`${head ? "text-xs" : "text-[11px]"} text-gray-400`}>{exec.role}</p>
    </a>
  );
}
