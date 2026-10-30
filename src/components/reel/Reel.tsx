"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DateEntry } from "../DateEntry";
import { ShareActions } from "../ShareActions";
import { Wordmark } from "../Wordmark";
import { Backdrop, CommonsVideo, GoalArt, Headline, IntroArt, Star, VinylArt, Youtube } from "./Slides";
import type { Moment } from "@/lib/moments";
import type { ParsedDate } from "@/lib/types";

interface Props {
  date: ParsedDate;
  label: string;
  weekday: string;
  arDate: string;
  moments: Moment[];
  coverage: string;
}

const INTRO_MS = 4500;
const SLIDE_MS = 7500;
const VIDEO_MS = 18000;

const size = (text: string) =>
  text.length < 22 ? "text-[clamp(3rem,10vw,7.5rem)]" : text.length < 48 ? "text-[clamp(2.4rem,6.8vw,5.25rem)]" : "text-[clamp(1.8rem,4.6vw,3.5rem)]";

const stop = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation(), onPointerUp: (e: React.PointerEvent) => e.stopPropagation() };

export function Reel({ date, label, weekday, arDate, moments, coverage }: Props) {
  const reduced = useReducedMotion();
  const last = moments.length + 1;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [videoFailed, setVideoFailed] = useState<Record<string, boolean>>({});
  const held = useRef<number | undefined>(undefined);
  const downAt = useRef<{ x: number; t: number } | null>(null);

  const go = useCallback((delta: number) => setIndex((i) => Math.max(0, Math.min(last, i + delta))), [last]);

  const moment = index >= 1 && index <= moments.length ? moments[index - 1]! : null;
  const useYoutube = !!moment?.youtube && !reduced;
  const useVideo = !!moment?.videoFile && !useYoutube && !videoFailed[moment.id] && !reduced;
  const duration = index === 0 ? INTRO_MS : useYoutube ? VIDEO_MS : SLIDE_MS;
  const isEnd = index === last;
  const hasMorocco = moments.some((m) => m.morocco);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, select, textarea")) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " " && target.tagName !== "BUTTON" && target.tagName !== "A") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Load the next picture before its turn.
  useEffect(() => {
    const next = moments[index]?.image?.src;
    if (next) new Image().src = next;
  }, [index, moments]);

  const onDown = (e: React.PointerEvent) => {
    downAt.current = { x: e.clientX, t: Date.now() };
    held.current = window.setTimeout(() => setPaused(true), 220);
  };
  const onUp = (e: React.PointerEvent) => {
    clearTimeout(held.current);
    const start = downAt.current;
    downAt.current = null;
    if (!start) return;
    if (Date.now() - start.t > 220) {
      setPaused(false);
      return;
    }
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    else go(e.clientX < window.innerWidth * 0.3 ? -1 : 1);
  };

  return (
    <div className={`relative h-[100svh] overflow-hidden bg-[#08070e] text-white select-none ${paused ? "is-paused" : ""}`}>
      <p className="sr-only" aria-live="polite">
        {moment ? `Moment ${index} of ${moments.length}: ${moment.kicker}. ${moment.arTitle ?? ""} ${moment.title}` : isEnd ? "End of the story" : label}
      </p>

      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          className="absolute inset-0"
          initial={reduced ? false : { opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: moment?.kind === "died" ? 1 : 0.5 }}
        >
          {index === 0 && (
            <div className="sky-night absolute inset-0 overflow-hidden">
              <IntroArt year={date.year} month={date.month} day={date.day} />
              <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: "radial-gradient(80% 100% at 60% 100%, rgb(245 166 91 / .28), transparent 72%)" }} />
              <div className="absolute inset-x-0 bottom-24 px-5 sm:bottom-20 sm:px-12">
                <p className="tag text-[var(--acc)]">{weekday}</p>
                <h1 className="display nums mt-2 text-white">
                  <span className="block text-[clamp(2.6rem,8vw,5.5rem)] italic">{label.replace(/ \d{4}$/, "")}</span>
                  <span className="block text-[clamp(6rem,24vw,16rem)] leading-[0.9]">{date.year}</span>
                </h1>
                {hasMorocco && <p dir="rtl" lang="ar" className="font-arabic mt-2 text-left text-2xl font-medium">{arDate}</p>}
                <p className="mt-3 text-xl text-white/85">{moments.length ? `${moments.length} big ${moments.length === 1 ? "moment" : "moments"} from your day` : "We found no big names for this day"}</p>
              </div>
            </div>
          )}

          {moment && (
            <>
              {useYoutube ? (
                <Youtube id={moment.youtube!} title={moment.title} />
              ) : useVideo ? (
                <CommonsVideo file={moment.videoFile!} onFail={() => setVideoFailed((v) => ({ ...v, [moment.id]: true }))} />
              ) : (
                <Backdrop moment={moment} index={index} />
              )}
              {moment.kind === "goal" && !useYoutube && <GoalArt />}
              {moment.kind === "music" && !useYoutube && <VinylArt moment={moment} />}

              <div className="absolute inset-x-0 bottom-20 px-5 sm:bottom-16 sm:px-12">
                <div className="max-w-5xl">
                  <p className="tag flex flex-wrap items-center gap-2 text-white/90">
                    {moment.kind === "music" && <span className="eq text-[#f5a65b] [height:1rem]" aria-hidden="true"><i /><i /><i /><i /><i /></span>}
                    {moment.kicker}
                    {moment.morocco && (
                      <span className="font-arabic inline-flex items-center gap-1.5 bg-[#c1272d] px-2 py-0.5 text-[0.9rem] tracking-normal text-white normal-case" lang="ar" dir="rtl">
                        <Star className="h-3.5 w-3.5 text-[#7fe0a3]" /> المغرب · {moment.arKicker}
                      </span>
                    )}
                  </p>

                  {moment.morocco && moment.arTitle && (
                    <motion.p
                      dir="rtl"
                      lang="ar"
                      className="font-arabic mt-3 text-right text-[clamp(2.6rem,8.5vw,6rem)] leading-[1.15] font-bold text-white sm:text-left"
                      initial={{ opacity: 0, y: 22 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.55 }}
                    >
                      {moment.arTitle}
                    </motion.p>
                  )}

                  <div className="mt-2">
                    <Headline
                      text={moment.title}
                      calm={moment.kind === "died"}
                      size={moment.morocco && moment.arTitle ? "text-[clamp(1.7rem,4.4vw,3rem)]" : size(moment.title)}
                    />
                  </div>

                  {moment.score && moment.kind === "goal" && (
                    <motion.p className="display nums mt-1 text-[clamp(2.2rem,6vw,4rem)] text-[#f5a65b]" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.7, duration: 0.4 }}>
                      Final score {moment.score}
                    </motion.p>
                  )}
                  {moment.arLine && (
                    <p dir="rtl" lang="ar" className="font-arabic mt-2 line-clamp-2 text-right text-xl leading-snug text-white/90 sm:text-left">{moment.arLine}</p>
                  )}
                  {moment.line && moment.line !== moment.title && <p className="mt-1 line-clamp-1 text-lg text-white/80 sm:text-xl">{moment.line}</p>}

                  <p className="tag relative z-20 mt-3 text-white/75">
                    <a href={moment.sourceUrl} rel="noreferrer" className="link" {...stop}>{moment.sourceLabel}</a>
                    {moment.image && !useYoutube && (
                      <>
                        {" · Photo: "}
                        <a href={moment.image.pageUrl} rel="noreferrer" className="link" {...stop}>{moment.image.credit.slice(0, 32)}, {moment.image.license}</a>
                      </>
                    )}
                    {" · "}
                    <Link href={`/day/${date.iso}/story/${encodeURIComponent(moment.storyId)}`} className="link" {...stop}>More</Link>
                  </p>
                </div>
              </div>
            </>
          )}

          {isEnd && (
            <div className="sky-night absolute inset-0 overflow-y-auto">
              <div className="mx-auto grid min-h-full max-w-5xl content-center gap-10 px-5 py-24 sm:px-12 lg:grid-cols-2">
                <div>
                  <p className="tag text-[var(--acc)]">That was {label}</p>
                  <h2 className="display mt-2 text-[clamp(2.8rem,7vw,4.5rem)] text-white">Send it to someone born that day.</h2>
                  <ShareActions iso={date.iso} label={label} />
                  <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                    <button type="button" className="tag link cursor-pointer" onClick={() => setIndex(0)}>Watch again</button>
                    <Link className="tag link" href={`/day/${date.iso}/archive`}>Full record</Link>
                    <Link className="tag link" href="/method">Sources and credits</Link>
                  </div>
                  <p className="mt-5 text-base text-white/70">{coverage}</p>
                </div>
                <div>
                  <h2 className="display text-[2.2rem] text-white">Try another day</h2>
                  <div className="mt-4"><DateEntry submitLabel="Watch that day" compact /></div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tap areas: left goes back, right goes forward, holding pauses. Captions and controls sit above this. */}
      {!isEnd && <div className="absolute inset-0 z-10" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => clearTimeout(held.current)} aria-hidden="true" />}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/55 to-transparent px-3 pt-3 pb-10 sm:px-6">
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: last + 1 }, (_, i) => (
            <div key={i} className="h-[3px] flex-1 overflow-hidden bg-white/30">
              {i < index && <div className="h-full bg-white" />}
              {i === index && !isEnd && !reduced && (
                <div key={`${index}-${duration}`} className="bar-fill h-full bg-white" style={{ "--dur": `${duration}ms` } as React.CSSProperties} onAnimationEnd={() => go(1)} />
              )}
              {i === index && (isEnd || reduced) && <div className="h-full bg-white" />}
            </div>
          ))}
        </div>
        <div className="pointer-events-auto mt-2.5 flex items-center justify-between">
          <div className="text-white"><Wordmark /></div>
          <div className="flex items-center gap-1">
            {!reduced && !isEnd && (
              <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play" : "Pause"} className="grid h-11 w-11 cursor-pointer place-items-center text-white">
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">{paused ? <path d="M4 2v12l10-6z" /> : <path d="M3 2h4v12H3zM9 2h4v12H9z" />}</svg>
              </button>
            )}
            <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous moment" className="grid h-11 w-11 cursor-pointer place-items-center text-xl text-white disabled:opacity-30">←</button>
            <button type="button" onClick={() => go(1)} disabled={isEnd} aria-label="Next moment" className="grid h-11 w-11 cursor-pointer place-items-center text-xl text-white disabled:opacity-30">→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
