import { NextResponse } from "next/server";
import { listContacts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(listContacts());
}
