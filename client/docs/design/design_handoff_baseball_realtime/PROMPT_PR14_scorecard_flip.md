# PR 14 — Game view: live scorecard flip, per-team card driven by real game state

Supersedes both earlier PR 14 drafts (iframe embed, then a version with placeholder roster data).
**Net-new, ungated** — no new API; reuses the same play-by-play feed AND the same `LINEUPS` roster
data already powering the Lineups tray.

## What it is
A flip icon in `PitchByPitchV2`'s header 3D-flips the panel to a pannable/zoomable scorecard.
**Each team has its own card** — a HOU/CHC `Segmented` toggle in the scorecard header switches which
team's card is shown, defaulting to whichever team is currently batting.

The grid itself is built by ONE shared function, `window.buildScorebookGrid` (in `scorebook-cell.js`),
called identically by `Scorebook Page.html` (print reference, blank) and `game-v2.jsx` (live, filled).
Port this function as a single shared module — do not reimplement the grid in JSX.

## Per-team card contents
- **Batting lineup** (order 1–9, 3 name slots per order — starter + up to 2 subs): number, name,
  position, and substitutions sourced from the real `LINEUPS[team]` roster (the same data the Lineups
  tray already uses) — not invented. Game average (`H/AB` this game) computed from the feed.
- **Per-inning cells**: each completed PA fills its batter's inning cell with a result-code badge on
  the field diagram; the live PA gets a rust dashed outline instead; anything after the play head
  stays blank/faded — the card only fills in up to "now."
- **Stat columns**: AB / R / H / RBI (Error column removed; the 4 columns split the old 5-column
  width evenly), rendered as scorebook tick marks (`window.tallyMarksHTML` — 4 verticals + a diagonal
  slash for the 5th), not plain numbers.
- **Pitching section**: order / number / name / ERA / HND columns, populated with the team's actual
  starter + relief chain from `LINEUPS` (ERA pulled from the bullpen list when a reliever's name
  matches; starters show `—`, no season ERA in this mock). Per-inning R/H/K/BB tallies (also tick
  marks) are aggregated from the OPPOSING team's PAs during this team's half — a team's pitching
  stats come from the innings the other team batted.
- **Known data-model gap, not a bug:** runners advanced or scored by a later batter's PA aren't
  credited (the feed only carries each PA's own result) — R/RBI only credit self-scoring events
  (home runs). Real baserunner-state tracking is a follow-up, out of scope here.

Flip mechanic (3D `rotateY`, pointer-capture drag-to-pan, wheel-to-zoom anchored to cursor, auto-focus
on the live head) unchanged from earlier drafts; wheel-zoom sensitivity is 1.04×/0.96× per tick.

## Files touched
- `scorebook-cell.js` — `window.buildScorebookGrid` now renders sub-row 2/3 from `entry.subs`
  (previously blank), and batting stat cells use `tallyMarksHTML` instead of plain digits.
- `holistic/game-v2.jsx` — `ScorecardGrid` derives `lineup`/`pitchers` from `LINEUPS[team]` (roster)
  crossed with `PAs` (live results), not from `PAs` alone. `PitchByPitchV2` adds `scorecardTeam` state
  and a HOU/CHC `Segmented` toggle in the scorecard header.
- CSS custom properties (`--ink`, `--surface`, etc.) the shared builder relies on are now injected
  from the `T` token set at mount (`game-v2.jsx`), matching what `Scorebook Page.html` defines itself
  — without this the grid's borders/field-diagram strokes render as invalid/missing.

## Acceptance
- Toggling HOU/CHC in the scorecard header swaps to that team's own card (different roster, different
  filled cells).
- Lineup rows show real player numbers/names/positions from the roster, with sub rows populated when
  a sub exists.
- Stat columns (AB/R/H/RBI) and pitching per-inning tallies (R/H/K/BB) render as tick marks.
- Pitching section lists the real starter + subs with ERA/hand, not a blank row.
- Cells only fill up to the live play head; future innings stay blank/faded.
