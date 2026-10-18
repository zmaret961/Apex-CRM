import clsx from "clsx";
import type { CompanyStatus } from "@/lib/types";

const MAP: Record<CompanyStatus, { label: string; cls: string }> = {
  customer: { label: "Customer", cls: "bg-emerald-400/15 text-emerald-300 border-emerald-300/30" },
  prospect: { label: "Prospect", cls: "bg-sky-400/15 text-sky-300 border-sky-300/30" },
  researched: { label: "Researched", cls: "bg-gray-400/10 text-gray-400 border-gray-400/20" },
  competitor: { label: "Competitor", cls: "bg-rose-400/15 text-rose-300 border-rose-300/30" },
};

export default function StatusPill({ status }: { status: CompanyStatus }) {
  const m = MAP[status];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", m.cls)}>
      {status === "customer" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-glow-green" />}
      {m.label}
    </span>
  );
}
