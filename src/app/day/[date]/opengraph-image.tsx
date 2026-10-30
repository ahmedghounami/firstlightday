import { notFound } from "next/navigation";
import { CARD_SIZE, renderCard } from "@/lib/card";
import { parseIso } from "@/lib/date";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "The Firstlight card for this date";

export default async function Image({ params }: { params: Promise<{ date: string }> }) {
  const parsed = parseIso((await params).date);
  if (!parsed.ok) notFound();
  return renderCard(parsed.date);
}
