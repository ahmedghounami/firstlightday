"use client";

import { useState } from "react";

export function ShareActions({ iso, label }: { iso: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/day/${iso}`;
    const data = { title: `${label} · Firstlight`, text: `What the record shows for ${label}`, url };
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share(data);
      } catch {
        // Dismissing the share sheet is not an error.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" className="btn" onClick={share}>{copied ? "Link copied" : "Share this day"}</button>
      <a className="btn btn-ghost no-underline" href={`/day/${iso}/capsule`} download={`firstlight-${iso}.png`}>Download image</a>
      <span className="sr-only" aria-live="polite">{copied ? "Link copied to clipboard" : ""}</span>
    </div>
  );
}
