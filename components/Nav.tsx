"use client";

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
