# Scout mode + scorecard flip — 6 fixes (Jul 27, 2026)

Six targeted fixes from an in-app review. **No new API, no data model change** — all client-side.
Files: `holistic/game-scout.jsx`, `holistic/game-v2.jsx` (both re-synced in full in this package).

---

## 1. Review-mode wheel scroll now steps one PITCH at a time (was: one at-bat)

**Bug:** scrolling the pitch feed in Review/Scout mode called `stepAB`, which seeks straight
to the *next at-bat's last pitch* — so every scroll tick showed a new batter with their entire
at-bat already revealed, then jumped straight to the next batter on the following tick. The
auto-`Play` timer was already correct (advances one pitch/moment per tick); only manual
wheel-scrubbing had this bug.

**Fix** (`game-scout.jsx`):
- New `stepPitch(dir)` in `GameScoutPrototype`: `seek(head + dir)` — moves the play head by
  exactly one moment (one pitch), clamped to `[0, N-1]`.
- Passed down to `ScoutFeed` as a new `onStepPitch` prop.
- `ScoutFeed`'s wheel handler now calls `onStepPitch(down ? -1 : 1)` instead of `onStep(...)`.
- `onStep`/`stepAB` (previous/next at-bat) is unchanged and still backs the ⏮/⏭ buttons —
  those are explicitly labeled "Previous/Next at-bat" and are meant to jump whole at-bats.

Port note: if the shipped app's Scout/Review feed has its own wheel handler (rather than
reusing this component), the same fix applies — swap the at-bat seek for a single-moment
`head ± 1` step on wheel.

## 2. Line-score errors were a hardcoded constant, not rolled up from play data

**Bug:** the dark line-score band's E column in Review mode showed a fixed `CHC: 1, HOU: 0`
regardless of the play head — visible even at the first pitch of the game, before any play
had happened. Violates the "nothing displays until the event occurs" rule already followed by
the per-inning cells.

**Fix** (`game-scout.jsx`): added `teamErrors(team, H)`, which counts `sb.kind === 'error'`
at-bats through the head (currently always 0 — no error events exist in the mock script yet).
`Row`'s E cell now calls this instead of the `team === 'CHC' ? 1 : 0` literal.

Port note: the real app needs an actual error count per team through the game state (its
play-by-play feed should already carry this per play, similar to hits/runs) — wire it the same
way `teamRuns`/`teamHits` are already wired, not as a static value.

## 3. "On the Mound" card showed the pitcher's full-game final line all game

**Bug:** `PitcherCard`/`MoundCard`'s "Today" IP and H/R/K/BB line came from a static
per-pitcher object (`PITCHERS[team].today`/`.todaySub`) — e.g. showing "6⅓ IP" at the top of
the 1st inning in Review mode, because that was always the pitcher's END-of-game total.

**Fix** (`game-scout.jsx`): added
- `pitcherOuts(pitchTeam, H)` — outs recorded by the fielding team's batters-faced, through H.
- `ipString(outs)` — formats outs as thirds (`5 2/3 IP`, or `6 IP` when evenly divisible).
- `pitcherLineThrough(pitchTeam, H)` — H/R/K/BB allowed, through H.

`MoundCard` now computes `today`/`todaySub` from these instead of the static fields. ERA/WHIP/
pitch-count stay as season-level static mocks (unaffected — those are real season stats, not
in-game state).

Port note: the real app should already have this data live per pitching change — same head-
driven computation, not a separate lookup.

## 4. Scorecard flip view had no game header, and no team logos

**Bug:** the in-app scorecard back-face (`PitchByPitchV2`'s flip reveal, `game-v2.jsx`) only
had a "Scorecard" panel title — no matchup, date/time, venue, or team marks. The equivalent
print document (`Scorebook Page.html`) already had this.

**Fix** (`game-v2.jsx`): added a meta row under the panel title bar, above the pannable grid:
`<TeamDot team={TEAMS.HOU}/> Houston Astros @ <TeamDot team={TEAMS.CHC}/> Chicago Cubs` ·
`Sun May 24 · 8:05p ET` · `Wrigley Field` — same fields as `PageTitle`'s subtitle elsewhere on
the game view, plus the two team marks.

Port note: source these three fields (matchup, date/start time, venue) from whatever the game
header already reads, not new data.

## 5. Pinch-to-zoom on the scorecard was too weak, and didn't work on touchscreens at all

**Bug:** the scorecard pan/zoom viewport only handled `wheel` events. Trackpad pinch (delivered
as `wheel` + `ctrlKey`) used the same weak mouse-wheel zoom curve, so a pinch gesture barely
moved the scale. True touch-pinch (phone/tablet) did nothing — `touchAction: 'none'` blocks the
browser's native pinch-zoom, and there was no JS touch handler to replace it.

**Fix** (`game-v2.jsx`):
- `onWheel` now detects `e.ctrlKey` (trackpad pinch) and applies a steeper exponential curve
  (base `1.08`/`0.93` vs `1.03`/`0.97` for a plain mouse wheel, higher power cap) — extracted
  the scale-at-point math into a shared `zoomAt(mx, my, scaleMul)` helper.
- Added real two-finger touch support: `onTouchStart`/`onTouchMove`/`onTouchEnd` track pinch
  distance and call `zoomAt` with the ratio of current/starting distance; single-finger touch
  pans (mirrors the existing pointer-drag pan).

Port note: if the shipped viewer uses a different pan/zoom implementation, port `zoomAt` +
the three touch handlers verbatim — the point is real multi-touch pinch support, not just a
tuned wheel curve.

## 6. (bundled) Team logos in the new scorecard header

Covered under item 4 — `TeamDot` renders the real team marks already used everywhere else on
the game view (`window.teamLogoUrl`, letter-mark fallback). No new asset needed.

---

## Scope / caveats
- All six are pure client-side logic/UI fixes on existing mock data — no schema or endpoint
  changes.
- Item 1's fix is Scout/Review-mode only; the live game view has no timer/wheel-driven replay
  and is unaffected.
- Item 2's `teamErrors` will read `0` until the real play-by-play feed's error field is mapped
  through, same posture as other "ungated, but needs the real field wired" items in this repo.
