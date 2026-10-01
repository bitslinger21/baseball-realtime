// Home Following layers (PROMPT_video_clips.md §3a): every layer is a label +
// two content lines at a fixed height, so cycling never moves the rail.
//   TODAY     — the game today (live / final / tonight), or "No game today"
//   SEASON    — the season line
//   NEXT GAME — after today's game, when there is one
// A dash here is either a W–L record or a compact game score with the subject
// team first ("NYY 7–2"); a full game score elsewhere reads "HOU 8 – 5 CHC".
import type { GameDto } from '../games/dtos/game.dto';
import type { StandingTeamDto } from '../standings/dtos/standing-team.dto';
import type { SeasonBattingStats, SeasonPitchingStats } from '../players/players.service';
import type { FollowFace } from './following.types';
import { ordinal, situationText } from '../games/situation';

const ET = 'America/New_York';


function face(label: FollowFace['label'], line2: string, line3: string): FollowFace {
  return { label, lines: [line2, line3] };
}

// "7:05 ET" — game times are shown in Eastern, like the rest of the app.
function timeEt(iso: string): string {
  const t = new Date(iso).toLocaleTimeString('en-US', { timeZone: ET, hour: 'numeric', minute: '2-digit' });
  return `${t.replace(/\s?[AP]M$/, '')} ET`;
}

function weekdayEt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { timeZone: ET, weekday: 'short' });
}

function lastName(full: string | null | undefined): string | null {
  if (full == null || full.trim() === '') return null;
  const parts = full.trim().split(/\s+/);
  while (parts.length > 1 && /^(jr\.?|sr\.?|ii|iii|iv)$/i.test(parts[parts.length - 1])) parts.pop();
  return parts[parts.length - 1];
}

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

// Innings pitched in thirds, like the rest of the app: "6.0" → "6", "5.2" → "5 2/3", "0.2" → "2/3".
function formatIp(ip: string): string {
  const [whole, frac] = ip.split('.');
  if (frac == null || frac === '0') return whole;
  return whole === '0' ? `${frac}/3` : `${whole} ${frac}/3`;
}

// ── The slice of the live feed the TODAY layer reads ─────────────────────────

type FeedPerson = { id?: number; fullName?: string };
type FeedPlayer = {
  person?: FeedPerson;
  stats?: {
    batting?: { atBats?: number; hits?: number; doubles?: number; triples?: number; homeRuns?: number; rbi?: number };
    pitching?: { inningsPitched?: string; hits?: number; strikeOuts?: number; numberOfPitches?: number };
  };
  seasonStats?: { pitching?: { wins?: number; losses?: number } };
};
export type FollowFeed = {
  gameData?: {
    status?: { abstractGameState?: string };
    datetime?: { dateTime?: string };
    teams?: { away?: FeedTeam; home?: FeedTeam };
    probablePitchers?: { away?: FeedPerson; home?: FeedPerson };
  };
  liveData?: {
    linescore?: {
      currentInning?: number;
      isTopInning?: boolean;
      inningState?: string;
      outs?: number;
      offense?: { first?: unknown; second?: unknown; third?: unknown };
      defense?: { pitcher?: FeedPerson };
      teams?: { away?: { runs?: number }; home?: { runs?: number } };
    };
    decisions?: { winner?: FeedPerson; loser?: FeedPerson };
    boxscore?: { teams?: { away?: { players?: Record<string, FeedPlayer> }; home?: { players?: Record<string, FeedPlayer> } } };
  };
};
type FeedTeam = { id?: number; abbreviation?: string };

type Side = 'away' | 'home';

interface GameView {
  side: Side;
  opp: Side;
  state: 'live' | 'final' | 'scheduled';
  feed: FollowFeed;
}

export function gameView(feed: FollowFeed, teamId: number): GameView | null {
  const t = feed.gameData?.teams;
  const side: Side | null = t?.away?.id === teamId ? 'away' : t?.home?.id === teamId ? 'home' : null;
  if (side == null) return null;
  const st = feed.gameData?.status?.abstractGameState;
  const state = st === 'Final' ? 'final' : st === 'Live' ? 'live' : 'scheduled';
  return { side, opp: side === 'away' ? 'home' : 'away', state, feed };
}

function runs(g: GameView, s: Side): number {
  return g.feed.liveData?.linescore?.teams?.[s]?.runs ?? 0;
}

function abbr(g: GameView, s: Side): string {
  return g.feed.gameData?.teams?.[s]?.abbreviation ?? '';
}

// "vs ATL" at home, "@ TOR" away.
function versus(g: GameView): string {
  return `${g.side === 'home' ? 'vs' : '@'} ${abbr(g, g.opp)}`;
}

// "▲8th" — the current half-inning.
function halfInning(g: GameView): string {
  const ls = g.feed.liveData?.linescore;
  if (ls?.currentInning == null) return '';
  return `${ls.isTopInning === false ? '▼' : '▲'}${ordinal(ls.currentInning)}`;
}

function situation(g: GameView): string {
  return situationText(g.feed.liveData?.linescore ?? {});
}

// The subject team first: "NYY 7–2".
function compactScore(g: GameView): string {
  return `${abbr(g, g.side)} ${runs(g, g.side)}–${runs(g, g.opp)}`;
}

function startLine(g: GameView): string {
  const iso = g.feed.gameData?.datetime?.dateTime;
  if (iso == null) return 'Today';
  const hourEt = Number(new Date(iso).toLocaleString('en-US', { timeZone: ET, hour: 'numeric', hour12: false }));
  return `${hourEt >= 17 ? 'Tonight' : 'Today'} ${versus(g)} · ${timeEt(iso)}`;
}

// The subject team's starter first: "Valdez vs Kirby".
function probablesLine(mine: string | null | undefined, theirs: string | null | undefined): string {
  const a = lastName(mine);
  const b = lastName(theirs);
  if (a == null && b == null) return 'Probables not announced';
  return `${a ?? 'TBD'} vs ${b ?? 'TBD'}`;
}

function feedProbables(g: GameView): string {
  const p = g.feed.gameData?.probablePitchers;
  return probablesLine(p?.[g.side]?.fullName, p?.[g.opp]?.fullName);
}

function player(g: GameView, s: Side, id: number | undefined): FeedPlayer | null {
  if (id == null) return null;
  return g.feed.liveData?.boxscore?.teams?.[s]?.players?.[`ID${id}`] ?? null;
}

// ── TODAY ────────────────────────────────────────────────────────────────────

export function teamToday(g: GameView): FollowFace {
  // The opponent's abbreviation, like "vs BOS" elsewhere on the card: a city
  // is ambiguous (two clubs each in New York, Chicago, Los Angeles; MLB calls
  // the Yankees "Bronx") and a club name overflows the 320px rail.
  const club = abbr(g, g.opp);
  const mine = runs(g, g.side);
  const theirs = runs(g, g.opp);
  if (g.state === 'scheduled') return face('TODAY', startLine(g), feedProbables(g));
  if (g.state === 'final') {
    const won = mine > theirs;
    const d = g.feed.liveData?.decisions;
    const pitcher = won ? d?.winner : d?.loser;
    const side = player(g, g.side, pitcher?.id);
    const rec = side?.seasonStats?.pitching;
    const name = lastName(pitcher?.fullName);
    const decision = name == null
      ? versus(g)
      : `${won ? 'W' : 'L'}: ${name}${rec?.wins != null && rec.losses != null ? ` (${rec.wins}–${rec.losses})` : ''}`;
    return face('TODAY', `Final · ${won ? 'beat' : 'lost to'} ${club} ${mine}–${theirs}`, decision);
  }
  const verb = mine > theirs ? 'leading' : mine < theirs ? 'trailing' : 'tied with';
  return face('TODAY', `${halfInning(g)} · ${verb} ${club} ${mine}–${theirs}`, situation(g));
}

export function playerToday(g: GameView, mlbId: number): FollowFace {
  if (g.state === 'scheduled') return face('TODAY', startLine(g), feedProbables(g));
  const p = player(g, g.side, mlbId);
  const bat = p?.stats?.batting;
  const pit = p?.stats?.pitching;
  const finalPrefix = g.state === 'final' ? 'Final · ' : '';

  if (bat != null && (bat.atBats ?? 0) > 0) {
    const parts = [`${bat.hits ?? 0}-for-${bat.atBats}`];
    const count = (n: number | undefined, tag: string): void => {
      if ((n ?? 0) > 0) parts.push(n === 1 ? tag : `${n} ${tag}`);
    };
    count(bat.doubles, '2B');
    count(bat.triples, '3B');
    count(bat.homeRuns, 'HR');
    count(bat.rbi, 'RBI');
    const context = g.state === 'final'
      ? `${versus(g)} · ${abbr(g, g.side)} ${runs(g, g.side) > runs(g, g.opp) ? 'won' : 'lost'} ${runs(g, g.side)}–${runs(g, g.opp)}`
      : `${versus(g)} · ${halfInning(g)} · ${compactScore(g)}`;
    return face('TODAY', `${finalPrefix}${parts.join(' · ')}`, context);
  }
  if (pit?.inningsPitched != null) {
    const line = `${formatIp(pit.inningsPitched)} IP · ${pit.hits ?? 0} H · ${pit.strikeOuts ?? 0} K`;
    const pitches = pit.numberOfPitches != null ? ` · ${pit.numberOfPitches} pitches` : '';
    const stillIn = g.state === 'live' && g.feed.liveData?.linescore?.defense?.pitcher?.id === mlbId ? ' · still in' : '';
    return face('TODAY', `${finalPrefix}${line}`, `${versus(g)}${pitches}${stillIn}`);
  }
  // In today's game but no plate appearance / inning yet.
  return g.state === 'final'
    ? face('TODAY', 'Final · did not play', `${versus(g)} · ${compactScore(g)}`)
    : face('TODAY', 'Not in yet', `${versus(g)} · ${halfInning(g)} · ${compactScore(g)}`);
}

// ── NEXT GAME / no game today ────────────────────────────────────────────────

// "Sat vs SEA · 7:05 ET"; the day alone while MLB has the time as TBD.
function nextWhen(next: GameDto, teamId: number): string {
  const home = next.homeTeamId === teamId;
  const matchup = `${home ? 'vs' : '@'} ${home ? next.awayAbbr : next.homeAbbr}`;
  if (next.startTimeUtc != null) {
    const iso = new Date(next.startTimeUtc).toISOString();
    return `${weekdayEt(iso)} ${matchup} · ${timeEt(iso)}`;
  }
  // gameDate is the calendar date (yyyy-mm-dd) — read at noon UTC so no zone shifts the day.
  const day = next.gameDate != null ? weekdayEt(`${String(next.gameDate).slice(0, 10)}T16:00:00Z`) : null;
  return day != null ? `${day} ${matchup}` : matchup;
}

export function nextGameFace(next: GameDto, teamId: number): FollowFace {
  const home = next.homeTeamId === teamId;
  const mine = (home ? next.homeProbable : next.awayProbable)?.name;
  const theirs = (home ? next.awayProbable : next.homeProbable)?.name;
  return face('NEXT GAME', nextWhen(next, teamId), probablesLine(mine, theirs));
}

export function noGameToday(next: GameDto | null, teamId: number): FollowFace {
  return face('TODAY', 'No game today', next != null ? `Next: ${nextWhen(next, teamId)}` : 'No game scheduled');
}

// ── SEASON ───────────────────────────────────────────────────────────────────

function streakText(streak: string | null | undefined): string | null {
  const m = /^([WL])(\d+)$/.exec(streak ?? '');
  if (m == null) return null;
  const n = Number(m[2]);
  const verb = m[1] === 'W' ? 'won' : 'lost';
  return n === 1 ? `${verb} last game` : `${verb} ${n} straight`;
}

export function teamSeason(s: StandingTeamDto): FollowFace {
  const gb = s.gamesBack === '-' || s.gamesBack === '' ? 'leads the division' : `${s.gamesBack} GB`;
  return face(
    'SEASON',
    `${s.wins}–${s.losses} · ${ordinal(s.rank)} ${s.divisionName}`,
    [gb, streakText(s.streak)].filter(Boolean).join(' · '),
  );
}

export function playerSeason(
  totals: { batting: SeasonBattingStats | null; pitching: SeasonPitchingStats | null } | null,
): FollowFace {
  const b = totals?.batting;
  if (b != null && (b.avg != null || b.homeRuns != null)) {
    const sb = (b.stolenBases ?? 0) >= 10 ? ` · ${b.stolenBases} SB` : '';
    return face(
      'SEASON',
      `${b.avg ?? '.---'} · ${b.homeRuns ?? 0} HR · ${b.rbi ?? 0} RBI`,
      `${b.obp ?? '.---'} OBP · ${b.slg ?? '.---'} SLG${sb}`,
    );
  }
  const p = totals?.pitching;
  if (p != null) {
    const starts = p.gamesStarted != null && p.gamesStarted > 0 ? ` · ${p.gamesStarted} ${plural(p.gamesStarted, 'start', 'starts')}` : '';
    return face(
      'SEASON',
      `${p.wins ?? 0}–${p.losses ?? 0} · ${p.era ?? '-.--'} ERA · ${p.strikeOuts ?? 0} K`,
      `${p.whip ?? '-.--'} WHIP${starts}`,
    );
  }
  return face('SEASON', 'No stats yet this season', '');
}
