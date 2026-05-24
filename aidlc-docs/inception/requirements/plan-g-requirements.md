# Plan G — Requirements Document: At-Bat Card System

## Intent Analysis Summary

**User Request**: Replace the individual pitch/result rows in the GamePage live feed with a visual at-bat card that plots pitch locations on a strike zone diagram, displays batter info, and maintains a pitch-by-pitch log — all updating live as each pitch arrives via WebSocket.

**Request Type**: New Feature

**Scope Estimate**: Multiple components — API WebSocket enrichment + new client component + GamePage feed redesign

**Complexity Estimate**: Moderate-Complex — real-time data pipeline change, new SVG/canvas zone diagram, significant feed restructure

---

## Extension Configuration (carried forward)

| Extension | Enabled |
|---|---|
| Security Baseline | No |
| Property-Based Testing | No |

---

## Functional Requirements

### FR-G1: WebSocket Payload Enrichment (API)

The MLB live feed `pitchData` already contains pitch coordinates and strike zone bounds. These must be extracted and added to `PlayUpdateWire` so the client can render the zone diagram.

**New fields to add to `PlayUpdateWire` (realtime.types.ts)**:
- `pitchX?: number` — horizontal coordinate (pX from `pitchData.coordinates.pX`); negative = pitcher's left (inside to RHB), positive = pitcher's right (outside to RHB)
- `pitchZ?: number` — vertical coordinate (pZ from `pitchData.coordinates.pZ`); feet above home plate
- `strikeZoneTop?: number` — top of strike zone for current batter (`pitchData.strikeZoneTop`)
- `strikeZoneBottom?: number` — bottom of strike zone for current batter (`pitchData.strikeZoneBottom`)

**Extraction location**: `poller.service.ts` — where `pitchType` and `pitchSpeedMph` are already read from `framePitch.pitchData`

**SDK impact**: `PlayUpdateWire` is part of the published SDK client — `spec:check → spec:gen → client:build → client:publish → client install` required

---

### FR-G2: At-Bat Card Component (Client)

New React component `AtBatCard` rendering the full card for one at-bat.

**Layout**: Modified Landscape
- **Top-left**: Strike zone diagram (catcher's perspective)
- **Top-right**: Batter info panel
- **Bottom**: Pitch log table (full width)

#### FR-G2a: Strike Zone Diagram

- Catcher's perspective: left = inside to RHB, right = outside to RHB
- Renders a rectangular strike zone divided into 3×3 grid (high/mid/low × inside/mid/outside)
- Ball zone rendered as surrounding area outside the rectangle
- Zone height: **dynamic** — derived from `strikeZoneTop` / `strikeZoneBottom` of the first pitch in the at-bat that carries these values; falls back to static rulebook proportions (1.5 ft – 3.5 ft) if not available
- Zone width: fixed rulebook width (±0.85 ft from center)
- Each pitch plotted as a **color-coded numbered circle** at its (pitchX, pitchZ) coordinate
  - Number = pitch sequence within the at-bat (1, 2, 3…)
  - Color = pitch type (e.g. 4-seam FB = red, changeup = blue, slider = green, curveball = purple, cutter = orange, sinker = dark red, splitter = teal)
  - Final pitch of a resolved at-bat marked with a distinct border or star overlay
- Pitches with missing coordinates (pitchX/pitchZ are null/undefined) are omitted from the zone but still appear in the pitch log

#### FR-G2b: Batter Info Panel

- Batter headshot image from MLB CDN (`img.mlbstatic.com/.../{mlbId}/headshot/67/current`); fallback to generic silhouette on error
- Batter name, jersey number, position, team abbreviation
- Season slash line: AVG / OBP / SLG
- Today's game stats: AB-H line (e.g. "1-for-4"), Runs, RBI
- Data source: lazy-fetched from existing `GET /players/:mlbId/overview` endpoint when a new batterId is seen; cached in component state for the game session

#### FR-G2c: Pitch Log Table

- Full-width bottom section of the card
- One row per pitch, appended as pitches arrive
- Columns: # · TYPE · RESULT · MPH · COUNT
- Row background color matches the pitch type color (muted/tinted variant for readability)
- Final pitch row highlighted with result badge (e.g. "★ HOME RUN", "K", "HBP")

---

### FR-G3: GamePage Feed Restructure (Client)

The existing pitch/result row feed in `GamePage` is replaced with an at-bat block structure.

**Feed structure per at-bat**:
```
[ Batter Name Row ]  ← clickable header
  └─ [ AtBatCard ]   ← zone + batter info + pitch log
```

**Active at-bat (current)**:
- Block fully expanded at the bottom of the feed
- Card updates pitch-by-pitch as WebSocket `play-update` events arrive
- At-bat boundary detection: new `batterId` in incoming event signals end of previous at-bat

**Completed at-bats (past)**:
- Block collapses to batter name row only after at-bat resolves
- Batter name row shows a compact summary: result chip (HR, K, BB, etc.) + final count
- Clicking the batter name row expands to reveal the full filled-in card
- Clicking again collapses it

**On initial page load for a game in progress**:
- Past at-bats are not reconstructed from history (out of scope for this unit)
- Feed starts fresh from the current at-bat; historical pitch rows shown as before for prior events already in state
- Future enhancement: reconstruct past at-bats from game log

---

### FR-G4: Real-Time and Replay Compatibility

- Card works for live games (pitches arrive via WebSocket with variable timing)
- Card works for historical replay mode (pitches arrive at replay delay interval)
- No new polling or REST calls required during the at-bat; all pitch data comes from the existing `play-update` WebSocket event

---

## Non-Functional Requirements

**NFR-G1**: No regression to existing `GamePage` functionality — box score, alerts, inning summary, score header all unaffected

**NFR-G2**: TypeScript strict mode — all new code passes existing checks with no new `any`

**NFR-G3**: Zone diagram must render correctly when `pitchX`/`pitchZ` arrive incrementally (i.e. first render has 0 dots; subsequent renders add dots as pitches arrive)

**NFR-G4**: Batter headshot fetch must not block card render — show placeholder until image resolves

---

## Out of Scope (This Plan)

| Item | Note |
|---|---|
| Reconstruct past at-bats on page load | Requires full game play-by-play fetch; deferred |
| Pitcher's at-bat card (pitcher's perspective) | Catcher's view only for now |
| Spray charts | Separate future feature |
| DailyGamesPage mini-card | Possible future enhancement |
| Pitch type color legend / tooltip | Nice-to-have; deferred |
