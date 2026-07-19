# Game view — live→final auto-transition + extra-innings line score scroll (dev handoff, Jul 19, 2026)

Two behavioral fixes to `GamePage`/`PitchByPitchV2`/`LineScoreBand`. No design-file changes needed —
`holistic/game-v2.jsx`'s line score is a static mock; both fixes are app-side wiring/layout, described
here for the dev to implement against the live data feed.

## 1 — Live → Final should not require a refresh

When a live game's status flips to final (mid-session, via the socket feed), the app must switch out
of Live mode into Scout/Final mode **without a page reload**: drop the LIVE pill, mount the Upcoming
zone properly (see the separate `PROMPT_live_upcoming_regression.md`), enable the Play/Review
transport, and open paused in Scout at the game's final state — the same entry state a final game
gets on a fresh page load. Whatever `isLive`/`scoutMode` flag currently gets its initial value from a
one-time check on mount needs to react to the live status changing during the session (subscribe to
the status field already coming through the socket, not just read it once).

## 2 — Line score must extend past 9 innings, with horizontal scroll once space runs out

**Problem:** the line score's innings row (Zone 1 of the dark band) is hardcoded to innings 1–9 in
both live/final and pregame states. In extra innings, inning 10+ has no column to render into — the
line score silently stops growing.

**Fix — two parts:**

**a) Innings row grows with the game.** The innings array must be derived from the actual game data
(however many innings have been played/are in progress — 9, 10, 11, ...), not a fixed `[1..9]`. As
inning 10 starts, a 10th column appears; same for 11, 12, etc.

**b) Once the innings row runs out of horizontal room, it scrolls — not the whole band.** The dark
band itself does not grow taller or force the page layout to shift; only the **innings cell row**
(not the team-name column, not the R/H/E column) becomes its own horizontally-scrollable region once
it hits its available width. Add the same **chevron affordance already used on the at-bats scorebook
row** (fade-in gradient + ‹ › chevrons that scroll to the edge on click) when the innings overflow —
consistent interaction pattern, not a new one.

## 3 — To make room for a growing line score: condense Game Leaders, add breathing room

The line score currently gets a fixed 660px (live) — it needs to be able to grow. Free that space
from Zone 3 (Game Leaders), which currently spans a full 180px flex column with room to wrap:

- **Game Leaders column shrinks to intrinsic content width** — sized to fit its two leader rows
  (name + stat line) without wrapping, not a fixed 180px. Use `white-space: nowrap` +
  `text-overflow: ellipsis` on any leader name/line that would otherwise overflow that intrinsic
  width, with a **native tooltip (`title` attr)** or existing tooltip pattern showing the full text
  on hover/focus.
- **Add padding between Game Leaders and the Last-pitch zone** (Zone 4) — currently they sit close
  enough to feel crowded; give the boundary the same breathing room as the other zone dividers.
- Net effect: Game Leaders + its new padding occupy only what their content needs, and the freed
  width goes to Zone 1 (line score), which can now grow to accommodate extra-innings columns before
  needing to scroll internally.

## Acceptance

- A live game that goes final mid-session flips to Final/Scout mode live, no refresh needed —
  Upcoming zone appears, transport controls enable, LIVE pill disappears.
- A game in extra innings shows all played innings (10, 11, 12...) in the line score.
- When the innings row can no longer fit its available width, it — and only it — becomes
  horizontally scrollable, with fade + chevron affordance matching the at-bats scorebook row.
- Game Leaders column is sized to its content (no more, no less) with ellipsis + tooltip for any
  name/line that would overflow; there's visible padding between it and the Last-pitch zone.
- Line score's available width grows to fill the space freed by Game Leaders' condensation, so
  extra-inning columns have more room before triggering the scroll behavior.
