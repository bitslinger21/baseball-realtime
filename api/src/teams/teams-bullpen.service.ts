import { Injectable, Logger } from '@nestjs/common';
import { MlbApiService } from '../providers/mlb/mlb.service';
import { BoxScoreService } from '../boxscore/boxscore.service';
import type { BoxScoreDto } from '../boxscore/dtos/boxscore.dto';
import type { SeasonGameDto } from '../games/dtos/season-game.dto';
import { BullpenPitcherDto, TeamBullpenDto } from './dtos/team-bullpen.dto';

const CACHE_TTL_MS = 10 * 60 * 1000;
const LOOKBACK_DAYS = 10;
const REST_PITCH_THRESHOLD = 25;

type AnyObj = Record<string, unknown>;

type RosterPitcher = {
  mlbId: number;
  name: string;
  hand: 'L' | 'R';
};

type Appearance = { gameDate: string; pitches: number };

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - n * 24 * 60 * 60 * 1000);
}

function daysBetween(earlier: string, later: string): number {
  const a = new Date(`${earlier}T00:00:00Z`).getTime();
  const b = new Date(`${later}T00:00:00Z`).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

@Injectable()
export class TeamsBullpenService {
  private readonly log = new Logger(TeamsBullpenService.name);
  private readonly cache = new Map<
    number,
    { data: TeamBullpenDto; expiresAt: number }
  >();

  constructor(
    private readonly mlb: MlbApiService,
    private readonly boxScore: BoxScoreService,
  ) {}

  async getBullpenStatus(teamId: number): Promise<TeamBullpenDto> {
    const cached = this.cache.get(teamId);
    if (cached != null && Date.now() < cached.expiresAt) return cached.data;

    const result = await this.compute(teamId);
    this.cache.set(teamId, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return result;
  }

  private async fetchActivePitchers(teamId: number): Promise<RosterPitcher[]> {
    try {
      const url = new URL(
        `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster`,
      );
      url.searchParams.set('rosterType', 'active');
      url.searchParams.set('hydrate', 'person(pitchHand)');
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`MLB roster API ${res.status}`);

      const payload = (await res.json()) as AnyObj;
      const roster = Array.isArray(payload.roster)
        ? (payload.roster as AnyObj[])
        : [];

      const pitchers: RosterPitcher[] = [];
      for (const entry of roster) {
        const posObj = (entry.position ?? {}) as AnyObj;
        if (posObj.code !== '1') continue;

        const person = (entry.person ?? {}) as AnyObj;
        const mlbId = typeof person.id === 'number' ? person.id : null;
        const name =
          typeof person.fullName === 'string' ? person.fullName : null;
        const handObj = (person.pitchHand ?? {}) as AnyObj;
        const hand = handObj.code === 'L' ? 'L' : 'R';
        if (mlbId == null || name == null) continue;

        pitchers.push({ mlbId, name, hand });
      }
      return pitchers;
    } catch (err: unknown) {
      this.log.warn(`fetchActivePitchers(${teamId}) failed: ${String(err)}`);
      return [];
    }
  }

  private async compute(teamId: number): Promise<TeamBullpenDto> {
    const pitchers = await this.fetchActivePitchers(teamId);

    const season = String(new Date().getFullYear());
    const schedule = await this.mlb.getSeasonScheduleForTeam(teamId, season);

    const today = new Date();
    const todayKey = toDateKey(today);
    const windowStartKey = toDateKey(daysAgo(LOOKBACK_DAYS, today));

    const recentFinals: SeasonGameDto[] = schedule
      .filter(
        (g) =>
          g.status === 'final' &&
          g.providerGameId != null &&
          g.gameDate >= windowStartKey &&
          g.gameDate <= todayKey,
      )
      .sort((a, b) => b.gameDate.localeCompare(a.gameDate)); // newest first

    const boxscores = await Promise.all(
      recentFinals.map((g) =>
        this.boxScore
          .getBoxScore(g.providerGameId as string)
          .catch((e: unknown) => {
            this.log.warn(
              `boxscore fetch failed for ${g.providerGameId}: ${e instanceof Error ? e.message : String(e)}`,
            );
            return null as BoxScoreDto | null;
          }),
      ),
    );

    const starterIds = new Set<number>();
    const appearancesByPitcher = new Map<number, Appearance[]>();

    recentFinals.forEach((g, i) => {
      const box = boxscores[i];
      if (box == null) return;
      const mySide = g.isHome ? box.home : box.away;
      const pitching = mySide.pitching;
      if (pitching.length === 0) return;

      starterIds.add(pitching[0].playerId);
      for (const p of pitching) {
        const list = appearancesByPitcher.get(p.playerId) ?? [];
        list.push({ gameDate: g.gameDate, pitches: p.pitches ?? 0 });
        appearancesByPitcher.set(p.playerId, list);
      }
    });

    const yesterdayKey = toDateKey(daysAgo(1, today));
    const twoDaysAgoKey = toDateKey(daysAgo(2, today));

    type Computed = BullpenPitcherDto & { sortValue: number };
    const readyList: Computed[] = [];
    const availableList: Computed[] = [];
    const restList: Computed[] = [];

    for (const p of pitchers) {
      if (starterIds.has(p.mlbId)) continue; // rotation, not bullpen

      const apps = (appearancesByPitcher.get(p.mlbId) ?? [])
        .slice()
        .sort((a, b) => b.gameDate.localeCompare(a.gameDate));

      const pitchedYesterday =
        apps.find((a) => a.gameDate === yesterdayKey) ?? null;
      const pitchedTwoDaysAgo =
        apps.find((a) => a.gameDate === twoDaysAgoKey) ?? null;
      const last2DaysPitches =
        (pitchedYesterday?.pitches ?? 0) + (pitchedTwoDaysAgo?.pitches ?? 0);
      const backToBack = pitchedYesterday != null && pitchedTwoDaysAgo != null;

      const entry = new BullpenPitcherDto();
      entry.mlbId = p.mlbId;
      entry.name = p.name;
      entry.hand = p.hand;

      if (backToBack) {
        entry.state = 'rest';
        entry.evidence = 'back-to-back days';
        restList.push({ ...entry, sortValue: 0 });
      } else if (last2DaysPitches >= REST_PITCH_THRESHOLD) {
        entry.state = 'rest';
        entry.evidence = `${last2DaysPitches} p over 2 days`;
        restList.push({ ...entry, sortValue: 0 });
      } else if (pitchedYesterday != null) {
        entry.state = 'available';
        entry.evidence = `threw ${pitchedYesterday.pitches} p yesterday`;
        availableList.push({ ...entry, sortValue: pitchedYesterday.pitches });
      } else {
        entry.state = 'ready';
        const lastApp = apps[0] ?? null;
        const restedDays =
          lastApp != null
            ? daysBetween(lastApp.gameDate, todayKey)
            : LOOKBACK_DAYS + 1;
        entry.evidence =
          lastApp != null
            ? `rested ${restedDays} days`
            : `rested ${LOOKBACK_DAYS}+ days`;
        readyList.push({ ...entry, sortValue: restedDays });
      }
    }

    readyList.sort((a, b) => b.sortValue - a.sortValue); // most-rested first
    availableList.sort((a, b) => a.sortValue - b.sortValue); // fewest pitches yesterday first

    const orderedPitchers: BullpenPitcherDto[] = [
      ...readyList,
      ...availableList,
      ...restList,
    ].map((p) => {
      const dto = new BullpenPitcherDto();
      dto.mlbId = p.mlbId;
      dto.name = p.name;
      dto.hand = p.hand;
      dto.evidence = p.evidence;
      dto.state = p.state;
      return dto;
    });

    return {
      availableCount: readyList.length + availableList.length,
      totalCount: orderedPitchers.length,
      pitchers: orderedPitchers,
    };
  }
}
