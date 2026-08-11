# Scoring Widget Handoff

> **Handback from dev, 2026-08-10.** Updated to reflect as-built design. Changes from the original spec are noted inline.

## Overview

The Scoring Widget displays live at-bat state for a game: pitcher/batter matchup, inning/bases/count, and team scores. Flips to reveal a venue + elapsed time + R/H/E box score. Used on the Daily Games landing page for each LIVE game.

**Dimensions: 425×195px** _(was 498×280px)_

## Component

**File:** `holistic/scoring-widget.jsx`  
**Demo:** `Scoring Widget Demo.html`  
**Spec:** `PROMPT_scoring_widget.md`

### Props _(updated)_

```
away: { abbr, name, logoUrl, hits, errors }   ← was { id, abbr }; logoUrl replaces id
home: { abbr, name, logoUrl, hits, errors }
awayScore: number | null
homeScore: number | null
inning:  number
half:    'top' | 'bottom'
balls:   number                               ← was count[0]
strikes: number                               ← was count[1]
outs:    number                               ← was count[2]
bases: {
  first:   boolean
  second:  boolean
  third:   boolean
  runner1: string | null   ← NEW — tooltip text e.g. "#27 Jose Altuve"
  runner2: string | null
  runner3: string | null
}
pitcher: { name, era, pc, logoUrl }           ← logoUrl is NEW
batter:  { name, avg, ab, h, logoUrl }        ← h and logoUrl are NEW
venue:        string | null                   ← NEW (shown on back face)
elapsedTime:  string                          ← NEW — pre-formatted "2H 14M"
onEnter:      () => void                      ← clicking the card navigates to game
```

**Logo derivation:** pitcher logo = pitching team; batter logo = batting team.
- Top half of inning → home pitches, away bats
- Bottom half → away pitches, home bats

Team logo URLs: `https://www.mlbstatic.com/team-logos/{mlbTeamId}.svg`

---

## Structure

### Front face

**Header** (10px top/bottom, 12px sides, border-bottom)
- Flex row: `[stat rows (flex:1)]  [⟲ flip button]`
- Stat rows: two 3-column grids (`1fr 58px 58px`)
  - Pitcher: `[logo 18×18 + name]  [ERA]  [N PC]`
  - Batter:  `[logo 18×18 + name]  [AVG]  [H-AB]` — H-AB hidden when ab=0
- **Flip button (⟲):** 40×40, `border-radius: 8`, `background: T.surfaceAlt`, `border: 1px solid T.borderStrong`

**Body** — 7-column grid: `88px 1px 1fr 1px 140px 1px 88px` (0px top/bottom, 12px sides)
- Team columns (88px): logo 36×36 + abbr (15px 700wt) + score (34px 800wt mono)
- Dividers: `background: T.border`, `margin: 10px 0`
- Inning + bases column (1fr):
  - Inning: 17px 800wt + `▲`/`▼` (13px)
  - **Bases grid: `repeat(3, 18px)` rows and cols, gap 2px** _(was 36px cells)_
    - Occupied: `◆` at `T.accent`, **font-size 32px** _(was 36px)_
    - Empty: `◇` at `T.borderStrong` _(was filled muted diamond)_
    - Occupied bases show a **hover tooltip** with runner jersey + name _(NEW)_
- Count column (140px, 14px padding): balls (3 pips) / strikes (2 pips) / outs (2 pips)

### Back face _(NEW — was not in original design)_

**Header** — `padding: 10px 12px 0` (no border-bottom, no bottom padding)
- Flex row: `[venue name (17px 600wt)]  [← back button]`
- **Back button (←):** same 40×40 bordered style as ⟲, `margin-top: 4px`

**Elapsed row** — `padding: 0 12px 7px`, border-bottom (no top padding)
- Elapsed time (15px 600wt mono) + "elapsed" label (11px 700wt uppercase muted)

**R/H/E grid** — `1fr 40px 40px 40px`, `gap: 10px 8px`
- Header row: R / H / E labels (14px 600wt muted, right-aligned)
- Two data rows (away, home): logo 28×28 + team name | R (18px 700wt ink) | H (18px 600wt muted) | E (18px 400wt muted)

### Animation

- `perspective: 1200px` on wrapper; `transform-style: preserve-3d` on inner
- Both faces: `position: absolute; inset: 0; backface-visibility: hidden`
- Back face starts at `rotateY(180deg)`
- Flip: `transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)`
- Hidden face: `pointer-events: none`

---

## Landing Page Integration

**File:** `landing.jsx`  
**Section:** Live games row

Grid layout wraps widgets naturally at viewport width. Widget is `flex-shrink: 0` to maintain its fixed 425px width.

---

## Styling Tokens

All from `window.T` (defined in `holistic/shared.jsx`):

| Token | Use |
|-------|-----|
| `T.surface` | Card background |
| `T.surfaceAlt` | Button background |
| `T.borderStrong` | Card border, button border, empty base color |
| `T.border` | Dividers, elapsed border-bottom |
| `T.ink` | Primary text, score, filled pips |
| `T.textMuted` | Labels, stats, empty pips |
| `T.accent` | Occupied base diamonds |
| `T.r.md` | Border radius (10px) |
| `T.sh.md` | Card shadow |
| `T.mono` | All numerals (scores, counts, elapsed) |
| `T.sans` | Labels, uppercase tags |
