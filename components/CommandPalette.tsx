"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Company, SearchHit } from "@/lib/types";
import StatusPill from "./StatusPill";

interface Action {
  id: string;
  kind: "nav" | "action" | "company" | "research";
  label: string;
  hint?: string;
  kindLabel?: string;
  run: () => void;
}

const NAV: { id: string; label: string; href: string; key: string }[] = [
  { id: "nav-map", label: "Go to Map", href: "/", key: "m" },
  { id: "nav-focus", label: "Go to Focus", href: "/focus", key: "f" },
  { id: "nav-hot", label: "Go to Hot Leads", href: "/hot-leads", key: "h" },
  { id: "nav-cards", label: "Go to Battlecards", href: "/battlecards", key: "b" },
  { id: "nav-opps", label: "Go to Opportunities", href: "/opportunities", key: "o" },
  { id: "nav-accounts", label: "Go to Accounts", href: "/accounts", key: "a" },
  { id: "nav-people", label: "Go to People", href: "/people", key: "p" },
  { id: "nav-research", label: "Go to Research", href: "/research", key: "r" },
  { id: "nav-automation", label: "Go to Automation", href: "/automation", key: "u" },
  { id: "nav-integrations", label: "Go to Integrations", href: "/integrations", key: "i" },
];

function exportCompaniesCsv(companies: Company[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["name", "domain", "industry", "status", "pipelineStage", "fitScore", "employees", "funding", "estimatedValue", "address"],
    ...companies.map((c) => [
      c.name, c.domain, c.industry, c.status, c.pipelineStage ?? "", c.fitScore,
      c.employees, c.funding, c.estimatedValue ?? "unconfirmed", c.address,
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

function isTypingTarget(t: EventTarget | null): boolean {
  return (
    t instanceof HTMLElement &&
    (t.tagName === "INPUT" ||
      t.tagName === "TEXTAREA" ||
      t.tagName === "SELECT" ||
      t.isContentEditable)
  );
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global keys: ⌘K / Ctrl-K toggles the palette; single letters navigate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const nav = NAV.find((n) => n.key === e.key.toLowerCase());
      if (nav && !open) router.push(nav.href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, router]);

  // Load company list lazily on first open.
  useEffect(() => {
    if (!open) return;
    setQ("");
    setCursor(0);
    inputRef.current?.focus();
    if (companies.length === 0) {
      fetch("/api/companies").then((r) => r.json()).then(setCompanies);
    }
  }, [open, companies.length]);

  // Research search — debounced server lookup over claims + briefs.
  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then(setHits)
        .catch(() => setHits([]));
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const actions = useMemo<Action[]>(() => {
    const list: Action[] = NAV.map((n) => ({
      id: n.id,
      kind: "nav",
      label: n.label,
      hint: n.key,
      run: () => router.push(n.href),
    }));
    list.push({
      id: "act-sweep",
      kind: "action",
      label: "Run research sweep",
      hint: "agent",
      run: () => {
        fetch("/api/agent", { method: "POST", body: "{}" });
        router.push("/automation");
      },
    });
    list.push({
      id: "act-export",
      kind: "action",
      label: "Export accounts to CSV",
      hint: "csv",
      run: () => exportCompaniesCsv(companies),
    });
    list.push({
      id: "act-add",
      kind: "action",
      label: "Add a company",
      hint: "new",
      run: () => router.push("/accounts?add=1"),
    });
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      const companyHits = companies
        .filter(
          (c) =>
            c.name.toLowerCase().includes(needle) ||
            c.domain.toLowerCase().includes(needle) ||
            c.industry.toLowerCase().includes(needle)
        )
        .slice(0, 7);
      // A typed query almost always means "find an account" — collect
      // matches separately and return them ahead of nav/action rows.
      const matched: Action[] = [];
      for (const c of companyHits) {
        matched.push({
          id: `co-${c.id}`,
          kind: "company",
          label: c.name,
          hint: `${c.industry} · fit ${c.fitScore}`,
          run: () => router.push(`/?focus=${c.id}`),
        });
      }
      // Research hits on accounts not already listed as company matches.
      const shown = new Set(companyHits.map((c) => c.id));
      for (const h of hits) {
        if (shown.has(h.companyId)) continue;
        shown.add(h.companyId);
        matched.push({
          id: `re-${h.companyId}`,
          kind: "research",
          label: h.name,
          hint: `fit ${h.fitScore}`,
          kindLabel: "research",
          run: () => router.push(`/?focus=${h.companyId}`),
        });
        if (matched.length > 14) break;
      }
      return [...matched, ...list];
    }
    return list;
  }, [q, companies, hits, router]);

  useEffect(() => setCursor(0), [q]);

  const onListKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, actions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const a = actions[cursor];
        if (a) {
          setOpen(false);
          a.run();
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [actions, cursor]
  );

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  const companyById = (a: Action) =>
    a.kind === "company" ? companies.find((c) => `co-${c.id}` === a.id) : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-28 backdrop-blur-sm"
      onMouseDown={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="glass-deep w-full max-w-lg overflow-hidden rounded-2xl shadow-glow"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onListKey}
          placeholder="Search companies, or pick an action…"
          aria-label="Search companies and actions"
          className="w-full border-b border-white/10 bg-transparent px-5 py-4 text-sm text-white outline-none placeholder:text-gray-600"
        />
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {actions.map((a, i) => {
            const co = companyById(a);
            return (
              <button
                key={a.id}
                data-idx={i}
                onClick={() => {
                  setOpen(false);
                  a.run();
                }}
                onMouseEnter={() => setCursor(i)}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors ${
                  i === cursor ? "bg-white/10 text-white" : "text-gray-300"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="w-4 shrink-0 text-center text-xs text-gray-500">
                    {a.kind === "company" ? "▸" : a.kind === "action" ? "⚡" : a.kind === "research" ? "◆" : "↪"}
                  </span>
                  <span className="truncate">{a.label}</span>
                  {a.kindLabel && (
                    <span className="shrink-0 rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-gray-500">
                      {a.kindLabel}
                    </span>
                  )}
                  {co && <StatusPill status={co.status} />}
                </span>
                {a.hint && (
                  <kbd className="ml-3 shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500">
                    {a.hint}
                  </kbd>
                )}
              </button>
            );
          })}
          {actions.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-600">
              No matches — try a company name, domain, or industry.
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[11px] text-gray-600">
          <span>⌘K toggle · ↑↓ select · ↵ run · esc close</span>
          <span>quick nav: m f h b o a p r u i</span>
        </div>
      </div>
    </div>
  );
}
