# Scorecard mode — header, controls, colours (Sep 23, 2026 · rev 3)

**Scope:** live game view, pitch-by-pitch card, scorecard mode. Ungated — no new API.
**Design source:** `holistic/game-v2.jsx` (`PitchByPitchV2` header, `FeedTimeline compact`, `ScorecardGrid`),
`scorebook-cell.js` (`buildScorebookGrid` `titleRow` option), `holistic/shared.jsx` (`IQDiamond`). Copies here.

> Revs 1 and 2 are superseded. Ignore both.

## 1 · The FRAME (pitch-by-pitch card chrome) in scorecard mode — **APP**
**One** major header row replaces the old two rows (matchup + controls, then timeline):
- **Left:** a black (ink) diamond followed by **`SCOREBOOK`** (JetBrains Mono 13 / 800, letter-spacing 0.1em).
  The diamond has no tail, because only rust diamonds get the tail.
- **Right:** a column containing:
  1. the control cluster: `inning ▾` · `speed ▾` | `⏮` `▶ Play` `⏭` | `HOU / CHC` team toggle · **`← Back`**
  2. the **timeline** directly beneath it. It **grows horizontally**: the right column takes all the
     width right of the `◆ SCOREBOOK` lockup (24px gap), the controls stay right-justified in it, and
     the timeline stretches across the full column. Compact padding.
- No matchup in the frame.

Feed mode is unchanged: the batter title on the left, controls on the right (inning · speed · transport ·
**`Scorecard`** button), and the full-width timeline as its own row below.

**The transport (⏮ / Play / ⏭) appears in BOTH modes.** The team toggle must show its labels, `HOU` / `CHC`;
in the app today they're blank.

## 2 · The CARD (the movable/resizable scorecard sheet) — **APP**
It has three header rows, top to bottom:
1. **Matchup row** (replaces the SC◆REBOOK wordmark row): ground `surfaceAlt #efeae0`. Away logo + full name,
   a muted `@`, home logo + full name (DM Sans 14 / 700), then date · start time · venue (JetBrains Mono 12,
   `textMuted`), all left-aligned.
2. **Team band:** the name of the team whose card is shown. It's the existing dark band, unchanged.
3. **Table header row:** unchanged.

Implementation: `buildScorebookGrid(grid, { …, titleRow: 'matchup', away: {name, logo}, home: {name, logo} })`.
The default `titleRow: 'wordmark'` keeps the standalone print sheet (`Scorebook Page.html`) as it is.

## 3 · Scorecard colours — **APP** (keep the design's, port verbatim)
Take them from `scorebook-cell.js` as they are — don't re-map them onto other app tokens:

| Element | Value |
|---|---|
| Grid outline, cell rules | `var(--ink)` `#15161a`, 1.3px outer / 1px inner |
| Column-header cells (inning numbers, AB/R/H/RBI, R/H/K/BB) | `rgb(151,173,201)` |
| Batter row shade (starter / sub rows) | `rgb(206,217,233)` / `rgb(231,236,243)` |
| Pitcher rows | same two shades |
| Matchup row (row 1) | `var(--surfaceAlt)` `#efeae0` |
| Team band (row 2) | ground `var(--ink)`, text `var(--surface)` |
| Cell ground | `var(--surface)` `#fcfaf6` |
| Stat-column hairlines | `var(--border)` `#cfc8b4` |
| Live cell | `2px dashed var(--accent)` `#b8421e`, inset 2px |

The CSS variables must resolve to the app's `T` tokens (see the `__scorebook_cell_css` block in `game-v2.jsx`:
`--bg --surface --surfaceAlt --ink --accent --border --borderStrong --textFaint --textMuted`).

## 4 · IQ diamond rule (shared.jsx)
The Q-tail follows the colour: **rust gets the tail, any other colour doesn't.**

## Acceptance
- Scorecard mode: the frame has ONE header row. `◆ SCOREBOOK` is on the left. On the right are the controls
  right-justified, with the timeline beneath them spanning all the width right of the lockup.
- Transport is visible in both modes. The team toggle reads `HOU` / `CHC`. The mode button reads
  `Scorecard` / `← Back`.
- The sheet's rows are: matchup (grey) → team band → table header. There's no SC◆REBOOK wordmark on the sheet.
- The colours in §3 match `Holistic.html`.
