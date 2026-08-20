# PROMPT: Field Card Implementation

## Objective
Add the Field Card widget to the Baseball Realtime live-game widget, displaying ballpark information and home run context.

## Card Specification
- **Dimensions**: 495 × 195 px
- **Location**: Widget carousel (6th card, end of track)
- **Data source**: Game feed `stadium` + season HR stats

## Data Structure
```typescript
interface FieldCard {
  venue: {
    name: string;           // e.g. "Globe Life Field"
    city: string;
    state: string;          // state abbrev, e.g. "TX"
    altitude: number;       // feet
    ballparkImageUrl: string;
  };
  seasonStats: {
    homeRunsHit: number;    // cumulative 2026
  };
}
```

## Layout
**Header** (padding `12px 14px`, border-bottom `1px #e0dccd`):
- Row 1: Venue name (16px, bold, #15161a)
- Row 2: City, state (13px, #75706a)

**Body** (flex row, gap `60px`, padding `12px 13px`):
- **Left**: Ballpark image
  - Width: 175 px, Height: 105 px
  - `object-fit: contain`, `border-right: 1px #e0dccd`
  - **Distance markers** (absolute, overlaid):
    - Top left: "375" (10px, #fcfaf6, bold) at `left: 35px; top: 24px`
    - Top center: "425" (10px, #fcfaf6, bold) at `left: 50%; transform: translateX(-50%); top: 2px`
    - Top right: "375" (10px, #fcfaf6, bold) at `right: 35px; top: 24px`

- **Right**: Stats column (flex, gap `8px`, justify-content center)
  - **Altitude**
    - Label: "ALTITUDE" (10px, #75706a, uppercase, letter-spacing 0.05em)
    - Value: e.g. "507 ft" (18px, bold, mono, #15161a)
  - **Home Runs**
    - Label: "HR 2026" (10px, #75706a, uppercase, letter-spacing 0.05em)
    - Value: e.g. "84" (18px, bold, mono, #15161a)

## Design Tokens
- **Font (UI)**: DM Sans
- **Font (numeric)**: JetBrains Mono
- **Background**: #fcfaf6
- **Border**: #b4ae9b, #e0dccd
- **Text primary**: #15161a
- **Text secondary**: #75706a
- **Text overlay**: #fcfaf6 (on ballpark image)
- **Border-radius**: 10px (card), 6px (image container)

## Data Wiring
1. **Ballpark image URL**: Fetch from game feed `stadium.ballparkImageUrl`
   - Fallback: placeholder or transparent 175×105 box
   - Format: PNG/JPG with transparent or light background
   
2. **Altitude**: `stadium.altitude` (integer, assume feet, format as "XXX ft")

3. **Home runs**: Query season stats table for team + year 2026, sum all games to date
   - Format: plain integer

## Rules
1. Always use mono font for numeric values
2. Distances (375/425) are hard-coded for standard MLB ballpark geometry—do not wire
3. Image should not stretch; use `object-fit: contain` to preserve aspect
4. If altitude missing: show "— ft"
5. If HR data missing: show "—"
6. Card never scrolls; all content must fit 195px height

## Edge Cases
- Neutral venue (no standard distances): show placeholder distances or omit markers
- International stadiums: altitude may be in meters—clarify with backend

## Pixel-Perfect Reference
See `Field Card.html` in handoff bundle for exact layout, spacing, and overlay positioning.
