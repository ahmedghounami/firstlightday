import { dayOfYear, MIN_YEAR } from "@/lib/date";

const SIZE = 1000;
const INNER = 58;
const OUTER = 492;

export function ringRadius(year: number, firstYear = MIN_YEAR, lastYear = new Date().getUTCFullYear()): number {
  const t = (Math.min(lastYear, Math.max(firstYear, year)) - firstYear) / Math.max(1, lastYear - firstYear);
  return INNER + t * (OUTER - INNER);
}

export function dayAngle(year: number, month: number, day: number): number {
  return (dayOfYear({ year, month, day }) / 366) * Math.PI * 2 - Math.PI / 2;
}

interface Props {
  year?: number;
  month?: number;
  day?: number;
  className?: string;
  /** Static placement for a finished date, a smaller ring count for small sizes. */
  dense?: boolean;
}

/** Every year since 1900 is a ring and every day an angle, so each date has one exact place on the disc. */
export function Rings({ year, month, day, className, dense = true }: Props) {
  const last = new Date().getUTCFullYear();
  const step = dense ? 1 : 5;
  const years: number[] = [];
  for (let y = MIN_YEAR; y <= last; y += step) years.push(y);

  const r = year !== undefined ? ringRadius(year) : undefined;
  const hasDay = year !== undefined && month !== undefined && day !== undefined;
  const a = hasDay ? dayAngle(year, month, day) : undefined;
  const monthStart = month !== undefined ? ((month - 1) / 12) * 360 - 90 : undefined;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={className} aria-hidden="true" fill="none">
      <g transform={`translate(${SIZE / 2} ${SIZE / 2})`}>
        <g stroke="var(--ink)">
          {years.map((y) => (
            <circle key={y} r={ringRadius(y)} strokeWidth={y % 10 === 0 ? 1.1 : 0.5} opacity={y % 10 === 0 ? 0.3 : 0.13} />
          ))}
        </g>
        <g stroke="var(--ink)" opacity="0.2">
          {Array.from({ length: 12 }, (_, i) => {
            const t = (i / 12) * Math.PI * 2;
            return <line key={i} x1={Math.cos(t) * INNER} y1={Math.sin(t) * INNER} x2={Math.cos(t) * OUTER} y2={Math.sin(t) * OUTER} strokeWidth="0.6" />;
          })}
        </g>
        {monthStart !== undefined && (
          <g transform={`rotate(${monthStart})`} style={{ transition: "transform .5s ease" }}>
            <path d={sector(30)} fill="var(--acc)" opacity="0.1" />
          </g>
        )}
        {r !== undefined && <circle r={r} stroke="var(--acc)" strokeWidth="2.2" style={{ transition: "r .5s cubic-bezier(.2,.7,.2,1)" }} />}
        {a !== undefined && r !== undefined && (
          <g>
            <line x1={Math.cos(a) * INNER} y1={Math.sin(a) * INNER} x2={Math.cos(a) * OUTER} y2={Math.sin(a) * OUTER} stroke="var(--acc)" strokeWidth="1" opacity="0.7" />
            <circle cx={Math.cos(a) * r} cy={Math.sin(a) * r} r="34" fill="var(--acc)" opacity="0.2" />
            <circle cx={Math.cos(a) * r} cy={Math.sin(a) * r} r="11" fill="var(--acc)" />
          </g>
        )}
      </g>
    </svg>
  );
}

function sector(degrees: number): string {
  const t = (degrees * Math.PI) / 180;
  const p = (radius: number, angle: number) => `${(Math.cos(angle) * radius).toFixed(1)} ${(Math.sin(angle) * radius).toFixed(1)}`;
  return `M ${p(INNER, 0)} L ${p(OUTER, 0)} A ${OUTER} ${OUTER} 0 0 1 ${p(OUTER, t)} L ${p(INNER, t)} A ${INNER} ${INNER} 0 0 0 ${p(INNER, 0)} Z`;
}
