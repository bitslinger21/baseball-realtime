export type { GameRow } from "./types/GameRow";
export type GameStatus = "scheduled" | "inProgress" | "final";
export type InningHalf = "T" | "B";

export interface TeamStub {
  id: number;
  name: string;
  abbr: string;
}

export interface ScoreSummary {
  home: number;
  away: number;
  inning?: number;
  half?: InningHalf;
}

export interface GameSummary {
  gamePk: number;
  status: GameStatus;
  startISO: string;
  home: TeamStub;
  away: TeamStub;
  score?: ScoreSummary;
}

// Live “envelope” sent over the socket
export type LiveUpdateKind = "play" | "pitch" | "score" | "status" | "heartbeat";

/** Generic live update wrapper. `ts` (ISO) or `t` (epoch ms) may be present depending on server */
export interface LiveUpdate<T = unknown> {
  gameId: string;
  type: LiveUpdateKind;
  payload: T;
  /** ISO timestamp (e.g., "2025-11-02T19:10:00Z") if your server uses string times */
  ts?: string;
  /** Epoch milliseconds if your server uses numeric times */
  t?: number;
}
