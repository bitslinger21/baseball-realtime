// Structured event model for "What's Hot Right Now" — see
// PROMPT_home_page.md. Detection is deterministic (computed from real
// LiveUpdate history, never an LLM); Baseball IQ is a separate, optional
// consumer of the same events, not the source of them.

export type HotEventType =
  | 'NO_HIT_BID'
  | 'PERFECT_GAME_BID'
  | 'NO_HITTER_COMPLETED'
  | 'PERFECT_GAME_COMPLETED'
  | 'CYCLE_BID'
  | 'CYCLE_COMPLETED'
  | 'MULTI_HOME_RUN_GAME'
  | 'HIGH_LEVERAGE_LATE';

export type HotEventStatus = 'ACTIVE' | 'COMPLETED';

export interface HotEventGameContext {
  providerGameId: string;
  awayAbbr: string;
  homeAbbr: string;
  awayScore: number;
  homeScore: number;
  half: 'top' | 'bottom';
  inning: number;
}

export interface HotEventPlayer {
  id?: number;
  name: string;
}

// The structured event — the "important abstraction" per the spec. `headline`
// is display-ready prose (composed here, server-side — the client never
// assembles it); `iqSuggested` is static per-type prompt text, not a
// fabricated answer. The real answer still comes from a live /api/iq/query
// call when the user actually asks.
export interface HotEvent {
  id: string;
  type: HotEventType;
  status: HotEventStatus;
  headline: string;
  importance: number;
  occurredAt: string;
  detectedAt: string;
  updatedAt: string;
  expiresAt: string | null;
  game: HotEventGameContext | null;
  players: HotEventPlayer[];
  teams: string[];
  hasIqContext: boolean;
  iqSuggested: string[];
}
