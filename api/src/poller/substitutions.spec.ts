import { extractSubstitutions, substitutionKey } from './substitutions';

const pitch = (index: number) => ({ index, isPitch: true, type: 'pitch' });
const action = (
  index: number,
  eventType: string,
  extra: Record<string, unknown> = {},
) => ({
  index,
  isPitch: false,
  type: 'action',
  startTime: '2026-10-20T01:00:00.000Z',
  details: { eventType, description: `${eventType} ${index}` },
  ...extra,
});
const play = (
  atBatIndex: number,
  inning: number,
  halfInning: string,
  pitcherId: number,
  playEvents: unknown[],
) => ({
  about: { atBatIndex, inning, halfInning },
  matchup: { pitcher: { id: pitcherId } },
  playEvents,
});

const feed = {
  gamePk: 849815,
  gameData: {
    players: {
      ID1: { fullName: 'Home Starter' },
      ID2: { fullName: 'Home Reliever' },
      ID3: { fullName: 'Away Starter' },
      ID4: { fullName: 'Pinch Hitter' },
      ID5: { fullName: 'Benched Batter' },
      ID6: { fullName: 'Mid-PA Reliever' },
    },
  },
  liveData: {
    boxscore: {
      teams: {
        away: { players: { ID4: { battingOrder: '801' } } },
        home: { players: {} },
      },
    },
    plays: {
      allPlays: [
        play(0, 1, 'top', 1, [pitch(0), pitch(1)]),
        play(1, 1, 'bottom', 3, [pitch(0)]),
        // Between innings: the home reliever and an away pinch hitter, ahead of the 2nd's first pitch.
        play(2, 2, 'top', 2, [
          action(0, 'pitching_substitution', {
            player: { id: 2 },
            position: { abbreviation: 'P' },
          }),
          action(1, 'offensive_substitution', {
            player: { id: 4 },
            replacedPlayer: { id: 5 },
            position: { abbreviation: 'PH' },
          }),
          action(2, 'game_advisory', { player: { id: 9 } }),
          pitch(3),
        ]),
        // Mid-PA change: not between innings.
        play(3, 2, 'top', 6, [
          pitch(0),
          action(1, 'pitching_substitution', { player: { id: 6 } }),
          pitch(2),
        ]),
      ],
    },
  },
};

describe('extractSubstitutions', () => {
  const subs = extractSubstitutions(feed);

  it('keeps only the four substitution event types, by exact enum', () => {
    expect(subs.map((s) => s.subType)).toEqual([
      'pitching_change',
      'offensive_sub',
      'pitching_change',
    ]);
  });

  it("marks a change ahead of the next half's first pitch as between innings", () => {
    expect(subs[0]).toMatchObject({
      atBatIndex: 2,
      eventIndex: 0,
      team: 'home',
      isBetweenInnings: true,
      playerIn: { id: 2, name: 'Home Reliever', position: 'P' },
      playerOut: { id: 1, name: 'Home Starter' },
    });
    expect(subs[2]).toMatchObject({
      atBatIndex: 3,
      isBetweenInnings: false,
      playerOut: { id: 2 },
    });
  });

  it('puts a pinch hitter on the batting team with his slot', () => {
    expect(subs[1]).toMatchObject({
      team: 'away',
      battingOrderSlot: 8,
      isBetweenInnings: true,
      playerIn: { id: 4, name: 'Pinch Hitter' },
      playerOut: { id: 5, name: 'Benched Batter' },
    });
  });

  it('dedupes on game, play and event index', () => {
    expect(substitutionKey(subs[0])).toBe('849815|2|0');
    expect(
      new Set(extractSubstitutions(feed).concat(subs).map(substitutionKey))
        .size,
    ).toBe(3);
  });
});
