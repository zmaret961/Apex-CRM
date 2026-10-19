import { NextRequest, NextResponse } from "next/server";
import { addCompany, listCompanies } from "@/lib/queries";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const companies = listCompanies({
    q: p.get("q") ?? undefined,
    industry: p.get("industry") ?? undefined,
    status: p.get("status") ?? undefined,
    minFit: p.get("minFit") ? Number(p.get("minFit")) : undefined,
    discovered: p.get("discovered") === "1",
    stage: p.get("stage") ?? undefined,
  });
  return NextResponse.json(companies);
}

const NYC_DEFAULT = { lat: 40.7484, lng: -73.9857 }; // Midtown — used when no coords given

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (!name || name.length > 120) {
    return NextResponse.json({ error: "name is required (≤120 chars)" }, { status: 400 });
  }

  const domain = String(body.domain ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
  if (!domain || !domain.includes(".") || domain.length > 100) {
    return NextResponse.json({ error: "a valid domain is required" }, { status: 400 });
  }

  const dup = getDb().prepare("SELECT id, name FROM companies WHERE domain = ?").get(domain) as
    | { id: number; name: string }
    | undefined;
  if (dup) {
    return NextResponse.json(
      { error: `${dup.name} is already tracked with that domain` },
      { status: 409 }
    );
  }

  const sourceUrl = String(body.sourceUrl ?? "").trim();
  if (!/^https?:\/\/.+/.test(sourceUrl) || sourceUrl.length > 500) {
    return NextResponse.json(
      { error: "sourceUrl must be a real http(s) link — every record cites a source" },
      { status: 400 }
    );
  }

  const industry = String(body.industry ?? "Enterprise Software").trim() || "Enterprise Software";
  const fitScore = Math.max(0, Math.min(100, Math.round(Number(body.fitScore) || 50)));
  const employees = Math.max(0, Math.round(Number(body.employees) || 0));
  const lat = Number.isFinite(Number(body.lat)) && body.lat !== "" ? Number(body.lat) : NYC_DEFAULT.lat;
  const lng = Number.isFinite(Number(body.lng)) && body.lng !== "" ? Number(body.lng) : NYC_DEFAULT.lng;
  const signal = String(body.signal ?? "").trim();

  const company = addCompany({
    name,
    domain,
    industry,
    address: String(body.address ?? "").trim() || "New York, NY (address not confirmed)",
    lat,
    lng,
    employees,
    funding: String(body.funding ?? "").trim(),
    description:
      String(body.description ?? "").trim() ||
      `${name} — added manually by seller. Replace with a researched description.`,
    fitScore,
    sourceUrl,
    signal: signal || undefined,
  });
  return NextResponse.json(company, { status: 201 });
}
