import { renderCard } from "@/lib/card";
import { parseIso } from "@/lib/date";

export async function GET(_: Request, { params }: { params: Promise<{ date: string }> }) {
  const parsed = parseIso((await params).date);
  if (!parsed.ok) return new Response("Not found", { status: 404 });
  const image = await renderCard(parsed.date);
  image.headers.set("Content-Disposition", `attachment; filename="firstlight-${parsed.date.iso}.png"`);
  return image;
}
