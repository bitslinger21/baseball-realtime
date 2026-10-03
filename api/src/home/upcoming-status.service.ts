import { Injectable, Logger } from '@nestjs/common';
import { MlbApiService } from '../providers/mlb/mlb.service';
import { StandingsService } from '../standings/standings.service';
import { PostseasonService } from './postseason.service';
import { safeTimeZone } from './follow-faces';
import type { PostseasonSeries, PostseasonSide } from './postseason.types';
import type { UpcomingFact, UpcomingStatus } from './upcoming-status.types';
import type { SeasonGameDto } from '../games/dtos/season-game.dto';

// Which state a player's Upcoming tab is in (PROMPT_upcoming_empty.md):
//   games      — the club has scheduled games with a known opponent
//   waiting    — postseason, next round's opponent undecided (a pair like NYY/CLE)
//   eliminated — season over for this club (lost a series, or missed the postseason)
//   offseason  — the season is over for everyone
// Only KNOWN facts are returned; a fact that can't be filled is left out.

const ROUND_ORDER = ['wc', 'ds', 'cs', 'ws'] as const;

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

@Injectable()
export class UpcomingStatusService {
  private readonly log = new Logger(UpcomingStatusService.name);
  private teams: { data: Map<number, { abbr: string; name: string }>; expiresAt: number } | null = null;

  constructor(
    private readonly mlb: MlbApiService,
    private readonly standings: StandingsService,
    private readonly postseason: PostseasonService,
  ) {}

  private async teamInfo(): Promise<Map<number, { abbr: string; name: string }>> {
    if (this.teams != null && Date.now() < this.teams.expiresAt) return this.teams.data;
    const res = await fetch('https://statsapi.mlb.com/api/v1/teams?sportId=1');
    const json = (await res.json()) as { teams?: { id?: number; abbreviation?: string; teamName?: string }[] };
    const map = new Map<number, { abbr: string; name: string }>();
    for (const t of json.teams ?? []) {
      if (t.id != null && t.abbreviation != null) map.set(t.id, { abbr: t.abbreviation, name: t.teamName ?? t.abbreviation });
    }
    this.teams = { data: map, expiresAt: Date.now() + 24 * 3_600_000 };
    return map;
  }

  // "Series tied 2–2" reads "tied 2–2" mid-sentence; "Mariners lead 2–1" stays as is.
  private statusPhrase(status: string): string {
    return status.replace(/^Series tied/, 'tied');
  }

  // Bracket labels say "AL Wild Card"; a sentence reads "the AL Wild Card Series".
  private seriesName(label: string): string {
    return /Wild Card$/.test(label) ? `${label} Series` : label;
  }

  async getStatus(teamId: number, timeZone?: string): Promise<UpcomingStatus> {
    const tz = safeTimeZone(timeZone);
    try {
      // 1. Scheduled games with a real opponent → the normal tab.
      const upcoming = await this.mlb.getUpcomingForTeam(teamId, 3);
      const real = upcoming.filter((g) => !(g.homeTeamId === teamId ? g.awayAbbr : g.homeAbbr).includes('/'));
      if (real.length > 0) return { kind: 'games', why: null, facts: [], link: null };

      const names = await this.teamInfo();
      const me = names.get(teamId);
      const nick = (abbr: string): string => [...names.values()].find((t) => t.abbr === abbr)?.name ?? abbr;
      const season = String(new Date().getFullYear());
      const post = await this.postseason.getPostseason(season);
      const b = post.bracket;
      const all: PostseasonSeries[] = b == null ? [] : [...b.alwc, ...b.alds, ...(b.alcs ? [b.alcs] : []), ...(b.ws ? [b.ws] : []), ...(b.nlcs ? [b.nlcs] : []), ...b.nlds, ...b.nlwc];
      const ws = b?.ws ?? null;

      // 4. The World Series is over → everyone is in the off-season.
      if (ws?.state === 'finished' || (b == null && real.length === 0 && !this.inSeason())) {
        return this.offseason(teamId, me, ws, nick, tz);
      }

      const isMine = (s: PostseasonSide): boolean => s.team?.id === teamId;
      const mine = all
        .filter((s) => isMine(s.high) || isMine(s.low))
        .sort((x, y) => ROUND_ORDER.indexOf(y.round) - ROUND_ORDER.indexOf(x.round));
      const latest = mine[0];

      if (latest == null) {
        // Not in the bracket at all: missed the postseason (once the field exists).
        if (b != null) return this.missedPostseason(teamId, me, season, tz);
        return this.offseason(teamId, me, null, nick, tz);
      }

      const meSide = isMine(latest.high) ? latest.high : latest.low;
      const them = meSide === latest.high ? latest.low : latest.high;

      // 3. Lost their most recent series → season over.
      if (latest.state === 'finished' && meSide.eliminated) {
        return this.eliminatedInSeries(latest, meSide, them, me, nick, tz);
      }

      // 2. Next round's opponent undecided → waiting.
      if (them.team == null) {
        return this.waiting(latest, them, mine, all, me, nick, tz);
      }

      // In a series with no game left on the schedule yet (e.g. one in progress now).
      const played = latest.games.filter((g) => g.state === 'final' || g.state === 'live').length;
      return {
        kind: 'waiting',
        why: `The ${me?.name ?? 'club'} are in the ${this.seriesName(latest.label)} against the ${nick(them.team.abbr)} — ${this.statusPhrase(latest.status)}.`,
        facts: [
          { label: 'Current series', value: `${latest.label} · best of ${latest.bestOf}` },
          { label: 'Series', value: `${meSide.wins}–${them.wins}`, mono: true, sub: played > 0 ? `${played} ${played === 1 ? 'game' : 'games'} played` : undefined },
        ],
        link: null,
      };
    } catch (e: unknown) {
      this.log.warn(`upcoming status for ${teamId} failed: ${e instanceof Error ? e.message : String(e)}`);
      // A failure must never fall back to mock games — show the quietest truthful state.
      return { kind: 'offseason', why: 'The schedule could not be loaded right now.', facts: [], link: null };
    }
  }

  private inSeason(): boolean {
    const m = new Date().getMonth() + 1;
    return m >= 3 && m <= 10;
  }

  // "Sat 10/17" in the viewer's zone, from an ISO time or a calendar date.
  private day(isoOrDate: string, tz: string): string {
    const iso = isoOrDate.length === 10 ? `${isoOrDate}T16:00:00Z` : isoOrDate;
    const d = new Date(iso);
    const wd = d.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' });
    const md = d.toLocaleDateString('en-US', { timeZone: tz, month: 'numeric', day: 'numeric' });
    return `${wd} ${md}`;
  }

  private time(iso: string, tz: string): string {
    return new Date(iso).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).replace(/\s?([AP])M$/, (_m, p: string) => p.toLowerCase());
  }

  private monthDay(date: string, tz: string): string {
    return new Date(`${date}T16:00:00Z`).toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric' });
  }

  private waiting(
    next: PostseasonSeries,
    them: PostseasonSide,
    mine: PostseasonSeries[],
    all: PostseasonSeries[],
    me: { abbr: string; name: string } | undefined,
    nick: (abbr: string) => string,
    tz: string,
  ): UpcomingStatus {
    const facts: UpcomingFact[] = [{ label: 'Next series', value: `${next.label} · best of ${next.bestOf}` }];
    const pair = them.options;
    // The series that decides the opponent: the one whose two clubs ARE the pair.
    const decider = all.find((s) => pair.length === 2 && [s.high.team?.abbr, s.low.team?.abbr].every((a) => a != null && pair.includes(a)));
    if (pair.length === 2) {
      const nextGame = decider?.games.find((g) => g.state === 'scheduled' || g.state === 'live');
      let sub: string | undefined;
      if (nextGame != null) {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
        sub = nextGame.date === today ? `Set after Game ${nextGame.number} tonight` : `Set after Game ${nextGame.number} · ${this.day(nextGame.date, tz)}`;
      }
      // The client draws a two-team fact as "[logo] NYY or [logo] CLE"; value is the plain-text form.
      facts.push({ label: 'Opponent', teams: pair, value: pair.join(' or '), sub });
    }
    const g1 = next.games[0];
    const startDate = g1?.date ?? next.startDate;
    if (startDate != null) {
      // Date (and time when known) only — the opponent is already on the row above.
      const value = [this.day(startDate, tz), g1?.startTime != null ? this.time(g1.startTime, tz) : null].filter(Boolean).join(' · ');
      facts.push({ label: 'Game 1', value, mono: true, sub: g1?.startTime == null ? 'Start time not announced' : undefined });
    }

    const won = mine.find((s) => s !== next && s.state === 'finished');
    let why: string;
    const deciderText =
      decider != null
        ? `the winner of ${nick(decider.high.team!.abbr)} vs. ${nick(decider.low.team!.abbr)} (${this.statusPhrase(decider.status)})`
        : 'still being decided';
    if (won != null) {
      const loser = won.high.team?.abbr === me?.abbr ? won.low : won.high;
      const w = won.high.team?.abbr === me?.abbr ? won.high.wins : won.low.wins;
      why = `The ${me?.name ?? 'club'} beat the ${nick(loser.team?.abbr ?? '')} ${w}–${loser.wins} in the ${this.seriesName(won.label)}. Their ${next.label} opponent is ${deciderText}.`;
    } else {
      why = `The ${me?.name ?? 'club'} earned a bye into the ${next.label}. They'll face ${deciderText}.`;
    }
    return { kind: 'waiting', why, facts, link: null };
  }

  private eliminatedInSeries(
    s: PostseasonSeries,
    meSide: PostseasonSide,
    them: PostseasonSide,
    me: { abbr: string; name: string } | undefined,
    nick: (abbr: string) => string,
    tz: string,
  ): UpcomingStatus {
    const last = [...s.games].reverse().find((g) => g.state === 'final');
    const facts: UpcomingFact[] = [];
    let when = '';
    if (last != null) {
      when = this.monthDay(last.date, tz);
      facts.push({
        label: 'Last game',
        value: `${when} · ${last.away.abbr} ${last.away.runs ?? 0} – ${last.home.runs ?? 0} ${last.home.abbr}`,
        mono: true,
        sub: `${s.label} Game ${last.number} · lost series ${meSide.wins}–${them.wins}`,
      });
    }
    const oppName = nick(them.team?.abbr ?? '');
    return {
      kind: 'eliminated',
      why: `The ${oppName} eliminated the ${me?.name ?? 'club'} ${them.wins}–${meSide.wins} in the ${this.seriesName(s.label)}${when ? `, ending their season on ${when}` : ''}.`,
      facts,
      link: 'stats',
    };
  }

  private async missedPostseason(
    teamId: number,
    me: { abbr: string; name: string } | undefined,
    season: string,
    tz: string,
  ): Promise<UpcomingStatus> {
    const [standings, schedule] = await Promise.all([
      this.standings.getStandings(season).catch(() => []),
      this.mlb.getSeasonScheduleForTeam(teamId, season).catch(() => [] as SeasonGameDto[]),
    ]);
    const st = standings.find((s) => s.abbr === me?.abbr);
    const facts: UpcomingFact[] = [];
    const last = [...schedule].reverse().find((g) => g.status === 'final');
    if (last != null && me != null) {
      const [away, home] = last.isHome ? [last.oppAbbr, me.abbr] : [me.abbr, last.oppAbbr];
      const [ar, hr] = last.isHome ? [last.oppScore, last.teamScore] : [last.teamScore, last.oppScore];
      facts.push({ label: 'Last game', value: `${this.monthDay(last.gameDate, tz)} · ${away} ${ar ?? 0} – ${hr ?? 0} ${home}`, mono: true, sub: 'Final regular-season game' });
    }
    const division = st?.divisionName?.replace(/^American League/, 'AL').replace(/^National League/, 'NL');
    const why =
      st != null
        ? `The ${me?.name ?? 'club'} finished ${st.wins}–${st.losses}, ${ordinal(st.rank)} in the ${division}, and missed the postseason.`
        : `The ${me?.name ?? 'club'} missed the postseason.`;
    return { kind: 'eliminated', why, facts, link: 'stats' };
  }

  private async offseason(
    teamId: number,
    me: { abbr: string; name: string } | undefined,
    ws: PostseasonSeries | null,
    nick: (abbr: string) => string,
    tz: string,
  ): Promise<UpcomingStatus> {
    const now = new Date();
    const nextSeason = String(now.getMonth() + 1 >= 9 ? now.getFullYear() + 1 : now.getFullYear());
    const schedule = await this.mlb.getSeasonScheduleForTeam(teamId, nextSeason).catch(() => [] as SeasonGameDto[]);
    const opener = schedule.find((g) => g.status === 'scheduled');
    const facts: UpcomingFact[] = [];
    let resumes: string;
    if (opener != null) {
      const date = opener.gameDate;
      facts.push({
        label: 'Opening Day',
        teams: [opener.oppAbbr],
        value: `${this.day(date, tz)} · ${opener.isHome ? 'vs' : '@'} ${opener.oppAbbr}`,
        mono: true,
      });
      const long = new Date(`${date}T16:00:00Z`).toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' });
      resumes = `The ${nextSeason} season opens ${long}.`;
    } else {
      resumes = `The ${nextSeason} schedule hasn't been released yet.`;
    }
    const champ = ws?.state === 'finished' ? [ws.high, ws.low].find((s) => !s.eliminated)?.team?.abbr : undefined;
    const lead = champ != null ? `The ${champ === me?.abbr ? me.name : nick(champ)} won the World Series. ` : '';
    return { kind: 'offseason', why: `${lead}${resumes}`, facts, link: null };
  }
}
