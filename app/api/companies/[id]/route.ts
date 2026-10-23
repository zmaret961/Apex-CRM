import { NextRequest, NextResponse } from "next/server";
import {
  accountIntelFor,
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
  updateNote,
  updatePipeline,
  setStatus,
  setEstimatedValue,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const company = getCompany(Number(id));
  if (!company) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    company,
    briefs: briefsFor(company.id),
    events: eventsFor(company.id),
    contacts: contactsFor(company.id),
    execs: execsFor(company.id),
    sequence: sequenceFor(company.id),
    intel: accountIntelFor(company.id),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const companyId = Number(id);
  const current = getCompany(companyId);
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // Competitors are intel targets — they can never hold a pipeline stage.
  const effectiveStatus = "status" in body ? body.status : current.status;

  // Validate the whole body BEFORE applying anything — a rejected request
  // must not partially mutate state or write phantom timeline events.
  const bad = (error: string) => NextResponse.json({ error }, { status: 400 });
  if ("pipelineStage" in body) {
    if (body.pipelineStage !== null && !isPipelineStage(body.pipelineStage)) {
      return bad(`pipelineStage must be one of the pipeline stages or null`);
    }
    if (body.pipelineStage !== null && effectiveStatus === "competitor") {
      return bad("competitors are intel targets — they cannot be added to the pipeline");
    }
  }
  if ("status" in body && !isCompanyStatus(body.status)) {
    return bad("invalid status");
  }
  if ("estimatedValue" in body) {
    const v = body.estimatedValue;
    if (v !== null && (typeof v !== "string" || v.trim().length === 0 || v.length > 120)) {
      return bad("estimatedValue must be a string under 120 chars or null");
    }
  }
  if ("note" in body) {
    if (typeof body.note !== "string" || !body.note.trim()) {
      return bad("note must be a non-empty string");
    }
    if (body.note.trim().length > 2000) return bad("note too long");
  }
  if ("deleteNote" in body) {
    const eventId = Number(body.deleteNote);
    if (!Number.isInteger(eventId) || eventId <= 0) return bad("deleteNote must be an event id");
  }
  if ("editNote" in body) {
    const e = body.editNote;
    if (!e || typeof e !== "object" || !Number.isInteger(Number(e.id)) || Number(e.id) <= 0) {
      return bad("editNote.id must be an event id");
    }
    if (typeof e.text !== "string" || !e.text.trim()) {
      return bad("editNote.text must be a non-empty string");
    }
    if (e.text.trim().length > 2000) return bad("editNote.text too long");
  }
  if ("contact" in body) {
    const c = body.contact;
    if (!c || typeof c !== "object" || typeof c.name !== "string" || !c.name.trim()) {
      return bad("contact.name is required");
    }
    if (
      typeof c.url === "string" &&
      c.url.trim() &&
      !/^https?:\/\//i.test(c.url.trim())
    ) {
      return bad("contact.url must be an http(s) URL");
    }
  }
  if ("deleteContact" in body) {
    const contactId = Number(body.deleteContact);
    if (!Number.isInteger(contactId) || contactId <= 0) return bad("deleteContact must be a contact id");
  }
  if ("championContact" in body) {
    const contactId = Number(body.championContact);
    if (!Number.isInteger(contactId) || contactId <= 0) {
      return bad("championContact must be a contact id");
    }
    if (!contactsFor(companyId).some((c) => c.id === contactId)) {
      return NextResponse.json({ error: "championContact contact not found on this company" }, { status: 404 });
    }
  }
  if ("sequenceStep" in body) {
    const s = body.sequenceStep;
    const ok = s && typeof s === "object" && Number.isInteger(s.index);
    if (!ok) return bad("invalid sequenceStep");
  }

  // All validations passed — apply.
  if ("pipelineStage" in body) updatePipeline(companyId, body.pipelineStage);
  if ("status" in body) {
    setStatus(companyId, body.status);
    if (body.status === "competitor" && current.pipelineStage != null) {
      updatePipeline(companyId, null);
    }
  }
  if ("estimatedValue" in body) {
    const v = body.estimatedValue;
    setEstimatedValue(companyId, v === null ? null : v.trim());
  }
  if ("note" in body) addEvent(companyId, "note", body.note.trim());
  if ("deleteNote" in body) deleteNote(companyId, Number(body.deleteNote));
  if ("editNote" in body) {
    const e = body.editNote;
    if (!updateNote(companyId, Number(e.id), e.text.trim())) {
      return NextResponse.json({ error: "note not found on this company" }, { status: 404 });
    }
  }
  if ("contact" in body) {
    const c = body.contact;
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
  if ("deleteContact" in body) deleteContact(companyId, Number(body.deleteContact));
  if ("championContact" in body) {
    setContactChampion(companyId, Number(body.championContact), body.champion !== false);
  }
  if (body.startSequence === true) startSequence(companyId);
  if (body.endSequence === true) endSequence(companyId);
  if ("sequenceStep" in body) {
    const s = body.sequenceStep;
    const ok = setSequenceStep(companyId, s.index, s.done !== false);
    if (!ok) return bad("invalid sequenceStep");
  }
  return NextResponse.json({
    company: getCompany(companyId),
    contacts: contactsFor(companyId),
    sequence: sequenceFor(companyId),
    intel: accountIntelFor(companyId),
  });
}
