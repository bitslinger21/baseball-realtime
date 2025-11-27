// client/src/realtime/types.ts

// What the server sends for a normal play update
export type PlayUpdate = {
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
  ts: string; // ISO timestamp
};

// What AlertsService sends inside { alert: ... }
export type AlertUpdate = {
  type: string;
  note: string;
  at: string; // ISO timestamp
  // extra metadata (batterId, needs, etc) comes through here
  [key: string]: unknown;
};

// Raw payload from the socket
export type GameWireMessage = PlayUpdate | { alert: AlertUpdate };

// Shape returned by useRealtimeGame
export type RealtimeState = {
  plays: readonly PlayUpdate[];
  alerts: readonly AlertUpdate[];
};