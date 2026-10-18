import { NextResponse } from "next/server";
import { searchResearch } from "@/lib/queries";

export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);
  return NextResponse.json(searchResearch(q));
}
