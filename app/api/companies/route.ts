import { NextRequest, NextResponse } from "next/server";
import { listCompanies } from "@/lib/queries";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const companies = listCompanies({
    q: p.get("q") ?? undefined,
    industry: p.get("industry") ?? undefined,
    status: p.get("status") ?? undefined,
    minFit: p.get("minFit") ? Number(p.get("minFit")) : undefined,
    discovered: p.get("discovered") === "1",
  });
  return NextResponse.json(companies);
}
