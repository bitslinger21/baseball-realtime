# Plan G — Components

## Client Components

---

### `AtBatBlock`
**File**: `client/src/components/AtBatCard/AtBatBlock.tsx`

**Responsibility**: Collapsible wrapper for one complete at-bat entry in the feed. Renders a clickable batter name header row and conditionally renders the `AtBatCard` below it. Active at-bat is always expanded; completed at-bats are collapsed by default and toggle on click.

**Responsibilities**:
- Render batter name row with result chip (for completed at-bats)
- Manage expand/collapse toggle for completed at-bats
- Always render card for active at-bat (no toggle)
- Pass `AtBatState` and `BatterInfo` down to `AtBatCard`

---

### `AtBatCard`
**File**: `client/src/components/AtBatCard/AtBatCard.tsx`

**Responsibility**: Container for the Modified Landscape at-bat card layout. Composes `ZoneDiagram` (top-left), `BatterInfoPanel` (top-right), and `PitchLogTable` (full-width bottom) into the card structure.

**Responsibilities**:
- Apply card layout (Modified Landscape CSS grid/flex)
- Pass pitch data down to `ZoneDiagram` and `PitchLogTable`
- Pass batter info down to `BatterInfoPanel`
- Show game situation header (inning, outs, count)

---

### `ZoneDiagram`
**File**: `client/src/components/AtBatCard/ZoneDiagram.tsx`

**Responsibility**: SVG-based strike zone visualization. Renders the strike zone rectangle, surrounding ball area, and a numbered color-coded `<circle>` for each pitch at its (pitchX, pitchZ) coordinate.

**Responsibilities**:
- Define SVG viewport and coordinate scale (pX/pZ → SVG pixels)
- Render strike zone rectangle scaled to dynamic `strikeZoneTop`/`strikeZoneBottom` bounds; fall back to static rulebook bounds (1.5–3.5 ft) if not available
- Render zone grid lines (3×3 divisions)
- Render one `<circle>` + sequence number label per pitch
- Color each dot using `getPitchColor(pitchTypeCode)` from `pitchColors.ts`
- Mark final at-bat pitch with a ring or star overlay

---

### `BatterInfoPanel`
**File**: `client/src/components/AtBatCard/BatterInfoPanel.tsx`

**Responsibility**: Displays batter headshot, name, jersey number, position, team, season slash line, and today's game stats. Shows a placeholder while data is loading.

**Responsibilities**:
- Render headshot `<img>` from MLB CDN; show generic silhouette on load error
- Display name, number, position, team abbreviation
- Display season slash line (AVG / OBP / SLG) from `BatterInfo`
- Display today's stats (e.g. "1-for-4 · 1 R · 2 RBI") sourced from `PlayUpdateWire` game stat fields
- Show skeleton/placeholder state when `isLoading` is true

---

### `PitchLogTable`
**File**: `client/src/components/AtBatCard/PitchLogTable.tsx`

**Responsibility**: Tabular pitch-by-pitch log. One row per pitch, color-coded by pitch type. Final pitch row highlighted with result badge.

**Responsibilities**:
- Render table with columns: # · TYPE · RESULT · MPH · COUNT
- Apply muted pitch type background color per row using `getPitchColor()`
- Highlight the final pitch row with a result badge (e.g. "★ HOME RUN")
- Handle empty state gracefully (no pitches yet)

---

## API Components

### `PlayUpdateWire` (enrichment — realtime.types.ts)
**Responsibility**: Carries all per-pitch data from the server to the client over WebSocket. Plan G adds 8 new optional fields.

**New fields added by Plan G**:
- Pitch coordinates: `pitchX`, `pitchZ`, `strikeZoneTop`, `strikeZoneBottom`
- Batter game stats: `batterGameAB`, `batterGameH`, `batterGameR`, `batterGameRBI`
