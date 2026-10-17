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

  // Poll so new briefs appear while a sweep is running
  useEffect(() => {
    const t = setInterval(() => {
      fetch("/api/research").then((r) => r.json()).then(setBriefs);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-4">
      {briefs.map((b) => {
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
              <button
                onClick={() => setOpenId(open ? null : b.id)}
                className="interactive rounded-lg border border-white/10 px-3 py-1 text-xs text-gray-400 hover:text-white"
              >
                {open ? "Collapse" : `${b.claims.length} claims ▾`}
              </button>
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
      {briefs.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center text-sm text-gray-500">
          No research yet — run a sweep from the Automation console.
        </div>
      )}
      <CompanyDrawer companyId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
