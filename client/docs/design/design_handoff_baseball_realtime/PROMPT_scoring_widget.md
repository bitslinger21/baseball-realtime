# Scoring Widget — 3D Flip Card (as-built)

> **Handback from dev, 2026-08-10.** This document supersedes the original spec. Sections marked **[CHANGED]** differ from what was handed to dev; all other sections are unchanged.

## Overview
A compact card widget displaying live game state on the front and a box-score summary on the back, with smooth 3D flip animation. Appears on the Daily Games landing page for each LIVE game.

---

## Design specs

### Container **[CHANGED]**
- **Width: 425px** (was 498px)
- **Height: 195px** (was 280px)
- `perspective: 1200px` on the wrapper; `transform-style: preserve-3d` on the inner div
- `display: inline-flex` so the widget stays at natural size and doesn't stretch to fill a grid cell

---

### Front face

#### Header (10px top/bottom, 12px left/right padding)
- Flex row: `[stat grid (flex: 1)]  [flip button]`
- **Stat grid** — two rows (`pitcher` / `batter`), each using a 3-column CSS grid: `1fr 58px 58px`
  - Col 1: team logo (18×18) + name (14px, 700wt) in a flex container — name truncates with ellipsis **[CHANGED — logo added]**
  - Col 2: ERA / AVG (12px, T.textMuted) right-aligned **[CHANGED — order swapped: ERA before PC, AVG before H-AB]**
  - Col 3: pitch count ("87 PC") / today's performance ("1-3") (12px, T.textMuted, mono) right-aligned
  - **Today's performance is hidden when at-bats = 0** **[CHANGED]**
- **Flip button** (⟲): 40×40, `border-radius: 8`, `background: T.surfaceAlt`, `border: 1px solid T.borderStrong`, `color: T.textMuted`, `fontSize: 22` **[CHANGED — now has explicit border + background (was transparent ghost)]**

#### Body grid — `88px 1px 1fr 1px 140px 1px 88px` (12px left/right, no vertical padding)
- **Away / home team columns** (88px): logo 36×36 + abbr (15px, 700wt) + score (28px, 800wt, mono), centered, 5px gap **[CHANGED — was 42/22/36px]**
- **Dividers** (1px): `T.border`, `margin: 10px 0`
- **Inning + bases** (1fr column, centered):
  - Inning: 17px, 800wt + `▲`/`▼` suffix (13px)
  - Bases: 3×3 CSS grid, **`repeat(3, 18px)` rows and columns**, `gap: 2px` **[CHANGED — was 36px cells]**
    - Occupied: `◆` at `T.accent`, **`font-size: 32px`** **[CHANGED — was 36px]**
    - Empty: `◇` at `T.borderStrong`, same font-size **[CHANGED — was filled muted diamond]**
    - **Occupied bases show a hover tooltip**: `#27 Jose Altuve` format (jersey + full name) **[NEW]**
- **Count column** (140px, 14px padding): three rows — balls (3 pips) / strikes (2 pips) / outs (2 pips)
  - Labels: 11px, 700wt, uppercase, `T.textMuted`, 44px wide, right-aligned
  - Pip circles: 12px, `border: 1px solid` — filled = `T.ink` bg + border; empty = `T.surface` bg + `T.borderStrong` border

---

### Back face (rotateY 180deg) **[CHANGED throughout]**

#### Header (10px top, 12px sides, **0 bottom padding, no border-bottom**) **[CHANGED]**
- Flex row: `[venue name (17px, 600wt)]  [back button]`
- **Back button** (←): same style as flip button — 40×40, same border/background/radius **[CHANGED — was a separate smaller style; now unified with front button]**; positioned **4px lower** than center via `margin-top: 4px` **[CHANGED]**

#### Elapsed row (**no top padding**, 12px sides, 7px bottom, border-bottom) **[CHANGED]**
- Elapsed time (15px, 600wt, mono) + "elapsed" label (11px, 700wt, uppercase, T.textMuted) in baseline-aligned flex row
- Elapsed time is **computed from game start time** (not a formatted string from the API) **[CHANGED — original spec took a pre-formatted string; now it's computed client-side]**

#### R/H/E table (14px padding)
- 4-column grid: `1fr 40px 40px 40px`, `gap: 10px 8px`
- Header row: R / H / E (14px, 600wt, T.textMuted, right-aligned)
- Two data rows (away, home):
  - Team cell: logo 28×28 + full team name (16px, 600wt, T.ink) in flex row, truncates
  - R: 18px, 700wt, T.ink
  - H: 18px, 600wt, T.textMuted
  - E: 18px, 400wt, T.textMuted

---

### Animation (unchanged)
- `perspective: 1200px` on container
- Front/back: `position: absolute`, `backface-visibility: hidden`, both `inset: 0`
- Flip: `transform: rotateY(0deg)` ↔ `rotateY(180deg)`, `transition: transform 0.4s cubic-bezier(0.4,0,0.2,1)`
- Back face: `transform: rotateY(180deg)` at rest
- Hidden face: `pointer-events: none` (prevents phantom clicks through the card)

---

## Data structure **[CHANGED]**

```javascript
ScoringWidget({
  away: {
    abbr: string,        // "OAK"
    name: string,        // "Oakland Athletics"
    logoUrl: string,     // resolved URL (not MLB team ID)
    hits: number | null,
    errors: number | null,
  },
  home: { abbr, name, logoUrl, hits, errors },
  awayScore: number | null,
  homeScore: number | null,
  inning: number,
  half: 'top' | 'bottom',
  balls: number,         // top-level (was count[0])
  strikes: number,       // top-level (was count[1])
  outs: number,          // top-level (was count[2])
  bases: {
    first: boolean,
    second: boolean,
    third: boolean,
    runner1: string | null,   // "#27 Jose Altuve" — shown as tooltip [NEW]
    runner2: string | null,
    runner3: string | null,
  },
  pitcher: {
    name: string,
    era: string | null,
    pc: number | null,
    logoUrl: string | null,   // pitcher's team logo [NEW]
  },
  batter: {
    name: string,
    avg: string | null,
    ab: number | null,        // today's at-bats
    h: number | null,         // today's hits
    logoUrl: string | null,   // batter's team logo [NEW]
  },
  venue: string | null,
  elapsedTime: string,        // pre-formatted "2H 18M" for design; computed in app
})
```

**Logo derivation** (for design file — in the app, URLs come from the API):
- Team logos: `https://www.mlbstatic.com/team-logos/{mlbTeamId}.svg`
- Pitcher logo = pitching team; batter logo = batting team
  - Top half of inning → home team pitches, away team bats
  - Bottom half → away team pitches, home team bats

---

## Files
- `Scoring Widget Demo.html` — Standalone demo (updated to reflect as-built)
- `holistic/scoring-widget.jsx` — Reusable component (updated to reflect as-built)
