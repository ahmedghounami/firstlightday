"use client";

import { useEffect, useId, useRef, useState } from "react";
import { dateErrorMessage, MIN_YEAR, MONTHS, validateDate } from "@/lib/date";
import type { ParsedDate } from "@/lib/types";
import { useOpenDate } from "./Reveal";

export interface DraftDate {
  day?: number;
  month?: number;
  year?: number;
}

interface Props {
  initial?: DraftDate;
  onChange?: (draft: DraftDate) => void;
  submitLabel?: string;
  compact?: boolean;
}

const toNumber = (s: string) => (s.trim() === "" ? undefined : Number(s));

export function DateEntry({ initial, onChange, submitLabel = "Open that day", compact }: Props) {
  const id = useId();
  const open = useOpenDate();
  const [day, setDay] = useState(initial?.day ? String(initial.day) : "");
  const [month, setMonth] = useState(initial?.month ? String(initial.month) : "");
  const [year, setYear] = useState(initial?.year ? String(initial.year) : "");
  const [error, setError] = useState<string | null>(null);
  const monthRef = useRef<HTMLSelectElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const y = toNumber(year);
    onChange?.({
      day: toNumber(day),
      month: toNumber(month),
      year: year.length === 4 && y !== undefined && y >= MIN_YEAR ? y : undefined,
    });
  }, [day, month, year, onChange]);

  const check = (): ParsedDate | null => {
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    if (!day || !month || year.length !== 4) {
      setError(dateErrorMessage("format"));
      return null;
    }
    const result = validateDate(y, m, d);
    if (!result.ok) {
      setError(dateErrorMessage(result.error, y, m, d));
      return null;
    }
    return result.date;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const date = check();
    if (date) open(date);
    else if (!day) dayRef.current?.focus();
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Choose a date">
      <div className={`grid grid-cols-[4.25rem_minmax(0,1fr)_6rem] gap-3 sm:gap-5 ${compact ? "" : "sm:grid-cols-[5.25rem_minmax(0,1fr)_7.5rem]"}`}>
        <div className="field">
          <label htmlFor={`${id}-d`} className="tag text-[var(--mut)]">Day</label>
          <input
            ref={dayRef}
            id={`${id}-d`}
            inputMode="numeric"
            autoComplete="bday-day"
            placeholder="17"
            maxLength={2}
            value={day}
            aria-invalid={!!error}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              setDay(v);
              setError(null);
              if (v.length === 2) monthRef.current?.focus();
            }}
          />
        </div>
        <div className="field">
          <label htmlFor={`${id}-m`} className="tag text-[var(--mut)]">Month</label>
          <select
            ref={monthRef}
            id={`${id}-m`}
            autoComplete="bday-month"
            value={month}
            aria-invalid={!!error}
            onChange={(e) => {
              setMonth(e.target.value);
              setError(null);
              if (e.target.value) yearRef.current?.focus();
            }}
          >
            <option value="">Month</option>
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-y`} className="tag text-[var(--mut)]">Year</label>
          <input
            ref={yearRef}
            id={`${id}-y`}
            inputMode="numeric"
            autoComplete="bday-year"
            placeholder="2002"
            maxLength={4}
            value={year}
            aria-invalid={!!error}
            onChange={(e) => {
              setYear(e.target.value.replace(/\D/g, ""));
              setError(null);
            }}
          />
        </div>
      </div>
      <p className="mt-3 min-h-6 text-base text-[var(--acc)]" role="alert">{error}</p>
      <button type="submit" className="btn mt-2 w-full sm:w-auto">
        {submitLabel}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
