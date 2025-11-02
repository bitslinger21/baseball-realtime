import type { GameStatus, ScoreSummary, TeamStub } from "../types";

/**
 * A single row of summarized game information shown in the DailyGamesPage list.
 * Mirrors the minimal data you need for each day's schedule.
 */
export interface GameRow {
  /** MLB gamePk or internal game ID */
  gamePk: number;

  /** Game status: scheduled | inProgress | final */
  status: GameStatus;

  /** Local start time (ISO string) */
  startISO: string;

  /** Compact team info */
  home: TeamStub;
  away: TeamStub;

  /** Current or final score snapshot */
  score?: ScoreSummary;

  /** True if replay data is available (for completed games) */
  hasReplay?: boolean;

  /** Optional short descriptor (e.g., “Bot 5 • 2 Out”) for UI convenience */
  label?: string;
}
