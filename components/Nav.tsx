"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "Map", icon: "◉" },
  { href: "/opportunities", label: "Opportunities", icon: "⬡" },
  { href: "/accounts", label: "Accounts", icon: "▦" },
  { href: "/research", label: "Research", icon: "◈" },
  { href: "/automation", label: "Automation", icon: "⚡" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-3">
      <div className="glass pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-2">
        <span className="bg-gradient-to-br from-accent-soft to-violet-400 bg-clip-text text-lg font-semibold tracking-tight text-transparent">
          Apex
        </span>
        <span className="hidden text-xs text-gray-500 sm:block">
          NYC prospecting · Devin
        </span>
      </div>
      <nav className="glass pointer-events-auto flex items-center gap-1 rounded-2xl p-1">
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
    </header>
  );
}
