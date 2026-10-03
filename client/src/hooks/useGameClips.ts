import { useCallback, useEffect, useRef, useState } from "react";
import type { ClipIndexWire, ClipWire } from "../pages/game/clipTypes";

const POLL_MS = 60_000;

// GET /games/:gameId/clip-index — the light play → clip mapping (id, at-bat,
// inning, duration) that Watch buttons and scorecard marks need on page load.
// Re-fetched on each new play (via `refreshKey`) or every 60s, whichever is
// first. A failure leaves the page exactly as it is without clips.
export function useGameClipIndex(gameId: string | null | undefined, refreshKey: unknown): ClipIndexWire[] {
  const [index, setIndex] = useState<ClipIndexWire[]>([]);
  const gameIdRef = useRef(gameId);
  gameIdRef.current = gameId;

  useEffect(() => {
    if (gameId == null) {
      setIndex([]);
      return;
    }
    let cancelled = false;
    const load = (): void => {
      void fetch(`/api/games/${encodeURIComponent(gameId)}/clip-index`)
        .then((res) => (res.ok ? (res.json() as Promise<ClipIndexWire[]>) : Promise.reject(new Error("bad response"))))
        .then((rows) => {
          if (!cancelled && gameIdRef.current === gameId) setIndex(rows);
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

  return index;
}

export type LazyClipsStatus = "idle" | "loading" | "loaded" | "error";

// GET /games/:gameId/clips — the full clip list (titles, media URLs), loaded
// only when asked for: the Highlights row opening, or a clip being played
// (PROMPT_highlights_lazy.md). Once loaded it's kept — closing and reopening
// the row doesn't refetch. `ensure(id)` refetches only when a clip that the
// index knows about isn't in the loaded list yet (a new clip in a live game).
export function useLazyGameClips(gameId: string | null | undefined): {
  clips: ClipWire[];
  status: LazyClipsStatus;
  load: () => void;
  ensure: (clipId: string) => void;
} {
  const [clips, setClips] = useState<ClipWire[]>([]);
  const [status, setStatus] = useState<LazyClipsStatus>("idle");
  const gameIdRef = useRef(gameId);
  const clipsRef = useRef(clips);
  const inFlight = useRef(false);
  clipsRef.current = clips;

  // A new game page starts empty and unloaded.
  useEffect(() => {
    gameIdRef.current = gameId;
    setClips([]);
    setStatus("idle");
    inFlight.current = false;
  }, [gameId]);

  const fetchAll = useCallback((): void => {
    const id = gameIdRef.current;
    if (id == null || inFlight.current) return;
    inFlight.current = true;
    setStatus((s) => (s === "loaded" ? s : "loading"));
    void fetch(`/api/games/${encodeURIComponent(id)}/clips`)
      .then((res) => (res.ok ? (res.json() as Promise<ClipWire[]>) : Promise.reject(new Error("bad response"))))
      .then((rows) => {
        if (gameIdRef.current !== id) return;
        setClips(rows);
        setStatus("loaded");
      })
      .catch(() => {
        if (gameIdRef.current === id) setStatus((s) => (s === "loaded" ? s : "error"));
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  const load = useCallback((): void => {
    if (status === "loaded" || status === "loading") return;
    fetchAll();
  }, [status, fetchAll]);

  const ensure = useCallback(
    (clipId: string): void => {
      if (!clipsRef.current.some((c) => c.id === clipId)) fetchAll();
    },
    [fetchAll],
  );

  return { clips, status, load, ensure };
}
