# PROMPT: Pitch Mix Card Implementation

## Objective
Add the Pitch Mix card widget to the Baseball Realtime live-game widget, displaying pitcher pitch-type distribution during the game.

## Card Specification
- **Dimensions**: 495 × 195 px
- **Location**: Widget carousel (4th card position after Matchup, Line Score, Win Probability)
- **Data source**: Existing game feed `pitcher.pitchMix` array

## Data Structure
```typescript
interface PitchMix {
  pitcher: string;
  team: string;
  teamLogoUrl: string;
  pitches: Array<{
    type: string;      // "Four-seam", "Slider", "Change-up", "Curveball", "Sinker", "Other"
    percent: number;   // 0-100
    color: string;     // hex color code
  }>;
  seenCount: number;  // total pitches seen
  avgVelocity: string; // e.g. "93.5 mph"
}
```

## Layout
**Header** (2 rows, padding `12px 14px`, border-bottom `1px #e0dccd`):
- Row 1: "Pitch Mix" title (16px, bold)
- Row 2: Team logo (16×16) + pitcher name (13px, medium)

**Body** (flex row, `gap: 25px`, flex: 1):
- **Left**: Donut chart (110px)
  - SVG: center 60, radius 40, stroke-width 22
  - Center text: "Seen" (10px) + count (12px, mono, bold)
  - Arc angles: `(percent / 100) * 360`
  
- **Right** (flex: 1):
  - **Data table** (grid: 2 columns, `gap: 35px`, row-gap 6px)
    - 6 rows: colored dot + type name + percent (right-aligned, mono)
  - **Divider** (1px #e0dccd, top margin 8px)
  - **Average velocity** (10px label, 13px value mono)

## Pitch Color Palette
```
Four-seam: #dc2626 (red)
Slider: #0891b2 (cyan)
Change-up: #16a34a (green)
Curveball: #3b82f6 (blue)
Sinker: #ea580c (orange)
Other: #a3a3a3 (gray)
```

## Design Tokens
- **Font (UI)**: DM Sans
- **Font (numeric)**: JetBrains Mono
- **Background**: #fcfaf6
- **Border**: #b4ae9b
- **Text primary**: #15161a
- **Text secondary**: #75706a
- **Border-radius**: 10px

## Rules
1. Always use mono font for percentages and velocity
2. Pitch names: "Four-seam" (NOT "Four-seam fastball")
3. If <5 pitch types, omit empty rows
4. If >5 pitch types, group into "Other"
5. SVG donut arcs calculated from `strokeDasharray` based on percentages
6. No scrolling—chart and data must fit within fixed 195px height

## Edge Cases
- Missing velocity: show "— mph"
- Zero percent pitch: still render with 0% value
- Real pitchers may have 10+ pitch types: always consolidate to top 5 + Other

## Pixel-Perfect References
See `Pitch Mix Card.html` in handoff bundle for exact layout, spacing, and SVG construction.
