"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PersonRow } from "@/lib/types";
import CompanyDrawer from "./CompanyDrawer";
import clsx from "clsx";

function touchLabel(lastTouchAt: string | null) {
  if (!lastTouchAt) return { text: "never touched", cold: true };
  const d = Math.max(
    0,
    Math.floor((Date.now() - new Date(lastTouchAt.replace(" ", "T") + "Z").getTime()) / 86400000)
  );
  return {
    text: d === 0 ? "touched today" : d === 1 ? "touched yesterday" : `touched ${d}d ago`,
    cold: d > 14,
  };
}

export default function PeopleList() {
  const searchParams = useSearchParams();
  const [people, setPeople] = useState<PersonRow[] | null>(null);
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [champOnly, setChampOnly] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);

  function load() {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((d) => setPeople(Array.isArray(d) ? d : []))
      .catch(() => setPeople([]));
  }

  useEffect(load, []);

  // Save a sourced exec to your contacts in one click — then the drawer
  // can star them as champion, add their LinkedIn, attach notes.
  async function save(p: PersonRow) {
    setSaving(p.id);
    await fetch(`/api/companies/${p.companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact: { name: p.name, role: p.role } }),
    });
    setSaving(null);
    load();
  }

  if (!people)
    return <div className="glass rounded-2xl p-8 text-center text-sm text-gray-500">Loading…</div>;

  const lq = q.trim().toLowerCase();
  const rows = people.filter(
    (p) =>
      (!champOnly || p.champion === 1) &&
      (!lq ||
        p.name.toLowerCase().includes(lq) ||
        p.role.toLowerCase().includes(lq) ||
        p.companyName.toLowerCase().includes(lq))
  );
  const champions = people.filter((p) => p.champion === 1).length;
  const saved = people.filter((p) => p.saved).length;
  const accounts = new Set(people.map((p) => p.companyId)).size;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, role, or account…"
          className="interactive w-64 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-accent/50 focus:outline-none"
        />
        <button
          onClick={() => setChampOnly((v) => !v)}
          className={clsx(
            "interactive rounded-lg border px-2.5 py-1.5 text-[11px] font-medium",
            champOnly
              ? "border-amber-300/40 bg-amber-400/15 text-amber-300"
              : "border-white/10 bg-white/[0.03] text-gray-400 hover:text-gray-200"
          )}
        >
          ★ champions only
        </button>
        <span className="ml-auto text-[11px] text-gray-500">
          {people.length} people · {saved} saved · {champions} champion
          {champions === 1 ? "" : "s"} · {accounts} account{accounts === 1 ? "" : "s"}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-gray-500">
          {people.length === 0
            ? "No people yet — researched accounts contribute their sourced execs here."
            : "No people match."}
        </div>
      ) : (
        <div className="glass divide-y divide-white/5 rounded-2xl">
          {rows.map((p) => {
            const touch = touchLabel(p.lastTouchAt);
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span
                  className={clsx("w-4 shrink-0 text-center", p.champion ? "text-amber-300" : "text-gray-700")}
                  title={p.champion ? "Champion" : p.saved ? "In your contacts" : ""}
                >
                  {p.champion ? "★" : p.saved ? "●" : "·"}
                </span>
                <div className="min-w-0 w-48">
                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-medium text-white hover:text-accent-soft"
                      title={p.url}
                    >
                      {p.name} ↗
                    </a>
                  ) : (
                    <span className="block truncate font-medium text-white">{p.name}</span>
                  )}
                  {p.role && <span className="block truncate text-[11px] text-gray-500">{p.role}</span>}
                </div>
                <button
                  onClick={() => setSelected(p.companyId)}
                  className="min-w-0 flex-1 truncate text-left text-gray-300 hover:text-accent-soft"
                >
                  {p.companyName}
                </button>
                <span className="hidden shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-gray-400 sm:inline">
                  {p.pipelineStage ?? "no pipeline"}
                </span>
                <span className={clsx("hidden w-28 shrink-0 text-right text-[11px] md:inline", touch.cold ? "text-amber-300/70" : "text-gray-600")}>
                  {touch.text}
                </span>
                {p.saved ? (
                  <span className="w-14 shrink-0" />
                ) : (
                  <button
                    disabled={saving === p.id}
                    onClick={() => save(p)}
                    title="Save to your contacts — then star, link, and note them in the account profile"
                    className="interactive w-14 shrink-0 rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent-soft disabled:opacity-40"
                  >
                    {saving === p.id ? "…" : "+ save"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selected !== null && (
        <CompanyDrawer companyId={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
