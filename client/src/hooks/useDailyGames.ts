import { useEffect, useState } from "react";
import type { GameSummary } from "../types";

export function useDailyGames(dateISO: string): { loading: boolean; games: GameSummary[] } {
  const [loading, setLoading] = useState<boolean>(true);
  const [games, setGames] = useState<GameSummary[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        // temporary mock until backend/API ready
        const res = await fetch(`/api/games?date=${dateISO}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as GameSummary[];
        if (alive) {
          setGames(data);
          setLoading(false);
        }
      } catch {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [dateISO]);

  return { loading, games };
}
