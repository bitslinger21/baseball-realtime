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
  pitchSpeedMph?: number;
  atBatIndex?: number;
  playResult?: string;
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

// What the hook returns to pages/components
export interface RealtimeState {
  plays: readonly PlayUpdate[];
  alerts: readonly GameAlert[];
  isConnected: boolean;
  connectionError: string | null;
}