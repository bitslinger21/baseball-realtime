import { useEffect, useState } from "react";
import type { GameLineupsDto } from "@bitslinger21/scorebook-client";
import { gamesApi } from "../api/baseballApiClient";

// Re-read while the page is pregame: the official lineup can post at any time.
const REFRESH_MS = 60_000;

/** Both lineups before first pitch — official once posted, else projected (PROMPT_pregame_first_matchup.md). */
export function useGameLineups(gameId: string | null, enabled: boolean): { lineups: GameLineupsDto | null; loaded: boolean } {
  const [lineups, setLineups] = useState<GameLineupsDto | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (gameId == null || !enabled) return;
    let cancelled = false;
    const load = (): void => {
      gamesApi
        .gamesGetLineups(gameId)
        .then((r) => { if (!cancelled) setLineups(r.data); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoaded(true); });
    };
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [gameId, enabled]);

  return { lineups, loaded };
}
