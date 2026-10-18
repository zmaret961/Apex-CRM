"use client";

import { useEffect, useState } from "react";
import type { ResearchBrief } from "@/lib/types";
import StatusPill from "./StatusPill";
import CompanyDrawer from "./CompanyDrawer";
import clsx from "clsx";

const CATEGORY_TONE: Record<string, string> = {
  "Devin mention": "text-emerald-300 border-emerald-300/30 bg-emerald-400/10",
  "Competitor mention": "text-rose-300 border-rose-300/30 bg-rose-400/10",
  "AI tooling": "text-violet-300 border-violet-300/30 bg-violet-400/10",
  "Job posting": "text-amber-300 border-amber-300/30 bg-amber-400/10",
  "Funding/leadership": "text-cyan-300 border-cyan-300/30 bg-cyan-400/10",
  "Engineering signal": "text-sky-300 border-sky-300/30 bg-sky-400/10",
  Overview: "text-gray-300 border-white/15 bg-white/5",
};

export default function ResearchFeed({ initialBriefs }: { initialBriefs: ResearchBrief[] }) {
  const [briefs, setBriefs] = useState(initialBriefs);
  const [openId, setOpenId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [promoting, setPromoting] = useState<number | null>(null);

  // Poll so new briefs appear while a sweep is running
  useEffect(() => {
    const t = setInterval(() => {
      if (document.hidden) return;
      fetch("/api/research").then((r) => r.json()).then(setBriefs);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  async function promote(b: ResearchBrief) {
    setPromoting(b.companyId);
    await fetch(`/api/companies/${b.companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: "Researched" }),
    });
    setBriefs((prev) =>
      prev.map((x) => (x.companyId === b.companyId ? { ...x, companyPipelineStage: "Researched" } : x))
    );
    setPromoting(null);
  }

  const categories = [...new Set(briefs.flatMap((b) => b.claims.map((c) => c.category)))];
  const filtered = briefs.filter(
    (b) =>
      (!category || b.claims.some((c) => c.category === category)) &&
      (!q || (b.companyName ?? "").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="glass flex flex-wrap items-center gap-2 rounded-2xl px-4 py-2.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by company…"
          className="interactive w-48 rounded-lg border border-white/10 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-gray-600 focus:border-accent/50"
        />
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(category === c ? "" : c)}
            className={clsx(
              "interactive rounded-full border px-3 py-1 text-xs",
              category === c
                ? "border-accent/50 bg-accent/15 text-white"
                : "border-white/10 text-gray-400 hover:text-gray-200"
            )}
          >
            {c}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-500">{filtered.length} briefs</span>
      </div>
      {filtered.map((b) => {
        const open = openId === b.id;
        return (
          <article key={b.id} className="glass animate-fade-up rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <button
                  onClick={() => setSelected(b.companyId)}
                  className="text-lg font-semibold text-white hover:text-accent-soft"
                >
                  {b.companyName}
                </button>
                <div className="mt-0.5 text-xs text-gray-500">
                  {new Date(b.createdAt).toLocaleString()}
                  {b.companyStatus && (
                    <span className="ml-2"><StatusPill status={b.companyStatus} /></span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <button
                  onClick={() => setOpenId(open ? null : b.id)}
                  className="interactive rounded-lg border border-white/10 px-3 py-1 text-xs text-gray-400 hover:text-white"
                >
                  {open ? "Collapse" : `${b.claims.length} claims ▾`}
                </button>
                {b.companyPipelineStage ? (
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-gray-400">
                    {b.companyPipelineStage}
                  </span>
                ) : (
                  <button
                    onClick={() => promote(b)}
                    disabled={promoting === b.companyId}
                    className="interactive rounded-lg border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-medium text-accent-soft hover:bg-accent/25 disabled:opacity-40"
                  >
                    {promoting === b.companyId ? "…" : "Add to pipeline"}
                  </button>
                )}
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">{b.whatTheyDo}</p>
            <div className="mt-3 rounded-xl border border-accent/20 bg-accent/5 p-3 text-sm leading-relaxed text-gray-200">
              <span className="font-medium text-accent-soft">Why now — </span>
              {b.whyNow}
            </div>
            {open && (
              <ul className="mt-4 space-y-2 border-t border-white/5 pt-4">
                {b.claims.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 text-sm">
                    <span
                      className={clsx(
                        "mt-0.5 shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        CATEGORY_TONE[c.category] ?? CATEGORY_TONE.Overview
                      )}
                    >
                      {c.category}
                    </span>
                    <span className="flex-1 leading-relaxed text-gray-300">{c.text}</span>
                    {c.sourceUrl && (
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        className="shrink-0 text-xs text-accent-soft hover:underline"
                      >
                        source ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
      {filtered.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center text-sm text-gray-500">
          {briefs.length === 0
            ? "No research yet — run a sweep from the Automation console."
            : "No briefs match these filters."}
        </div>
      )}
      <CompanyDrawer companyId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
