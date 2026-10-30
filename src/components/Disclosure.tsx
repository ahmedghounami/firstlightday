"use client";

import { useId, useState } from "react";

/** Server-rendered list items, revealed in steps with CSS so they all stay in the document. */
export function Disclosure({ initial, total, label, step = 20, children }: { initial: number; total: number; label: string; step?: number; children: React.ReactNode }) {
  const [shown, setShown] = useState(initial);
  const id = `list-${useId().replace(/\W/g, "")}`;
  return (
    <>
      <style>{`#${id} > li:nth-child(n + ${shown + 1}) { display: none; }`}</style>
      <ul id={id} className="rule-t list-none p-0">{children}</ul>
      {shown < total && (
        <button type="button" className="btn btn-ghost mt-6" onClick={() => setShown((s) => s + step)}>
          Show {Math.min(step, total - shown)} more {label}
        </button>
      )}
    </>
  );
}
