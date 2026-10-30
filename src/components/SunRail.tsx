"use client";

import { useEffect, useRef, useState } from "react";

export const CHAPTERS = [
  ["headlines", "Front page"],
  ["music", "Released"],
  ["film", "Cinema"],
  ["tv", "On air"],
  ["sports", "Results"],
  ["science", "Discoveries"],
  ["business", "Business"],
  ["born", "Born"],
  ["died", "Died"],
  ["hidden", "Hidden"],
  ["index", "Everything"],
  ["other-years", "Other years"],
] as const;

/** The sun's position is the reader's progress down the page, a chapter marker and not a time of day. */
export function SunRail() {
  const dot = useRef<SVGCircleElement>(null);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    let frame = 0;
    const place = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const t = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      const a = Math.PI * t;
      dot.current?.setAttribute("cx", String(4 + Math.sin(a) * 28));
      dot.current?.setAttribute("cy", String(150 - Math.cos(a) * 146));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    place();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const seen = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.chapter ?? "");
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    const watch = () =>
      document.querySelectorAll("[data-chapter]").forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el);
          observer.observe(el);
        }
      });
    watch();
    // Chapters stream in after first paint.
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      observer.disconnect();
      mo.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <nav aria-label="Chapters" className="fixed top-1/2 left-5 z-30 hidden -translate-y-1/2 mix-blend-difference lg:block">
        <svg viewBox="0 0 40 300" className="absolute top-[-1.25rem] -left-1 h-[calc(100%+2.5rem)] w-10" aria-hidden="true" preserveAspectRatio="none" fill="none">
          <path d="M4 4 A 28 146 0 0 1 4 296" stroke="#fff" opacity=".3" vectorEffect="non-scaling-stroke" />
        </svg>
        <svg viewBox="0 0 40 300" className="pointer-events-none absolute top-[-1.25rem] -left-1 h-[calc(100%+2.5rem)] w-10" aria-hidden="true" preserveAspectRatio="none">
          <circle ref={dot} cx="4" cy="4" r="4" fill="#fff" />
        </svg>
        <ul className="relative ml-11 space-y-1">
          {CHAPTERS.map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={active === id ? "true" : undefined}
                className={`tag block whitespace-nowrap text-white no-underline transition-opacity hover:opacity-100 focus-visible:opacity-100 ${active === id ? "opacity-100" : "opacity-0 hover:opacity-80 focus-visible:opacity-80"}`}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <nav aria-label="Chapters" className="sky-night rule-b sticky top-0 z-30 overflow-x-auto lg:hidden" style={{ scrollbarWidth: "none" }}>
        <ul className="flex gap-1 px-2">
          {CHAPTERS.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} aria-current={active === id ? "true" : undefined} className={`tag flex h-11 items-center whitespace-nowrap px-2.5 no-underline ${active === id ? "text-[var(--acc)]" : "text-[var(--mut)]"}`}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
