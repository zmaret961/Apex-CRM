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

export default function KanbanBoard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
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

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const id = Number(e.active.id);
    const stage = e.over?.id as PipelineStage | undefined;
    if (!stage || !PIPELINE_STAGES.includes(stage)) return;
    const company = companies.find((c) => c.id === id);
    if (!company || company.pipelineStage === stage) return;
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pipelineStage: stage } : c))
    );
    await fetch(`/api/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: stage }),
    });
  }

  const active = activeId != null ? companies.find((c) => c.id === activeId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <Column key={stage} stage={stage} items={byStage.get(stage) ?? []} />
        ))}
      </div>
      <DragOverlay>
        {active ? <Card company={active} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ stage, items }: { stage: PipelineStage; items: Company[] }) {
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
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-gray-500">
          {items.length}
        </span>
      </div>
      <div className="space-y-2.5">
        {items.map((c) => (
          <DraggableCard key={c.id} company={c} />
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

function DraggableCard({ company }: { company: Company }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: company.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card company={company} />
    </div>
  );
}

function Card({ company, overlay }: { company: Company; overlay?: boolean }) {
  return (
    <div
      className={clsx(
        "glass interactive rounded-xl p-3",
        overlay && "shadow-glow ring-1 ring-accent/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-white">{company.name}</div>
          <div className="mt-0.5 text-xs text-gray-500">{company.industry}</div>
        </div>
        <StatusPill status={company.status} />
      </div>
      <div className="mt-2.5 flex items-center justify-between text-xs">
        <span className={company.estimatedValue ? "text-emerald-300" : "text-gray-400"}>
          {company.estimatedValue ?? `unconfirmed · fit ${company.fitScore}`}
        </span>
        <span className="text-gray-600">
          {company.lastResearchAt
            ? `researched ${new Date(company.lastResearchAt).toLocaleDateString()}`
            : "unresearched"}
        </span>
      </div>
    </div>
  );
}
