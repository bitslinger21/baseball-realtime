const REPLAY_DELAY_STORAGE_KEY = "br-replay-delay-ms";
const DEFAULT_REPLAY_DELAY_MS = 2000;

export function getReplayDelayMs(): number {
  try {
    const raw = window.localStorage.getItem(REPLAY_DELAY_STORAGE_KEY);
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 50) return parsed;
  } catch {
    // ignore
  }

  return DEFAULT_REPLAY_DELAY_MS;
}
