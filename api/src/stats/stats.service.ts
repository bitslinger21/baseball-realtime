import { Injectable } from '@nestjs/common';

type GameState = {
  inning: number; half: 'Top'|'Bottom'; outs: number;
  count: { balls: number; strikes: number };
  bases: { on1?: boolean; on2?: boolean; on3?: boolean };
};
@Injectable()
export class StatsService {
  private games = new Map<string, GameState>();

  applyUpdate(gameId: string, u: GameState) { this.games.set(gameId, u); }
  getGameSnapshot(gameId: string) { return this.games.get(gameId) ?? null; }
}
