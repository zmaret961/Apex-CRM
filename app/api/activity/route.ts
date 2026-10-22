import { NextResponse } from "next/server";
import { listEvents } from "@/lib/queries";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(listEvents());
}
