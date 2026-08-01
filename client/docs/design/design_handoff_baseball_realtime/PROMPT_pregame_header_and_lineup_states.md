# Pregame header layout + lineup empty states (Jul 31, 2026)

Files: `holistic/shared.jsx` (`PageTitle`), `holistic/game-v2.jsx` (pregame + live screens).

## 1. Header row layout fix
Status pill (SCHEDULED/LIVE) and the Preview/Head-to-head toggle were both crammed onto one
row. Moved to match the venue/team-name rows they belong with:
- `PageTitle` (`shared.jsx`) gained a `subtitleRight` prop — renders alongside the
  venue/date/time subtitle row, separate from the existing `right` prop (now renders
  alongside the title/team-names row). Backward compatible — other pages using only `right`
  are unaffected.
- Pregame: `subtitleRight` = SCHEDULED pill; `right` = Preview/Head-to-head toggle.
- Live: `subtitleRight` = LivePill + elapsed-time pill; `right` = Live/Head-to-head toggle.
- Removed the redundant "First pitch 8:05p" pill (time already shown in the subtitle) and
  removed the status dot/label + start time text from the dark line-score band's top-left
  (Zone 1 header) on both bands — that info now lives only in the page header, not duplicated
  in the band.

## 2. Team logos / record colors (confirmed correct, port bug elsewhere)
Re-verified: `TeamDot`/`TeamMark` render mascot short names (`TEAMS.HOU.short`, e.g. "Astros"),
not abbreviations, and the "Coming in" record numbers render plain white — team-primary-colored
records or abbreviation-only team names seen in a port are a port-side bug, not a design source
issue. No design change needed; re-check the port's implementation against this file.

## 3. Lineup "not yet posted" empty state (NEW)
Real MLB batting orders typically post ~1hr before first pitch — well after probable starters
are known (rotation-based, days ahead). The design previously assumed a lineup was always
available pregame. Fixed with a `lineupPosted` flag (mock demonstrates the **not-posted**
state, since that's the common case):

- `LineupsTray` — new `lineupPosted` prop (default `true`, so live view is unaffected). When
  `false`, the "Lineup" section renders an empty-state card ("Lineup not yet posted · clubs
  typically post ~1hr before first pitch") instead of the batting order. Bench/Bullpen are
  unaffected (roster-level data, available regardless).
- `PregameMatchupLeft` — the "Leading off" batter card now branches on `lineupPosted` (currently
  hardcoded `false`): shows the real leadoff-batter mini-card when true, or a matching empty
  state when false. The "First pitch: [starter] vs [starter]" headline is UNCONDITIONAL — always
  shown, since it only depends on `PROBABLES`, not the lineup.
- `PregameContext` — "Top of the order · HOU" shows the same empty state when not posted; the
  left card was reframed from "First matchup" (batter vs pitcher, needs a known batter) to
  "Probable starter · CHC" (pitcher-only, always available).

## Port note
Wire `lineupPosted` (and the equivalent gates in `PregameMatchupLeft`/`PregameContext`) to
real data-availability — true once the actual lineup feed has posted for the game, false
before. Probable-starter content should NOT be gated the same way; it comes from a separate,
earlier-available data source.
