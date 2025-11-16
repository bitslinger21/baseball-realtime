// api/src/realtime/realtime.types.ts
export interface PlayUpdate {
  providerGameId: string;
  description: string;
  inning: number;
  half: "top" | "bottom";
  homeScore: number;
  awayScore: number;
  ts: string; // ISO timestamp
}