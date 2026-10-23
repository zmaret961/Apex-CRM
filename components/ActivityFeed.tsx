"use client";

import { useEffect, useState } from "react";
import type { TimelineEvent } from "@/lib/types";
import CompanyDrawer from "./CompanyDrawer";
import clsx from "clsx";

const TYPE_META: Record<TimelineEvent["type"], { label: string; tone: string }> = {
  pipeline: { label: "pipeline", tone: "border-accent/40 bg-accent/10 text-accent-soft" },
  note: { label: "touch", tone: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" },
  research: { label: "research", tone: "border-violet-300/30 bg-violet-400/10 text-violet-300" },
  status: { label: "status", tone: "border-sky-300/30 bg-sky-400/10 text-sky-300" },
  import: { label: "import", tone: "border-white/15 bg-white/5 text-gray-400" },
};

const FILTERS: (TimelineEvent["type"] | "all")[] = ["all", "note", "pipeline", "research", "status", "import"];

function relTime(ts: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(ts.replace(" ", "T") + "Z").getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts.replace(" ", "T") + "Z").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Day-group the stream — "Today / Yesterday / Wed Oct 15" headers let a
// seller scan the week the way every real activity feed does.
function dayKey(ts: string) {
  return new Date(ts.replace(" ", "T") + "Z").toISOString().slice(0, 10);
}

function dayLabel(key: string) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return new Date(key + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function exportCsv(rows: TimelineEvent[]) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csv = [
    "ts_utc,type,company,text",
    ...rows.map((e) => [e.ts, e.type, esc(e.companyName), esc(e.text)].join(",")),
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "apex-activity.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ActivityFeed() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [filter, setFilter] = useState<TimelineEvent["type"] | "all">("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => setEvents([]));
  }, []);

  if (!events)
    return <div className="glass rounded-2xl p-8 text-center text-sm text-gray-500">Loading…</div>;

  const lq = q.trim().toLowerCase();
  const rows = events.filter(
    (e) =>
      (filter === "all" || e.type === filter) &&
      (!lq || e.text.toLowerCase().includes(lq) || e.companyName.toLowerCase().includes(lq))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "interactive rounded-lg border px-2.5 py-1 text-[11px] font-medium capitalize",
              filter === f
                ? "border-accent/50 bg-accent/15 text-accent-soft"
                : "border-white/10 bg-white/[0.03] text-gray-400 hover:text-gray-200"
            )}
          >
            {f === "note" ? "touches" : f}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search activity…"
          className="interactive ml-auto w-52 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-accent/50 focus:outline-none"
        />
        <span className="text-[11px] text-gray-500">{rows.length} events</span>
        <button
          onClick={() => exportCsv(rows)}
          title="Download the filtered feed as CSV"
          className="interactive rounded-lg border border-white/15 px-2.5 py-1 text-[11px] text-gray-300"
        >
          Export CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-gray-500">
          Nothing here yet — touches, stage moves, and research runs land in this feed.
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            const groups: { key: string; items: TimelineEvent[] }[] = [];
            for (const e of rows) {
              const k = dayKey(e.ts);
              const g = groups[groups.length - 1];
              if (g && g.key === k) g.items.push(e);
              else groups.push({ key: k, items: [e] });
            }
            return groups.map((g) => (
              <div key={g.key}>
                <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                  {dayLabel(g.key)}
                </div>
                <div className="glass divide-y divide-white/5 rounded-2xl">
                  {g.items.map((e) => {
                    const meta = TYPE_META[e.type];
                    return (
                      <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        <span
                          className={clsx(
                            "w-16 shrink-0 rounded-full border px-2 py-0.5 text-center text-[10px] font-medium",
                            meta.tone
                          )}
                        >
                          {meta.label}
                        </span>
                        <button
                          onClick={() => setSelected(e.companyId)}
                          className="w-40 shrink-0 truncate text-left font-medium text-white hover:text-accent-soft"
                        >
                          {e.companyName}
                        </button>
                        <span className="min-w-0 flex-1 truncate text-gray-400">{e.text}</span>
                        <span
                          className="w-20 shrink-0 text-right text-[11px] text-gray-600"
                          title={e.ts + " UTC"}
                        >
                          {relTime(e.ts)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {selected !== null && (
        <CompanyDrawer companyId={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
