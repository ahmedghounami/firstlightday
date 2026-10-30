import Link from "next/link";

export function Mark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="16" cy="16" r="15" opacity=".35" />
      <circle cx="16" cy="16" r="10.5" opacity=".6" />
      <circle cx="16" cy="16" r="6" />
      <circle cx="24.2" cy="10" r="2.6" fill="var(--acc)" stroke="none" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 no-underline" aria-label="Firstlight, home">
      <Mark />
      <span className="font-display text-[1.45rem] leading-none italic tracking-tight">Firstlight</span>
    </Link>
  );
}
