"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { Company } from "@/lib/types";
import { heat } from "@/lib/heat";
import CompanyDrawer from "./CompanyDrawer";
import FitScore from "./FitScore";
import StatusPill from "./StatusPill";

function whyHot(c: Company): string {
  if (c.pipelineStage === "Proposal") return "In proposal — push it over the line.";
  if (c.pipelineStage === "Demo Scheduled") return "Demo on the books — prep the room.";
  if (c.pipelineStage === "Engaged") return "Conversation started — keep momentum.";
  if (c.signals.length >= 2) return c.signals[0].text;
  return `Top ${c.fitScore} fit in ${c.industry} — unresearched upside.`;
}

function tier(h: number): { label: string; cls: string } {
  if (h >= 100) return { label: "🔥 Scorching", cls: "text-orange-300 border-orange-400/40 bg-orange-500/10" };
  if (h >= 85) return { label: "🔥 Hot", cls: "text-amber-300 border-amber-400/40 bg-amber-500/10" };
  return { label: "Warm", cls: "text-yellow-200/80 border-yellow-400/30 bg-yellow-500/10" };
}

export default function HotLeads() {
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await fetch("/api/companies").then((r) => r.json());
    setCompanies(data);
  }

  useEffect(() => {
    load();
  }, []);

  const leads = useMemo(() => {
    if (!companies) return null;
    return companies
      .map((c) => ({ c, h: heat(c) }))
      .filter(({ h }) => h > 0)
      .sort((a, b) => b.h - a.h)
      .slice(0, 30);
  }, [companies]);

  async function addToPipeline(c: Company) {
    setBusy(c.id);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: "Identified" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `Couldn't add ${c.name} to the pipeline.`);
        return;
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {error && (
        <div className="glass mb-4 rounded-xl border-rose-400/40 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}
      {!leads && <p className="text-sm text-gray-500">Ranking your book…</p>}
      {leads && leads.length === 0 && (
        <p className="text-sm text-gray-500">No hot leads right now — research some top-fit accounts.</p>
      )}
      {leads && leads.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {leads.map(({ c, h }) => {
            const t = tier(h);
            return (
              <div key={c.id} className="glass group rounded-2xl p-4 transition-colors hover:bg-white/[0.04]">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => setSelected(c.id)}
                    className="min-w-0 text-left text-[15px] font-semibold tracking-tight text-white hover:text-accent-soft"
                  >
                    <span className="block truncate">{c.name}</span>
                    <span className="block truncate text-xs font-normal text-gray-500">{c.domain}</span>
                  </button>
                  <span className={clsx("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium", t.cls)}>
                    {t.label}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                  <FitScore score={c.fitScore} />
                  <StatusPill status={c.status} />
                  {c.pipelineStage && (
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-sky-300">
                      {c.pipelineStage}
                    </span>
                  )}
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-400">{whyHot(c)}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => setSelected(c.id)}
                    className="interactive rounded-lg bg-white/5 px-2.5 py-1 text-xs text-gray-300 hover:text-white"
                  >
                    Open
                  </button>
                  {!c.pipelineStage && c.status !== "competitor" && c.status !== "customer" && (
                    <button
                      onClick={() => addToPipeline(c)}
                      disabled={busy === c.id}
                      className="interactive rounded-lg bg-accent-soft/10 px-2.5 py-1 text-xs font-medium text-accent-soft hover:bg-accent-soft/20 disabled:opacity-50"
                    >
                      {busy === c.id ? "Adding…" : "+ Pipeline"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <CompanyDrawer companyId={selected} onClose={() => setSelected(null)} onAdded={load} />
    </div>
  );
}
