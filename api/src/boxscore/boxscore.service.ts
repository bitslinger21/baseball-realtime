import { Injectable } from '@nestjs/common';
import { MlbApiService } from '../providers/mlb/mlb.service';
import type {
  BoxScoreDto,
  BatterLineDto,
  PitcherLineDto,
  BoxScoreSideDto,
  BenchPlayerDto,
  BullpenPlayerDto,
} from './dtos/boxscore.dto';

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
  private readonly cache = new Map<string, { data: BoxScoreDto; expiresAt: number }>();
  private readonly TTL_MS = 15_000;

  public constructor(private readonly mlb: MlbApiService) { }

  public async getBoxScore(providerGameId: string): Promise<BoxScoreDto> {
    const cached = this.cache.get(providerGameId);
    if (cached != null && Date.now() < cached.expiresAt) return cached.data;

    const feed = (await this.mlb.getLiveFeed(providerGameId)) as AnyObj;

    const liveData = (feed.liveData ?? {}) as AnyObj;
    const box = (liveData.boxscore ?? {}) as AnyObj;
    const linescore = (liveData.linescore ?? {}) as AnyObj;

    const teams = (box.teams ?? {}) as AnyObj;
    const awayTeam = (teams.away ?? {}) as AnyObj;
    const homeTeam = (teams.home ?? {}) as AnyObj;

    const paMap = this.buildPaMap(liveData);

    const awayLs = ((linescore.teams ?? {}) as AnyObj).away as AnyObj | undefined;
    const homeLs = ((linescore.teams ?? {}) as AnyObj).home as AnyObj | undefined;

    const innings = arr(linescore.innings);
    const awayInningRuns: (number | null)[] = innings.map((inn) => {
      const a = ((inn as AnyObj).away ?? {}) as AnyObj;
      return typeof a.runs === 'number' ? (a.runs as number) : null;
    });
    const homeInningRuns: (number | null)[] = innings.map((inn) => {
      const h = ((inn as AnyObj).home ?? {}) as AnyObj;
      return typeof h.runs === 'number' ? (h.runs as number) : null;
    });

    const away: BoxScoreSideDto = {
      teamAbbr: str((awayTeam.team as AnyObj | undefined)?.abbreviation ?? 'AWY', 'AWY'),
      linescore: {
        runs: num(awayLs?.runs, 0),
        hits: num(awayLs?.hits, 0),
        errors: num(awayLs?.errors, 0),
        inningRuns: awayInningRuns,
      },
      batting: this.mapBatting(awayTeam, paMap),
      bench: this.mapBench(awayTeam),
      pitching: this.mapPitching(awayTeam),
      bullpen: this.mapBullpen(awayTeam),
    };

    const home: BoxScoreSideDto = {
      teamAbbr: str((homeTeam.team as AnyObj | undefined)?.abbreviation ?? 'HOM', 'HOM'),
      linescore: {
        runs: num(homeLs?.runs, 0),
        hits: num(homeLs?.hits, 0),
        errors: num(homeLs?.errors, 0),
        inningRuns: homeInningRuns,
      },
      batting: this.mapBatting(homeTeam, paMap),
      bench: this.mapBench(homeTeam),
      pitching: this.mapPitching(homeTeam),
      bullpen: this.mapBullpen(homeTeam),
    };

    const result: BoxScoreDto = {
      providerGameId,
      away,
      home,
      ts: new Date().toISOString(),
    };
    this.cache.set(providerGameId, { data: result, expiresAt: Date.now() + this.TTL_MS });
    return result;
  }

  private static PA_ABBR: Record<string, string> = {
    'Home Run': 'HR',
    'Single': '1B',
    'Double': '2B',
    'Triple': '3B',
    'Walk': 'BB',
    'Intent Walk': 'BB',
    'Hit By Pitch': 'HBP',
    'Strikeout': 'K',
    'Grounded Into DP': 'GDP',
    'Double Play': 'DP',
    'Triple Play': 'TP',
    'Sac Fly': 'SF',
    'Sac Fly Double Play': 'SF',
    'Sac Bunt': 'SH',
    'Sac Bunt Double Play': 'SH',
    'Field Error': 'E',
    'Fielders Choice': 'FC',
    'Fielders Choice Out': 'FC',
    'Catcher Interference': 'CI',
  };

  private buildPaMap(liveData: AnyObj): Map<number, string> {
    const plays = ((liveData.plays ?? {}) as AnyObj).allPlays;
    if (!Array.isArray(plays)) return new Map();
    const map = new Map<number, string[]>();
    for (const play of plays) {
      const p = play as AnyObj;
      const about = (p.about ?? {}) as AnyObj;
      if (!about.isComplete) continue;
      const batterId = ((p.matchup ?? {}) as AnyObj).batter;
      const id = typeof batterId === 'object' && batterId != null
        ? (batterId as AnyObj).id
        : batterId;
      if (typeof id !== 'number') continue;
      const event = str(((p.result ?? {}) as AnyObj).event);
      if (!event) continue;
      const abbr = BoxScoreService.PA_ABBR[event] ?? 'Out';
      const arr2 = map.get(id) ?? [];
      arr2.push(abbr);
      map.set(id, arr2);
    }
    const result = new Map<number, string>();
    for (const [id, abbrs] of map) result.set(id, abbrs.join(' · '));
    return result;
  }

  private mapBatting(side: AnyObj, paMap: Map<number, string> = new Map()): BatterLineDto[] {
    const batters = arr(side.batters);
    const players = (side.players ?? {}) as AnyObj;

    const lines: BatterLineDto[] = [];

    for (const pidRaw of batters) {
      const pid = Number(pidRaw);
      if (!Number.isFinite(pid)) continue;

      const p = (players[`ID${pid}`] ?? {}) as AnyObj;
      const person = (p.person ?? {}) as AnyObj;
      const position = (p.position ?? {}) as AnyObj;
      const stats = ((p.stats ?? {}) as AnyObj).batting as AnyObj | undefined;
      const seasonBatting = ((p.seasonStats ?? {}) as AnyObj).batting as AnyObj | undefined;

      if (!stats) continue;

      const seasonAvgRaw = seasonBatting?.avg ?? seasonBatting?.average;
      const seasonAvg: string | null =
        typeof seasonAvgRaw === 'number'
          ? seasonAvgRaw.toFixed(3)
          : typeof seasonAvgRaw === 'string' && seasonAvgRaw !== ''
            ? seasonAvgRaw
            : null;

      lines.push({
        playerId: pid,
        name: str(person.fullName, 'Unknown'),
        battingOrder: typeof p.battingOrder === 'string' ? p.battingOrder : null,
        jerseyNumber: maybeString(p.jerseyNumber),
        position: maybeString(position.abbreviation ?? position.code ?? position.name),
        ab: num(stats.atBats),
        r: num(stats.runs),
        h: num(stats.hits),
        rbi: num(stats.rbi),
        bb: num(stats.baseOnBalls),
        so: num(stats.strikeOuts),
        hr: num(stats.homeRuns),
        pa: paMap.get(pid) ?? null,
        seasonAvg,
      });
    }

    return lines;
  }

  private mapBench(side: AnyObj): BenchPlayerDto[] {
    const bench = arr(side.bench);
    const players = (side.players ?? {}) as AnyObj;

    const lines: BenchPlayerDto[] = [];

    for (const pidRaw of bench) {
      const pid = Number(pidRaw);
      if (!Number.isFinite(pid)) continue;

      const p = (players[`ID${pid}`] ?? {}) as AnyObj;
      const person = (p.person ?? {}) as AnyObj;
      const position = (p.position ?? {}) as AnyObj;

      lines.push({
        playerId: pid,
        name: str(person.fullName, 'Unknown'),
        jerseyNumber: maybeString(p.jerseyNumber),
        position: maybeString(position.abbreviation ?? position.code ?? position.name),
      });
    }

    return lines;
  }

  private mapBullpen(side: AnyObj): BullpenPlayerDto[] {
    const bullpen = arr(side.bullpen);
    const players = (side.players ?? {}) as AnyObj;

    const lines: BullpenPlayerDto[] = [];

    for (const pidRaw of bullpen) {
      const pid = Number(pidRaw);
      if (!Number.isFinite(pid)) continue;

      const p = (players[`ID${pid}`] ?? {}) as AnyObj;
      const person = (p.person ?? {}) as AnyObj;
      const position = (p.position ?? {}) as AnyObj;
      const seasonStats = ((p.seasonStats ?? {}) as AnyObj).pitching as AnyObj | undefined;

      lines.push({
        playerId: pid,
        name: str(person.fullName, 'Unknown'),
        jerseyNumber: maybeString(p.jerseyNumber),
        position: maybeString(position.abbreviation ?? position.code ?? position.name),
        era: maybeString(seasonStats?.era),
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
      const position = (p.position ?? {}) as AnyObj;
      const stats = ((p.stats ?? {}) as AnyObj).pitching as AnyObj | undefined;

      if (!stats) continue;

      lines.push({
        playerId: pid,
        name: str(person.fullName, 'Unknown'),
        jerseyNumber: maybeString(p.jerseyNumber),
        position: maybeString(position.abbreviation ?? position.code ?? position.name),
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