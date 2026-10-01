import { Injectable, Logger } from '@nestjs/common';
import { MlbApiService } from '../providers/mlb/mlb.service';
import { StandingsService } from '../standings/standings.service';
import { findGameRecap } from '../clips/clips.service';
import { situationText } from '../games/situation';
import type {
  PostseasonBracket,
  PostseasonGame,
  PostseasonRecap,
  PostseasonResponse,
  PostseasonRound,
  PostseasonSeries,
  PostseasonSide,
} from './postseason.types';

// ── Raw MLB shapes (only the fields read here) ──────────────────────────────

type RawTeam = { id?: number; abbreviation?: string; teamName?: string };
type RawPerson = { id?: number; fullName?: string };
type RawGameSide = { team?: RawTeam; score?: number; isWinner?: boolean; probablePitcher?: RawPerson };
type RawLinescore = {
  currentInning?: number;
  scheduledInnings?: number;
  isTopInning?: boolean;
  inningState?: string;
  outs?: number;
  offense?: { first?: unknown; second?: unknown; third?: unknown };
};
type RawGame = {
  gamePk?: number;
  gameDate?: string;
  officialDate?: string;
  seriesDescription?: string;
  seriesGameNumber?: number;
  gamesInSeries?: number;
  status?: { abstractGameState?: string; detailedState?: string; startTimeTBD?: boolean };
  teams?: { away?: RawGameSide; home?: RawGameSide };
  linescore?: RawLinescore;
  decisions?: { winner?: RawPerson; loser?: RawPerson; save?: RawPerson };
};
type RawSeries = { series?: { id?: string }; games?: RawGame[] };

type BoxPlayer = {
  person?: { id?: number; fullName?: string; boxscoreName?: string };
  stats?: {
    batting?: { homeRuns?: number; rbi?: number; hits?: number; atBats?: number };
    pitching?: { inningsPitched?: string; strikeOuts?: number };
  };
};
type RawBoxScore = { teams?: { away?: { players?: Record<string, BoxPlayer> }; home?: { players?: Record<string, BoxPlayer> } } };

// ── Tunables ────────────────────────────────────────────────────────────────

const POSTSEASON_BERTHS = 12;
const RESPONSE_TTL_MS = 30_000; // live games move the footer; 30s is plenty
// Recaps usually post an hour or more after the final out — re-check a
// missing one on this cadence rather than every request.
const RECAP_RECHECK_MS = 10 * 60_000;

const ROUND_BY_PREFIX: Record<string, PostseasonRound> = { F: 'wc', D: 'ds', L: 'cs', W: 'ws' };
const ROUND_NAME: Record<PostseasonRound, string> = {
  wc: 'Wild Card Series',
  ds: 'Division Series',
  cs: 'Championship Series',
  ws: 'World Series',
};
const ROUND_ORDER: PostseasonRound[] = ['wc', 'ds', 'cs', 'ws'];

// MLB's bracket placeholders ("NYY/BOS", "AL Higher Seed") are real team
// records with their own ids in the 5000s; the 30 clubs are all 108–158.
function isRealTeam(t: RawTeam | undefined): t is RawTeam & { id: number; abbreviation: string } {
  return t?.id != null && t.id < 1000 && typeof t.abbreviation === 'string' && !t.abbreviation.includes('/');
}

function roundLabel(round: PostseasonRound, league: 'AL' | 'NL' | null): string {
  if (round === 'ws') return 'World Series';
  if (round === 'wc') return `${league ?? ''} Wild Card`.trim();
  return `${league ?? ''}${round === 'ds' ? 'DS' : 'CS'}`;
}

const SUFFIXES = new Set(['jr.', 'jr', 'sr.', 'sr', 'ii', 'iii', 'iv']);
function lastName(fullName: string | undefined): string | null {
  if (fullName == null || fullName.trim() === '') return null;
  const parts = fullName.trim().split(/\s+/);
  while (parts.length > 1 && SUFFIXES.has(parts[parts.length - 1].toLowerCase())) parts.pop();
  return parts[parts.length - 1];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// "Tue 9/29" from an officialDate — a calendar date, so no timezone math.
function dayLabel(officialDate: string): string {
  const [y, m, d] = officialDate.split('-').map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${wd} ${m}/${d}`;
}


// "7.0" → "7", "6.2" → "6 2/3" — IP is thirds, never a decimal.
function formatIp(ip: string): string {
  const [whole, frac] = ip.split('.');
  if (frac == null || frac === '0') return whole;
  return `${whole} ${frac}/3`;
}

function ipOuts(ip: string | undefined): number {
  if (ip == null) return 0;
  const [whole, frac] = ip.split('.');
  return (Number(whole) || 0) * 3 + (Number(frac) || 0);
}


// Box-score names disambiguate shared surnames as "Smith, W" — read as
// "W. Smith" in a sentence.
function shortName(p: BoxPlayer['person']): string | null {
  const bs = p?.boxscoreName;
  if (bs == null) return lastName(p?.fullName);
  const m = /^(.+), (\S+)$/.exec(bs);
  return m != null ? `${m[2].replace(/\.?$/, '.')} ${m[1]}` : bs;
}

// One notable line per final, from the box score: multi-HR > HR + RBI >
// 3+ hits > pitcher with ≥7 IP or ≥10 K. Nothing qualifies → null, no filler
// (§5). Within a tier the winning club's player comes first.
function notableLine(box: RawBoxScore, winnerSide: 'away' | 'home' | null): string | null {
  type Cand = { name: string; winner: boolean; hr: number; rbi: number; h: number; ab: number; outs: number; k: number; ip: string | null };
  const cands: Cand[] = [];
  for (const side of ['away', 'home'] as const) {
    for (const p of Object.values(box.teams?.[side]?.players ?? {})) {
      const name = shortName(p.person);
      if (name == null) continue;
      const b = p.stats?.batting ?? {};
      const pi = p.stats?.pitching ?? {};
      cands.push({
        name,
        winner: side === winnerSide,
        hr: b.homeRuns ?? 0,
        rbi: b.rbi ?? 0,
        h: b.hits ?? 0,
        ab: b.atBats ?? 0,
        outs: ipOuts(pi.inningsPitched),
        k: pi.strikeOuts ?? 0,
        ip: pi.inningsPitched ?? null,
      });
    }
  }
  const pick = (ok: (c: Cand) => boolean, rank: (a: Cand, b: Cand) => number): Cand | null => {
    const hits = cands.filter(ok).sort((a, b) => Number(b.winner) - Number(a.winner) || rank(a, b));
    return hits[0] ?? null;
  };
  const rbiText = (c: Cand): string => `${c.rbi} RBI`;

  const multi = pick((c) => c.hr >= 2, (a, b) => b.hr - a.hr || b.rbi - a.rbi);
  if (multi) return `${multi.name} ${multi.hr} HR, ${rbiText(multi)}`;
  const hr = pick((c) => c.hr >= 1, (a, b) => b.rbi - a.rbi || b.h - a.h);
  if (hr) return hr.h >= 2 ? `${hr.name} ${hr.h}-for-${hr.ab}, HR, ${rbiText(hr)}` : `${hr.name} HR, ${rbiText(hr)}`;
  const hits = pick((c) => c.h >= 3, (a, b) => b.h - a.h || b.rbi - a.rbi);
  if (hits) return `${hits.name} ${hits.h}-for-${hits.ab}${hits.rbi > 0 ? `, ${rbiText(hits)}` : ''}`;
  const arm = pick((c) => c.outs >= 21 || c.k >= 10, (a, b) => b.outs - a.outs || b.k - a.k);
  if (arm?.ip != null) return `${arm.name} ${formatIp(arm.ip)} IP, ${arm.k} K`;
  return null;
}

// Box-score short names ("Valdez"), keyed by player id — used for W/L/SV so
// they read the same as the notable line.
function boxNames(box: RawBoxScore): Map<number, string> {
  const m = new Map<number, string>();
  for (const side of ['away', 'home'] as const) {
    for (const p of Object.values(box.teams?.[side]?.players ?? {})) {
      const name = shortName(p.person);
      if (p.person?.id != null && name != null) m.set(p.person.id, name);
    }
  }
  return m;
}

interface FinalDetail {
  note: string | null;
  names: Map<number, string>;
}

// Intermediate per-series record while the bracket is assembled.
interface Work {
  id: string;
  round: PostseasonRound;
  league: 'AL' | 'NL' | null;
  bestOf: number;
  games: RawGame[]; // deduped, in game order
  home: RawTeam | undefined; // game 1's home side (higher seed / better record)
  away: RawTeam | undefined;
  wins: Map<string, number>; // abbr → series wins
  winner: string | null; // abbr, once decided
}

@Injectable()
export class PostseasonService {
  private readonly log = new Logger(PostseasonService.name);
  private cache: { season: string; data: PostseasonResponse; expiresAt: number } | null = null;
  private readonly finalDetails = new Map<string, FinalDetail>();
  private readonly recaps = new Map<string, { recap: PostseasonRecap | null; checkedAt: number }>();

  constructor(
    private readonly mlb: MlbApiService,
    private readonly standings: StandingsService,
  ) {}

  async getPostseason(season: string): Promise<PostseasonResponse> {
    const c = this.cache;
    if (c != null && c.season === season && Date.now() < c.expiresAt) return c.data;
    try {
      const data = await this.build(season);
      this.cache = { season, data, expiresAt: Date.now() + RESPONSE_TTL_MS };
      return data;
    } catch (e: unknown) {
      this.log.warn(`getPostseason failed: ${e instanceof Error ? e.message : String(e)}`);
      return c?.data ?? { active: false, note: '', bracket: null };
    }
  }

  private async build(season: string): Promise<PostseasonResponse> {
    const [rawSeries, teams] = await Promise.all([
      this.mlb.getPostseasonSeries(season),
      this.standings.getStandings(season),
    ]);

    const clinched = teams.filter((t) => t.clinchIndicator != null).length;
    const works = (rawSeries as RawSeries[]).map((s) => this.toWork(s)).filter((w): w is Work => w != null);
    const underway = works.some((w) => w.games.some((g) => g.status?.abstractGameState !== 'Preview'));
    // The condition (§1): all 12 berths clinched. `underway` covers the
    // postseason itself, when regular-season clinch flags are beside the point.
    const active = works.length > 0 && (clinched >= POSTSEASON_BERTHS || underway);
    if (!active) return { active: false, note: '', bracket: null };

    // Division winners are the 1–3 seeds; used to tell a 3v6 Wild Card from a 4v5.
    const divisionWinners = new Set(teams.filter((t) => t.rank === 1).map((t) => t.abbr));
    const shortNames = new Map<string, string>();
    for (const w of works) {
      for (const g of w.games) {
        for (const t of [g.teams?.away?.team, g.teams?.home?.team]) {
          if (isRealTeam(t) && t.teamName) shortNames.set(t.abbreviation, t.teamName);
        }
      }
    }

    const byLeague = (round: PostseasonRound, league: 'AL' | 'NL'): Work[] =>
      works.filter((w) => w.round === round && w.league === league);

    // ── Seeds, from the bracket's own structure (MLB publishes no seed) ──
    // Wild Card: the higher seed hosts every game; a division winner at home
    // means 3v6, otherwise 4v5. Division Series: the bye club hosts game 1 and
    // is seed 1 if its feeder is the 4v5 Wild Card, seed 2 if it's the 3v6.
    const seeds = new Map<string, number>();
    const feederOf = new Map<string, Work>(); // DS id → its Wild Card
    for (const league of ['AL', 'NL'] as const) {
      const wcs = byLeague('wc', league);
      for (const wc of wcs) {
        if (!isRealTeam(wc.home) || !isRealTeam(wc.away)) continue;
        const threeSix = divisionWinners.has(wc.home.abbreviation);
        seeds.set(wc.home.abbreviation, threeSix ? 3 : 4);
        seeds.set(wc.away.abbreviation, threeSix ? 6 : 5);
      }
      for (const ds of byLeague('ds', league)) {
        const feeder = wcs.find((wc) => this.candidates(ds).some((a) => this.candidates(wc).includes(a)));
        if (feeder != null) feederOf.set(ds.id, feeder);
        const bye = isRealTeam(ds.home) ? ds.home.abbreviation : null;
        if (bye == null || feeder == null || !isRealTeam(feeder.home)) continue;
        seeds.set(bye, seeds.get(feeder.home.abbreviation) === 4 ? 1 : 2);
      }
    }

    // Final-game detail (notable line + short names) and recaps, fetched once.
    await this.hydrateFinals(works);

    const seriesOut = new Map<string, PostseasonSeries>();
    const build = (w: Work, feeders: Work[]): PostseasonSeries => {
      const out = this.toSeries(w, feeders, seeds, shortNames);
      seriesOut.set(w.id, out);
      return out;
    };

    const bracket: PostseasonBracket = { alwc: [], alds: [], alcs: null, ws: null, nlcs: null, nlds: [], nlwc: [] };
    const lcsByLeague: Partial<Record<'AL' | 'NL', Work>> = {};
    for (const league of ['AL', 'NL'] as const) {
      // Top slot = the seed-1 Division Series, with the Wild Card that feeds it.
      const dss = byLeague('ds', league).sort((a, b) => this.byeSeed(a, seeds) - this.byeSeed(b, seeds));
      const wcs = dss.map((ds) => feederOf.get(ds.id)).filter((w): w is Work => w != null);
      const dsOut = dss.map((ds) => build(ds, [feederOf.get(ds.id)].filter((w): w is Work => w != null)));
      const wcOut = wcs.map((wc) => build(wc, []));
      const lcs = byLeague('cs', league)[0];
      if (lcs != null) lcsByLeague[league] = lcs;
      const lcsOut = lcs != null ? build(lcs, dss) : null;
      if (league === 'AL') Object.assign(bracket, { alwc: wcOut, alds: dsOut, alcs: lcsOut });
      else Object.assign(bracket, { nlwc: wcOut, nlds: dsOut, nlcs: lcsOut });
    }
    const ws = works.find((w) => w.round === 'ws');
    if (ws != null) {
      bracket.ws = build(ws, [lcsByLeague.AL, lcsByLeague.NL].filter((w): w is Work => w != null));
    }

    return { active: true, note: this.noteFor(works, shortNames), bracket };
  }

  private toWork(s: RawSeries): Work | null {
    const id = s.series?.id;
    const round = id != null ? ROUND_BY_PREFIX[id.charAt(0)] : undefined;
    if (id == null || round == null) return null;
    // Postponed/cancelled rows are dropped; a rescheduled game reappears as
    // its own row with the same game number, and the later row wins.
    const byNumber = new Map<number, RawGame>();
    for (const g of s.games ?? []) {
      const state = g.status?.detailedState ?? '';
      if (state.startsWith('Cancelled') || state.startsWith('Postponed')) continue;
      if (g.seriesGameNumber != null) byNumber.set(g.seriesGameNumber, g);
    }
    const games = [...byNumber.values()].sort((a, b) => (a.seriesGameNumber ?? 0) - (b.seriesGameNumber ?? 0));
    const first = games[0] ?? s.games?.[0];
    const desc = first?.seriesDescription ?? '';
    const league = desc.startsWith('AL') ? 'AL' : desc.startsWith('NL') ? 'NL' : null;
    const bestOf = first?.gamesInSeries ?? (round === 'wc' ? 3 : round === 'ds' ? 5 : 7);

    const wins = new Map<string, number>();
    for (const g of games) {
      if (g.status?.abstractGameState !== 'Final') continue;
      for (const side of [g.teams?.away, g.teams?.home]) {
        if (side?.isWinner && isRealTeam(side.team)) {
          wins.set(side.team.abbreviation, (wins.get(side.team.abbreviation) ?? 0) + 1);
        }
      }
    }
    const need = Math.ceil(bestOf / 2);
    const winner = [...wins.entries()].find(([, n]) => n >= need)?.[0] ?? null;
    return { id, round, league, bestOf, games, home: first?.teams?.home?.team, away: first?.teams?.away?.team, wins, winner };
  }

  // Every club that could still end up on a side of this series: the real
  // teams, or the abbrs in a "NYY/BOS" placeholder.
  private candidates(w: Work): string[] {
    const out: string[] = [];
    for (const t of [w.home, w.away]) {
      if (isRealTeam(t)) out.push(t.abbreviation);
      else if (t?.abbreviation?.includes('/')) out.push(...t.abbreviation.split('/'));
    }
    return out;
  }

  private byeSeed(ds: Work, seeds: Map<string, number>): number {
    return isRealTeam(ds.home) ? (seeds.get(ds.home.abbreviation) ?? 9) : 9;
  }

  // A side of a later round, derived from the series that feeds it: its
  // winner once decided, else both of its clubs (a logo pair) once known,
  // else a word.
  private sideFromFeeder(feeder: Work | undefined, word: string): Pick<PostseasonSide, 'team' | 'options' | 'label'> {
    if (feeder?.winner != null) {
      const t = [feeder.home, feeder.away].find((x) => isRealTeam(x) && x.abbreviation === feeder.winner);
      if (isRealTeam(t)) return { team: { id: t.id, abbr: t.abbreviation }, options: [], label: null };
    }
    if (feeder != null && isRealTeam(feeder.home) && isRealTeam(feeder.away)) {
      return { team: null, options: [feeder.home.abbreviation, feeder.away.abbreviation], label: null };
    }
    return { team: null, options: [], label: word };
  }

  private toSeries(
    w: Work,
    feeders: Work[],
    seeds: Map<string, number>,
    shortNames: Map<string, string>,
  ): PostseasonSeries {
    const label = roundLabel(w.round, w.league);
    const side = (who: Pick<PostseasonSide, 'team' | 'options' | 'label'>): PostseasonSide => {
      const abbr = who.team?.abbr ?? null;
      return {
        ...who,
        seed: abbr != null ? (seeds.get(abbr) ?? null) : null,
        wins: abbr != null ? (w.wins.get(abbr) ?? 0) : 0,
        eliminated: w.winner != null && abbr != null && abbr !== w.winner,
      };
    };
    const real = (t: RawTeam | undefined): Pick<PostseasonSide, 'team' | 'options' | 'label'> | null =>
      isRealTeam(t) ? { team: { id: t.id, abbr: t.abbreviation }, options: [], label: null } : null;

    let high: PostseasonSide;
    let low: PostseasonSide;
    const homeReal = real(w.home);
    const awayReal = real(w.away);
    if (homeReal != null && awayReal != null) {
      // Both clubs known: game 1's host is the higher seed (better record in
      // the World Series) — MLB's own call, not re-derived.
      high = side(homeReal);
      low = side(awayReal);
    } else if (w.round === 'wc' || w.round === 'ds') {
      // A bye club waiting on its Wild Card: the bye club is known and hosts.
      const feeder = feeders[0];
      high = side(homeReal ?? this.sideFromFeeder(undefined, 'TBD'));
      low = side(awayReal ?? this.sideFromFeeder(feeder, 'TBD'));
    } else {
      const word = (f: Work | undefined): string =>
        w.round === 'ws' ? `${f?.league ?? ''} champ`.trim() : 'TBD';
      const a = side(this.sideFromFeeder(feeders[0], word(feeders[0])));
      const b = side(this.sideFromFeeder(feeders[1], word(feeders[1])));
      // A known club reads first; otherwise keep the feeder order.
      [high, low] = b.team != null && a.team == null ? [b, a] : [a, b];
    }

    const bothKnown = high.team != null && low.team != null;
    const state: PostseasonSeries['state'] = w.winner != null ? 'finished' : bothKnown ? 'current' : 'upcoming';
    const startDate = w.games[0]?.officialDate ?? null;

    let waitingOn: string | null = null;
    if (state === 'upcoming') {
      const f = feeders.find((x) => x.winner == null);
      waitingOn = f != null ? `Waiting on ${w.round === 'ws' ? 'LCS' : roundLabel(f.round, f.league)}` : null;
    }

    return {
      id: w.id,
      round: w.round,
      league: w.league,
      label,
      bestOf: w.bestOf,
      state,
      high,
      low,
      status: this.statusSentence(w, high, low, shortNames, startDate),
      waitingOn,
      startDate,
      games: state === 'upcoming' ? [] : this.toGames(w),
    };
  }

  // "Yankees lead 2–1" / "Series tied 1–1" / "Phillies won 3–1" — a dash
  // here is a series record, per the score rule (§4).
  private statusSentence(
    w: Work,
    high: PostseasonSide,
    low: PostseasonSide,
    shortNames: Map<string, string>,
    startDate: string | null,
  ): string {
    const name = (s: PostseasonSide): string => (s.team ? (shortNames.get(s.team.abbr) ?? s.team.abbr) : '');
    const [lead, trail] = high.wins >= low.wins ? [high, low] : [low, high];
    if (w.winner != null) return `${name(lead)} won ${lead.wins}–${trail.wins}`;
    if (high.wins === 0 && low.wins === 0) {
      return startDate != null ? `Series starts ${dayLabel(startDate)}` : 'Series not started';
    }
    if (high.wins === low.wins) return `Series tied ${high.wins}–${low.wins}`;
    return `${name(lead)} lead ${lead.wins}–${trail.wins}`;
  }

  private toGames(w: Work): PostseasonGame[] {
    const need = Math.ceil(w.bestOf / 2);
    const leaderWins = Math.max(0, ...w.wins.values());
    const played = w.games.filter((g) => g.status?.abstractGameState === 'Final').length;
    const out: PostseasonGame[] = [];
    for (const g of w.games) {
      const abstract = g.status?.abstractGameState;
      // Once decided, the unplayed if-necessary games are gone.
      if (w.winner != null && abstract !== 'Final') continue;
      const n = g.seriesGameNumber ?? 0;
      const away = g.teams?.away;
      const home = g.teams?.home;
      const abbrOf = (t: RawTeam | undefined): string => (isRealTeam(t) ? t.abbreviation : (t?.abbreviation ?? ''));
      const base: PostseasonGame = {
        gamePk: String(g.gamePk ?? ''),
        number: n,
        date: g.officialDate ?? '',
        startTime: g.status?.startTimeTBD ? null : (g.gameDate ?? null),
        host: isRealTeam(home?.team) ? home.team.abbreviation : null,
        state: 'scheduled',
        away: { abbr: abbrOf(away?.team), runs: null },
        home: { abbr: abbrOf(home?.team), runs: null },
        innings: null,
        winner: null,
        loser: null,
        save: null,
        note: null,
        recap: null,
        inning: null,
        situation: null,
        probables: null,
      };

      if (abstract === 'Final') {
        const detail = this.finalDetails.get(base.gamePk);
        const nameOf = (p: RawPerson | undefined): string | null =>
          p?.id != null ? (detail?.names.get(p.id) ?? lastName(p.fullName)) : null;
        const ls = g.linescore ?? {};
        const scheduled = ls.scheduledInnings ?? 9;
        out.push({
          ...base,
          state: 'final',
          away: { abbr: base.away.abbr, runs: away?.score ?? 0 },
          home: { abbr: base.home.abbr, runs: home?.score ?? 0 },
          innings: ls.currentInning != null && ls.currentInning > scheduled ? ls.currentInning : null,
          winner: nameOf(g.decisions?.winner),
          loser: nameOf(g.decisions?.loser),
          save: nameOf(g.decisions?.save),
          note: detail?.note ?? null,
          recap: this.recaps.get(base.gamePk)?.recap ?? null,
        });
      } else if (abstract === 'Live') {
        const ls = g.linescore ?? {};
        out.push({
          ...base,
          state: 'live',
          away: { abbr: base.away.abbr, runs: away?.score ?? 0 },
          home: { abbr: base.home.abbr, runs: home?.score ?? 0 },
          inning: ls.currentInning != null ? `${ls.isTopInning === false ? '▼' : '▲'}${ls.currentInning}` : null,
          situation: situationText(ls),
        });
      } else {
        // Game n is certain to be played only if the series leader, winning
        // every game before it, still couldn't have clinched.
        const unplayedBefore = Math.max(0, n - 1 - played);
        const certain = leaderWins + unplayedBefore < need;
        const pa = lastName(away?.probablePitcher?.fullName);
        const ph = lastName(home?.probablePitcher?.fullName);
        out.push({
          ...base,
          state: certain ? 'scheduled' : 'ifNecessary',
          probables: certain && (pa != null || ph != null) ? { away: pa, home: ph } : null,
        });
      }
    }
    return out;
  }

  private async hydrateFinals(works: Work[]): Promise<void> {
    const finals = works.flatMap((w) => w.games).filter((g) => g.status?.abstractGameState === 'Final' && g.gamePk != null);
    await Promise.all(
      finals.map(async (g) => {
        const pk = String(g.gamePk);
        if (!this.finalDetails.has(pk)) {
          const box = (await this.mlb.getRawBoxScore(pk)) as RawBoxScore | null;
          if (box != null) {
            const winnerSide = g.teams?.away?.isWinner ? 'away' : g.teams?.home?.isWinner ? 'home' : null;
            this.finalDetails.set(pk, { note: notableLine(box, winnerSide), names: boxNames(box) });
          }
        }
        const r = this.recaps.get(pk);
        if (r == null || (r.recap == null && Date.now() - r.checkedAt > RECAP_RECHECK_MS)) {
          const content = await this.mlb.getGameContent(pk);
          this.recaps.set(pk, { recap: content != null ? findGameRecap(content) : null, checkedAt: Date.now() });
        }
      }),
    );
  }

  // Beside the section label: "Field set · Wild Card Series start Tuesday",
  // "Division Series · 8 clubs left".
  private noteFor(works: Work[], shortNames: Map<string, string>): string {
    const anyPlayed = works.some((w) => w.games.some((g) => g.status?.abstractGameState !== 'Preview'));
    if (!anyPlayed) {
      const first = works
        .filter((w) => w.round === 'wc')
        .map((w) => w.games[0]?.officialDate)
        .filter((d): d is string => d != null)
        .sort()[0];
      const day = first != null ? dayLabel(first).split(' ')[0] : null;
      const dayName: Record<string, string> = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
      return day != null ? `Field set · Wild Card Series start ${dayName[day]}` : 'Field set';
    }
    const ws = works.find((w) => w.round === 'ws');
    if (ws?.winner != null) return `${shortNames.get(ws.winner) ?? ws.winner} won the World Series`;
    const current = ROUND_ORDER.find((r) => works.some((w) => w.round === r && w.winner == null)) ?? 'ws';
    const eliminated = works.filter((w) => w.winner != null).length;
    return `${ROUND_NAME[current]} · ${POSTSEASON_BERTHS - eliminated} clubs left`;
  }
}
