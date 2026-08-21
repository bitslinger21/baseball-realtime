import { useEffect, useRef, useState } from "react";
import { getSocket } from "./useRealtimeGame";

export type PitchMixEntry = {
  code: string;
  name: string;
  color: string;
  percent: number;
};

export type PitchMixData = {
  entries: PitchMixEntry[];
  seenCount: number;
  avgVelocity: string | null;
};

export type WinProbDataPoint = {
  inning: number;  // 0–9 range (0 = game start, 9 = end of 9th)
  prob: number;    // −100 to +100 (positive = home team favored)
};

export type WinProbData = {
  homeTeamWinProb: number;     // 0–100 current home-team win probability
  dataPoints: WinProbDataPoint[];
};

export type FieldData = {
  altitude: number | null;
  seasonHR: number | null;
  distLF: number | null;
  distCF: number | null;
  distRF: number | null;
};

export type WeatherData = {
  temp: number | null;
  condition: string | null;
  windSpeed: number | null;
  windDirection: string | null; // cardinal: "SW", "NE", etc.
  windLabel: string | null;     // raw display string from MLB
  windRotation: number | null;  // CSS rotation (deg) for field-image overlay; 0=toward HP, 180=toward CF
  humidity: number | null;
  pressure: number | null;
};

export type DailyGameStatusWire = {
  gameId: string;
  gameDate: string;
  startTimeUtc: string | null;
  homeAbbr: string;
  awayAbbr: string;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  phase:
    | "SCHEDULED"
    | "LIVE"
    | "FINAL"
    | "DELAYED"
    | "POSTPONED"
    | "SUSPENDED"
    | "CANCELLED"
    | "WARMUP"
    | "UNKNOWN";
  inning: number | null;
  half: "top" | "bottom" | null;
  outs: number | null;
  statusText: string;
  detailedState: string | null;
  venue: string | null;
  city?: string | null;
  state?: string | null;
  // Live enrichment (present for LIVE games; null/false otherwise)
  balls: number | null;
  strikes: number | null;
  on1: boolean;
  on2: boolean;
  on3: boolean;
  runner1: string | null;
  runner2: string | null;
  runner3: string | null;
  pitcherName: string | null;
  pitcherEra: string | null;
  pitchCount: number | null;
  batterName: string | null;
  batterAvg: string | null;
  batterHits: number | null;
  batterAtBats: number | null;
  awayHits: number | null;
  awayErrors: number | null;
  homeHits: number | null;
  homeErrors: number | null;
  elapsedMinutes: number | null;
  pitchMix?: PitchMixData | null;
  winProb?: WinProbData | null;
  fieldCard?: FieldData | null;
  weather?: WeatherData | null;
};

type DailySnapshotWire = {
  dateKey: string;
  ts: string;
  games: readonly DailyGameStatusWire[];
};

export function useRealtimeDailyGames(
  dateKey: string | null,
): ReadonlyMap<string, DailyGameStatusWire> {
  const [overrides, setOverrides] = useState<ReadonlyMap<string, DailyGameStatusWire>>(
    () => new Map(),
  );

  const dateKeyRef = useRef<string | null>(null);

  useEffect(() => {
    dateKeyRef.current = dateKey;
  }, [dateKey]);

  // Attach daily listener and reconnect handler once (socket is singleton).
  useEffect(() => {
    const socket = getSocket();

    const handleDaily = (msg: unknown): void => {
      const snap = msg as DailySnapshotWire;
      if (!Array.isArray(snap?.games)) return;
      if (typeof snap.dateKey === "string" && snap.dateKey !== "" && snap.dateKey !== dateKeyRef.current) return;

      const next = new Map<string, DailyGameStatusWire>();
      for (const g of snap.games) {
        if (typeof g.gameId === "string" && g.gameId !== "") {
          next.set(g.gameId, g);
        }
      }
      setOverrides(next);
    };

    const handleConnect = (): void => {
      const dk = dateKeyRef.current;
      if (dk != null && dk !== "") {
        socket.emit("joinDaily", { dateKey: dk });
      }
    };

    socket.on("daily", handleDaily);
    socket.on("connect", handleConnect);

    return (): void => {
      socket.off("daily", handleDaily);
      socket.off("connect", handleConnect);
    };
  }, []);

  // Join/leave the daily room whenever the dateKey changes.
  useEffect(() => {
    const socket = getSocket();

    if (dateKey == null || dateKey === "") return;

    socket.emit("joinDaily", { dateKey });
    setOverrides(new Map());

    return (): void => {
      socket.emit("leaveDaily", { dateKey });
    };
  }, [dateKey]);

  return overrides;
}
