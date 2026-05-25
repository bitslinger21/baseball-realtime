# U26 — Business Logic Model

## 1. `useAtBatHistory` — State Machine

**Signature**: `useAtBatHistory(latestUpdate: PlayUpdate | null): { currentAtBat: AtBatState | null; completedAtBats: AtBatState[] }`

**Trigger**: Runs on each new `latestUpdate` value (via `useEffect` dependency).

### Algorithm

```
ON each new latestUpdate:

  1. If latestUpdate is null → no-op, return current state

  2. Compute renderKey:
       renderKey = latestUpdate.playKey ?? `${latestUpdate.ts}-${overallPlayIndex}`
       overallPlayIndex += 1

  3. Determine if this is a new at-bat:
       NEW AT-BAT if:
         a. currentAtBat is null (first ever update), OR
         b. latestUpdate.atBatIndex != null
            AND latestUpdate.atBatIndex !== currentAtBat.atBatIndex
         c. FALLBACK (atBatIndex absent on both):
            latestUpdate.batterId != null
            AND latestUpdate.batterId !== currentAtBat.batterId

  4. If NEW AT-BAT:
       a. If currentAtBat is not null → push to completedAtBats
       b. Detect isFirstInInning:
            currentInningKey = `${latestUpdate.inning}-${latestUpdate.half}`
            isFirstInInning = (currentInningKey !== lastInningKey)
            lastInningKey = currentInningKey
       c. Initialize new currentAtBat:
            {
              atBatIndex: latestUpdate.atBatIndex ?? -1,
              batterId: latestUpdate.batterId ?? 0,
              batterName: latestUpdate.batterName ?? "",
              inning: latestUpdate.inning,
              half: latestUpdate.half,
              pitches: [],
              strikeZoneTop: latestUpdate.strikeZoneTop,
              strikeZoneBottom: latestUpdate.strikeZoneBottom,
              gameAB: latestUpdate.batterGameAB,
              gameH: latestUpdate.batterGameH,
              gameR: latestUpdate.batterGameR,
              gameRBI: latestUpdate.batterGameRBI,
              firstPitchRenderKey: renderKey,
              isFirstInInning,
              result: undefined,
              finalCount: undefined,
            }

  5. Build PitchEntry:
       isLastPitch = latestUpdate.playResult != null
       seq = currentAtBat.pitches.length + 1
       pitchEntry = {
         seq,
         pitchTypeCode: latestUpdate.pitchTypeCode ?? "UN",
         pitchTypeName: latestUpdate.pitchType ?? "Unknown",
         result: latestUpdate.description ?? "",
         speedMph: latestUpdate.pitchSpeedMph,
         count: `${latestUpdate.balls}-${latestUpdate.strikes}`,
         pitchX: latestUpdate.pitchX,
         pitchZ: latestUpdate.pitchZ,
         isLastPitch,
         renderKey,
       }

  6. Append pitchEntry to currentAtBat.pitches

  7. Update strikeZoneTop/Bottom if not yet set AND values present:
       if currentAtBat.strikeZoneTop == null && latestUpdate.strikeZoneTop != null:
         currentAtBat.strikeZoneTop = latestUpdate.strikeZoneTop
       (same for strikeZoneBottom)

  8. Always update game stats (latest wire value):
       currentAtBat.gameAB = latestUpdate.batterGameAB ?? currentAtBat.gameAB
       currentAtBat.gameH  = latestUpdate.batterGameH  ?? currentAtBat.gameH
       currentAtBat.gameR  = latestUpdate.batterGameR  ?? currentAtBat.gameR
       currentAtBat.gameRBI = latestUpdate.batterGameRBI ?? currentAtBat.gameRBI

  9. If isLastPitch:
       currentAtBat.result = latestUpdate.playResult   // e.g. "HomeRun", "Strikeout"
       currentAtBat.finalCount = pitchEntry.count
```

---

## 2. SVG Coordinate Transform

Used by `ZoneDiagram` to map real-world pitch coordinates to SVG pixels.

### Constants
```
PADDING_PX = 14           // margin inside SVG viewport
PX_RANGE = [-1.5, +1.5]  // ft (approx full spread including balls)
```

### Zone boundaries (from AtBatState or fallback)
```
szTop    = atBat.strikeZoneTop    ?? 3.5   // ft
szBottom = atBat.strikeZoneBottom ?? 1.5   // ft
```

### SVG viewport
```
viewportWidth  = props.width  ?? 200
viewportHeight = props.height ?? 220
plotWidth  = viewportWidth  - 2 * PADDING_PX
plotHeight = viewportHeight - 2 * PADDING_PX
```

### toSvgX(pX)
```
// Catcher's perspective: pX negative = inside to RHB = LEFT in SVG
x_norm = (pX - PX_RANGE[0]) / (PX_RANGE[1] - PX_RANGE[0])   // 0.0 to 1.0
return PADDING_PX + x_norm * plotWidth
```

### toSvgY(pZ)
```
// pZ increases upward; SVG y increases downward → invert
pZ_clamped = max(0, pZ)   // guard against negative values
// Map szBottom → bottom of plot, szTop → top
// Extend 0.5 ft beyond zone in each direction for context
yRange = [szBottom - 0.5, szTop + 0.5]
y_norm = (pZ_clamped - yRange[0]) / (yRange[1] - yRange[0])   // 0.0 to 1.0
return PADDING_PX + (1 - y_norm) * plotHeight   // inverted
```

### Strike zone rectangle in SVG
```
// Zone width: ±0.835 ft from center (17-inch plate / 2 + ball radius)
zoneLeft   = toSvgX(-0.835)
zoneRight  = toSvgX(+0.835)
zoneTop    = toSvgY(szTop)
zoneBottom = toSvgY(szBottom)
```

### 3×3 grid lines
```
// Horizontal thirds
h1 = toSvgY(szBottom + (szTop - szBottom) / 3)
h2 = toSvgY(szBottom + (szTop - szBottom) * 2 / 3)
// Vertical thirds
v1 = toSvgX(-0.835 + (1.67 / 3))
v2 = toSvgX(-0.835 + (1.67 * 2 / 3))
```

---

## 3. `useBatterInfo` — Session Cache

**Signature**: `useBatterInfo(batterId: number | null): { batterInfo: BatterInfo | null; isLoading: boolean }`

**Cache**: Module-level `Map<number, BatterInfo>` (singleton per page load, survives component remounts). Not a ref — defined at module scope outside the hook.

**Algorithm**:
```
ON each batterId change:
  1. If batterId is null → return { batterInfo: null, isLoading: false }
  2. Check module cache: cache.get(batterId)
  3. Cache HIT → return { batterInfo: cached, isLoading: false }
  4. Cache MISS:
       setIsLoading(true)
       fetch GET /players/{batterId}/overview
       on success:
         extract BatterInfo from BatterOverviewDto
         cache.set(batterId, batterInfo)
         setBatterInfo(batterInfo)
         setIsLoading(false)
       on error:
         setIsLoading(false)
         batterInfo remains null
```

**BatterOverviewDto → BatterInfo mapping**:
```
mlbId        ← batterId (param)
name         ← dto.fullName
jerseyNumber ← dto.jerseyNumber ?? ""
position     ← dto.position ?? ""
teamAbbr     ← dto.teamAbbr ?? ""
avg          ← dto.headline.battingAverage
obp          ← dto.headline.onBasePercentage
slg          ← dto.headline.sluggingPercentage
```

---

## 4. `pitchColors.ts` — Color Mapping

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

const FALLBACK_COLOR = "#a0aec0";   // gray for unknown codes

getPitchColor(code: string): string
  → PITCH_COLORS[code.toUpperCase()] ?? FALLBACK_COLOR

getPitchColorMuted(code: string): string
  → apply 15% opacity to the full color (for table row background tints)
  → implementation: hex color + "26" suffix (hex for 15% alpha) as CSS rgba or hex8
```

---

## 5. GameTimeline Anchor ID Protocol

`GameTimeline` resolves jump targets by querying `#${CSS.escape(targetId)}` inside `.live-feed-list`.

**IDs the new feed must render** (from `playIds.ts`):

| ID format | When rendered | Where |
|---|---|---|
| `inning-{renderKey}` | First at-bat in each new inning | Inning group header `<div>` |
| `batter-{renderKey}` | Every at-bat | `AtBatBlock` header container `<div>` |

Where `renderKey = playKey ?? ts-overallIndex` of the **first pitch** of the at-bat.

`AtBatState.firstPitchRenderKey` stores this value. The rendered output must be:
```jsx
// Inning header (only when atBat.isFirstInInning === true)
<div id={getInningAnchorIdFromKey(atBat.firstPitchRenderKey)} ...>
  ▲{inning} / ▼{inning}
</div>

// Batter header (every AtBatBlock)
<div id={getBatterAnchorIdFromKey(atBat.firstPitchRenderKey)} ...>
  {batterName}
</div>
```
