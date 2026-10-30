"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="sky-night flex min-h-screen flex-col justify-center px-4 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="display text-[clamp(2.75rem,8vw,5rem)]">We lost the thread.</h1>
        <p className="mt-4 text-[var(--mut)]">Something went wrong while opening this page. Your date is fine, so try again.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="btn" onClick={reset}>Try again</button>
          <Link className="btn btn-ghost no-underline" href="/">Back to the start</Link>
        </div>
      </div>
    </main>
  );
}
