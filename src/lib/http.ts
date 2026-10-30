const CONTACT = process.env.CONTACT_EMAIL || "https://github.com/firstlight-archive";
export const USER_AGENT = `Firstlight/0.1 (${CONTACT})`;

export class ProviderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface FetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  /** Requests in a lane run one at a time, as Wikimedia and MusicBrainz ask. One lane per host. */
  lane?: string;
  /** Minimum gap between requests in a lane. */
  gapMs?: number;
}

const lanes = new Map<string, Promise<unknown>>();

function inLane<T>(lane: string | undefined, gapMs: number, task: () => Promise<T>): Promise<T> {
  if (!lane) return task();
  const previous = lanes.get(lane) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(async () => {
    try {
      return await task();
    } finally {
      if (gapMs) await sleep(gapMs);
    }
  });
  lanes.set(lane, run);
  return run;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { headers, timeoutMs = 15_000, retries = 2, lane, gapMs = 0 } = options;
  let lastError: ProviderError | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(400 * 2 ** (attempt - 1) + Math.random() * 200);
    try {
      return await inLane(lane, gapMs, async () => {
        const res = await fetch(url, {
          headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...headers },
          signal: AbortSignal.timeout(timeoutMs),
          cache: "no-store",
        });
        if (!res.ok) throw new ProviderError(`HTTP ${res.status}`, res.status);
        try {
          return (await res.json()) as T;
        } catch {
          throw new ProviderError("Malformed JSON response");
        }
      });
    } catch (err) {
      lastError = err instanceof ProviderError ? err : new ProviderError(err instanceof Error ? err.message : "Network error");
      if (lastError.status !== undefined && !RETRYABLE.has(lastError.status)) break;
    }
  }
  throw lastError ?? new ProviderError("Request failed");
}

export function qs(params: Record<string, string | number | undefined>): string {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) out.set(k, String(v));
  return out.toString();
}
