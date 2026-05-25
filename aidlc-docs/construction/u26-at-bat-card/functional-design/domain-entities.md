# U26 — Domain Entities

## API Amendment (from Q3-A)

Before client work begins, one small addition is needed in the API to support pitch type codes:

**`api/src/poller/poller.service.ts`** — extract `pitchTypeCode` alongside `pitchType`:
```typescript
const pitchTypeCode: string | undefined =
  typeof framePitch?.details?.type?.code === 'string'
    ? framePitch.details.type.code : undefined;
```

**`api/src/poller/poller.processor.ts`** — add to `PlayUpdateWire`:
```typescript
pitchTypeCode?: string;  // e.g. "FF", "SL", "CH"
```

**`api/src/realtime/realtime.gateway.ts`** — add to `toPlayWire()` return:
```typescript
pitchTypeCode: u.pitchTypeCode,
```

**`client/src/realtime/types.ts`** — add to `PlayUpdate` interface:
```typescript
pitchTypeCode?: string;
```

No SDK bump required — WebSocket types are a manual mirror.

---

## Core Domain Types

### `PitchEntry`
One pitch within an at-bat.

```typescript
interface PitchEntry {
  seq: number;              // 1-based position within the at-bat
  pitchTypeCode: string;    // MLB code: "FF", "SL", "CH", etc. — used for color mapping
  pitchTypeName: string;    // Full description: "4-Seam Fastball", "Slider", etc.
  result: string;           // e.g. "Ball", "Called Strike", "Foul", "Home Run"
  speedMph?: number;
  count: string;            // "{balls}-{strikes}" at time of pitch, e.g. "1-2"
  pitchX?: number;          // pX coordinate (ft, catcher's perspective)
  pitchZ?: number;          // pZ coordinate (ft above home plate)
  isLastPitch: boolean;     // true only when playResult is non-null on this update
  renderKey: string;        // playKey ?? `${ts}-${overallIndex}` — for GameTimeline anchor IDs
}
```

### `AtBatState`
One complete or in-progress at-bat. Maintained in `useAtBatHistory`.

```typescript
interface AtBatState {
  atBatIndex: number;         // from PlayUpdateWire.atBatIndex — primary identity
  batterId: number;
  batterName: string;
  inning: number;
  half: "top" | "bottom";
  pitches: PitchEntry[];
  strikeZoneTop?: number;     // ft — set from first pitch that carries it
  strikeZoneBottom?: number;  // ft — set from first pitch that carries it
  result?: string;            // final play result text, set when isLastPitch=true
  finalCount?: string;        // count string at completion, e.g. "3-2"

  // Today's game stats — updated on every pitch (latest wire value wins)
  gameAB?: number;
  gameH?: number;
  gameR?: number;
  gameRBI?: number;

  // For GameTimeline anchor ID assignment
  firstPitchRenderKey: string;   // renderKey of pitches[0] → batter anchor ID
  isFirstInInning: boolean;      // true if this at-bat opened a new inning
}
```

### `BatterInfo`
Season stats and bio fetched from `/players/:id/overview`. Cached per session.

```typescript
interface BatterInfo {
  mlbId: number;
  name: string;
  jerseyNumber: string;
  position: string;
  teamAbbr: string;
  avg: string;    // season AVG formatted ".242"
  obp: string;    // season OBP formatted ".318"
  slg: string;    // season SLG formatted ".401"
}
```

### `AtBatHistoryState`
Internal state shape of `useAtBatHistory`.

```typescript
interface AtBatHistoryState {
  currentAtBat: AtBatState | null;
  completedAtBats: AtBatState[];   // oldest index 0, newest last
  overallPlayIndex: number;        // increments on each processed PlayUpdate — used in renderKey computation
  lastInningKey: string;           // tracks current inning identity ("inning-half") for isFirstInInning detection
}
```
