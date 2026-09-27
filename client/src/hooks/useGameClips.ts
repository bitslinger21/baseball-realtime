import { useEffect, useRef, useState } from "react";
import type { ClipWire } from "../pages/game/clipTypes";

const POLL_MS = 60_000;

// GET /games/:gameId/clips — re-fetched on each new play (via `refreshKey`)
// or every 60s, whichever comes first (PROMPT_video_clips.md §6c). An
// endpoint that fails leaves the page exactly as it is without clips —
// never surfaced as a page-level error.
export function useGameClips(gameId: string | null | undefined, refreshKey: unknown): ClipWire[] {
  const [clips, setClips] = useState<ClipWire[]>([]);
  const gameIdRef = useRef(gameId);
  gameIdRef.current = gameId;

  useEffect(() => {
    if (gameId == null) {
      setClips([]);
      return;
    }
    let cancelled = false;
    const load = (): void => {
      void fetch(`/api/games/${encodeURIComponent(gameId)}/clips`)
        .then((res) => (res.ok ? (res.json() as Promise<ClipWire[]>) : Promise.reject(new Error("bad response"))))
        .then((rows) => {
          if (!cancelled && gameIdRef.current === gameId) setClips(rows);
        })
        .catch(() => {
          // Leave whatever was last successfully loaded.
        });
    };
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, refreshKey]);

  return clips;
}
