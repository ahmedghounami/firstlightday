import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getCore } from "./archive";
import { capsule } from "./editorial";
import { formatDate, weekday } from "./date";
import type { ParsedDate } from "./types";

const font = (file: string) => readFile(path.join(process.cwd(), "src/assets/fonts", file));

export const CARD_SIZE = { width: 1200, height: 630 };

/** The share image. Only retrieved facts: when a lookup fails it shows the date alone. */
export async function renderCard(date: ParsedDate) {
  const [display, italic, mono] = await Promise.all([
    font("bodoni-moda-latin-500-normal.woff"),
    font("bodoni-moda-latin-500-italic.woff"),
    font("ibm-plex-mono-latin-500-normal.woff"),
  ]);
  let lead: string | undefined;
  let culture: string | undefined;
  try {
    const picks = capsule((await getCore(date)).records);
    lead = picks.lead?.title;
    culture = picks.culture ? `${picks.culture.category === "music" ? "Released" : "On screen"}: ${picks.culture.title}` : undefined;
  } catch {
    // The date alone is still a valid card.
  }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#0d0c16", color: "#f1eadc", fontFamily: "Bodoni" }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 420, display: "flex", background: "radial-gradient(70% 100% at 75% 100%, rgba(245,166,91,.32), rgba(13,12,22,0))" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Plex", fontSize: 22, letterSpacing: 2, textTransform: "uppercase", color: "#f5a65b" }}>
          <span>{weekday(date)}</span>
          <span style={{ color: "#b0a999" }}>Firstlight</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 118, lineHeight: 1 }}>{formatDate(date)}</div>
          {lead && <div style={{ fontFamily: "BodoniItalic", fontSize: 40, lineHeight: 1.15, marginTop: 28, maxHeight: 142, overflow: "hidden" }}>{lead.length > 110 ? `${lead.slice(0, 108)}…` : lead}</div>}
          {culture && <div style={{ fontFamily: "Plex", fontSize: 22, marginTop: 20, color: "#b0a999" }}>{culture.slice(0, 70)}</div>}
        </div>
      </div>
    ),
    {
      ...CARD_SIZE,
      fonts: [
        { name: "Bodoni", data: display, weight: 500, style: "normal" },
        { name: "BodoniItalic", data: italic, weight: 500, style: "italic" },
        { name: "Plex", data: mono, weight: 500, style: "normal" },
      ],
    },
  );
}
