// client/src/realtime/types.ts

export type TeamRhe = { runs: number; hits: number; errors: number };
export type LiveLinescore = { away: TeamRhe; home: TeamRhe };

// Mirror of the server-side PlayUpdate wire shape
export interface PlayUpdate {
  providerGameId: string;
  inning: number;
  half: "top" | "bottom";
  outs: number;
  balls: number;
  strikes: number;
  bases: {
    on1: boolean;
    on2: boolean;
    on3: boolean;
  };
  homeScore: number;
  awayScore: number;
  description?: string;
  batterName?: string;
  pitcherName?: string;
  batterAvg?: number;
  pitcherEra?: number;
  pitchType?: string;
  pitchTypeCode?: string;
  pitchSpeedMph?: number;
  atBatIndex?: number;
  playResult?: string;
  scorebookCode?: string;
  batterId?: number;
  pitchX?: number;
  pitchZ?: number;
  strikeZoneTop?: number;
  strikeZoneBottom?: number;
  batterGameAB?: number;
  batterGameH?: number;
  batterGameR?: number;
  batterGameRBI?: number;
  linescore?: LiveLinescore;
  ts?: string;
  playKey?: string;
  homeTeamWinProbability?: number;
  leverageIndex?: number;
}

export type GameHydratePayload = {
  gameId: string;
  plays: PlayUpdate[];
};

// Mirror of server-side GameAlert
export interface GameAlert {
  type: string;
  note: string;
  at: string;

  // Optional metadata
  batterId?: string;
  batterName?: string;
  pitcherId?: string;
  pitcherName?: string;
  needs?: string;
  ipOuts?: number;
}

// Envelope for websocket messages
export type GameWirePayload = {
  play?: PlayUpdate;
  alert?: GameAlert;
};

// Mirror of server-side BroadcastOutput
export interface NarrationPayload {
  gameId: string;
  sequence: number;
  eventType: string;
  narration: string;
  generatedAt: string;
  promptVersion: string;
  providerName: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

// What the hook returns to pages/components
export interface RealtimeState {
  plays: readonly PlayUpdate[];
  alerts: readonly GameAlert[];
  narrations: readonly NarrationPayload[];
  isConnected: boolean;
  connectionError: string | null;
}