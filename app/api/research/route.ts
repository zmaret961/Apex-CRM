import { NextResponse } from "next/server";
import { listBriefs } from "@/lib/queries";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(listBriefs(60));
}
