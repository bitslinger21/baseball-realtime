# Scorecard — Design Handoff

This document describes the live in-app scorecard grid (`buildScorebookGrid` in `client/public/scorebook-cell.js`). It is intended for a designer picking up this component for review, refinement, or redesign direction.

---

## What it is

A traditional baseball scorebook rendered as an interactive in-app grid. It appears when the user "flips" the pitch-by-pitch feed panel. The grid is pan/zoomable (drag to pan, pinch or scroll to zoom). One grid per team; a segmented control switches sides.

The grid is built imperatively in a shared JS function — the same function drives both the in-app view and a printable reference page — so any visual changes to the design need to map back to that single builder.

---

## Design language

The scorecard inherits the app's "editorial scorebook" design direction:

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f4f1ea` | Warm cream — SCOREBOOK header row background |
| `--surface` | `#fcfaf6` | Off-white cream — scoring cell and stat cell backgrounds |
| `--ink` | `#15161a` | Near-black — all borders, text, SVG strokes |
| `--accent` | `#b8421e` | Rust red — live PA indicator, SCOREBOOK diamond logo |
| `--border` | `#cfc8b4` | Warm light grey — sub-row dividers, lighter internal lines |
| `--borderStrong` | `#b8ae9b` | Warm mid-grey — SVG diamond stroke color |
| `--starterBg` | `#DAFAFD` | Starter batter info cells + starting pitcher info cells |
| `--subBg` | `#F5FFFF` | Substitute batter info cells + relief pitcher info cells |

**Typefaces:**
- **JetBrains Mono** — all numbers, column labels, order numbers, the SCOREBOOK wordmark
- **DM Sans** — player names only

---

## Grid structure

### Column layout (left → right)

| Col | Label | Width | Content |
|---|---|---|---|
| 1 | `#` | 36px | Batting order number |
| 2 | No. | 36px | Jersey number |
| 3 | Name | 190px | Player name |
| 4 | Avg | 34px | Batting average |
| 5 | Pos | 26px | Defensive position |
| 6–14 | 1–9 | 112px each | Inning scoring cells |
| 15–18 | AB R H RBI | 52.5px each | Game stat totals |

**Total width:** ≈ 1,560px at natural scale (wider than any viewport — designed to be zoomed and panned).

### Row layout (top → bottom)

| Row(s) | Height | Content |
|---|---|---|
| 1 | 44px | SCOREBOOK header — wordmark + game meta |
| 2 | 30px | Team name band |
| 3 | 30px | Column label row (#, No., Name, … 1–9, AB R H RBI) |
| 4–30 | 32px × 27 | 9 batting slots × 3 sub-rows each |
| 31 | 32px | Pitching section header |
| 32–35 | 32px × 4 | Pitcher rows (1 starter + 3 relievers) |

---

## Color zones

### Row 1 — SCOREBOOK header
- Background: `#f4f1ea` (bg/cream)
- Left: `SC◇REBOOK` wordmark — JetBrains Mono 800, 14px, 0.12em letter-spacing, ink color, with a rust-red (`#b8421e`) diamond SVG between SC and REBOOK
- Right: game meta line — `DATE · vs OPPONENT · VENUE` — DM Sans 11px, muted text

### Row 2 — Team name band
- Background: `#15161a` (ink — near-black)
- Text: white, JetBrains Mono 800, 13px, 0.08em tracking
- Optionally prefixed with team logo (22×22px)

### Row 3 — Column labels
- Background: `#26616e` (dark teal)
- Text: white, JetBrains Mono 700, 13px
- All columns — `#`, No., Name, Avg, Pos, 1–9, AB R H RBI

### Col 1 (order numbers) + pitcher order numbers
- Background: `#26616e` (same dark teal as label row — reads as a continuous left rail)
- Text: white, JetBrains Mono 800, 16px

### Batting slot info cells (cols 2–5: No. · Name · Avg · Pos only)
Only the four identity columns are shaded — inning cells and stat cells always use `--surface` cream.

Each major slot has 3 sub-rows:
- **Sub-row 0** (starter): `--starterBg` — `#DFF8FA`
- **Sub-rows 1–2** (substitutes): `--subBg` — `#F5FFFF`

Sub-rows are independent cells. The last sub-row in each major slot uses a strong ink border-bottom; inner sub-row dividers use the lighter `--border` color. Substitutes' names are indented 28px to show lineage from the starter.

### Inning scoring cells (cols 6–14)
- Background: `#fcfaf6` (surface cream)
- Spans all 3 sub-rows of the major slot as one cell
- Outer border: 1px solid ink (strong)
- Content: the scoring diamond SVG (see Scoring Cell below)
- **Live PA**: 2px dashed `#b8421e` (rust) outline, offset -2px inset
- **Empty/future innings**: full opacity border, inner content faded to 30% opacity (border always full strength so column lines read continuously)

### Stat cells — AB R H RBI (cols 15–18)
- Background: `#fcfaf6` (surface cream)
- Spans all 3 sub-rows as one cell
- Outer border: 1px solid ink (matches inning cells)
- Two internal horizontal dividers at 33% and 66% height in the lighter `border` color, marking the 3 sub-rows
- Value (tally marks) is centered across the full height

### Pitching section header (row 31)
- Cols 1–5: `#26616e` background, white text — "Pitching", ERA, HND labels
- Cols 6–14 (inning area): each cell subdivided into 4 equal columns — **R · H · K · BB** — `#26616e` background, white text, JetBrains Mono 700 12px
- Cols 15–18 (stat area): this row has no separate cells; the position diamond (below) spans this space

### Pitcher rows (rows 32–35)
- Col 1 order number: `#26616e` background, white
- Cols 2–5 info (No. · Name · ERA · Hand only — shaded, same rule as batters):
  - **Starting pitcher (row 0)**: `--starterBg` — matches batter starter shade
  - **Relief pitchers (rows 1–3)**: `--subBg` — matches batter substitute shade
- Cols 6–14 (inning area): subdivided 4-wide (r/h/k/bb), `--surface` background, lighter `--border` dividers between sub-cells — not shaded
- Cols 15–18: occupied by position reference diamond (spans all 4 pitcher rows) — not shaded

---

## Border system

| Context | Color | Weight |
|---|---|---|
| Outer grid frame | ink `#15161a` | 1.3px |
| Major row boundary (between batting slots) | ink | 1px |
| Column separators | ink | 1px |
| Sub-row dividers (info cols, inner) | border `#cfc8b4` | 1px |
| Stat cell internal dividers | border | 1px (absolute positioned) |
| Pitcher inning sub-cell dividers (R\|H\|K\|BB) | border | 1px |

The key rule: **column lines always render at full opacity**. Fading on empty cells is applied only to the inner content wrapper, not the cell element itself, so vertical rhythm is unbroken whether a game is in progress or not.

---

## Scoring cell (inning diamond)

Each inning cell is 112×96px. It holds a custom SVG scoring cell.

### SVG layout
**Left region — field SVG:**
- Baseball diamond polygon — four corners: home (50,94), 1B (84,60), 2B (50,26), 3B (16,60)
- Stroke: `#b8ae9b` (borderStrong), 2px weight
- Foul lines extending from 1B and 3B outward
- Infield arc (outfield edge), 1px, 45% opacity
- Four corner dots at each base, 2.5px radius, `#b8ae9b` fill
- Base-running paths are drawn on the diamond as the game progresses:
  - **Bold path**: the plate appearance result (where the batter ended up)
  - **Lighter path**: subsequent baserunning advancement
  - Path colors use ink; scoring lines may differ in weight

**Right region — marker column:**
- 3-box stack (balls, top): each box 10×10px, ink border 1.3px
- 2-box stack (strikes, middle): same box style
- Circle (out number, bottom): 14×14px, ink border 1.3px, number inside in JetBrains Mono 8px 700

**Half-inning end marker:**
- A diagonal SVG line extending beyond the cell's bottom-right corner, rendered with `overflow:visible`
- Indicates the 3rd out ended the half-inning

---

## Position reference diamond

Occupies the stat column area (cols 15–18) beside all 4 pitcher rows.

- SVG viewBox `0 0 100 100`, rendered at 85% of the container height, centered via flexbox
- Same diamond shape as the scoring cells: `polygon points="50,94 84,60 50,26 16,60"`
- Position numbers 1–9 placed at each fielder's approximate location on the diamond
- Position 2 (catcher) sits below home plate — outside the viewBox, rendered via `overflow:visible`
- Stroke: ink at 1.3px; foul lines at same weight; outfield arc at 1px / 45% opacity
- Provides a quick reference for scoring fielder notations

---

## Typography detail

| Element | Face | Size | Weight | Notes |
|---|---|---|---|---|
| SCOREBOOK wordmark | JetBrains Mono | 14px | 800 | 0.12em tracking, with rust ◇ SVG inset |
| Team name | JetBrains Mono | 13px | 800 | 0.08em tracking, white on ink |
| Column labels | JetBrains Mono | 13px | 700 | White on `#26616e` |
| Stat labels (AB R H RBI) | JetBrains Mono | 11px | 700 | Smaller to fit narrower columns |
| Pitching sub-labels (R H K BB) | JetBrains Mono | 12px | 700 | White on `#26616e` |
| Order / pitcher numbers | JetBrains Mono | 16px | 800 | Large, white on `#26616e` |
| Jersey numbers | JetBrains Mono | 15px | 700 | In tinted info cell |
| Player names | DM Sans | 14px | 600 | Only element using sans; substitutes indented 28px |
| Batting average / ERA | JetBrains Mono | 13px | 400 | Default info cell |
| Out number in circle | JetBrains Mono | 8px | 700 | Inside 14px circle |
| Game meta line | DM Sans | 11px | 400 | Muted, right-aligned in SCOREBOOK header |

---

## Interaction model

The grid lives inside a **pan/zoom viewport**:
- Pointer drag: pans (translate X/Y)
- Pinch / scroll wheel: zooms around the pointer position
- Transform applied directly to a content div via `style.transform`; no CSS transitions (imperative for responsiveness)
- The **matchup/date/venue** meta strip is inside the transform container and pans with the grid
- The static header (SCOREBOOK wordmark, hint text, team selector, back button) stays fixed above the viewport

---

## Data model (what the builder accepts)

```js
buildScorebookGrid(gridEl, {
  lineup: [              // 9 entries
    {
      order: 1,
      no: '27',
      name: 'Jose Altuve',
      avg: '.284',
      pos: '2B',
      playerId: 514888,
      subs: [            // substitutes at this slot
        { no: '4', name: 'Mauricio Dubón', pos: 'PH', playerId: 605216 }
      ],
      cellsByInn: {      // keyed by inning number 1–9
        3: { code: 'K', balls: 1, strikes: 3, result: 'Strikeout', isLooking: false, live: false, halfEnd: false }
      },
      stats: { ab: 4, r: 1, h: 2, rbi: 0 }
    },
    // …
  ],
  pitchers: [            // up to 4 entries
    {
      no: '35',
      name: 'Justin Verlander',
      era: '3.12',
      hnd: 'R',
      cellsByInn: {
        1: { r: 0, h: 1, k: 2, bb: 0 }
      }
    },
    // …
  ],
  teamAbbr: 'HOU',
  teamName: 'Houston Astros',
  logoUrl: 'https://…/logo.svg',
  opponent: 'Toronto Blue Jays',
  gameDate: 'Tue Aug 4',
  venue: 'Daikin Park',
  gameId: 'mlb-748523',
})
```

---

## Open design questions / known gaps

1. **Scoring cell result codes** — currently shows a short code string (`K`, `1B`, `HR`, etc.). Richer codes (e.g., `6-3`, `F8`, `K²`) need out-type and fielder data from the API; parked as F-005.
2. **Color in dark mode** — the scorecard CSS variables are injected once at mount with hardcoded light-mode values. The grid does not currently respond to `prefers-color-scheme`. Tinted rows use rgba which would show differently on a dark ground.
3. **Inning cell result path colors** — bold/light path distinction exists (F-003 shipped) but there is no per-path color differentiation beyond stroke-width. Baserunning paths on multi-runner plays could benefit from color coding.
4. **Pitcher stat area** — the R/H/K/BB tally marks use tick-mark SVGs. No visual hierarchy distinguishes earned from unearned runs.
5. **Mobile / small-screen** — the grid is wide by design and intended for zoom/pan on mobile. No breakpoint-specific layout adaptation exists.
