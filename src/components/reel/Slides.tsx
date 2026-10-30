"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Rings } from "../Rings";
import { Poster } from "../Artwork";
import type { Moment } from "@/lib/moments";

const KEN = ["ken-a", "ken-b", "ken-c"];

export function Backdrop({ moment, index }: { moment: Moment; index: number }) {
  const [failed, setFailed] = useState(false);
  const mono = moment.kind === "died";
  if (!moment.image || failed) return <Field moment={moment} />;
  const portrait = moment.image.height > moment.image.width * 1.05;
  return (
    <div className="absolute inset-0 overflow-hidden bg-black" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- Commons thumbnails, sized by the API. */}
      <img src={moment.image.src} alt="" referrerPolicy="no-referrer" className={`absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-2xl ${mono ? "grayscale" : ""}`} />
      {/* eslint-disable-next-line @next/next/no-img-element -- As above. */}
      <img
        src={moment.image.src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${KEN[index % 3]} absolute inset-0 h-full w-full object-cover ${portrait ? "object-[50%_18%] md:right-[4vw] md:left-auto md:w-[72vh] md:[mask-image:linear-gradient(90deg,transparent,#000_16%,#000_84%,transparent)]" : ""} ${mono ? "grayscale" : ""}`}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgb(8 7 14 / .94) 4%, rgb(8 7 14 / .5) 38%, rgb(8 7 14 / .08) 66%, rgb(8 7 14 / .5))" }} />
    </div>
  );
}

const FIELDS: Record<Moment["kind"], string> = {
  news: "#1b2a4a", born: "#c8452c", died: "#1c1a22", music: "#3b1d5e", film: "#0f3b44", goal: "#0e5a3c", match: "#0e5a3c", launch: "#0d1236",
};

/** No free picture: motion and colour carry the slide instead of a blank. */
function Field({ moment }: { moment: Moment }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: moment.morocco ? "#8f1a22" : FIELDS[moment.kind] }} aria-hidden="true">
      <div className="absolute top-[-8vmin] right-[-16vmin] h-[120vmin] w-[120vmin] text-white/30">
        <span className="ripple" /><span className="ripple" /><span className="ripple" />
      </div>
      {moment.kind === "film" && (
        <div className="absolute top-[12vh] right-[6vw] hidden w-64 md:block"><Poster title={moment.title} line={moment.line} /></div>
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgb(8 7 14 / .78), transparent 62%)" }} />
    </div>
  );
}

export function Youtube({ id, title }: { id: string; title: string }) {
  return (
    <div className="absolute inset-0 bg-black">
      <iframe
        className="absolute top-1/2 left-1/2 aspect-video h-auto min-h-full w-auto min-w-full -translate-x-1/2 -translate-y-1/2 border-0"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&playsinline=1&modestbranding=1&rel=0`}
        title={`Video: ${title}`}
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgb(8 7 14 / .9) 6%, transparent 46%)" }} />
    </div>
  );
}

export function CommonsVideo({ file, onFail }: { file: string; onFail: () => void }) {
  return (
    <video
      className="absolute inset-0 h-full w-full bg-black object-cover"
      src={`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`}
      autoPlay
      muted
      loop
      playsInline
      onError={onFail}
    />
  );
}

/** A ball curling into the top corner. Decoration: it shows that a goal happened, not how it looked. */
export function GoalArt() {
  return (
    <svg viewBox="0 0 380 210" className="absolute top-[13vh] right-[4vw] w-[min(78vw,30rem)] opacity-95" aria-hidden="true">
      <g className="net" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1">
        <path d="M250 200 V20 H372 V200" strokeWidth="3" strokeOpacity=".95" />
        {[30, 50, 70, 90, 110, 130, 150, 170, 190].map((y) => <line key={y} x1="250" x2="372" y1={y} y2={y} />)}
        {[270, 290, 310, 330, 350].map((x) => <line key={x} x1={x} x2={x} y1="20" y2="200" />)}
      </g>
      <circle className="goal-flash" cx="330" cy="62" r="46" fill="#fff" opacity="0" />
      <g className="ball">
        <circle r="10" fill="#fff" />
        <path d="M0 -5 l4.8 3.5 -1.8 5.6 h-6 l-1.8 -5.6z" fill="#101010" />
      </g>
    </svg>
  );
}

export function VinylArt({ moment }: { moment: Moment }) {
  return (
    <div className="absolute top-[13vh] right-[5vw] w-[min(46vw,20rem)]" aria-hidden="true">
      <div className="vinyl relative aspect-square rounded-full" style={{ background: "repeating-radial-gradient(circle, #111 0 2px, #1e1e1e 2px 4px)" }}>
        <div className="absolute inset-[30%] overflow-hidden rounded-full bg-[#f5a65b]">
          {moment.image && (
            // eslint-disable-next-line @next/next/no-img-element -- As above.
            <img src={moment.image.src} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          )}
        </div>
      </div>
    </div>
  );
}

export function Star({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M12 2.5 17.6 21 2.8 9.6h18.4L6.4 21z" />
    </svg>
  );
}

/** Words arrive one by one; the text stays short so the picture does the talking. */
export function Headline({ text, calm, size }: { text: string; calm: boolean; size: string }) {
  return (
    <h2 className={`display ${size} text-white`}>
      {text.split(" ").map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block whitespace-pre"
          initial={{ opacity: 0, y: calm ? 0 : 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: calm ? 1.1 : 0.5, delay: 0.12 + i * (calm ? 0.1 : 0.06), ease: [0.2, 0.7, 0.2, 1] }}
        >
          {word}{" "}
        </motion.span>
      ))}
    </h2>
  );
}

export function IntroArt({ year, month, day }: { year: number; month: number; day: number }) {
  return <Rings year={year} month={month} day={day} className="absolute top-1/2 right-[-22vmin] h-[120vmin] w-[120vmin] -translate-y-1/2 opacity-50" />;
}
