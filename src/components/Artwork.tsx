/** Original typographic covers, drawn from the title. Commercial sleeves and posters are not licensed for reuse,
 *  so each release gets its own cover here, which also means no broken or missing artwork. */

function seed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const PALETTES = [
  ["#1b1712", "#f4ecdf", "#c8452c"],
  ["#c8452c", "#f8e6c9", "#1b1712"],
  ["#10323a", "#f0d9a8", "#e8743b"],
  ["#f0d9a8", "#2a1a3e", "#c8452c"],
  ["#2a1a3e", "#f2b27c", "#e5e0d0"],
  ["#e9b76a", "#2b1608", "#7a1f0c"],
  ["#dfe6df", "#10323a", "#c8452c"],
  ["#451a22", "#f4e7e0", "#e9b76a"],
] as const;

export function Sleeve({ title, artist }: { title: string; artist?: string }) {
  const s = seed(title + (artist ?? ""));
  const [bg, fg, accent] = PALETTES[s % PALETTES.length]!;
  const kind = (s >> 4) % 4;
  const cx = 30 + ((s >> 8) % 41);
  const cy = 22 + ((s >> 12) % 41);
  return (
    <div className="relative aspect-square w-full overflow-hidden" style={{ background: bg, color: fg }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {kind === 0 && [34, 26, 18, 10].map((r, i) => <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={i === 3 ? accent : fg} strokeWidth={i === 3 ? 3 : 0.5} />)}
        {kind === 1 && <circle cx={cx} cy={cy} r="26" fill={accent} />}
        {kind === 2 && Array.from({ length: 9 }, (_, i) => <rect key={i} x="0" y={10 + i * 7} width={32 + ((s >> i) % 68)} height="2.4" fill={i % 3 === 0 ? accent : fg} />)}
        {kind === 3 && (
          <>
            <path d={`M0 ${cy} L100 ${cy + 14} L100 100 L0 100 Z`} fill={accent} />
            <circle cx={cx} cy={cy - 8} r="11" fill={fg} />
          </>
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="font-display text-[1.25rem] leading-[1.02] [overflow-wrap:anywhere]">{title}</p>
        {artist && <p className="tag mt-1 opacity-80">{artist}</p>}
      </div>
    </div>
  );
}

export function Poster({ title, line }: { title: string; line?: string }) {
  const s = seed(title);
  const [bg, fg, accent] = PALETTES[s % PALETTES.length]!;
  return (
    <div className="relative flex aspect-[2/3] w-full flex-col justify-between overflow-hidden p-4" style={{ background: bg, color: fg }}>
      <svg viewBox="0 0 200 300" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx={40 + (s % 120)} cy={70 + ((s >> 6) % 60)} r={46 + ((s >> 3) % 40)} fill={accent} opacity="0.9" />
        <line x1="0" y1={190 + ((s >> 9) % 30)} x2="200" y2={190 + ((s >> 9) % 30)} stroke={fg} strokeWidth="0.6" />
      </svg>
      <span className="tag relative opacity-80">{line ?? ""}</span>
      <p className="font-display relative text-[1.6rem] leading-[1.02] [overflow-wrap:anywhere]">{title}</p>
    </div>
  );
}
