import { DateEntry } from "@/components/DateEntry";
import { Wordmark } from "@/components/Wordmark";

export default function NotFound() {
  return (
    <main id="main" className="sky-night min-h-screen px-4 sm:px-8">
      <header className="mx-auto flex h-20 max-w-3xl items-center"><Wordmark /></header>
      <div className="mx-auto mt-10 max-w-3xl">
        <h1 className="display text-[clamp(2.75rem,8vw,5rem)]">That page isn’t in the archive.</h1>
        <p className="mt-4 max-w-lg text-[var(--mut)]">The date may be in the future, before 1900 or not a real day. Try another.</p>
        <div className="mt-8 max-w-lg"><DateEntry /></div>
      </div>
    </main>
  );
}
