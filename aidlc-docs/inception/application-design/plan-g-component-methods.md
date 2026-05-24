# Plan G — Component Methods

## Shared Types

```typescript
// client/src/components/AtBatCard/atBatTypes.ts

interface PitchEntry {
  seq: number;
  pitchTypeCode: string;   // e.g. "FF", "SL", "CH"
  pitchTypeName: string;   // e.g. "4-Seam Fastball"
  result: string;          // e.g. "Ball", "Called Strike", "Foul", "Home Run"
  speedMph?: number;
  count: string;           // e.g. "0-1"
  pitchX?: number;         // pX coordinate from live feed
  pitchZ?: number;         // pZ coordinate from live feed
  isLastPitch: boolean;
}

interface AtBatState {
  batterId: number;
  batterName: string;
  pitches: PitchEntry[];
  strikeZoneTop?: number;
  strikeZoneBottom?: number;
  result?: string;         // final at-bat result once resolved
  finalCount?: string;
  // Today's game stats (from PlayUpdateWire, updated each pitch)
  gameAB?: number;
  gameH?: number;
  gameR?: number;
  gameRBI?: number;
}

interface BatterInfo {
  mlbId: number;
  name: string;
  jerseyNumber: string;
  position: string;
  teamAbbr: string;
  avg: string;    // season AVG, e.g. ".242"
  obp: string;    // season OBP
  slg: string;    // season SLG
}
```

---

## Client Component Signatures

### `AtBatBlock`
```typescript
interface AtBatBlockProps {
  atBat: AtBatState;
  batterInfo: BatterInfo | null;
  isBatterInfoLoading: boolean;
  isActive: boolean;          // true = current at-bat, always expanded
  isExpanded?: boolean;       // controlled by parent for completed at-bats
  onToggle?: () => void;      // called when header row is clicked (completed only)
}

function AtBatBlock(props: AtBatBlockProps): ReactElement
```

### `AtBatCard`
```typescript
interface AtBatCardProps {
  atBat: AtBatState;
  batterInfo: BatterInfo | null;
  isBatterInfoLoading: boolean;
}

function AtBatCard(props: AtBatCardProps): ReactElement
```

### `ZoneDiagram`
```typescript
interface ZoneDiagramProps {
  pitches: PitchEntry[];
  strikeZoneTop?: number;    // ft; falls back to 3.5 if absent
  strikeZoneBottom?: number; // ft; falls back to 1.5 if absent
  width?: number;            // SVG viewport width in px (default: 200)
  height?: number;           // SVG viewport height in px (default: 220)
}

function ZoneDiagram(props: ZoneDiagramProps): ReactElement
```

**Internal coordinate transform** (not exposed):
```typescript
// Maps pX (ft, range ~-1.5 to +1.5) → SVG x pixel
function toSvgX(pX: number, viewportWidth: number): number

// Maps pZ (ft, range ~0.5 to 5.0) → SVG y pixel (inverted: high pZ = low y)
function toSvgY(pZ: number, szTop: number, szBottom: number, viewportHeight: number): number
```

### `BatterInfoPanel`
```typescript
interface BatterInfoPanelProps {
  atBat: AtBatState;         // for today's game stats (gameAB, gameH, gameR, gameRBI)
  batterInfo: BatterInfo | null;
  isLoading: boolean;
}

function BatterInfoPanel(props: BatterInfoPanelProps): ReactElement
```

### `PitchLogTable`
```typescript
interface PitchLogTableProps {
  pitches: PitchEntry[];
}

function PitchLogTable(props: PitchLogTableProps): ReactElement
```

---

## Hooks

### `useAtBatHistory`
**File**: `client/src/hooks/useAtBatHistory.ts`

```typescript
interface UseAtBatHistoryResult {
  currentAtBat: AtBatState | null;
  completedAtBats: AtBatState[];   // most recent last
}

function useAtBatHistory(latestUpdate: PlayUpdateWire | null): UseAtBatHistoryResult
```

**Behavior**:
- On each new `latestUpdate`, checks if `batterId` has changed vs. current at-bat
- If changed: moves `currentAtBat` to `completedAtBats`, initializes new `currentAtBat`
- If same batter: appends new `PitchEntry` to `currentAtBat.pitches`
- Updates `strikeZoneTop`/`strikeZoneBottom` on `currentAtBat` from the first pitch that carries them
- Updates game stats (`gameAB`, `gameH`, `gameR`, `gameRBI`) on `currentAtBat` from every pitch
- Marks `isLastPitch` on the final pitch when at-bat result is detected (e.g. HR, K, BB)

---

### `useBatterInfo`
**File**: `client/src/hooks/useBatterInfo.ts`

```typescript
interface UseBatterInfoResult {
  batterInfo: BatterInfo | null;
  isLoading: boolean;
}

function useBatterInfo(batterId: number | null): UseBatterInfoResult
```

**Behavior**:
- Fetches `GET /players/:batterId/overview` when `batterId` changes
- Caches results in a `Map<number, BatterInfo>` ref so each batter is only fetched once per session
- Returns `isLoading: true` during fetch; `null` until resolved
- Extracts: name, jerseyNumber, position, teamAbbr, avg/obp/slg from `BatterOverviewDto`

---

## Utility

### `pitchColors.ts`
**File**: `client/src/utils/pitchColors.ts`

```typescript
const PITCH_COLORS: Record<string, string> = {
  FF: "#e53e3e",   // 4-Seam Fastball — red
  SI: "#c53030",   // Sinker — dark red
  FC: "#e57c3e",   // Cutter — orange
  SL: "#38a169",   // Slider — green
  CU: "#805ad5",   // Curveball — purple
  KC: "#6b46c1",   // Knuckle Curve — violet
  CH: "#3182ce",   // Changeup — blue
  FS: "#0987a0",   // Splitter — teal
  KN: "#718096",   // Knuckleball — gray
  EP: "#b7791f",   // Eephus — amber
};

// Returns color for pitch type code; falls back to gray for unknown codes
function getPitchColor(pitchTypeCode: string): string

// Returns a muted (low-opacity) variant of the pitch color for table row backgrounds
function getPitchColorMuted(pitchTypeCode: string): string
```

---

## API — poller.service.ts additions

```typescript
// New fields extracted from framePitch inside buildPlayUpdate()

const pitchX: number | undefined =
  framePitch?.pitchData?.coordinates?.pX ?? undefined;

const pitchZ: number | undefined =
  framePitch?.pitchData?.coordinates?.pZ ?? undefined;

const strikeZoneTop: number | undefined =
  framePitch?.pitchData?.strikeZoneTop ?? undefined;

const strikeZoneBottom: number | undefined =
  framePitch?.pitchData?.strikeZoneBottom ?? undefined;

// Batter game stats — looked up from liveData.boxscore
// Checks both home and away player maps for the batterId
const batterStats = getBatterGameStats(liveData, batterId);
const batterGameAB: number | undefined = batterStats?.atBats;
const batterGameH: number | undefined = batterStats?.hits;
const batterGameR: number | undefined = batterStats?.runs;
const batterGameRBI: number | undefined = batterStats?.rbi;
```
