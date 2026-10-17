import { NextRequest, NextResponse } from "next/server";
import { briefsFor, getCompany, updatePipeline, setStatus } from "@/lib/queries";
import type { PipelineStage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = getCompany(Number(id));
  if (!company) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ company, briefs: briefsFor(company.id) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if ("pipelineStage" in body) updatePipeline(Number(id), body.pipelineStage as PipelineStage | null);
  if ("status" in body) setStatus(Number(id), body.status);
  const company = getCompany(Number(id));
  return NextResponse.json(company);
}
