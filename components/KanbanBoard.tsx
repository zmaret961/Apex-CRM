"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import clsx from "clsx";
import type { Company, PipelineStage } from "@/lib/types";
import { PIPELINE_STAGES } from "@/lib/types";
import StatusPill from "./StatusPill";
import CompanyDrawer from "./CompanyDrawer";

export default function KanbanBoard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    id: number;
    name: string;
    from: PipelineStage | null;
    to: PipelineStage;
  } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function load() {
    const data = await fetch("/api/companies").then((r) => r.json());
    setCompanies(data.filter((c: Company) => c.pipelineStage != null));
  }
  useEffect(() => {
    load();
  }, []);

  const byStage = useMemo(() => {
    const m = new Map<PipelineStage, Company[]>();
    for (const s of PIPELINE_STAGES) m.set(s, []);
    for (const c of companies) {
      if (c.pipelineStage) m.get(c.pipelineStage)?.push(c);
    }
    for (const list of m.values()) list.sort((a, b) => b.fitScore - a.fitScore);
    return m;
  }, [companies]);

  function onDragStart(e: DragStartEvent) {
    setActiveId(Number(e.active.id));
  }

  async function moveTo(id: number, stage: PipelineStage | null) {
    await fetch(`/api/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: stage }),
    });
  }

  async function advance(id: number) {
    const company = companies.find((c) => c.id === id);
    if (!company?.pipelineStage) return;
    const idx = PIPELINE_STAGES.indexOf(company.pipelineStage);
    const next = PIPELINE_STAGES[idx + 1];
    if (!next) return;
    const from = company.pipelineStage;
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pipelineStage: next } : c))
    );
    await moveTo(id, next);
    setToast({ id, name: company.name, from, to: next });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 6000);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const id = Number(e.active.id);
    const stage = e.over?.id as PipelineStage | undefined;
    if (!stage || !PIPELINE_STAGES.includes(stage)) return;
    const company = companies.find((c) => c.id === id);
    if (!company || company.pipelineStage === stage) return;
    const from = company.pipelineStage;
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pipelineStage: stage } : c))
    );
    await moveTo(id, stage);
    setToast({ id, name: company.name, from, to: stage });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 6000);
  }

  async function undo() {
    if (!toast) return;
    const { id, from } = toast;
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pipelineStage: from } : c))
    );
    setToast(null);
    await moveTo(id, from);
  }

  const active = activeId != null ? companies.find((c) => c.id === activeId) : null;

  const forecast = useMemo(() => {
    const open = companies.filter(
      (c) => c.pipelineStage !== "Closed Won" && c.pipelineStage !== "Closed Lost"
    );
    const won = companies.filter((c) => c.pipelineStage === "Closed Won");
    const parse = parseMoney;
    let openValue = 0;
    let weighted = 0;
    let unpriced = 0;
    for (const c of open) {
      const v = parse(c.estimatedValue);
      if (v == null) {
        unpriced++;
        continue;
      }
      openValue += v;
      weighted += v * STAGE_PROBABILITY[c.pipelineStage ?? "Identified"];
    }
    let wonValue = 0;
    for (const c of won) wonValue += parse(c.estimatedValue) ?? 0;
    return { openCount: open.length, openValue, weighted, unpriced, wonCount: won.length, wonValue };
  }, [companies]);

  function exportPipelineCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["name", "domain", "industry", "status", "pipelineStage", "stageProbability", "estimatedValue", "weightedValue", "hasChampion", "touches"],
      ...companies.map((c) => {
        const v = parseMoney(c.estimatedValue);
        return [
          c.name, c.domain, c.industry, c.status, c.pipelineStage,
          STAGE_PROBABILITY[c.pipelineStage ?? "Identified"],
          c.estimatedValue ?? "",
          v != null ? Math.round(v * STAGE_PROBABILITY[c.pipelineStage ?? "Identified"]) : "",
          c.hasChampion ? "yes" : "no",
          c.sequenceProgress ? `${c.sequenceProgress.done}/${c.sequenceProgress.total}` : "",
        ];
      }),
    ];
    const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], {
      type: "text/csv",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "apex-pipeline.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="glass mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl px-4 py-3 text-sm">
        <span className="text-gray-400">
          {forecast.openCount} open deal{forecast.openCount === 1 ? "" : "s"}
        </span>
        <span className="text-gray-400">
          Pipeline <span className="font-semibold text-white">{fmtMoney(forecast.openValue)}</span>
        </span>
        <span className="text-gray-400">
          Weighted{" "}
          <span className="font-semibold text-accent-soft">{fmtMoney(forecast.weighted)}</span>
        </span>
        <span className="text-gray-400">
          Won <span className="font-semibold text-emerald-300">{forecast.wonCount}</span>
          {forecast.wonValue > 0 && (
            <span className="text-emerald-300/70"> · {fmtMoney(forecast.wonValue)}</span>
          )}
        </span>
        {forecast.unpriced > 0 && (
          <span className="text-amber-300/80">
            {forecast.unpriced} unpriced — set a value on the card
          </span>
        )}
        <button
          onClick={exportPipelineCsv}
          title="Download the board as CSV (values, odds, weighted, champion + cadence flags)"
          className="interactive rounded-lg border border-white/10 px-2.5 py-1 text-xs text-gray-400 hover:border-accent/40 hover:text-white"
        >
          Export CSV
        </button>
        <span className="ml-auto text-xs text-gray-600">
          Weighted = stage odds × value · Click a card for full context · drag to move
        </span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <Column
            key={stage}
            stage={stage}
            items={byStage.get(stage) ?? []}
            onSelect={setSelected}
            onAdvance={advance}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? <Card company={active} overlay /> : null}
      </DragOverlay>
      <CompanyDrawer
        companyId={selected}
        onClose={() => setSelected(null)}
        onAdded={load}
      />
      {toast && (
        <div className="glass-deep animate-fade-up fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl px-5 py-3 text-sm shadow-glow">
          <span className="text-gray-300">
            <span className="font-medium text-white">{toast.name}</span>
            {toast.from ? ` moved ${toast.from} → ${toast.to}` : ` added to ${toast.to}`}
          </span>
          <button
            onClick={undo}
            className="interactive rounded-lg border border-accent/40 px-2.5 py-1 text-xs font-medium text-accent-soft hover:bg-accent/15"
          >
            Undo
          </button>
        </div>
      )}
    </DndContext>
  );
}

function Column({
  stage,
  items,
  onSelect,
  onAdvance,
}: {
  stage: PipelineStage;
  items: Company[];
  onSelect: (id: number) => void;
  onAdvance: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const closed = stage.startsWith("Closed");
  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "glass w-64 shrink-0 rounded-2xl p-3 transition-all duration-200",
        isOver && "border-accent/50 bg-accent/5 shadow-glow"
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h3
          className={clsx(
            "text-xs font-semibold uppercase tracking-wider",
            stage === "Closed Won" && "text-emerald-300",
            stage === "Closed Lost" && "text-rose-300/80",
            !closed && "text-gray-400"
          )}
        >
          {stage}
        </h3>
        <span className="flex items-center gap-1.5">
          {items.reduce((s, c) => s + (parseMoney(c.estimatedValue) ?? 0), 0) > 0 && (
            <span className="text-[11px] font-medium text-emerald-300/80">
              {fmtMoney(items.reduce((s, c) => s + (parseMoney(c.estimatedValue) ?? 0), 0))}
            </span>
          )}
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-gray-500">
            {items.length}
          </span>
        </span>
      </div>
      <div className="space-y-2.5">
        {items.map((c) => (
          <DraggableCard key={c.id} company={c} onSelect={onSelect} onAdvance={onAdvance} />
        ))}
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-gray-600">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

const STAGE_PROBABILITY: Record<PipelineStage, number> = {
  Identified: 0.1,
  Researched: 0.2,
  Engaged: 0.35,
  "Demo Scheduled": 0.5,
  Proposal: 0.7,
  "Closed Won": 1,
  "Closed Lost": 0,
};

function parseMoney(v: string | null): number | null {
  if (!v) return null;
  const m = v.match(/\$(\d+(?:\.\d+)?)\s*([kKmM])?/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2]?.toLowerCase() === "m" ? n * 1_000_000 : m[2]?.toLowerCase() === "k" ? n * 1_000 : n;
}

function fmtMoney(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return v > 0 ? `$${Math.round(v)}` : "$0";
}

function stageDays(ts: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(ts + "Z").getTime()) / 86400000));
}

function daysAgo(ts: string): string {
  const d = stageDays(ts);
  return d === 0 ? "today" : `${d}d`;
}

function DraggableCard({
  company,
  onSelect,
  onAdvance,
}: {
  company: Company;
  onSelect: (id: number) => void;
  onAdvance: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: company.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => !isDragging && onSelect(company.id)}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card company={company} onAdvance={onAdvance} />
    </div>
  );
}

function Card({
  company,
  overlay,
  onAdvance,
}: {
  company: Company;
  overlay?: boolean;
  onAdvance?: (id: number) => void;
}) {
  const canAdvance =
    onAdvance &&
    company.pipelineStage != null &&
    !company.pipelineStage.startsWith("Closed");
  return (
    <div
      className={clsx(
        "group glass interactive rounded-xl p-3",
        overlay && "shadow-glow ring-1 ring-accent/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-white">{company.name}</div>
          <div className="mt-0.5 text-xs text-gray-500">{company.industry}</div>
        </div>
        <div className="flex items-center gap-1.5">
          {canAdvance && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdvance(company.id);
              }}
              title={`Advance to ${PIPELINE_STAGES[PIPELINE_STAGES.indexOf(company.pipelineStage!) + 1]}`}
              className="interactive rounded-md border border-white/10 px-1.5 py-0.5 text-[11px] text-gray-500 opacity-0 transition-opacity hover:border-accent/40 hover:text-accent-soft group-hover:opacity-100"
            >
              →
            </button>
          )}
          <StatusPill status={company.status} />
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between text-xs">
        <span className={company.estimatedValue ? "text-emerald-300" : "text-gray-400"}>
          {company.estimatedValue ?? `unconfirmed · fit ${company.fitScore}`}
        </span>
        <span className="flex items-center gap-2">
          {company.sequenceProgress && (
            <span
              className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent-soft"
              title="Outreach sequence progress"
            >
              {company.sequenceProgress.done}/{company.sequenceProgress.total} touches
            </span>
          )}
          {company.pipelineStage &&
            !["Closed Won", "Closed Lost"].includes(company.pipelineStage) &&
            !company.hasChampion && (
              <span
                className="text-[10px] font-medium text-amber-300/80"
                title="No champion contact on this deal — open the profile and star one"
              >
                no champion
              </span>
            )}
          <span
            className={
              company.stageChangedAt && stageDays(company.stageChangedAt) > 30
                ? "font-medium text-amber-300/80"
                : "text-gray-600"
            }
            title={
              company.stageChangedAt && stageDays(company.stageChangedAt) > 30
                ? "Sitting in this stage over a month — check Focus for next steps"
                : undefined
            }
          >
            {company.stageChangedAt
              ? `${daysAgo(company.stageChangedAt)} in stage`
              : company.lastResearchAt
              ? `researched ${new Date(company.lastResearchAt).toLocaleDateString()}`
              : "unresearched"}
          </span>
        </span>
      </div>
    </div>
  );
}
