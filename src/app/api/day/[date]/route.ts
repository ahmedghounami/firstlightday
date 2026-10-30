import { NextResponse } from "next/server";
import { getArchive } from "@/lib/archive";
import { parseIso } from "@/lib/date";

export async function GET(_: Request, { params }: { params: Promise<{ date: string }> }) {
  const parsed = parseIso((await params).date);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  return NextResponse.json(await getArchive(parsed.date), { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
