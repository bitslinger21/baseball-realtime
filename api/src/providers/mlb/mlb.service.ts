import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { GameDto } from 'src/games/dtos/games.dto';

// Node 18+ has global fetch; if you’re on older Node, install 'undici' or 'node-fetch'
const BASE = 'https://statsapi.mlb.com/api';

@Injectable()
export class MlbApiService {
  private readonly log = new Logger(MlbApiService.name);

  /**
   * Return normalized games for a yyyy-mm-dd date.
   */
  async getScheduleByDate(date: string): Promise<GameDto[]> {
    const url = `${BASE}/v1/schedule?sportId=1&date=${encodeURIComponent(date)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
       throw new InternalServerErrorException(`MLB schedule failed: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();

    const games = (data?.dates ?? []).flatMap((d: any) => d?.games ?? []);
    return games.map((g: any) => {
      const gamePk = String(g.gamePk);
      const statusRaw = (g.status?.abstractGameState ?? '').toLowerCase(); // 'preview' | 'live' | 'final'
      const status = statusRaw === 'preview' ? 'scheduled' : statusRaw;

      const home = g.teams?.home?.team ?? {};
      const away = g.teams?.away?.team ?? {};
      const abbr = (t: any) =>
        t?.abbreviation ?? t?.fileCode?.toUpperCase?.() ?? t?.teamCode ?? t?.teamName ?? t?.name ?? 'UNK';

      return plainToInstance(GameDto, {
        providerGameId: gamePk,
        gameDate: date,
        homeAbbr: abbr(home),
        awayAbbr: abbr(away),
        status, // scheduled | live | final
        startTimeUtc: g.gameDate ?? null,
        snapshot: undefined,
      });
    });
  }

  /**
   * Live feed for a gamePk (string).
   */
  async getLiveFeed(gamePk: string) {
    const url = `${BASE}/v1.1/game/${encodeURIComponent(gamePk)}/feed/live`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`MLB live feed failed: ${res.status} ${res.statusText}`);
    return res.json();
  }
}
