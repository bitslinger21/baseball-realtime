import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../domains/config/env';

// Live facts for Baseball IQ outside the game view (POST /iq/ask). Each
// digest is a few lines of plain text fetched from the Stats API just now —
// what the model may cite as current — so an answer about "this season" is
// the real season, not the model's training data. Every digest returns null
// on any failure: the answer then falls back to general knowledge, never to
// an invented number.

const TTL_MS = 5 * 60_000;

type Stat = Record<string, string | number | undefined>;
interface StatBlock {
  type?: { displayName?: string };
  group?: { displayName?: string };
  splits?: { stat?: Stat }[];
}

@Injectable()
export class IqGroundingService {
  private readonly log = new Logger(IqGroundingService.name);
  private readonly base: string;
  private readonly cache = new Map<
    string,
    { at: number; text: string | null }
  >();
  private teamAbbrById: Map<number, string> | null = null;

  constructor(cfg: ConfigService) {
    this.base =
      cfg.get<AppConfig['mlbApiBase']>('app.mlbApiBase') ??
      'https://statsapi.mlb.com/api';
  }

  private async cached(
    key: string,
    build: () => Promise<string | null>,
  ): Promise<string | null> {
    const hit = this.cache.get(key);
    if (hit != null && Date.now() - hit.at < TTL_MS) return hit.text;
    let text: string | null = null;
    try {
      text = await build();
    } catch (e: unknown) {
      this.log.warn(
        `grounding ${key} failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    this.cache.set(key, { at: Date.now(), text });
    return text;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.base}${path}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return (await res.json()) as T;
  }

  async teamIdFor(abbr: string): Promise<number | null> {
    const map = await this.teamAbbrs();
    for (const [id, a] of map) if (a === abbr.toUpperCase()) return id;
    return null;
  }

  private async teamAbbrs(): Promise<Map<number, string>> {
    if (this.teamAbbrById != null) return this.teamAbbrById;
    const json = await this.get<{
      teams?: { id: number; abbreviation?: string }[];
    }>(`/v1/teams?sportId=1`);
    this.teamAbbrById = new Map(
      (json.teams ?? []).map((t) => [t.id, t.abbreviation ?? String(t.id)]),
    );
    return this.teamAbbrById;
  }

  // ---- Player ----------------------------------------------------------------

  // Any MLB player by name, including those off the active roster (injured
  // list, inactive) — the app's player search indexes active rosters only.
  async findPerson(
    fullName: string,
  ): Promise<{ mlbId: number; name: string; teamAbbr: string } | null> {
    try {
      const json = await this.get<{
        people?: {
          id: number;
          fullName: string;
          active?: boolean;
          currentTeam?: { id?: number };
        }[];
      }>(
        `/v1/people/search?names=${encodeURIComponent(fullName.trim())}&sportIds=1&hydrate=currentTeam`,
      );
      const people = json.people ?? [];
      const p = people.find((x) => x.active === true) ?? people[0];
      if (p == null) return null;
      const abbrs = await this.teamAbbrs();
      return {
        mlbId: p.id,
        name: p.fullName,
        teamAbbr: abbrs.get(p.currentTeam?.id ?? 0) ?? '',
      };
    } catch {
      return null;
    }
  }

  player(mlbId: number, season: string): Promise<string | null> {
    return this.cached(`player:${mlbId}:${season}`, async () => {
      const q = `hydrate=currentTeam,stats(group=[hitting,pitching],type=[season,career,lastXGames],season=${season},limit=10)`;
      const json = await this.get<{
        people?: {
          fullName: string;
          primaryPosition?: { abbreviation?: string };
          currentTeam?: { id?: number };
          currentAge?: number;
          stats?: StatBlock[];
        }[];
      }>(`/v1/people/${mlbId}?${q}`);
      const p = json.people?.[0];
      if (p == null) return null;
      const post = await this.get<{ people?: { stats?: StatBlock[] }[] }>(
        `/v1/people/${mlbId}?hydrate=stats(group=[hitting,pitching],type=[season],season=${season},gameType=P)`,
      ).catch(() => null);
      const abbrs = await this.teamAbbrs();
      const team =
        p.currentTeam?.id != null ? (abbrs.get(p.currentTeam.id) ?? '') : '';
      const pitcher = p.primaryPosition?.abbreviation === 'P';
      const line = (b: StatBlock | undefined): string | null => {
        const s = b?.splits?.[0]?.stat;
        if (s == null) return null;
        return b?.group?.displayName === 'pitching'
          ? `${s.gamesPlayed} G, ${s.wins}-${s.losses}, ${s.era} ERA, ${s.inningsPitched} IP, ${s.strikeOuts} K, ${s.baseOnBalls} BB, ${s.whip} WHIP${Number(s.saves) > 0 ? `, ${s.saves} SV` : ''}`
          : `${s.gamesPlayed} G, ${s.avg}/${s.obp}/${s.slg} (${s.ops} OPS), ${s.hits} H, ${s.homeRuns} HR, ${s.rbi} RBI, ${s.stolenBases} SB, ${s.baseOnBalls} BB, ${s.strikeOuts} K`;
      };
      const groups = pitcher ? ['pitching'] : ['hitting'];
      const find = (
        stats: StatBlock[] | undefined,
        type: string,
        group: string,
      ): StatBlock | undefined =>
        stats?.find(
          (s) => s.type?.displayName === type && s.group?.displayName === group,
        );
      const out = [
        `${p.fullName} (${p.primaryPosition?.abbreviation ?? '?'}${team ? `, ${team}` : ''}${p.currentAge != null ? `, age ${p.currentAge}` : ''}):`,
      ];
      for (const g of groups) {
        const season_ = line(find(p.stats, 'season', g));
        const post_ = line(find(post?.people?.[0]?.stats, 'season', g));
        const last10 = line(find(p.stats, 'lastXGames', g));
        const career = line(find(p.stats, 'career', g));
        if (season_) out.push(`  ${season} regular season: ${season_}`);
        if (post_) out.push(`  ${season} postseason: ${post_}`);
        if (last10) out.push(`  Last 10 regular-season games: ${last10}`);
        if (career) out.push(`  Career (regular season): ${career}`);
      }
      return out.length > 1 ? out.join('\n') : null;
    });
  }

  // ---- Team ------------------------------------------------------------------

  team(abbr: string, season: string): Promise<string | null> {
    return this.cached(`team:${abbr}:${season}`, async () => {
      const id = await this.teamIdFor(abbr);
      if (id == null) return null;
      const [standings, stats] = await Promise.all([
        this.standingsRows(season),
        this.get<{ stats?: StatBlock[] }>(
          `/v1/teams/${id}/stats?stats=season&group=hitting,pitching&season=${season}`,
        ),
      ]);
      const row = standings.find((r) => r.id === id);
      const hit = stats.stats?.find((s) => s.group?.displayName === 'hitting')
        ?.splits?.[0]?.stat;
      const pit = stats.stats?.find((s) => s.group?.displayName === 'pitching')
        ?.splits?.[0]?.stat;
      const out = [`${abbr}:`];
      if (row) out.push(`  ${season} record: ${row.text}`);
      if (hit)
        out.push(
          `  Team hitting: ${hit.avg}/${hit.obp}/${hit.slg}, ${hit.runs} R, ${hit.homeRuns} HR, ${hit.stolenBases} SB`,
        );
      if (pit)
        out.push(
          `  Team pitching: ${pit.era} ERA, ${pit.whip} WHIP, ${pit.strikeOuts} K, ${pit.saves} SV`,
        );
      const series = await this.postseasonLines(season, abbr);
      if (series.length > 0) out.push(`  Postseason: ${series.join('; ')}`);
      return out.length > 1 ? out.join('\n') : null;
    });
  }

  private async standingsRows(
    season: string,
  ): Promise<{ id: number; abbr: string; div: string; text: string }[]> {
    const json = await this.get<{
      records?: {
        division?: { id?: number; name?: string; nameShort?: string };
        teamRecords?: {
          team: { id: number };
          wins: number;
          losses: number;
          gamesBack: string;
          wildCardGamesBack?: string;
          divisionRank?: string;
          streak?: { streakCode?: string };
          runDifferential?: number;
          clinchIndicator?: string;
          records?: {
            splitRecords?: { type: string; wins: number; losses: number }[];
          };
        }[];
      }[];
    }>(
      `/v1/standings?leagueId=103,104&season=${season}&standingsTypes=regularSeason&hydrate=division`,
    );
    const abbrs = await this.teamAbbrs();
    const rows: { id: number; abbr: string; div: string; text: string }[] = [];
    for (const r of json.records ?? []) {
      const div = r.division?.nameShort ?? r.division?.name ?? '';
      for (const t of r.teamRecords ?? []) {
        const l10 = t.records?.splitRecords?.find((s) => s.type === 'lastTen');
        const abbr = abbrs.get(t.team.id) ?? String(t.team.id);
        const rd = t.runDifferential ?? 0;
        rows.push({
          id: t.team.id,
          abbr,
          div,
          text:
            `${t.wins}-${t.losses}, ${ordinalRank(t.divisionRank)} in ${div}` +
            `${t.gamesBack !== '-' ? ` (${t.gamesBack} GB)` : ''}` +
            `${wildCard(t.wildCardGamesBack)}` +
            `, run diff ${rd > 0 ? '+' : ''}${rd}` +
            `${l10 ? `, last 10 ${l10.wins}-${l10.losses}` : ''}` +
            `${t.streak?.streakCode ? `, streak ${t.streak.streakCode}` : ''}` +
            `${t.clinchIndicator ? `, clinched (${t.clinchIndicator})` : ''}`,
        });
      }
    }
    return rows;
  }

  // ---- League-wide -----------------------------------------------------------

  standings(season: string): Promise<string | null> {
    return this.cached(`standings:${season}`, async () => {
      const rows = await this.standingsRows(season);
      if (rows.length === 0) return null;
      const byDiv = new Map<string, string[]>();
      for (const r of rows)
        byDiv.set(r.div, [
          ...(byDiv.get(r.div) ?? []),
          `${r.abbr} ${r.text.replace(/, \d+\w+ in [^,(]+?(?=\s*[,(]|$)/, '')}`,
        ]);
      return [
        `${season} final/current regular-season standings:`,
        ...[...byDiv].map(([d, ts]) => `  ${d}: ${ts.join(' | ')}`),
      ].join('\n');
    });
  }

  leaders(season: string): Promise<string | null> {
    return this.cached(`leaders:${season}`, async () => {
      type L = {
        leagueLeaders?: {
          leaderCategory: string;
          leaders?: {
            person: { fullName: string };
            team?: { id?: number };
            value: string;
          }[];
        }[];
      };
      const [hit, pit] = await Promise.all([
        this.get<L>(
          `/v1/stats/leaders?leaderCategories=homeRuns,battingAverage,onBasePlusSlugging,runsBattedIn,hits,stolenBases&season=${season}&limit=5&sportId=1&statGroup=hitting`,
        ),
        this.get<L>(
          `/v1/stats/leaders?leaderCategories=earnedRunAverage,strikeouts,wins,saves,walksAndHitsPerInningPitched&season=${season}&limit=5&sportId=1&statGroup=pitching`,
        ),
      ]);
      const abbrs = await this.teamAbbrs();
      const fmt = (l: L, group: string): string[] =>
        (l.leagueLeaders ?? []).map(
          (c) =>
            `  ${group} ${c.leaderCategory}: ${(c.leaders ?? []).map((x) => `${x.person.fullName} (${abbrs.get(x.team?.id ?? 0) ?? '?'}) ${x.value}`).join(', ')}`,
        );
      const out = [
        `${season} MLB regular-season leaders (top 5):`,
        ...fmt(hit, 'Hitting'),
        ...fmt(pit, 'Pitching'),
      ];
      return out.length > 1 ? out.join('\n') : null;
    });
  }

  // Today's games (with scores/status) and, in October, where every
  // postseason series stands.
  today(dateYmd: string, season: string): Promise<string | null> {
    return this.cached(`today:${dateYmd}`, async () => {
      type G = {
        status?: { detailedState?: string; abstractGameState?: string };
        gameDate?: string;
        teams?: {
          away?: { team?: { id?: number }; score?: number };
          home?: { team?: { id?: number }; score?: number };
        };
        linescore?: { currentInningOrdinal?: string; inningHalf?: string };
        seriesDescription?: string;
        gameType?: string;
      };
      const json = await this.get<{ dates?: { games?: G[] }[] }>(
        `/v1/schedule?sportId=1&date=${dateYmd}&hydrate=linescore`,
      );
      const abbrs = await this.teamAbbrs();
      const games = json.dates?.[0]?.games ?? [];
      const lines = games.map((g) => {
        const a = abbrs.get(g.teams?.away?.team?.id ?? 0) ?? '?';
        const h = abbrs.get(g.teams?.home?.team?.id ?? 0) ?? '?';
        const st = g.status?.abstractGameState;
        const score =
          st === 'Preview'
            ? ''
            : ` ${g.teams?.away?.score ?? 0}-${g.teams?.home?.score ?? 0}`;
        const where =
          st === 'Live'
            ? ` (${g.linescore?.inningHalf ?? ''} ${g.linescore?.currentInningOrdinal ?? ''})`
            : '';
        return `  ${a} @ ${h}${score} — ${g.status?.detailedState ?? '?'}${where}${g.gameType !== 'R' && g.seriesDescription ? `, ${g.seriesDescription}` : ''}`;
      });
      const out = [
        `Games on ${dateYmd}${lines.length === 0 ? ': none scheduled' : ':'}`,
        ...lines,
      ];
      const series = await this.postseasonLines(season, null);
      if (series.length > 0)
        out.push(
          `${season} postseason series:`,
          ...series.map((s) => `  ${s}`),
        );
      return out.join('\n');
    });
  }

  private async postseasonLines(
    season: string,
    onlyAbbr: string | null,
  ): Promise<string[]> {
    type S = {
      series?: {
        games?: {
          seriesDescription?: string;
          teams?: {
            away?: { team?: { id?: number }; leagueRecord?: { wins: number } };
            home?: { team?: { id?: number }; leagueRecord?: { wins: number } };
          };
        }[];
      }[];
    };
    const json = await this.get<S>(
      `/v1/schedule/postseason/series?season=${season}&sportId=1`,
    ).catch(() => null);
    const abbrs = await this.teamAbbrs();
    const out: string[] = [];
    for (const s of json?.series ?? []) {
      const g = s.games?.[s.games.length - 1];
      const a = abbrs.get(g?.teams?.away?.team?.id ?? 0);
      const h = abbrs.get(g?.teams?.home?.team?.id ?? 0);
      if (a == null || h == null) continue; // a round whose clubs aren't set yet
      if (onlyAbbr != null && a !== onlyAbbr && h !== onlyAbbr) continue;
      out.push(
        `${g?.seriesDescription ?? 'Series'}: ${a} ${g?.teams?.away?.leagueRecord?.wins ?? 0}, ${h} ${g?.teams?.home?.leagueRecord?.wins ?? 0} (series wins)`,
      );
    }
    return out;
  }
}

// "+9.5" = that many games AHEAD of the last wild-card spot.
function wildCard(gb: string | undefined): string {
  if (gb == null || gb === '-' || gb === '') return '';
  return gb.startsWith('+')
    ? `, ${gb.slice(1)} games clear of the last wild card`
    : `, ${gb} games out of the last wild card`;
}

function ordinalRank(r: string | undefined): string {
  const n = Number(r);
  if (!Number.isFinite(n)) return '?';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
