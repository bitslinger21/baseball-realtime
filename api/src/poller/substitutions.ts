// Substitutions from MLB's live feed (PROMPT_due_up_projection.md Part A).
//
// MLB carries lineup changes as NON-pitch play events: `allPlays[].playEvents[]`
// entries with `isPitch: false`, `type: "action"` and the kind in
// `details.eventType`. A change made during the break between half-innings is
// attached to the NEXT half's first play, ahead of its first pitch — so it is
// visible in the feed after the 3rd out and before the next first pitch, when
// no pitch frame is being emitted.

type AnyObj = Record<string, unknown>;

export type SubstitutionType =
  | 'pitching_change'
  | 'offensive_sub'
  | 'defensive_sub'
  | 'defensive_switch';

export type SubstitutionWire = {
  kind: 'substitution';
  gamePk: number;
  /** The play it is attached to — for a between-innings change, the next half's first PA. */
  atBatIndex: number;
  /** Index in that play's playEvents; with atBatIndex, the dedupe key. */
  eventIndex: number;
  subType: SubstitutionType;
  team: 'away' | 'home';
  playerIn: { id: number; name: string; position?: string };
  playerOut?: { id: number; name: string };
  /** 1–9 when the player enters the batting order. */
  battingOrderSlot?: number;
  /** After a 3rd out and before the next half's first pitch. */
  isBetweenInnings: boolean;
  /** MLB's text, e.g. "Pitching Change: Pressly replaces Valdez." */
  description: string;
  /** The event's startTime (ISO). */
  ts: string;
};

// Exact enum equality on details.eventType — never text matching (the PR 10 lesson).
const SUB_TYPES: Record<string, SubstitutionType> = {
  pitching_substitution: 'pitching_change',
  offensive_substitution: 'offensive_sub',
  defensive_substitution: 'defensive_sub',
  defensive_switch: 'defensive_switch',
};

export function substitutionKey(
  s: Pick<SubstitutionWire, 'gamePk' | 'atBatIndex' | 'eventIndex'>,
): string {
  return `${s.gamePk}|${s.atBatIndex}|${s.eventIndex}`;
}

function obj(v: unknown): AnyObj {
  return v != null && typeof v === 'object' ? (v as AnyObj) : {};
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** MLB's "301" form: slot 3, first sub. 0 when absent or not a slot. */
function slotFrom(battingOrder: unknown): number {
  const n =
    typeof battingOrder === 'string'
      ? parseInt(battingOrder, 10)
      : (num(battingOrder) ?? NaN);
  if (!Number.isFinite(n)) return 0;
  const slot = Math.floor(n / 100);
  return slot >= 1 && slot <= 9 ? slot : 0;
}

export function extractSubstitutions(feed: unknown): SubstitutionWire[] {
  const root = obj(feed);
  const gameData = obj(root.gameData);
  const liveData = obj(root.liveData);
  const gamePk = num(root.gamePk) ?? num(obj(gameData.game).pk) ?? 0;
  const people = obj(gameData.players);
  const boxTeams = obj(obj(liveData.boxscore).teams);
  const allPlays = Array.isArray(obj(liveData.plays).allPlays)
    ? (obj(liveData.plays).allPlays as unknown[])
    : [];

  const nameOf = (id: number): string => {
    const p = obj(people[`ID${id}`]);
    return typeof p.fullName === 'string' ? p.fullName : String(id);
  };
  // Batting slot from the boxscore when the event doesn't carry one.
  const boxSlotOf = (team: 'away' | 'home', id: number): number =>
    slotFrom(obj(obj(obj(boxTeams[team]).players)[`ID${id}`]).battingOrder);

  const out: SubstitutionWire[] = [];
  // Each team's current pitcher (a pitching change names only who comes in;
  // who leaves is the arm before him).
  const lastPitcher: Record<'away' | 'home', number | null> = {
    away: null,
    home: null,
  };
  let prevHalfKey: string | null = null;

  for (const raw of allPlays) {
    const play = obj(raw);
    const about = obj(play.about);
    const atBatIndex = num(about.atBatIndex);
    const half =
      about.halfInning === 'top'
        ? 'top'
        : about.halfInning === 'bottom'
          ? 'bottom'
          : null;
    if (atBatIndex == null || half == null) continue;
    const halfKey = `${String(about.inning)}-${half}`;
    const firstOfHalf = halfKey !== prevHalfKey;
    prevHalfKey = halfKey;
    const batting: 'away' | 'home' = half === 'top' ? 'away' : 'home';
    const fielding: 'away' | 'home' = half === 'top' ? 'home' : 'away';

    let pitchSeen = false;
    const events = Array.isArray(play.playEvents)
      ? (play.playEvents as unknown[])
      : [];
    for (let i = 0; i < events.length; i++) {
      const ev = obj(events[i]);
      if (ev.isPitch === true || ev.type === 'pitch') {
        pitchSeen = true;
        continue;
      }
      const details = obj(ev.details);
      const subType =
        typeof details.eventType === 'string'
          ? SUB_TYPES[details.eventType]
          : undefined;
      if (subType == null) continue;
      const inId = num(obj(ev.player).id);
      if (inId == null) continue;

      // Pitching changes and defensive moves belong to the fielding team;
      // pinch hitters and runners to the batting team.
      const team = subType === 'offensive_sub' ? batting : fielding;
      const replacedId =
        num(obj(ev.replacedPlayer).id) ??
        (subType === 'pitching_change' ? lastPitcher[team] : null);
      const slot =
        slotFrom(ev.battingOrder) ||
        (subType === 'pitching_change' ? 0 : boxSlotOf(team, inId));
      const position = obj(ev.position).abbreviation;

      out.push({
        kind: 'substitution',
        gamePk,
        atBatIndex,
        eventIndex: num(ev.index) ?? i,
        subType,
        team,
        playerIn: {
          id: inId,
          name: nameOf(inId),
          ...(typeof position === 'string' ? { position } : {}),
        },
        ...(replacedId != null && replacedId !== inId
          ? { playerOut: { id: replacedId, name: nameOf(replacedId) } }
          : {}),
        ...(slot > 0 ? { battingOrderSlot: slot } : {}),
        isBetweenInnings: firstOfHalf && !pitchSeen,
        description:
          typeof details.description === 'string' ? details.description : '',
        ts: typeof ev.startTime === 'string' ? ev.startTime : '',
      });
      if (subType === 'pitching_change') lastPitcher[team] = inId;
    }
    // matchup.pitcher is whoever finished the PA, so it's only the team's arm
    // as of the END of the play — not for a pitch thrown before a mid-PA change.
    const pid = num(obj(obj(play.matchup).pitcher).id);
    if (pitchSeen && pid != null) lastPitcher[fielding] = pid;
  }
  return out;
}
