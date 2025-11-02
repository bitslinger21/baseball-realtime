export type Count = { balls: number; strikes: number };
export type Bases = { on1?: boolean; on2?: boolean; on3?: boolean };

export type LiveUpdate = {
  gameId: string;
  inning: number;
  half: 'Top' | 'Bottom';
  outs: number;
  count: Count;
  bases: Bases;
  // optional alert payload from backend
  alert?: { type: string; [k: string]: any };
};

export type GameRow = {
  id?: string;
  providerGameId: string;
  gameDate: string;         // 'YYYY-MM-DD'
  homeAbbr: string;
  awayAbbr: string;
  status: 'scheduled'|'live'|'final';
  startTimeUtc?: string | null;
  snapshot?: Partial<LiveUpdate>;
};
