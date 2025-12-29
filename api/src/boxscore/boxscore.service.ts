import { Injectable } from '@nestjs/common';
import { MlbApiService } from '../providers/mlb/mlb.service';
import type { BoxScoreDto, BatterLineDto, PitcherLineDto, BoxScoreSideDto } from './dtos/boxscore.dto';

type AnyObj = Record<string, unknown>;

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function arr(v: unknown): readonly unknown[] {
  return Array.isArray(v) ? v : [];
}

function maybeString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

@Injectable()
export class BoxScoreService {
  public constructor(private readonly mlb: MlbApiService) { }

  public async getBoxScore(providerGameId: string): Promise<BoxScoreDto> {
    // You likely already have a method like getLiveFeed/getGameFeed; if not, add it in mlb.service.ts
    const feed = (await this.mlb.getLiveFeed(providerGameId)) as AnyObj;

    const liveData = (feed.liveData ?? {}) as AnyObj;
    const box = (liveData.boxscore ?? {}) as AnyObj;
    const linescore = (liveData.linescore ?? {}) as AnyObj;

    const teams = (box.teams ?? {}) as AnyObj;
    const awayTeam = (teams.away ?? {}) as AnyObj;
    const homeTeam = (teams.home ?? {}) as AnyObj;

    const awayLs = ((linescore.teams ?? {}) as AnyObj).away as AnyObj | undefined;
    const homeLs = ((linescore.teams ?? {}) as AnyObj).home as AnyObj | undefined;

    const away: BoxScoreSideDto = {
      teamAbbr: str((awayTeam.team as AnyObj | undefined)?.abbreviation ?? 'AWY', 'AWY'),
      linescore: {
        runs: num(awayLs?.runs, 0),
        hits: num(awayLs?.hits, 0),
        errors: num(awayLs?.errors, 0),
      },
      batting: this.mapBatting(awayTeam),
      pitching: this.mapPitching(awayTeam),
    };

    const home: BoxScoreSideDto = {
      teamAbbr: str((homeTeam.team as AnyObj | undefined)?.abbreviation ?? 'HOM', 'HOM'),
      linescore: {
        runs: num(homeLs?.runs, 0),
        hits: num(homeLs?.hits, 0),
        errors: num(homeLs?.errors, 0),
      },
      batting: this.mapBatting(homeTeam),
      pitching: this.mapPitching(homeTeam),
    };

    return {
      providerGameId,
      away,
      home,
      ts: new Date().toISOString(),
    };
  }

  private mapBatting(side: AnyObj): BatterLineDto[] {
    const batters = arr(side.batters);
    const players = (side.players ?? {}) as AnyObj;

    const lines: BatterLineDto[] = [];

    for (const pidRaw of batters) {
      const pid = Number(pidRaw);
      if (!Number.isFinite(pid)) continue;

      const p = (players[`ID${pid}`] ?? {}) as AnyObj;
      const person = (p.person ?? {}) as AnyObj;
      const stats = ((p.stats ?? {}) as AnyObj).batting as AnyObj | undefined;

      if (!stats) continue;

      lines.push({
        playerId: pid,
        name: str(person.fullName, 'Unknown'),
        battingOrder: typeof p.battingOrder === 'string' ? p.battingOrder : null,
        jerseyNumber: maybeString(person.primaryNumber),
        ab: num(stats.atBats),
        r: num(stats.runs),
        h: num(stats.hits),
        rbi: num(stats.rbi),
        bb: num(stats.baseOnBalls),
        so: num(stats.strikeOuts),
        hr: num(stats.homeRuns),
      });
    }

    return lines;
  }

  private mapPitching(side: AnyObj): PitcherLineDto[] {
    const pitchers = arr(side.pitchers);
    const players = (side.players ?? {}) as AnyObj;

    const lines: PitcherLineDto[] = [];

    for (const pidRaw of pitchers) {
      const pid = Number(pidRaw);
      if (!Number.isFinite(pid)) continue;

      const p = (players[`ID${pid}`] ?? {}) as AnyObj;
      const person = (p.person ?? {}) as AnyObj;
      const stats = ((p.stats ?? {}) as AnyObj).pitching as AnyObj | undefined;

      if (!stats) continue;

      lines.push({
        playerId: pid,
        name: str(person.fullName, 'Unknown'),
        ip: str(stats.inningsPitched, '0.0'),
        h: num(stats.hits),
        r: num(stats.runs),
        er: num(stats.earnedRuns),
        bb: num(stats.baseOnBalls),
        so: num(stats.strikeOuts),
        pitches: typeof stats.pitchesThrown === 'number' ? stats.pitchesThrown : null,
        strikes: typeof stats.strikes === 'number' ? stats.strikes : null,
      });
    }

    return lines;
  }
}
