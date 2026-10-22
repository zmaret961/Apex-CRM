"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PIPELINE_STAGES, type Company } from "@/lib/types";
import { heat, HOT_THRESHOLD } from "@/lib/heat";
import StatusPill from "./StatusPill";
import FitScore from "./FitScore";
import CompanyDrawer from "./CompanyDrawer";

const INDUSTRIES = [
  "Finance", "Fintech", "Crypto", "Data Infrastructure", "Dev Tools",
  "Enterprise Software", "AI / ML", "Security", "Media", "Consumer",
  "Healthcare", "Real Estate", "Big Tech",
];

const FILTERS_KEY = "apex-accounts-filters";

type SortKey = "heat" | "fit" | "name" | "employees" | "touch";
const SORT_KEYS: SortKey[] = ["heat", "fit", "name", "employees", "touch"];

function loadFilters(): { q: string; industry: string; status: string; stage: string; sort: SortKey } {
  const empty = { q: "", industry: "", status: "", stage: "", sort: "heat" as const };
  try {
    const raw = JSON.parse(localStorage.getItem(FILTERS_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return empty;
    return {
      q: typeof raw.q === "string" ? raw.q : "",
      industry: typeof raw.industry === "string" ? raw.industry : "",
      status: typeof raw.status === "string" ? raw.status : "",
      stage: typeof raw.stage === "string" ? raw.stage : "",
      sort: SORT_KEYS.includes(raw.sort) ? raw.sort : "heat",
    };
  } catch {
    return empty;
  }
}

export default function AccountsList() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState("");
  const [stage, setStage] = useState("");
  const [sort, setSort] = useState<SortKey>("heat");
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkNote, setBulkNote] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" jumps to search — the standard list-page shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement;
      if (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        el.isContentEditable
      )
        return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Restore the seller's last view — pick up where you left off.
  useEffect(() => {
    const f = loadFilters();
    setQ(f.q);
    setIndustry(f.industry);
    setStatus(f.status);
    setStage(f.stage);
    setSort(f.sort);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify({ q, industry, status, stage, sort }));
    } catch { /* storage unavailable */ }
  }, [q, industry, status, stage, sort]);

  // Deep link: /accounts?open=<id> opens the shared company drawer.
  //            /accounts?add=1 opens the Add company modal (⌘K action).
  const searchParams = useSearchParams();
  const router = useRouter();
  const openId = Number(searchParams.get("open")) || null;
  useEffect(() => {
    if (openId) setSelected(openId);
    else setSelected(null);
  }, [openId]);
  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setAdding(true);
      router.replace("/accounts");
    }
  }, [searchParams, router]);

  // While the drawer is open, ↑/↓ steps through the current filtered list —
  // a seller can review a whole territory without touching the mouse.
  useEffect(() => {
    if (selected == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable) return;
      const idx = companies.findIndex((c) => c.id === selected);
      if (idx < 0) return;
      const next = e.key === "ArrowDown" ? idx + 1 : idx - 1;
      if (next < 0 || next >= companies.length) return;
      e.preventDefault();
      setSelected(companies[next].id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, companies]);

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (industry) p.set("industry", industry);
      if (status) p.set("status", status);
      if (stage) p.set("stage", stage);
      fetch(`/api/companies?${p}`)
        .then((r) => r.json())
        .then((list: Company[]) => {
          if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
          else if (sort === "employees") list.sort((a, b) => b.employees - a.employees);
          else if (sort === "heat") list.sort((a, b) => heat(b) - heat(a));
          else if (sort === "fit") list.sort((a, b) => b.fitScore - a.fitScore);
          else if (sort === "touch")
            // coldest first: never-touched accounts surface at the top
            list.sort((a, b) => (a.lastTouchAt ?? "").localeCompare(b.lastTouchAt ?? ""));
          setCompanies(list);
          setLoaded(true);
        });
    }, 180);
    return () => clearTimeout(t);
  }, [q, industry, status, stage, sort, refreshKey]);

  // Filters changed → a stale bulk selection pointing at off-list rows is a
  // footgun; clear it.
  useEffect(() => {
    setChecked(new Set());
  }, [q, industry, status, stage, sort]);

  function exportCsv(list: Company[] = companies) {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["name", "domain", "industry", "status", "pipelineStage", "fitScore", "employees", "funding", "estimatedValue", "address", "lastResearchAt"],
      ...list.map((c) => [
        c.name, c.domain, c.industry, c.status, c.pipelineStage ?? "", c.fitScore,
        c.employees, c.funding, c.estimatedValue ?? "unconfirmed", c.address,
        c.lastResearchAt ?? "",
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], {
      type: "text/csv",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "apex-accounts.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function toggleCheck(id: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCheckAll() {
    setChecked((prev) =>
      prev.size === companies.length && companies.length > 0
        ? new Set()
        : new Set(companies.map((c) => c.id))
    );
  }

  async function bulkPatch(body: Record<string, unknown>, done: string) {
    setBulkBusy(true);
    setBulkNote(null);
    const results = await Promise.all(
      [...checked].map((id) =>
        fetch(`/api/companies/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then((r) => r.ok)
      )
    );
    const ok = results.filter(Boolean).length;
    const skipped = results.length - ok;
    setBulkBusy(false);
    setBulkNote(
      `${done.replace("%d", String(ok))}${skipped ? ` · ${skipped} skipped` : ""}`
    );
    setChecked(new Set());
    setRefreshKey((k) => k + 1);
  }

  return (
    <>
      <div className="glass mb-5 flex flex-wrap items-center gap-2 rounded-2xl px-4 py-2.5">
        <input
          ref={searchRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies… ( / )"
          className="interactive w-56 rounded-lg border border-white/10 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-gray-600 focus:border-accent/50"
        />
        {(q || industry || status || stage) && (
          <button
            onClick={() => {
              setQ("");
              setIndustry("");
              setStatus("");
              setStage("");
            }}
            title="Clear all filters"
            className="interactive rounded-lg border border-white/10 px-2 py-1.5 text-xs text-gray-500 hover:border-accent/40 hover:text-gray-300"
          >
            Clear ✕
          </button>
        )}
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          aria-label="Filter by industry"
          className="interactive rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-sm text-gray-300 [&>option]:bg-base-900"
        >
          <option value="">All industries</option>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="interactive rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-sm text-gray-300 [&>option]:bg-base-900"
        >
          <option value="">All statuses</option>
          <option value="customer">Customers</option>
          <option value="prospect">Prospects</option>
          <option value="researched">Researched</option>
          <option value="competitor">Competitors</option>
        </select>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          aria-label="Filter by pipeline stage"
          className="interactive rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-sm text-gray-300 [&>option]:bg-base-900"
        >
          <option value="">All stages</option>
          <option value="open">In pipeline (open)</option>
          <option value="none">Not in pipeline</option>
          {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="interactive rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-sm text-gray-300 [&>option]:bg-base-900"
          aria-label="Sort"
        >
          <option value="heat">Sort: heat</option>
          <option value="fit">Sort: fit score</option>
          <option value="touch">Sort: last touch</option>
          <option value="name">Sort: name</option>
          <option value="employees">Sort: size</option>
        </select>
        <button
          onClick={() => exportCsv()}
          title="Download the current view as CSV"
          className="interactive rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-400 hover:border-accent/40 hover:text-white"
        >
          Export CSV
        </button>
        <button
          onClick={() => setAdding(true)}
          title="Add a company that isn't tracked yet"
          className="interactive rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent-soft hover:bg-accent/20"
        >
          + Add company
        </button>
        <label className="interactive flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-xs text-gray-400 hover:border-accent/40" title="Select every account in this view">
          <input
            type="checkbox"
            checked={companies.length > 0 && checked.size === companies.length}
            onChange={toggleCheckAll}
            className="accent-accent"
          />
          All
        </label>
        <span className="ml-auto text-xs text-gray-500">
          {companies.length} accounts
          {checked.size > 0 && <span className="text-accent-soft"> · {checked.size} selected</span>}
          {selected != null && <span className="text-gray-600"> · ↑↓ steps through profiles</span>}
        </span>
      </div>

      {loaded && companies.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center text-sm text-gray-500">
          No accounts match these filters.
        </div>
      )}
      {!loaded && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass h-28 animate-pulse rounded-2xl" />
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {companies.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className="glass interactive group relative rounded-2xl p-4 text-left"
          >
            <input
              type="checkbox"
              checked={checked.has(c.id)}
              onChange={() => toggleCheck(c.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${c.name}`}
              className={`absolute right-3 top-3 accent-accent ${
                checked.has(c.id) ? "" : "opacity-0 transition-opacity group-hover:opacity-100"
              }`}
            />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 font-medium text-white group-hover:text-accent-soft">
                  {c.name}
                  {heat(c) >= HOT_THRESHOLD && (
                    <span className="text-xs" title="Hot account — top heat tier">🔥</span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {c.industry} · {c.employees > 0 ? `${c.employees.toLocaleString()} employees` : "size unconfirmed"}
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
            <div className="mt-1.5 text-[11px]">
              {(() => {
                if (!c.lastTouchAt)
                  return <span className="text-amber-300/70">never touched</span>;
                const d = Math.max(
                  0,
                  Math.floor((Date.now() - new Date(c.lastTouchAt + "Z").getTime()) / 86400000)
                );
                return (
                  <span className={d > 14 ? "text-amber-300/70" : "text-gray-600"}>
                    touched {d === 0 ? "today" : d === 1 ? "yesterday" : `${d}d ago`}
                  </span>
                );
              })()}
            </div>
          </button>
        ))}
      </div>
      {checked.size > 0 && (
        <div className="glass-deep animate-fade-up fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-glow">
          <span className="font-medium text-white">{checked.size} selected</span>
          <button
            disabled={bulkBusy}
            onClick={() => bulkPatch({ pipelineStage: "Identified" }, "Added %d to pipeline")}
            className="interactive rounded-lg border border-accent/40 bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent-soft disabled:opacity-40"
          >
            Add to pipeline
          </button>
          <button
            disabled={bulkBusy}
            onClick={() => bulkPatch({ status: "researched" }, "Marked %d researched")}
            className="interactive rounded-lg border border-white/15 px-2.5 py-1 text-xs text-gray-300 disabled:opacity-40"
          >
            Mark researched
          </button>
          <button
            disabled={bulkBusy}
            onClick={() => exportCsv(companies.filter((c) => checked.has(c.id)))}
            className="interactive rounded-lg border border-white/15 px-2.5 py-1 text-xs text-gray-300 disabled:opacity-40"
          >
            Export CSV
          </button>
          <button
            onClick={() => setChecked(new Set())}
            className="interactive rounded-lg border border-white/10 px-2.5 py-1 text-xs text-gray-500"
          >
            Clear
          </button>
        </div>
      )}
      {bulkNote && (
        <div
          onClick={() => setBulkNote(null)}
          className="glass-deep animate-fade-up fixed bottom-6 left-1/2 z-50 -translate-x-1/2 cursor-pointer rounded-xl px-5 py-3 text-sm text-gray-300 shadow-glow"
        >
          {bulkNote}
        </div>
      )}
      <CompanyDrawer
        companyId={selected}
        onClose={() => setSelected(null)}
        onAdded={() => setRefreshKey((k) => k + 1)}
      />
      {adding && (
        <AddCompanyModal
          industries={INDUSTRIES}
          onClose={() => setAdding(false)}
          onCreated={(id) => {
            setAdding(false);
            setRefreshKey((k) => k + 1);
            setSelected(id);
          }}
        />
      )}
    </>
  );
}

function AddCompanyModal({
  industries,
  onClose,
  onCreated,
}: {
  industries: string[];
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    domain: "",
    industry: industries[0],
    address: "",
    employees: "",
    funding: "",
    fitScore: 60,
    sourceUrl: "",
    signal: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: k === "fitScore" ? Number(e.target.value) : e.target.value }));

  async function submit() {
    setSaving(true);
    setError("");
    const r = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, employees: Number(form.employees) || 0 }),
    });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) {
      setError(d.error ?? "Could not add company");
      return;
    }
    onCreated(d.id);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="glass-deep w-full max-w-md space-y-3 rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Add company"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Add company</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="interactive rounded-lg border border-white/10 px-2.5 py-1 text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name *" value={form.name} onChange={set("name")} placeholder="Acme Corp" />
          <Field label="Domain *" value={form.domain} onChange={set("domain")} placeholder="acme.com" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-gray-400">
            Industry
            <select
              value={form.industry}
              onChange={set("industry")}
              className="interactive mt-1 w-full rounded-lg border border-white/10 bg-transparent px-2.5 py-1.5 text-sm text-gray-200 [&>option]:bg-base-900"
            >
              {industries.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </label>
          <Field label="NYC address" value={form.address} onChange={set("address")} placeholder="200 Park Ave" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employees" value={form.employees} onChange={set("employees")} placeholder="5000" />
          <Field label="Funding / valuation" value={form.funding} onChange={set("funding")} placeholder="Series C" />
        </div>
        <label className="block text-xs text-gray-400">
          Fit score — <span className="text-white">{form.fitScore}</span>
          <input
            type="range" min={0} max={100} step={5} value={form.fitScore}
            onChange={set("fitScore")}
            className="mt-1 w-full accent-accent"
          />
        </label>
        <Field label="Source URL *" value={form.sourceUrl} onChange={set("sourceUrl")} placeholder="https://acme.com/about" />
        <Field label="Key signal (optional)" value={form.signal} onChange={set("signal")} placeholder="Hiring 40 platform engineers in NYC" />
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-gray-600">* required — every record cites a source</span>
          <button
            onClick={submit}
            disabled={saving || !form.name.trim() || !form.domain.trim() || !form.sourceUrl.trim()}
            className="interactive rounded-lg border border-accent/40 bg-accent/15 px-4 py-1.5 text-sm font-medium text-accent-soft hover:bg-accent/25 disabled:opacity-40"
          >
            {saving ? "Adding…" : "Add company"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs text-gray-400">
      {label}
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="interactive mt-1 w-full rounded-lg border border-white/10 bg-transparent px-2.5 py-1.5 text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-accent/50"
      />
    </label>
  );
}
