import { Injectable, Logger } from '@nestjs/common';
import { MlbApiService, type MlbPerson } from '../providers/mlb/mlb.service';
import type {
  GameLineupsDto,
  LineupBatterDto,
  LineupProbableDto,
  LineupSideDto,
  LineupSourceDto,
} from './dtos/game-lineups.dto';

type Side = 'away' | 'home';
type Hand = 'L' | 'R';

// The parts of MLB's live feed and box score read here.
interface FeedPerson {
  fullName?: string;
  pitchHand?: { code?: string };
  batSide?: { code?: string };
  primaryNumber?: string;
  primaryPosition?: { abbreviation?: string };
}
interface BoxPlayer {
  person?: { fullName?: string };
  position?: { abbreviation?: string };
  jerseyNumber?: string;
}
interface BoxTeam {
  team?: { abbreviation?: string };
  battingOrder?: number[];
  pitchers?: number[];
  players?: Record<string, BoxPlayer>;
}
interface BoxScoreLike {
  teams?: Partial<Record<Side, BoxTeam>>;
}
interface LiveFeedLike {
  gameData?: {
    teams?: Partial<Record<Side, { id?: number; abbreviation?: string }>>;
    players?: Record<string, FeedPerson>;
    probablePitchers?: Partial<
      Record<Side, { id?: number; fullName?: string }>
    >;
  };
  liveData?: { boxscore?: BoxScoreLike };
}
type Projection = { source: LineupSourceDto; batters: LineupBatterDto[] };

// How far back a projection looks, and how many finished games it reads.
const LOOKBACK_DAYS = 45;
const MAX_GAMES = 12;
// A projection doesn't change until the club plays again.
const PROJECTION_TTL_MS = 60 * 60_000;

const asHand = (v: unknown): Hand | null => (v === 'L' || v === 'R' ? v : null);

/**
 * Lineups before first pitch (PROMPT_pregame_first_matchup.md): each side's
 * official lineup once MLB posts it; until then a projection — the club's
 * most recent lineup against a starter of the SAME hand as today's opposing
 * probable. The first pitch is the final truth.
 */
@Injectable()
export class GameLineupsService {
  private readonly log = new Logger(GameLineupsService.name);
  private readonly projections = new Map<
    string,
    { value: Promise<Projection | null>; expiresAt: number }
  >();
  // gameId|side → when this process first saw the official lineup, having
  // seen the side without one first. Absent = posted before we looked.
  private readonly postedAt = new Map<string, string>();
  private readonly seenWithout = new Set<string>();

  constructor(private readonly mlb: MlbApiService) {}

  async getLineups(providerGameId: string): Promise<GameLineupsDto> {
    const feed = (await this.mlb.getLiveFeedCached(
      providerGameId,
      60_000,
    )) as unknown as LiveFeedLike;
    const gameData = feed.gameData ?? {};
    const box = feed.liveData?.boxscore?.teams ?? {};
    const players = gameData.players ?? {};
    const probables = gameData.probablePitchers ?? {};

    const sideFor = async (side: Side): Promise<LineupSideDto> => {
      const opp: Side = side === 'away' ? 'home' : 'away';
      const team = gameData.teams?.[side] ?? {};
      const teamAbbr =
        team.abbreviation ?? box[side]?.team?.abbreviation ?? '?';
      const opposingProbable = await this.probable(probables[opp], players);
      const key = `${providerGameId}|${side}`;
      const empty = {
        teamAbbr,
        opposingProbable,
        postedAt: null,
        source: null,
        batters: [],
      };

      const order = box[side]?.battingOrder ?? [];
      if (order.length > 0) {
        if (this.seenWithout.has(key) && !this.postedAt.has(key))
          this.postedAt.set(key, new Date().toISOString());
        const people = await this.peopleFor(order, players);
        const batters = order.map((id, i) =>
          this.batter(
            i + 1,
            id,
            box[side]?.players?.[`ID${id}`],
            people.get(id),
          ),
        );
        await this.addLast7(batters);
        return {
          ...empty,
          status: 'official',
          postedAt: this.postedAt.get(key) ?? null,
          batters,
        };
      }
      this.seenWithout.add(key);

      const vsHand = opposingProbable?.hand ?? null;
      if (vsHand == null || team.id == null)
        return { ...empty, status: 'none' };
      const projection = await this.projection(team.id, vsHand);
      if (projection == null) return { ...empty, status: 'none' };
      const batters = projection.batters.map((b) => ({ ...b }));
      await this.addLast7(batters);
      return {
        ...empty,
        status: 'projected',
        source: projection.source,
        batters,
      };
    };

    const [away, home] = await Promise.all([sideFor('away'), sideFor('home')]);
    return { providerGameId, away, home };
  }

  private async probable(
    ref: { id?: number; fullName?: string } | undefined,
    players: Record<string, FeedPerson>,
  ): Promise<LineupProbableDto | null> {
    const id = ref?.id;
    if (id == null) return null;
    const p = players[`ID${id}`] ?? {};
    let hand = asHand(p.pitchHand?.code);
    let jersey = p.primaryNumber ?? null;
    if (hand == null || jersey == null) {
      const person = (await this.mlb.getPeople([id])).get(id);
      hand ??= asHand(person?.throws);
      jersey ??= person?.jerseyNumber ?? null;
    }
    return {
      mlbId: id,
      name: ref?.fullName ?? p.fullName ?? String(id),
      hand,
      jerseyNumber: jersey,
    };
  }

  // Bats/throws from the game's own player list when it has them, else one batched lookup.
  private async peopleFor(
    ids: number[],
    players: Record<string, FeedPerson>,
  ): Promise<Map<number, MlbPerson>> {
    const out = new Map<number, MlbPerson>();
    const missing: number[] = [];
    for (const id of ids) {
      const p = players[`ID${id}`];
      if (p?.batSide?.code != null) {
        out.set(id, {
          name: p.fullName ?? String(id),
          bats: p.batSide.code,
          throws: p.pitchHand?.code ?? null,
          jerseyNumber: p.primaryNumber ?? null,
          position: p.primaryPosition?.abbreviation ?? null,
        });
      } else missing.push(id);
    }
    if (missing.length > 0)
      for (const [id, p] of await this.mlb.getPeople(missing)) out.set(id, p);
    return out;
  }

  private batter(
    slot: number,
    id: number,
    boxPlayer: BoxPlayer | undefined,
    person: MlbPerson | undefined,
  ): LineupBatterDto {
    return {
      slot,
      mlbId: id,
      name: boxPlayer?.person?.fullName ?? person?.name ?? String(id),
      position: boxPlayer?.position?.abbreviation ?? person?.position ?? null,
      bats: person?.bats ?? null,
      throws: person?.throws ?? null,
      jerseyNumber: boxPlayer?.jerseyNumber ?? person?.jerseyNumber ?? null,
      last7: null,
    };
  }

  // Only the leadoff batter's last-7 line is shown.
  private async addLast7(batters: LineupBatterDto[]): Promise<void> {
    const lead = batters.find((b) => b.slot === 1);
    if (lead != null)
      lead.last7 = await this.mlb
        .getLastGamesHitting(lead.mlbId, 7)
        .catch(() => null);
  }

  private projection(teamId: number, vsHand: Hand): Promise<Projection | null> {
    const key = `${teamId}|${vsHand}`;
    const hit = this.projections.get(key);
    if (hit != null && Date.now() < hit.expiresAt) return hit.value;
    const value = this.findProjection(teamId, vsHand).catch((e: unknown) => {
      this.log.warn(
        `projection failed for team ${teamId} vs ${vsHand}: ${e instanceof Error ? e.message : String(e)}`,
      );
      this.projections.delete(key);
      return null;
    });
    this.projections.set(key, {
      value,
      expiresAt: Date.now() + PROJECTION_TTL_MS,
    });
    return value;
  }

  // Walk back through the club's finished games (regular season and
  // postseason) for the latest one against a starter of `vsHand`.
  private async findProjection(
    teamId: number,
    vsHand: Hand,
  ): Promise<Projection | null> {
    const games = (
      await this.mlb.getRecentFinalsForTeam(teamId, LOOKBACK_DAYS)
    ).slice(0, MAX_GAMES);
    const boxes = (await Promise.all(
      games.map((g) => this.mlb.getFinalBoxScore(g.gamePk)),
    )) as (BoxScoreLike | null)[];
    const starters = games.map((g, i) => {
      const opp: Side = g.side === 'away' ? 'home' : 'away';
      return boxes[i]?.teams?.[opp]?.pitchers?.[0] ?? null;
    });
    const hands = await this.mlb.getPeople(
      starters.filter((id): id is number => id != null),
    );
    for (let i = 0; i < games.length; i++) {
      const starter = starters[i];
      const mine = boxes[i]?.teams?.[games[i].side];
      if (starter == null || mine == null) continue;
      if (asHand(hands.get(starter)?.throws) !== vsHand) continue;
      const order = mine.battingOrder ?? [];
      if (order.length === 0) continue;
      const people = await this.mlb.getPeople(order);
      return {
        source: {
          providerGameId: games[i].gamePk,
          gameDate: games[i].date,
          oppStarterName: hands.get(starter)?.name ?? String(starter),
          oppStarterHand: vsHand,
        },
        batters: order.map((id, k) =>
          this.batter(k + 1, id, mine.players?.[`ID${id}`], people.get(id)),
        ),
      };
    }
    return null;
  }
}
