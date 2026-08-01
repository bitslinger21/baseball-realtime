# Head-to-head view + on-dark logo legibility fix (Jul 27, 2026)

New files: `holistic/game-headtohead.jsx`.
Changed: `holistic/shared.jsx`, `holistic/game-v2.jsx`, `holistic/game-scout.jsx`, `Holistic.html`.

---

## 1. NEW: Head-to-head view (game screen)

A standalone matchup/scouting view, reachable via a **Preview/Head-to-head** segmented
toggle next to the game title — present on BOTH the pregame screen and the live game view
(the matchup intel stays useful after first pitch, so it's not pregame-only).

**Component:** `window.HeadToHeadScreen({ lineups, probables, initial })` in the new
`holistic/game-headtohead.jsx`. Reads the existing `LINEUPS`/`PROBABLES` mock data (now
exported on `window` from `game-v2.jsx` — see below), no new data model.

**Structure:**
- `StarterPair` — both probable starters side by side (name, hand, record/ERA/WHIP), always
  visible regardless of mode.
- **Batter / Pitcher mode toggle**, plus a team-side segmented control:
  - **Batter mode** (default): pick a team → a chip rail of that team's 9 batters → the
    `DeepDive` card shows the selected batter's history against the OPPOSING starter.
  - **Pitcher mode**: pick a team's pitcher (starter or any bullpen arm, via `PitcherChip`
    rail sourced from `LINEUPS[side].bullpen`) → a chip rail of the OPPOSING team's full
    lineup → `DeepDive` shows the selected batter against the CHOSEN pitcher (not just the
    starter). This is how you'd scout, e.g., a specific reliever against the lineup.
- `DeepDive` (bottom card) — NOT a stat comparison; it's one batter's scouting report vs one
  specific pitcher: career H2H line (PA/AVG/OBP/SLG/HR/K) or a "First meeting" pill, an
  arsenal table (that pitcher's pitch types × the batter's AVG/SLG/whiff% against each), a
  damage heat-map zone, and a plain-language read line. Headshot uses a `PLAYER_MLB_IDS` map
  added for the mocked lineup names.

**Live-view default selection:** on the live game view, Head-to-head opens pre-selected to
the CURRENT live batter (`initial={{ side: 'CHC', slot: 3 }}` in this mock — wire to the real
live-PA batter in the port). Pregame defaults to the #2 hitter.

**Data note (mock only):** `mockH2H()` deterministically hashes batter+pitcher name pairs to
generate plausible-looking stats — NOT real data. In the port, replace with the actual
batter-vs-pitcher / batter-vs-pitch-type endpoints (same data class already used by the player
Upcoming tab's H2H card — see `player-upcoming.jsx` for the real data shape to reuse). The SLG
math in the mock is simplified (only credits HR extra bases) — don't port that formula, it's
placeholder-only.

**Load order:** `Holistic.html` now loads `holistic/game-headtohead.jsx` right after
`holistic/game-v2.jsx` (before `player.jsx`) — it depends on `LINEUPS`/`PROBABLES` being on
`window` (see item 3) and on shared atoms (`Card`, `Eyebrow`, `Segmented`, `Th`/`Td`/`Tr`,
`StrikeZone`, `Headshot`, `Pill`, `TeamDot`, `TEAMS`, `T`).

## 2. Team logos illegible on dark backgrounds (Twins/Royals-type navy marks)

**Bug:** dark-dominant team logos (e.g. Twins, Royals) disappeared against the ink-dark
line-score band — no MLB-hosted "on-dark" variant exists for full team marks (only cap marks
have on-light/on-dark folders).

**Fix** (`shared.jsx`): `TeamDot`/`TeamMark` gained an `onDark` boolean prop. When set, the
logo renders inside a small white circular/rounded plate (`background: '#fff'`, sized
`1.22×` the logo with padding) instead of bare — keeps any team's logo legible regardless of
its own color palette.

**Applied `onDark`** everywhere a `TeamDot` sits on a dark surface:
- `game-v2.jsx`: `LineScoreBand` and `PregameLineScoreBand` (team marks in the line-score
  rows) and their leader-line entries.
- `game-scout.jsx`: the dark Row/leaders line-score marks.
Light-surface usages (headers, cards, lineup tray, etc.) are unchanged — no `onDark`.

## 3. `LINEUPS`/`PROBABLES` now exported on `window`

`game-v2.jsx`'s module-scope `LINEUPS` and `PROBABLES` constants are now also assigned via
`Object.assign(window, { ..., LINEUPS, PROBABLES })` so `game-headtohead.jsx` (a separate
Babel script scope) can read them. No data changed — just made reachable across files, same
pattern already used for other shared constants in this codebase.

---

## Scope / caveats
- Head-to-head is fully client-side mock data — see the data note above before wiring real
  stats.
- Pitcher-mode's bullpen list is the same mocked bullpen already used by `LineupsTray`; no new
  roster data needed.
- No new empty/loading/error states beyond the existing "First meeting" pill.
