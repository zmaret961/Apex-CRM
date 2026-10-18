"use client";

import { useEffect, useState } from "react";
import type { Company } from "@/lib/types";
import StatusPill from "./StatusPill";
import FitScore from "./FitScore";
import CompanyDrawer from "./CompanyDrawer";

const INDUSTRIES = [
  "Finance", "Fintech", "Crypto", "Data Infrastructure", "Dev Tools",
  "Enterprise Software", "AI / ML", "Security", "Media", "Consumer",
  "Healthcare", "Real Estate", "Big Tech",
];

export default function AccountsList() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<"fit" | "name" | "employees">("fit");
  const [selected, setSelected] = useState<number | null>(null);

  // Deep link: /accounts?open=<id> opens the shared company drawer.
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("open"));
    if (id) setSelected(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (industry) p.set("industry", industry);
      if (status) p.set("status", status);
      fetch(`/api/companies?${p}`)
        .then((r) => r.json())
        .then((list: Company[]) => {
          if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
          else if (sort === "employees") list.sort((a, b) => b.employees - a.employees);
          setCompanies(list);
        });
    }, 180);
    return () => clearTimeout(t);
  }, [q, industry, status, sort]);

  return (
    <>
      <div className="glass mb-5 flex flex-wrap items-center gap-2 rounded-2xl px-4 py-2.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies…"
          className="interactive w-56 rounded-lg border border-white/10 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-gray-600 focus:border-accent/50"
        />
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="interactive rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-sm text-gray-300 [&>option]:bg-base-900"
        >
          <option value="">All industries</option>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="interactive rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-sm text-gray-300 [&>option]:bg-base-900"
        >
          <option value="">All statuses</option>
          <option value="customer">Customers</option>
          <option value="prospect">Prospects</option>
          <option value="researched">Researched</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="interactive rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-sm text-gray-300 [&>option]:bg-base-900"
          aria-label="Sort"
        >
          <option value="fit">Sort: fit score</option>
          <option value="name">Sort: name</option>
          <option value="employees">Sort: size</option>
        </select>
        <span className="ml-auto text-xs text-gray-500">{companies.length} accounts</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {companies.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className="glass interactive group rounded-2xl p-4 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-white group-hover:text-accent-soft">
                  {c.name}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {c.industry} · {c.employees.toLocaleString()} employees
                </div>
              </div>
              <FitScore score={c.fitScore} />
            </div>
            <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-gray-400">
              {c.description}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <StatusPill status={c.status} />
              <span className="text-[11px] text-gray-600">
                {c.pipelineStage ? c.pipelineStage : c.funding}
              </span>
            </div>
          </button>
        ))}
      </div>
      {companies.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center text-sm text-gray-500">
          No accounts match these filters.
        </div>
      )}
      <CompanyDrawer companyId={selected} onClose={() => setSelected(null)} />
    </>
  );
}
