"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { MONTHS, weekday } from "@/lib/date";
import type { ParsedDate } from "@/lib/types";

const RevealContext = createContext<(date: ParsedDate) => void>(() => undefined);
export const useOpenDate = () => useContext(RevealContext);

const REWIND_MS = 900;

/** Plays over the route change. The page behind it streams its data meanwhile, so nothing here waits on data
 *  or says that anything has been found: it only shows the calendar facts of the chosen date. */
export function RevealProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [date, setDate] = useState<ParsedDate | null>(null);

  const open = useCallback(
    (d: ParsedDate) => {
      if (reduced) {
        router.push(`/day/${d.iso}`);
        return;
      }
      setDate(d);
      router.push(`/day/${d.iso}`);
    },
    [reduced, router],
  );

  return (
    <RevealContext.Provider value={open}>
      {children}
      <AnimatePresence>{date && <Overlay key={date.iso} date={date} onDone={() => setDate(null)} />}</AnimatePresence>
    </RevealContext.Provider>
  );
}

function Overlay({ date, onDone }: { date: ParsedDate; onDone: () => void }) {
  const from = new Date().getUTCFullYear();
  const [year, setYear] = useState(from);
  const [settled, setSettled] = useState(false);
  const frame = useRef(0);

  useEffect(() => {
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / REWIND_MS);
      const eased = 1 - (1 - t) ** 3;
      setYear(Math.round(from + (date.year - from) * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else setSettled(true);
    };
    frame.current = requestAnimationFrame(tick);
    const done = setTimeout(onDone, REWIND_MS + 950);
    return () => {
      cancelAnimationFrame(frame.current);
      clearTimeout(done);
    };
  }, [date.year, from, onDone]);

  return (
    <motion.div
      className="sky-night fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-4 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(10px)" }}
      transition={{ duration: 0.3 }}
      role="status"
      aria-label={`Opening ${date.day} ${MONTHS[date.month - 1]} ${date.year}`}
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[70vh]"
        style={{ background: "radial-gradient(70% 100% at 50% 100%, rgb(245 166 91 / .28), transparent 70%)" }}
        initial={{ y: "45%", opacity: 0 }}
        animate={settled ? { y: 0, opacity: 1 } : { y: "30%", opacity: 0.4 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
      <div aria-hidden="true" className="relative">
        <p className="tag text-[var(--mut)]">{settled ? "You arrived on" : "Going back"}</p>
        <p className="display nums mt-3 text-[clamp(5.5rem,24vw,17rem)] leading-none">{year}</p>
        <motion.p
          className="display mt-4 text-[clamp(1.6rem,5vw,3rem)] italic"
          initial={{ opacity: 0, y: 12 }}
          animate={settled ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45 }}
        >
          {weekday(date)}, {date.day} {MONTHS[date.month - 1]}
        </motion.p>
      </div>
    </motion.div>
  );
}
