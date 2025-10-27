import { Injectable } from '@nestjs/common';

export interface PlayUpdate {
  gameId: string;
  ts: string;
  inning: number;
  half: 'Top' | 'Bottom';
  outs: number;
  count: { balls: number; strikes: number };
  bases: { on1?: boolean; on2?: boolean; on3?: boolean };
  note?: string;
}

// For now, a stub that generates changing state.
// Later, replace with a real adapter using mlb-stats-api.
@Injectable()
export class PollerService {
  private innings = new Map<string, number>();
  private outs = new Map<string, number>();

  async fetchLatest(gameId: string): Promise<PlayUpdate> {
    const inning = (this.innings.get(gameId) ?? 1) + (Math.random() < 0.15 ? 1 : 0);
    const outs = (this.outs.get(gameId) ?? 0 + (Math.random() < 0.5 ? 1 : 0)) % 3;

    this.innings.set(gameId, Math.min(inning, 9));
    this.outs.set(gameId, outs);

    return {
      gameId,
      ts: new Date().toISOString(),
      inning: this.innings.get(gameId)!,
      half: Math.random() < 0.5 ? 'Top' : 'Bottom',
      outs: this.outs.get(gameId)!,
      count: { balls: Math.floor(Math.random() * 4), strikes: Math.floor(Math.random() * 3) },
      bases: {
        on1: Math.random() < 0.3,
        on2: Math.random() < 0.2,
        on3: Math.random() < 0.1,
      },
      note: 'stub-update',
    };
  }
}
