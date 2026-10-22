# Due Up — best projection, and the between-innings substitution event (backend)

**rev 1 · Oct 22, 2026** · Ungated: all of it is in MLB's live feed · Backend-first, then a small client change

## Decision

Due Up batters stay **visually as they are**. There's no "projected" styling: no dashed ring, no pill. That's fine
only if the projection is the **best the data allows**, so this prompt is about getting it right, not about
changing the look.

The projection improves in three steps. Each step overrides the one before it:

1. **Roster / lineup.** At the 3rd out, project the next three from the batting team's `activeLineup`, starting from
   the slot after the last **completed** PA (the anchor rule from `handoff_atbat_transitions/` Part D).
2. **Between-innings non-pitch event.** When MLB sends a substitution during the break (pitching change, pinch
   hitter announced, defensive switch / double switch), re-project at once.
3. **First pitch.** The batter on that pitch is the truth. If it differs from the projection, re-initialise for him
   (the existing pinch-hitter rule in `handoff_atbat_transitions/` Part B §3).

## Part A · Backend: a new `substitution` event on the wire

MLB's raw feed carries these as **non-pitch events**: `allPlays[].playEvents[]` entries with `isPitch: false` and
`type: "action"`. The event type lives in `details.eventType`. They also arrive **between innings**, in the gap after
the 3rd out and before the next half's first pitch. Right now we drop them, or only pick them up later when the
boxscore refreshes.

Emit one normalized event per substitution, as soon as it appears:

```ts
type SubstitutionWire = {
  kind: 'substitution';
  gamePk: number;
  atBatIndex: number;          // the play it's attached to (may be the NEXT half's first PA)
  eventIndex: number;          // index in playEvents, for dedupe
  subType: 'pitching_change' | 'offensive_sub' | 'defensive_sub' | 'defensive_switch';
  team: 'away' | 'home';
  playerIn:  { id: number; name: string; position?: string };
  playerOut?: { id: number; name: string };
  battingOrderSlot?: number;   // 1–9 when the sub enters the batting order
  isBetweenInnings: boolean;   // true if it came after the 3rd out and before the next first pitch
  description: string;        // MLB's text, e.g. "Pitching Change: Pressly replaces Valdez."
  ts: string;                  // event startTime (ISO)
};
```

Map from `details.eventType`:
- `pitching_substitution` → `pitching_change`
- `offensive_substitution` → `offensive_sub` (pinch hitter / pinch runner)
- `defensive_substitution` → `defensive_sub`
- `defensive_switch` → `defensive_switch`

Use **exact enum equality**, not text matching. That was the PR 10 lesson, when `parsePA` matched descriptions and
lost data.

`player.id` is the person entering. `replacedPlayer.id` (when present) is the person leaving. The batting slot comes
from `battingOrder` (MLB's `"301"` form → slot 3, sub 1). If it's missing, take it from the boxscore.

**Also:** apply the sub to the server's `activeLineup` **at the moment of the event**. Don't wait for the next
boxscore poll. The client projects from `activeLineup`, so this one change fixes most of the drift.

**Dedupe:** on `(gamePk, atBatIndex, eventIndex)`. MLB often re-sends play arrays, so the same event will be seen more
than once.

## Part B · Client: re-project on the event

In the Due Up state (`outs === 3`, before the next first pitch):

- **`pitching_change` for the fielding team** → the `MatchupContext` strip switches to `Coming in · TEAM` with the new
  pitcher, and `Next matchup` re-points to him. `Half just ended` shows the outgoing arm's final line (already
  designed).
- **`offensive_sub` / `defensive_switch` that changes a batting slot in the next three** → swap that tile. Same
  layout: headshot, name, `pos · hand · today`, slash line. Swap in place, **no height change** (the height lock).
- **A sub outside the next three** → nothing on screen changes. Still update the lineup.
- The feed's pre-staged leadoff batter must still **match the tile's first batter** after any swap.

At the first pitch: if the batter differs from the projection, re-initialise (existing rule). If he matches, nothing
moves.

## Acceptance

Name the games you test with.

- A between-innings pitching change shows `Coming in · TEAM` **before** the next half's first pitch.
- A pinch hitter announced during the break (rare but real) swaps the Due Up tile before the first pitch.
- A double switch that moves the pitcher's slot updates the tile if that slot is in the next three.
- The same event re-sent by MLB doesn't swap twice or flicker.
- No component changes height when a tile swaps.
- With no substitution, behaviour is the same as today.

## Report back

Per part: done / partial / blocked, the commit, test game IDs, and whether any between-innings substitution arrived
**only** in the boxscore and not as a play event. If that happens, we need to know how often.
