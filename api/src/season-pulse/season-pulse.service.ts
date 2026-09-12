import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MlbApiService } from '../providers/mlb/mlb.service';
import { BoxScoreService } from '../boxscore/boxscore.service';
import { SeasonPulseSnapshot } from '../persistence/entities/season-pulse-snapshot.entity';
import { ipToOuts, eraFrom } from '../common/era.util';
import {
  SeasonPulseDto,
  SeasonPulseOverallDto,
  SeasonPulsePhaseDto,
} from './dtos/season-pulse.dto';
import type { SeasonGameDto } from '../games/dtos/season-game.dto';
import type {
  BoxScoreDto,
  PitcherLineDto,
} from '../boxscore/dtos/boxscore.dto';

const WINDOW_DAYS = 30;
const WEEKLY_POINTS = 12;
const SCHEDULE_CONCURRENCY = 5;
const BOXSCORE_CONCURRENCY = 8;
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - n * 24 * 60 * 60 * 1000);
}

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

// Higher value wins (runs/game, run differential).
function rankDescending(values: Map<number, number>): Map<number, number> {
  const entries = Array.from(values.entries()).sort((a, b) => b[1] - a[1]);
  const ranks = new Map<number, number>();
  entries.forEach(([teamId], i) => ranks.set(teamId, i + 1));
  return ranks;
}

// Lower value wins (ERA).
function rankAscending(values: Map<number, number>): Map<number, number> {
  const entries = Array.from(values.entries()).sort((a, b) => a[1] - b[1]);
  const ranks = new Map<number, number>();
  entries.forEach(([teamId], i) => ranks.set(teamId, i + 1));
  return ranks;
}

type TeamSchedule = { teamId: number; games: SeasonGameDto[] };

@Injectable()
export class SeasonPulseService {
  private readonly log = new Logger(SeasonPulseService.name);

  constructor(
    private readonly mlb: MlbApiService,
    private readonly boxScore: BoxScoreService,
    @InjectRepository(SeasonPulseSnapshot)
    private readonly repo: Repository<SeasonPulseSnapshot>,
  ) {}

  async getSeasonPulse(teamId: number): Promise<SeasonPulseDto | null> {
    const row = await this.repo.findOne({ where: { teamId } });
    if (row == null) return null;
    return this.toDto(row);
  }

  private toDto(row: SeasonPulseSnapshot): SeasonPulseDto {
    const dto = new SeasonPulseDto();
    dto.computedAt = row.computedAt.toISOString();
    dto.overallLabel = 'Run differential';

    const overall = new SeasonPulseOverallDto();
    overall.rank = row.overallRank;
    overall.prevRank = row.overallPrevRank;
    overall.movement = row.overallPrevRank - row.overallRank;
    overall.narrative = this.buildNarrative(row.weeklyRanks, row.overallRank);
    dto.overall = overall;
    dto.weeklyRanks = row.weeklyRanks;

    dto.phases = [
      this.phase(
        'offense',
        'Offense',
        'R/G',
        row.offenseStat,
        row.offenseRank,
        row.offensePrevRank,
      ),
    ];
    // Nothing renders a fabricated number: a phase with no boxscore-backed
    // data for this team simply isn't in the list.
    if (
      row.startingRank != null &&
      row.startingStat != null &&
      row.startingPrevRank != null
    ) {
      dto.phases.push(
        this.phase(
          'startingPitching',
          'Starting pitching',
          'ERA',
          row.startingStat,
          row.startingRank,
          row.startingPrevRank,
        ),
      );
    }
    if (
      row.bullpenRank != null &&
      row.bullpenStat != null &&
      row.bullpenPrevRank != null
    ) {
      dto.phases.push(
        this.phase(
          'bullpen',
          'Bullpen',
          'ERA',
          row.bullpenStat,
          row.bullpenRank,
          row.bullpenPrevRank,
        ),
      );
    }
    return dto;
  }

  private phase(
    key: string,
    label: string,
    statLabel: string,
    statValue: number,
    rank: number,
    prevRank: number,
  ): SeasonPulsePhaseDto {
    const p = new SeasonPulsePhaseDto();
    p.key = key;
    p.label = label;
    p.statLabel = statLabel;
    p.statValue = statValue;
    p.rank = rank;
    p.prevRank = prevRank;
    return p;
  }

  // Worst week (by rank) names the low point; if the club's current mark is
  // also its season best, that's worth saying too. A judgment-call heuristic
  // — the doc doesn't specify the exact phrasing rule.
  private buildNarrative(weeklyRanks: number[], currentRank: number): string {
    if (weeklyRanks.length === 0) return '';
    let worstIdx = 0;
    for (let i = 1; i < weeklyRanks.length; i++) {
      if (weeklyRanks[i] > weeklyRanks[worstIdx]) worstIdx = i;
    }
    const worstRank = weeklyRanks[worstIdx];
    const weeksAgo = weeklyRanks.length - 1 - worstIdx;
    const worstMonth = MONTH_NAMES[daysAgo(weeksAgo * 7).getMonth()];
    const isBest = currentRank === Math.min(...weeklyRanks, currentRank);
    const base = `${ordinal(worstRank)} in ${worstMonth}`;
    return isBest ? `${base} · best mark of the season` : base;
  }

  // ── Nightly computation ──────────────────────────────────────────────────

  async computeAndPersistAll(): Promise<void> {
    const teamIds = await this.mlb.getAllTeamIds();
    if (teamIds.length === 0) {
      this.log.warn('No team ids resolved — aborting season-pulse computation');
      return;
    }

    const season = String(new Date().getFullYear());
    const schedules: TeamSchedule[] = await this.mapWithConcurrency(
      teamIds,
      SCHEDULE_CONCURRENCY,
      async (teamId) => ({
        teamId,
        games: await this.mlb
          .getSeasonScheduleForTeam(teamId, season)
          .catch((e: unknown) => {
            this.log.warn(
              `schedule fetch failed for team ${teamId}: ${e instanceof Error ? e.message : String(e)}`,
            );
            return [] as SeasonGameDto[];
          }),
      }),
    );

    const now = new Date();
    const today = toDateKey(now);
    const nowStart = toDateKey(daysAgo(WINDOW_DAYS, now));
    const prevStart = toDateKey(daysAgo(WINDOW_DAYS * 2, now));

    // Offense + Overall: schedule-level game results only, no boxscores.
    const nowOffense = new Map<number, number>();
    const prevOffense = new Map<number, number>();
    const nowDiff = new Map<number, number>();
    const prevDiff = new Map<number, number>();

    for (const { teamId, games } of schedules) {
      const finals = games.filter(
        (g) =>
          g.status === 'final' && g.teamScore != null && g.oppScore != null,
      );
      const nowGames = finals.filter(
        (g) => g.gameDate >= nowStart && g.gameDate <= today,
      );
      const prevGames = finals.filter(
        (g) => g.gameDate >= prevStart && g.gameDate < nowStart,
      );

      const totals = (gs: SeasonGameDto[]) =>
        gs.reduce(
          (acc, g) => ({
            scored: acc.scored + (g.teamScore ?? 0),
            allowed: acc.allowed + (g.oppScore ?? 0),
          }),
          { scored: 0, allowed: 0 },
        );

      const nowTotals = totals(nowGames);
      const prevTotals = totals(prevGames);
      nowOffense.set(
        teamId,
        nowGames.length > 0 ? nowTotals.scored / nowGames.length : 0,
      );
      prevOffense.set(
        teamId,
        prevGames.length > 0 ? prevTotals.scored / prevGames.length : 0,
      );
      nowDiff.set(teamId, nowTotals.scored - nowTotals.allowed);
      prevDiff.set(teamId, prevTotals.scored - prevTotals.allowed);
    }

    const nowOffenseRanks = rankDescending(nowOffense);
    const prevOffenseRanks = rankDescending(prevOffense);
    const nowDiffRanks = rankDescending(nowDiff);
    const prevDiffRanks = rankDescending(prevDiff);

    // Weekly Overall series: 12 checkpoints 7 days apart, each a trailing
    // 30-day run-differential rank across all 30 teams. Oldest -> newest.
    const weeklyRanksByTeam = new Map<number, number[]>();
    for (const { teamId } of schedules) weeklyRanksByTeam.set(teamId, []);

    for (let w = WEEKLY_POINTS - 1; w >= 0; w--) {
      const checkpoint = daysAgo(w * 7, now);
      const checkpointKey = toDateKey(checkpoint);
      const windowStart = toDateKey(daysAgo(WINDOW_DAYS, checkpoint));
      const diffAtCheckpoint = new Map<number, number>();

      for (const { teamId, games } of schedules) {
        const finals = games.filter(
          (g) =>
            g.status === 'final' &&
            g.teamScore != null &&
            g.oppScore != null &&
            g.gameDate >= windowStart &&
            g.gameDate <= checkpointKey,
        );
        const diff = finals.reduce(
          (acc, g) => acc + (g.teamScore ?? 0) - (g.oppScore ?? 0),
          0,
        );
        diffAtCheckpoint.set(teamId, diff);
      }

      const ranks = rankDescending(diffAtCheckpoint);
      for (const [teamId, rank] of ranks) {
        weeklyRanksByTeam.get(teamId)?.push(rank);
      }
    }

    // Starting/Bullpen ERA: only need boxscores for games inside the two
    // 30-day windows (~60 days back), not the full 12-week history.
    const gameIdsNeeded = new Set<string>();
    for (const { games } of schedules) {
      const finals = games.filter(
        (g) =>
          g.status === 'final' &&
          g.providerGameId != null &&
          g.gameDate >= prevStart &&
          g.gameDate <= today,
      );
      for (const g of finals) gameIdsNeeded.add(g.providerGameId as string);
    }

    const gameIdList = Array.from(gameIdsNeeded);
    this.log.log(
      `Fetching ${gameIdList.length} unique boxscores for starting/bullpen ERA`,
    );
    const boxscoreMap = new Map<string, BoxScoreDto | null>();
    await this.mapWithConcurrency(
      gameIdList,
      BOXSCORE_CONCURRENCY,
      async (id) => {
        const box = await this.boxScore.getBoxScore(id).catch((e: unknown) => {
          this.log.warn(
            `boxscore fetch failed for ${id}: ${e instanceof Error ? e.message : String(e)}`,
          );
          return null;
        });
        boxscoreMap.set(id, box);
      },
    );

    const nowStarting = new Map<number, number>();
    const prevStarting = new Map<number, number>();
    const nowBullpen = new Map<number, number>();
    const prevBullpen = new Map<number, number>();

    const accumulateEra = (
      teamGames: SeasonGameDto[],
    ): { startEra: number | null; bullEra: number | null } => {
      let startER = 0;
      let startOuts = 0;
      let bullER = 0;
      let bullOuts = 0;
      for (const g of teamGames) {
        const box = boxscoreMap.get(g.providerGameId as string);
        if (box == null) continue;
        const mySide = g.isHome ? box.home : box.away;
        const pitchers: PitcherLineDto[] = mySide.pitching;
        if (pitchers.length === 0) continue;
        // MLB boxscore pitcher order is appearance order — the starter is
        // always first; everyone after is the bullpen for that game.
        const starter = pitchers[0];
        startER += starter.er;
        startOuts += ipToOuts(starter.ip);
        for (const p of pitchers.slice(1)) {
          bullER += p.er;
          bullOuts += ipToOuts(p.ip);
        }
      }
      return {
        startEra: eraFrom(startER, startOuts),
        bullEra: eraFrom(bullER, bullOuts),
      };
    };

    for (const { teamId, games } of schedules) {
      const finals = games.filter(
        (g) => g.status === 'final' && g.providerGameId != null,
      );
      const nowGames = finals.filter(
        (g) => g.gameDate >= nowStart && g.gameDate <= today,
      );
      const prevGames = finals.filter(
        (g) => g.gameDate >= prevStart && g.gameDate < nowStart,
      );

      const nowAgg = accumulateEra(nowGames);
      const prevAgg = accumulateEra(prevGames);
      if (nowAgg.startEra != null) nowStarting.set(teamId, nowAgg.startEra);
      if (prevAgg.startEra != null) prevStarting.set(teamId, prevAgg.startEra);
      if (nowAgg.bullEra != null) nowBullpen.set(teamId, nowAgg.bullEra);
      if (prevAgg.bullEra != null) prevBullpen.set(teamId, prevAgg.bullEra);
    }

    const nowStartingRanks = rankAscending(nowStarting);
    const prevStartingRanks = rankAscending(prevStarting);
    const nowBullpenRanks = rankAscending(nowBullpen);
    const prevBullpenRanks = rankAscending(prevBullpen);

    const computedAt = new Date();
    for (const { teamId } of schedules) {
      const hasStarting =
        nowStartingRanks.has(teamId) && prevStartingRanks.has(teamId);
      const hasBullpen =
        nowBullpenRanks.has(teamId) && prevBullpenRanks.has(teamId);

      await this.repo.upsert(
        {
          teamId,
          computedAt,
          overallRank: nowDiffRanks.get(teamId) ?? 0,
          overallPrevRank: prevDiffRanks.get(teamId) ?? 0,
          runDiff: nowDiff.get(teamId) ?? 0,
          weeklyRanks: weeklyRanksByTeam.get(teamId) ?? [],
          offenseRank: nowOffenseRanks.get(teamId) ?? 0,
          offensePrevRank: prevOffenseRanks.get(teamId) ?? 0,
          offenseStat: Math.round((nowOffense.get(teamId) ?? 0) * 10) / 10,
          startingRank: hasStarting
            ? (nowStartingRanks.get(teamId) ?? null)
            : null,
          startingPrevRank: hasStarting
            ? (prevStartingRanks.get(teamId) ?? null)
            : null,
          startingStat: hasStarting ? (nowStarting.get(teamId) ?? null) : null,
          bullpenRank: hasBullpen
            ? (nowBullpenRanks.get(teamId) ?? null)
            : null,
          bullpenPrevRank: hasBullpen
            ? (prevBullpenRanks.get(teamId) ?? null)
            : null,
          bullpenStat: hasBullpen ? (nowBullpen.get(teamId) ?? null) : null,
        },
        { conflictPaths: ['teamId'] },
      );
    }

    this.log.log(`Season pulse computed for ${schedules.length} teams`);
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = new Array<R>(items.length);
    let idx = 0;
    const workers = Array.from(
      { length: Math.min(limit, items.length) },
      async () => {
        while (idx < items.length) {
          const current = idx++;
          results[current] = await fn(items[current]);
        }
      },
    );
    await Promise.all(workers);
    return results;
  }
}
