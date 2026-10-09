// Alert detection for the header bell (PROMPT_alerts.md, F-009). Pure: one
// game's raw live feed in, the stories and one-off moments it shows out. The
// feed service (alert-feed.service.ts) owns state — which stories already
// exist, when they started, when they end — and calls this every tick.
//
// Triggers, and only these:
//   1. No-hitter / perfect game, from the 7th (team level, so a combined one counts)
//   2. Cycle watch: 3 of the 4 hits, at bat or on deck
//   3. Big single games: a 3rd HR, a 15th K (one-off moments, never "live")
//   4. Milestones about to happen: one away from a career round number, up now

export type ProgWire =
  | { type: 'innings'; done: number }
  | { type: 'cycle'; have: string[] }
  | { type: 'count'; from: number; to: number; unit: string };

export interface GameSnap {
  gamePk: string;
  away: string;
  home: string;
  score: [number, number];
  half: string; // "▼8", "Final"
  live: boolean;
}

interface Who {
  playerId: number;
  playerShort: string;
  teamAbbr: string;
}

// A story that's live right now. `canStart` gates creating it (cycle and
// milestone stories begin only when the player is at bat or on deck); an
// existing story keeps updating while it's still detected at all.
export interface LiveStory extends Who {
  storyId: string;
  kind: string;
  big: boolean;
  canStart: boolean;
  title: string;
  sub: string;
  prog?: ProgWire;
  // What the original alert reads once the story is over.
  pastTitle: string;
  // The ending used when a story simply stops being detected (game over,
  // player out of the game) without one of the explicit endings below.
  fallbackEnd: StoryEnd;
}

export interface StoryEnd extends Who {
  kind: string;
  title: string;
  sub: string;
  pastSub: string; // the original alert's sub once ended ("Ended in the 8th")
  atBatIndex: number | null; // for the clip
  at: string | null;
}

// A one-off moment (3rd HR, 15th K): lands in the tray as already over.
export interface Moment extends Who {
  id: string;
  kind: string;
  title: string;
  sub: string;
  atBatIndex: number | null;
  at: string | null;
}

export interface Detection {
  game: GameSnap;
  final: boolean;
  stories: LiveStory[];
  // Explicit endings, keyed by the storyId they close. Applied only to
  // stories that are actually live — the detector doesn't know which are.
  endings: Map<string, StoryEnd>;
  moments: Moment[];
}

// Career totals before this season (career − season, regular season), so
// career-now = base + the box score's live season line, whenever the stats
// API catches up.
export interface CareerBase {
  hr: number;
  hits: number;
  k: number; // pitching
  w: number;
}

// ---- Raw feed (only what's read here) ----------------------------------------

interface RawPerson {
  id: number;
  fullName?: string;
}
interface RawBatting {
  hits?: number;
  doubles?: number;
  triples?: number;
  homeRuns?: number;
}
interface RawPitching {
  strikeOuts?: number;
  hits?: number;
  baseOnBalls?: number;
  numberOfPitches?: number;
  outs?: number;
  wins?: number;
  inningsPitched?: string;
}
interface RawBoxPlayer {
  person: RawPerson;
  stats?: { batting?: RawBatting; pitching?: RawPitching };
  seasonStats?: { batting?: RawBatting; pitching?: RawPitching };
}
interface RawBoxTeam {
  team?: { abbreviation?: string; teamName?: string };
  players?: Record<string, RawBoxPlayer>;
  pitchers?: number[];
  teamStats?: {
    batting?: { hits?: number; baseOnBalls?: number; hitByPitch?: number };
    pitching?: RawPitching;
  };
}
interface RawPlay {
  result?: {
    eventType?: string;
    event?: string;
    rbi?: number;
    awayScore?: number;
    homeScore?: number;
  };
  about?: {
    atBatIndex?: number;
    halfInning?: string;
    inning?: number;
    isComplete?: boolean;
    endTime?: string;
  };
  matchup?: { batter?: RawPerson; pitcher?: RawPerson };
  runners?: {
    movement?: { start?: string | null; end?: string | null; isOut?: boolean };
    details?: { runner?: RawPerson };
  }[];
  playEvents?: { hitData?: { totalDistance?: number } }[];
}
export interface RawFeed {
  gameData?: {
    game?: { pk?: number; type?: string };
    status?: { abstractGameState?: string; detailedState?: string };
    teams?: {
      away?: { abbreviation?: string; teamName?: string };
      home?: { abbreviation?: string; teamName?: string };
    };
    players?: Record<
      string,
      {
        id: number;
        lastName?: string;
        useLastName?: string;
        boxscoreName?: string;
        nameSuffix?: string;
      }
    >;
  };
  liveData?: {
    linescore?: {
      currentInning?: number;
      inningState?: string; // Top | Middle | Bottom | End
      scheduledInnings?: number;
      isTopInning?: boolean;
      outs?: number;
      teams?: {
        away?: { runs?: number; errors?: number };
        home?: { runs?: number; errors?: number };
      };
      offense?: { batter?: RawPerson; onDeck?: RawPerson; inHole?: RawPerson };
      defense?: { pitcher?: RawPerson };
    };
    boxscore?: { teams?: { away?: RawBoxTeam; home?: RawBoxTeam } };
    plays?: { allPlays?: RawPlay[] };
    decisions?: { winner?: RawPerson };
  };
}

type Side = 'away' | 'home';
const other = (s: Side): Side => (s === 'away' ? 'home' : 'away');

const HIT_EVENTS = new Set(['single', 'double', 'triple', 'home_run']);
const EVENT_WORD: Record<string, string> = {
  single: 'single',
  double: 'double',
  triple: 'triple',
  home_run: 'home run',
  walk: 'walk',
  intent_walk: 'intentional walk',
  hit_by_pitch: 'hit by pitch',
  field_error: 'reached on an error',
  catcher_interf: "catcher's interference",
  fielders_choice: "fielder's choice",
  fielders_choice_out: "fielder's choice",
};
const CYCLE = ['1B', '2B', '3B', 'HR'] as const;
const CYCLE_WORD: Record<string, string> = {
  '1B': 'single',
  '2B': 'double',
  '3B': 'triple',
  HR: 'home run',
};
const NTH_WORD = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth'];

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

// "7 1/3" — innings from outs, thirds as a fraction (app convention).
function ipFromOuts(outs: number): string {
  const whole = Math.floor(outs / 3);
  const rem = outs % 3;
  return rem === 0 ? `${whole}` : `${whole} ${rem}/3`;
}

function aOrAn(word: string): string {
  return /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`;
}

// ---- Game snapshot -----------------------------------------------------------

function halfLabel(
  ls: NonNullable<NonNullable<RawFeed['liveData']>['linescore']>,
): string {
  const inning = ls.currentInning ?? 1;
  const state = ls.inningState ?? (ls.isTopInning ? 'Top' : 'Bottom');
  const away = ls.teams?.away?.runs ?? 0;
  const home = ls.teams?.home?.runs ?? 0;
  const lastInning = inning >= (ls.scheduledInnings ?? 9);
  const middle = state === 'Middle' || (state === 'Top' && ls.outs === 3);
  const end = state === 'End' || (state === 'Bottom' && ls.outs === 3);
  // The last out lands a few seconds before the feed says Final.
  if (lastInning && ((middle && home > away) || (end && home !== away)))
    return 'Final';
  // Between halves, show the half coming up.
  if (middle) return `▼${inning}`;
  if (end) return `▲${inning + 1}`;
  return `${state === 'Top' ? '▲' : '▼'}${inning}`;
}

// How many innings this side's defense has finished. The home team fields the
// tops, the away team the bottoms.
function defensiveInningsDone(
  ls: NonNullable<NonNullable<RawFeed['liveData']>['linescore']>,
  fielding: Side,
  final: boolean,
): number {
  const inning = ls.currentInning ?? 0;
  const state = ls.inningState ?? (ls.isTopInning ? 'Top' : 'Bottom');
  const topDone = state === 'Top' && ls.outs !== 3 ? inning - 1 : inning;
  const bottomDone =
    state === 'End' || (state === 'Bottom' && ls.outs === 3) || final
      ? inning
      : inning - 1;
  return fielding === 'home' ? topDone : bottomDone;
}

// ---- Detection ---------------------------------------------------------------

export function detect(
  feed: RawFeed,
  careerBases: ReadonlyMap<number, CareerBase>,
): Detection | null {
  const gd = feed.gameData;
  const ld = feed.liveData;
  const ls = ld?.linescore;
  const box = ld?.boxscore?.teams;
  if (gd == null || ls == null || box?.away == null || box.home == null)
    return null;

  const state = (gd.status?.abstractGameState ?? '').toLowerCase();
  const final = state === 'final';
  const live = state === 'live';
  if (!final && !live) return null;
  if (/postponed|cancel|suspended/i.test(gd.status?.detailedState ?? ''))
    return null;

  const gamePk = String(gd.game?.pk ?? '');
  const abbr: Record<Side, string> = {
    away: gd.teams?.away?.abbreviation ?? '?',
    home: gd.teams?.home?.abbreviation ?? '?',
  };
  const clubName: Record<Side, string> = {
    away: gd.teams?.away?.teamName ?? abbr.away,
    home: gd.teams?.home?.teamName ?? abbr.home,
  };
  const game: GameSnap = {
    gamePk,
    away: abbr.away,
    home: abbr.home,
    score: [ls.teams?.away?.runs ?? 0, ls.teams?.home?.runs ?? 0],
    half: final ? 'Final' : halfLabel(ls),
    live,
  };
  const plays = (ld?.plays?.allPlays ?? []).filter(
    (p) => p.about?.isComplete !== false,
  );
  const players = gd.players ?? {};
  const short = (id: number): string => {
    const p = players[`ID${id}`];
    const last = p?.useLastName ?? p?.lastName ?? p?.boxscoreName ?? String(id);
    return p?.nameSuffix ? `${last} ${p.nameSuffix}.` : last;
  };
  const battingSideOf = (p: RawPlay): Side =>
    p.about?.halfInning === 'top' ? 'away' : 'home';
  const playAt = (p: RawPlay | undefined): string | null =>
    p?.about?.endTime ?? null;
  const batter = ls.offense?.batter?.id ?? null;
  const onDeck = ls.offense?.onDeck?.id ?? null;
  const inHole = ls.offense?.inHole?.id ?? null;
  const pitcherNow = ls.defense?.pitcher?.id ?? null;
  // Between halves the feed's offense is already the team coming up, so
  // "at bat" there means leading off.
  const between =
    ls.outs === 3 || ls.inningState === 'Middle' || ls.inningState === 'End';
  const dueSub = (id: number): string | null =>
    id === batter
      ? between
        ? 'Leads off next'
        : 'At bat now'
      : id === onDeck
        ? 'On deck'
        : id === inHole
          ? 'In the hole'
          : null;

  const stories: LiveStory[] = [];
  const endings = new Map<string, StoryEnd>();
  const moments: Moment[] = [];

  // 1. No-hitter / perfect game, per fielding side.
  for (const fielding of ['home', 'away'] as Side[]) {
    const batting = other(fielding);
    const team = box[fielding]!;
    const pitcherIds = team.pitchers ?? [];
    if (pitcherIds.length === 0) continue;
    const done = defensiveInningsDone(ls, fielding, final);
    const facing = plays.filter((p) => battingSideOf(p) === batting);
    const reached = (p: RawPlay): boolean => {
      const b = p.matchup?.batter?.id;
      return (p.runners ?? []).some(
        (r) =>
          r.details?.runner?.id === b &&
          r.movement?.start == null &&
          r.movement?.end != null &&
          r.movement.isOut !== true,
      );
    };
    const firstHit = facing.find((p) =>
      HIT_EVENTS.has(p.result?.eventType ?? ''),
    );
    const firstRunner = facing.find(reached);
    const solo = pitcherIds.length === 1;
    const starter = pitcherIds[0];
    const leadId =
      pitcherNow != null && pitcherIds.includes(pitcherNow)
        ? pitcherNow
        : pitcherIds[pitcherIds.length - 1];
    const whoTeam: Who = {
      playerId: leadId,
      playerShort: solo ? short(starter) : `${clubName[fielding]}`,
      teamAbbr: abbr[fielding],
    };
    const tp = team.teamStats?.pitching ?? {};
    const sp = team.players?.[`ID${starter}`]?.stats?.pitching ?? {};
    const line = solo
      ? `${sp.numberOfPitches ?? 0} pitches · ${sp.strikeOuts ?? 0} K · ${sp.baseOnBalls ?? 0} BB`
      : `${pitcherIds.length} pitchers · ${tp.strikeOuts ?? 0} K · ${tp.baseOnBalls ?? 0} BB`;
    const has = solo ? 'has' : 'have';
    const combined = solo ? '' : 'a combined ';

    for (const bid of ['pg', 'nh'] as const) {
      const storyId = `${bid}:${gamePk}:${fielding}`;
      const breaker = bid === 'pg' ? firstRunner : firstHit;
      const noun = bid === 'pg' ? 'perfect game' : 'no-hitter';
      const kind = bid === 'pg' ? 'Perfect game' : 'No-hitter';
      if (breaker != null) {
        const bInning = breaker.about?.inning ?? 0;
        const bBatter = breaker.matchup?.batter?.id;
        const outsBefore = solo
          ? outsBy(facing.slice(0, facing.indexOf(breaker)), starter)
          : null;
        endings.set(storyId, {
          ...whoTeam,
          playerShort: solo ? short(starter) : clubName[fielding],
          kind: `${kind} ended`,
          title: `lost the ${noun} in the ${ordinal(bInning)}`,
          sub: [
            bBatter != null
              ? `${short(bBatter)} ${EVENT_WORD[breaker.result?.eventType ?? ''] ?? (breaker.result?.event ?? '').toLowerCase()}`
              : null,
            outsBefore != null ? `${ipFromOuts(outsBefore)} IP` : null,
          ]
            .filter(Boolean)
            .join(' · '),
          pastSub: `Ended in the ${ordinal(bInning)}`,
          atBatIndex: breaker.about?.atBatIndex ?? null,
          at: playAt(breaker),
        });
        continue;
      }
      // While a perfect game is alive it is the story; the no-hitter one
      // starts only once the perfect game is gone.
      if (bid === 'nh' && firstRunner == null) continue;
      const shown = Math.min(done, 9);
      if (final) {
        const last = plays[plays.length - 1];
        endings.set(storyId, {
          ...whoTeam,
          kind,
          title: solo ? `threw ${aOrAn(noun)}` : `threw a combined ${noun}`,
          sub: `Final · ${line}`,
          pastSub: 'Completed',
          atBatIndex: last?.about?.atBatIndex ?? null,
          at: playAt(last),
        });
        continue;
      }
      if (done < 7) continue;
      stories.push({
        ...whoTeam,
        storyId,
        kind,
        big: true,
        canStart: true,
        title: `${has} ${combined || 'a '}${noun} through ${shown}`,
        sub: line,
        prog: { type: 'innings', done: shown },
        pastTitle: `had ${combined || 'a '}${noun} through ${shown}`,
        fallbackEnd: {
          ...whoTeam,
          kind: `${kind} ended`,
          title: `${noun} bid ended`,
          sub: line,
          pastSub: 'Ended',
          atBatIndex: null,
          at: null,
        },
      });
    }
  }

  // Per-batter, per-pitcher lines from the box score.
  const roster: { side: Side; p: RawBoxPlayer }[] = [];
  for (const side of ['away', 'home'] as Side[]) {
    for (const p of Object.values(box[side]!.players ?? {}))
      roster.push({ side, p });
  }

  // 2. Cycle watch.
  for (const { side, p } of roster) {
    const b = p.stats?.batting;
    if (b == null) continue;
    const d = b.doubles ?? 0,
      t = b.triples ?? 0,
      hr = b.homeRuns ?? 0;
    const s = (b.hits ?? 0) - d - t - hr;
    const have = CYCLE.filter(
      (k) => ({ '1B': s, '2B': d, '3B': t, HR: hr })[k] > 0,
    );
    if (have.length < 3) continue;
    const id = p.person.id;
    const storyId = `cy:${gamePk}:${id}`;
    const who: Who = {
      playerId: id,
      playerShort: short(id),
      teamAbbr: abbr[side],
    };
    if (have.length === 4) {
      // The completing hit: his last hit of the type he got last.
      const hits = plays.filter(
        (x) =>
          x.matchup?.batter?.id === id &&
          HIT_EVENTS.has(x.result?.eventType ?? ''),
      );
      const seen = new Set<string>();
      let completing: RawPlay | undefined;
      for (const h of hits) {
        const k =
          { single: '1B', double: '2B', triple: '3B', home_run: 'HR' }[
            h.result?.eventType ?? ''
          ] ?? '';
        if (!seen.has(k)) {
          seen.add(k);
          if (seen.size === 4) completing = h;
        }
      }
      endings.set(storyId, {
        ...who,
        kind: 'Cycle',
        title: 'hit for the cycle',
        sub:
          completing != null
            ? `${EVENT_WORD[completing.result?.eventType ?? '']} in the ${ordinal(completing.about?.inning ?? 0)}`
            : 'Hit for the cycle',
        pastSub: 'Completed',
        atBatIndex: completing?.about?.atBatIndex ?? null,
        at: playAt(completing),
      });
      continue;
    }
    const need = CYCLE.find((k) => !have.includes(k))!;
    const word = CYCLE_WORD[need];
    if (final) continue; // the fallback ending covers "finished a triple short"
    const due = dueSub(id);
    stories.push({
      ...who,
      storyId,
      kind: 'Cycle watch',
      big: id === batter && !between,
      canStart: id === batter || id === onDeck,
      title: `needs ${aOrAn(word)} for the cycle`,
      sub: due ?? 'Bats again later',
      prog: { type: 'cycle', have: [...have] },
      pastTitle: `needed ${aOrAn(word)} for the cycle`,
      fallbackEnd: {
        ...who,
        kind: 'Cycle watch ended',
        title: `finished ${aOrAn(word)} short of the cycle`,
        sub: `${have.join(' · ')}`,
        pastSub: 'Fell short',
        atBatIndex: null,
        at: null,
      },
    });
  }

  // 3. Big single games: 3rd+ HR, 15th / 20th K — one-off moments.
  for (const { side, p } of roster) {
    const id = p.person.id;
    const who: Who = {
      playerId: id,
      playerShort: short(id),
      teamAbbr: abbr[side],
    };
    const hrs = p.stats?.batting?.homeRuns ?? 0;
    if (hrs >= 3) {
      const hrPlays = plays.filter(
        (x) =>
          x.matchup?.batter?.id === id && x.result?.eventType === 'home_run',
      );
      for (let n = 3; n <= hrs; n++) {
        const play = hrPlays[n - 1];
        const rbi = play?.result?.rbi ?? 1;
        const kindWord =
          rbi >= 4
            ? 'Grand slam'
            : rbi === 1
              ? 'Solo home run'
              : `${rbi}-run home run`;
        const dist = play?.playEvents
          ?.map((e) => e.hitData?.totalDistance)
          .filter((v): v is number => v != null)
          .pop();
        moments.push({
          ...who,
          id: `hr:${gamePk}:${id}:${n}`,
          kind:
            n === 3
              ? 'Three-homer game'
              : n === 4
                ? 'Four-homer game'
                : `${n}-homer game`,
          title: `hit his ${NTH_WORD[n] ?? ordinal(n)} home run`,
          sub: [kindWord, dist != null ? `${Math.round(dist)} ft` : null]
            .filter(Boolean)
            .join(' · '),
          atBatIndex: play?.about?.atBatIndex ?? null,
          at: playAt(play),
        });
      }
    }
    const ks = p.stats?.pitching?.strikeOuts ?? 0;
    for (const n of [15, 20]) {
      if (ks < n) continue;
      const kPlays = plays.filter(
        (x) =>
          x.matchup?.pitcher?.id === id &&
          /^strikeout/.test(x.result?.eventType ?? ''),
      );
      const play = kPlays[n - 1];
      const outs =
        play != null
          ? outsBy(plays.slice(0, plays.indexOf(play) + 1), id)
          : null;
      moments.push({
        ...who,
        id: `k:${gamePk}:${id}:${n}`,
        kind: `${n}-strikeout game`,
        title: `struck out his ${ordinal(n)} batter`,
        sub: outs != null ? `${ipFromOuts(outs)} IP` : `${n} K`,
        atBatIndex: play?.about?.atBatIndex ?? null,
        at: playAt(play),
      });
    }
  }

  // 4. Milestones about to happen — regular season only (postseason totals
  // don't count toward a career).
  if (gd.game?.type === 'R') {
    for (const { side, p } of roster) {
      const id = p.person.id;
      const base = careerBases.get(id);
      if (base == null) continue;
      const who: Who = {
        playerId: id,
        playerShort: short(id),
        teamAbbr: abbr[side],
      };
      const season = p.seasonStats;
      const today = p.stats;
      const specs: {
        stat: string;
        unit: string;
        noun: (n: number) => string;
        now: number;
        todayCount: number;
        step: number;
        min: number;
        bigAt: number;
        up: boolean;
        upSub: string | null;
        eventTypes: RegExp;
        role: 'batter' | 'pitcher';
      }[] = [
        {
          stat: 'hr',
          unit: 'career HR',
          noun: (n) => `home run${n === 1 ? '' : 's'}`,
          now: base.hr + (season?.batting?.homeRuns ?? 0),
          todayCount: today?.batting?.homeRuns ?? 0,
          step: 100,
          min: 100,
          bigAt: 500,
          up: id === batter || id === onDeck,
          upSub: dueSub(id),
          eventTypes: /^home_run$/,
          role: 'batter',
        },
        {
          stat: 'hits',
          unit: 'career hits',
          noun: (n) => `hit${n === 1 ? '' : 's'}`,
          now: base.hits + (season?.batting?.hits ?? 0),
          todayCount: today?.batting?.hits ?? 0,
          step: 500,
          min: 1000,
          bigAt: 3000,
          up: id === batter || id === onDeck,
          upSub: dueSub(id),
          eventTypes: /^(single|double|triple|home_run)$/,
          role: 'batter',
        },
        {
          stat: 'k',
          unit: 'career K',
          noun: (n) => `strikeout${n === 1 ? '' : 's'}`,
          now: base.k + (season?.pitching?.strikeOuts ?? 0),
          todayCount: today?.pitching?.strikeOuts ?? 0,
          step: 500,
          min: 1000,
          bigAt: 3000,
          up: id === pitcherNow,
          upSub: 'On the mound',
          eventTypes: /^strikeout/,
          role: 'pitcher',
        },
      ];
      for (const sp of specs) {
        if (sp.now < sp.min - 1) continue;
        // Reached today → ends the story that targeted it.
        if (sp.todayCount > 0 && sp.now % sp.step === 0) {
          const target = sp.now;
          const field = sp.role === 'batter' ? 'batter' : 'pitcher';
          const evPlays = plays.filter(
            (x) =>
              x.matchup?.[field]?.id === id &&
              sp.eventTypes.test(x.result?.eventType ?? ''),
          );
          const play = evPlays[evPlays.length - 1];
          endings.set(`ms:${gamePk}:${id}:${sp.stat}:${target}`, {
            ...who,
            kind: 'Milestone',
            title:
              sp.stat === 'k'
                ? `recorded his ${target}th career strikeout`
                : `${sp.stat === 'hr' ? 'hit his' : 'got his'} ${target}th career ${sp.noun(1)}`,
            sub:
              play != null
                ? `In the ${ordinal(play.about?.inning ?? 0)}`
                : 'Reached',
            pastSub: 'Reached',
            atBatIndex: play?.about?.atBatIndex ?? null,
            at: playAt(play),
          });
        }
        const target = Math.ceil((sp.now + 1) / sp.step) * sp.step;
        if (target - sp.now !== 1 || target < sp.min || final) continue;
        const storyId = `ms:${gamePk}:${id}:${sp.stat}:${target}`;
        const single = sp.noun(1);
        stories.push({
          ...who,
          storyId,
          kind: 'Milestone',
          big:
            target >= sp.bigAt &&
            sp.up &&
            (sp.role === 'pitcher' || (id === batter && !between)),
          canStart: sp.up,
          title: `is one ${single} from ${target}`,
          sub:
            sp.upSub ??
            (sp.role === 'pitcher' ? 'In the game' : 'Bats again later'),
          prog: { type: 'count', from: sp.now, to: target, unit: sp.unit },
          pastTitle: `was one ${single} from ${target}`,
          fallbackEnd: {
            ...who,
            kind: 'Milestone',
            title: `is still one ${single} from ${target}`,
            sub: `${sp.now} ${sp.unit}`,
            pastSub: 'Not tonight',
            atBatIndex: null,
            at: null,
          },
        });
      }
      // Wins: a pitcher one away who is pitching now. Decided at the final.
      const wNow =
        base.w +
        (season?.pitching?.wins ?? 0) -
        (final && ld?.decisions?.winner?.id === id ? 1 : 0);
      const wTarget = Math.ceil((wNow + 1) / 100) * 100;
      if (
        wTarget - wNow === 1 &&
        wTarget >= 100 &&
        (box[side]!.pitchers ?? [])[0] === id
      ) {
        const storyId = `ms:${gamePk}:${id}:w:${wTarget}`;
        if (final && ld?.decisions?.winner?.id === id) {
          const last = plays[plays.length - 1];
          endings.set(storyId, {
            ...who,
            kind: 'Milestone',
            title: `earned his ${wTarget}th career win`,
            sub: 'Final',
            pastSub: 'Reached',
            atBatIndex: last?.about?.atBatIndex ?? null,
            at: playAt(last),
          });
        } else if (!final) {
          stories.push({
            ...who,
            storyId,
            kind: 'Milestone',
            big: wTarget >= 300 && id === pitcherNow,
            canStart: id === pitcherNow,
            title: `is going for win No. ${wTarget}`,
            sub: id === pitcherNow ? 'On the mound' : 'Out of the game',
            prog: { type: 'count', from: wNow, to: wTarget, unit: 'career W' },
            pastTitle: `went for win No. ${wTarget}`,
            fallbackEnd: {
              ...who,
              kind: 'Milestone',
              title: `is still one win from ${wTarget}`,
              sub: `${wNow} career W`,
              pastSub: 'Not tonight',
              atBatIndex: null,
              at: null,
            },
          });
        }
      }
    }
  }

  return { game, final, stories, endings, moments };
}

// Outs recorded while this pitcher was on the mound, from the plays given.
function outsBy(plays: readonly RawPlay[], pitcherId: number): number {
  let outs = 0;
  for (const p of plays) {
    if (p.matchup?.pitcher?.id !== pitcherId) continue;
    outs += (p.runners ?? []).filter((r) => r.movement?.isOut === true).length;
  }
  return outs;
}

// Who needs a career lookup this tick: due batters and the pitchers on the
// mound, in regular-season live games only.
export function careerCandidates(feed: RawFeed): number[] {
  if (feed.gameData?.game?.type !== 'R') return [];
  if ((feed.gameData?.status?.abstractGameState ?? '').toLowerCase() !== 'live')
    return [];
  const ls = feed.liveData?.linescore;
  const ids = [
    ls?.offense?.batter?.id,
    ls?.offense?.onDeck?.id,
    ls?.defense?.pitcher?.id,
  ];
  for (const side of ['away', 'home'] as Side[])
    ids.push(feed.liveData?.boxscore?.teams?.[side]?.pitchers?.[0]);
  return ids.filter((v): v is number => typeof v === 'number');
}
