"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "Map", icon: "◉" },
  { href: "/focus", label: "Focus", icon: "◎" },
  { href: "/hot-leads", label: "Hot Leads", icon: "🔥" },
  { href: "/battlecards", label: "Battlecards", icon: "⚔" },
  { href: "/opportunities", label: "Opportunities", icon: "⬡" },
  { href: "/accounts", label: "Accounts", icon: "▦" },
  { href: "/people", label: "People", icon: "◍" },
  { href: "/activity", label: "Activity", icon: "◷" },
  { href: "/research", label: "Research", icon: "◈" },
  { href: "/automation", label: "Automation", icon: "⚡" },
  { href: "/integrations", label: "Integrations", icon: "🧩" },
];

export default function Nav() {
  const path = usePathname();
  // Overdue/due cadence touches follow you on every page — the badge keeps
  // today's work visible without a trip to Focus.
  const [due, setDue] = useState(0);
  useEffect(() => {
    let stop = false;
    const load = () =>
      fetch("/api/focus")
        .then((r) => r.json())
        .then((d) => {
          if (!stop) setDue(d.sequenceDue?.length ?? 0);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [path]);
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-3 print:hidden">
      <div className="glass pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/apex-mark.svg" alt="" className="h-7 w-7" />
        <span className="bg-gradient-to-br from-accent-soft to-violet-400 bg-clip-text text-lg font-semibold tracking-tight text-transparent">
          Apex
        </span>
        <span className="hidden text-xs text-gray-500 sm:block">
          NYC prospecting · Devin
        </span>
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        <nav className="glass flex max-w-[72vw] items-center gap-1 overflow-x-auto rounded-2xl p-1">
        {LINKS.map((l) => {
          const active = path === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "interactive rounded-xl px-3.5 py-1.5 text-sm transition-colors",
                active
                  ? "bg-white/10 text-white shadow-glass"
                  : "text-gray-400 hover:text-gray-200"
              )}
            >
              <span className="mr-1.5 opacity-70">{l.icon}</span>
              {l.label}
              {l.href === "/focus" && due > 0 && (
                <span
                  title={`${due} cadence touch${due === 1 ? "" : "es"} due or overdue`}
                  className="ml-1.5 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
                >
                  {due}
                </span>
              )}
            </Link>
          );
        })}
        </nav>
        <button
          onClick={() =>
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
          }
          className="glass interactive rounded-2xl px-3 py-2 text-xs text-gray-500 hover:text-gray-300"
          aria-label="Open command palette"
        >
          ⌘K
        </button>
      </div>
    </header>
  );
}
