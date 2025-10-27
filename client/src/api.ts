import type { GameRow } from './types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function fetchGamesByDate(ymd: string): Promise<GameRow[]> {
  const url = `${API}/games?date=${encodeURIComponent(ymd)}`;

  // Optional: basic timeout
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);

  try {
    const res = await fetch(url, { signal: ctrl.signal });

    // Read text first so we can handle empty/invalid JSON
    const text = await res.text();

    if (!res.ok) {
      // Include body snippet for debugging
      throw new Error(`GET ${url} -> ${res.status} ${res.statusText} :: ${text.slice(0, 200)}`);
    }

    if (!text) return []; // empty body → treat as "no games"
    try {
      return JSON.parse(text) as GameRow[];
    } catch {
      throw new Error(`Invalid JSON from ${url}: "${text.slice(0, 200)}"`);
    }
  } finally {
    clearTimeout(t);
  }
}
