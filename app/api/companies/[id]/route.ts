import { NextRequest, NextResponse } from "next/server";
import {
  addContact,
  addEvent,
  briefsFor,
  contactsFor,
  deleteContact,
  deleteNote,
  eventsFor,
  endSequence,
  execsFor,
  getCompany,
  isCompanyStatus,
  isPipelineStage,
  sequenceFor,
  setContactChampion,
  setSequenceStep,
  startSequence,
  updatePipeline,
  setStatus,
  setEstimatedValue,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = getCompany(Number(id));
  if (!company) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    company,
    briefs: briefsFor(company.id),
    events: eventsFor(company.id),
    contacts: contactsFor(company.id),
    execs: execsFor(company.id),
    sequence: sequenceFor(company.id),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const companyId = Number(id);
  const current = getCompany(companyId);
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // Competitors are intel targets — they can never hold a pipeline stage.
  const effectiveStatus = "status" in body ? body.status : current.status;

  if ("pipelineStage" in body) {
    if (body.pipelineStage !== null && !isPipelineStage(body.pipelineStage)) {
      return NextResponse.json(
        { error: `pipelineStage must be one of the pipeline stages or null` },
        { status: 400 }
      );
    }
    if (body.pipelineStage !== null && effectiveStatus === "competitor") {
      return NextResponse.json(
        { error: "competitors are intel targets — they cannot be added to the pipeline" },
        { status: 400 }
      );
    }
    updatePipeline(companyId, body.pipelineStage);
  }
  if ("status" in body) {
    if (!isCompanyStatus(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    setStatus(companyId, body.status);
    if (body.status === "competitor" && current.pipelineStage != null) {
      updatePipeline(companyId, null);
    }
  }
  if ("estimatedValue" in body) {
    const v = body.estimatedValue;
    if (v !== null && (typeof v !== "string" || v.trim().length === 0 || v.length > 120)) {
      return NextResponse.json(
        { error: "estimatedValue must be a string under 120 chars or null" },
        { status: 400 }
      );
    }
    setEstimatedValue(companyId, v === null ? null : v.trim());
  }
  if ("note" in body) {
    const note = String(body.note ?? "").trim();
    if (!note) return NextResponse.json({ error: "note must be non-empty" }, { status: 400 });
    if (note.length > 2000)
      return NextResponse.json({ error: "note too long" }, { status: 400 });
    addEvent(companyId, "note", note);
  }
  if ("deleteNote" in body) {
    const eventId = Number(body.deleteNote);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json({ error: "deleteNote must be an event id" }, { status: 400 });
    }
    deleteNote(companyId, eventId);
  }
  if ("contact" in body) {
    const c = body.contact;
    if (!c || typeof c !== "object" || typeof c.name !== "string" || !c.name.trim()) {
      return NextResponse.json({ error: "contact.name is required" }, { status: 400 });
    }
    const clip = (v: unknown, max: number) =>
      typeof v === "string" ? v.trim().slice(0, max) : "";
    addContact(companyId, {
      name: clip(c.name, 120),
      role: clip(c.role, 160),
      url: clip(c.url, 500),
      notes: clip(c.notes, 500),
      champion: c.champion === true,
    });
  }
  if ("deleteContact" in body) {
    const contactId = Number(body.deleteContact);
    if (!Number.isInteger(contactId) || contactId <= 0) {
      return NextResponse.json({ error: "deleteContact must be a contact id" }, { status: 400 });
    }
    deleteContact(companyId, contactId);
  }
  if ("championContact" in body) {
    const contactId = Number(body.championContact);
    if (!Number.isInteger(contactId) || contactId <= 0) {
      return NextResponse.json({ error: "championContact must be a contact id" }, { status: 400 });
    }
    setContactChampion(companyId, contactId, body.champion !== false);
  }
  if (body.startSequence === true) startSequence(companyId);
  if (body.endSequence === true) endSequence(companyId);
  if ("sequenceStep" in body) {
    const s = body.sequenceStep;
    const ok =
      s &&
      typeof s === "object" &&
      Number.isInteger(s.index) &&
      setSequenceStep(companyId, s.index, s.done !== false);
    if (!ok) {
      return NextResponse.json({ error: "invalid sequenceStep" }, { status: 400 });
    }
  }
  return NextResponse.json({
    company: getCompany(companyId),
    contacts: contactsFor(companyId),
    sequence: sequenceFor(companyId),
  });
}
