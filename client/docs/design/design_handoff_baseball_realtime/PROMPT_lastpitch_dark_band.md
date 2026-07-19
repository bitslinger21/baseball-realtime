# Game view — last-pitch panel moved into the dark line-score band (dev handoff, Jul 18, 2026)

Ungated layout change. No new API, no data change. Source of truth: `holistic/game-v2.jsx` (and the
handoff copy under `design_handoff_baseball_realtime/holistic/`).

## What changed

The full-width "last pitch" headline strip that used to sit at the bottom of `MatchupLeft` (below the
strike zone / batter card — type, mph, outcome pill) is **removed from there** and now renders as a
**new fourth zone in the dark `LineScoreBand`**, to the right of Game Leaders — filling space that was
previously dead (Game Leaders' column is `1fr` but its content rarely fills it).

**Why:** that dead space was wasted, and pitch-level detail reads naturally alongside the score/leaders
readout at the top of the screen. Removing the strip from `MatchupLeft` also shortens that card, so
`MatchupContext` (This matchup / Due up) slides up — more of the page fits above the fold.

## Band layout

`LineScoreBand`'s grid goes from `660px 1fr` (line score | leaders) to **`660px 1fr 380px`** — a new
fixed-width fourth column. Its content mirrors the removed strip's 3-part layout, adapted to the
narrower column:

- **Left (flexible):** eyebrow label ("Last pitch · #N of at-bat" / "Final pitch · Nth inning") above
  the pitch type name, bold, e.g. "Four-Seam Fastball". Both truncate with ellipsis if the column gets
  too narrow.
- **Middle (fixed, bordered both sides):** the mph number, large and bold, mono, with a small "MPH"
  caption below.
- **Right (fixed, max-width 140px):** a **cream pill** (`T.bg` background, `T.ink` text — matches the
  page background, not a colored status tone) showing the outcome ("Ball", "Single", etc.), truncating
  with ellipsis if long.

This is the same treatment already built and signed off in the Scout-mode prototype
(`holistic/game-scout.jsx`'s `ScoutBand`) — ported here for visual consistency between live and
finished-game contexts. Reference: `Game Scout Mode.html` / `review-game-scout.html`.

## What was removed

The old full-width dark strip inside `MatchupLeft` (`padding: '14px 18px 18px'` block, grid
`1fr auto auto`, `viewing.last.type`/`.mph`/`.call`/`.note`) is deleted entirely. `isLive`, `viewing`,
and `liveAB` are still used elsewhere in `MatchupLeft` (rewind eyebrow, strike zone dots, scorebook
cell state) — only the headline strip itself is gone.

## Note on data wiring

Like the line score above it, this new band zone is a **static mock slice** in the design file — it
is not wired to `MatchupLeft`'s at-bat rewind state (same pattern already true of the line score, which
doesn't sync to the rewind selector either). When porting, wire this zone to whatever live-pitch data
source the existing (removed) strip was already reading from — the field shapes are unchanged
(`type`, `mph`, outcome text), only the panel's position and layout moved.

## Acceptance

- `MatchupLeft` no longer has a last-pitch strip below the batter card; `MatchupContext` sits directly
  under it with less empty scroll before the fold.
- The dark band's fourth zone shows pitch type, mph, and a cream outcome pill, matching the Scout-mode
  panel's visual style (same font sizes, divider rule, pill treatment).
- Long pitch-type names or outcome text truncate with ellipsis rather than wrapping or overflowing the
  band.
- No other zones (line score, Game Leaders) change in content or behavior — only their column widths
  shift to make room for the new zone.
