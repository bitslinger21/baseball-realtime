# U26 — Frontend Components

## Component Hierarchy

```
GamePage
  ├── [existing: LiveScoreboard, BoxScorePanel, GameTimeline, AlertHistoryDrawer]
  ├── useAtBatHistory(latestUpdate)  ← NEW hook
  └── <ul className="live-feed-list">
        ├── AtBatBlock [× completedAtBats, collapsed]
        │     └── AtBatCard (when expanded)
        │           ├── ZoneDiagram
        │           ├── BatterInfoPanel
        │           └── PitchLogTable
        └── AtBatBlock [currentAtBat, always expanded]
              └── AtBatCard
                    ├── ZoneDiagram
                    ├── BatterInfoPanel  ← useBatterInfo (inside AtBatBlock)
                    └── PitchLogTable
```

---

## API Amendment (included in U26 scope — small api/ change)

Before client work, add `pitchTypeCode` to the wire pipeline:
- `api/src/poller/poller.processor.ts` — `PlayUpdateWire.pitchTypeCode?: string`
- `api/src/poller/poller.service.ts` — extract `framePitch?.details?.type?.code`; add to `LiveUpdate` type and `buildPlayUpdate()` return
- `api/src/realtime/realtime.gateway.ts` — pass `pitchTypeCode: u.pitchTypeCode` in `toPlayWire()`
- `client/src/realtime/types.ts` — `PlayUpdate.pitchTypeCode?: string`

---

## `GamePage.tsx` Changes

### Additions
```typescript
// New imports
import { useAtBatHistory } from "../hooks/useAtBatHistory";
import { AtBatBlock } from "../components/AtBatCard/AtBatBlock";
import { getBatterAnchorIdFromKey, getInningAnchorIdFromKey } from "../realtime/playIds";

// New state — expansion control for completed at-bats
const [expandedAtBats, setExpandedAtBats] = useState<ReadonlySet<number>>(() => new Set());

// New hook call (alongside existing hooks)
const { currentAtBat, completedAtBats } = useAtBatHistory(
  hasUpdates ? replayUpdates[replayUpdates.length - 1] : null
);

// Toggle handler for completed at-bat blocks
function toggleAtBat(atBatIndex: number): void {
  setExpandedAtBats((prev) => {
    const next = new Set(prev);
    if (next.has(atBatIndex)) next.delete(atBatIndex);
    else next.add(atBatIndex);
    return next;
  });
}
```

### Replacement — feed body (replaces `<PitchByPitchFeed updates={replayUpdates} />`)
```tsx
{!hasUpdates ? (
  <p className="live-feed-message">Waiting for updates…</p>
) : (
  <ul className="live-feed-list">
    {completedAtBats.map((atBat) => (
      <AtBatBlock
        key={atBat.atBatIndex}
        atBat={atBat}
        isActive={false}
        isExpanded={expandedAtBats.has(atBat.atBatIndex)}
        onToggle={() => toggleAtBat(atBat.atBatIndex)}
      />
    ))}
    {currentAtBat != null && (
      <AtBatBlock
        key={currentAtBat.atBatIndex}
        atBat={currentAtBat}
        isActive={true}
      />
    )}
  </ul>
)}
```

### `expandedAtBats` reset
Add `setExpandedAtBats(new Set())` to the `useEffect` that resets state on `gameId` change (alongside `setReplayCount(0)` etc.).

---

## `AtBatBlock`

**File**: `client/src/components/AtBatCard/AtBatBlock.tsx`

**Props**:
```typescript
interface AtBatBlockProps {
  atBat: AtBatState;
  isActive: boolean;        // true = current at-bat, always expanded, no toggle
  isExpanded?: boolean;     // controlled by GamePage for completed at-bats
  onToggle?: () => void;
}
```

**Layout**:
```
<li className="atbat-block [is-active|is-collapsed|is-expanded]">

  // Header row — always visible
  <div
    id={getBatterAnchorIdFromKey(atBat.firstPitchRenderKey)}
    className="atbat-header"
    onClick={isActive ? undefined : onToggle}
    role={isActive ? undefined : "button"}
  >
    // Inning label (only when atBat.isFirstInInning === true)
    {atBat.isFirstInInning && (
      <div
        id={getInningAnchorIdFromKey(atBat.firstPitchRenderKey)}
        className="atbat-inning-label"
      >
        {atBat.half === "top" ? "▲" : "▼"}{atBat.inning}
      </div>
    )}

    <span className="atbat-batter-name">{atBat.batterName}</span>

    // Result chip (completed only)
    {atBat.result != null && (
      <span className="atbat-result-chip">{atBat.result}</span>
    )}

    // Final count (completed only)
    {atBat.finalCount != null && (
      <span className="atbat-final-count">{atBat.finalCount}</span>
    )}

    // Expand/collapse indicator (completed only)
    {!isActive && (
      <span className="atbat-toggle-indicator" aria-hidden="true">
        {isExpanded ? "▼" : "▶"}
      </span>
    )}
  </div>

  // Card body — expanded only
  {(isActive || isExpanded) && (
    <AtBatCard atBat={atBat} />
  )}

</li>
```

**`useBatterInfo` call** — inside `AtBatBlock`:
```typescript
const { batterInfo, isLoading } = useBatterInfo(atBat.batterId);
// Pass to AtBatCard → BatterInfoPanel
```

---

## `AtBatCard`

**File**: `client/src/components/AtBatCard/AtBatCard.tsx`

**Props**:
```typescript
interface AtBatCardProps {
  atBat: AtBatState;
  batterInfo: BatterInfo | null;
  isBatterInfoLoading: boolean;
}
```

**Layout** (Modified Landscape):
```
<div className="atbat-card">
  <div className="atbat-card-top">
    <ZoneDiagram
      pitches={atBat.pitches}
      strikeZoneTop={atBat.strikeZoneTop}
      strikeZoneBottom={atBat.strikeZoneBottom}
    />
    <BatterInfoPanel
      atBat={atBat}
      batterInfo={batterInfo}
      isLoading={isBatterInfoLoading}
    />
  </div>
  <PitchLogTable pitches={atBat.pitches} />
</div>
```

CSS: `.atbat-card-top` uses `display: flex; flex-direction: row` with `ZoneDiagram` fixed width (~200px) and `BatterInfoPanel` flex-growing.

---

## `ZoneDiagram`

**File**: `client/src/components/AtBatCard/ZoneDiagram.tsx`

**Props**:
```typescript
interface ZoneDiagramProps {
  pitches: PitchEntry[];
  strikeZoneTop?: number;
  strikeZoneBottom?: number;
  width?: number;    // default 200
  height?: number;   // default 220
}
```

**SVG structure**:
```svg
<svg viewBox="0 0 {width} {height}" width={width} height={height}>

  <!-- Background -->
  <rect x={0} y={0} width={width} height={height} fill="#f7fafc" />

  <!-- Ball zone (entire SVG background) is implicit -->

  <!-- Strike zone rectangle -->
  <rect
    x={toSvgX(-0.835)} y={toSvgY(szTop)}
    width={toSvgX(0.835) - toSvgX(-0.835)}
    height={toSvgY(szBottom) - toSvgY(szTop)}
    fill="none" stroke="#718096" strokeWidth={1.5}
  />

  <!-- 3×3 grid lines (inside zone only) -->
  <line x1={v1} y1={toSvgY(szTop)} x2={v1} y2={toSvgY(szBottom)} stroke="#cbd5e0" strokeWidth={0.75} />
  <line x1={v2} y1={toSvgY(szTop)} x2={v2} y2={toSvgY(szBottom)} stroke="#cbd5e0" strokeWidth={0.75} />
  <line x1={toSvgX(-0.835)} y1={h1} x2={toSvgX(0.835)} y2={h1} stroke="#cbd5e0" strokeWidth={0.75} />
  <line x1={toSvgX(-0.835)} y1={h2} x2={toSvgX(0.835)} y2={h2} stroke="#cbd5e0" strokeWidth={0.75} />

  <!-- Home plate indicator (bottom center) -->
  <polygon
    points="..."   // pentagon shape centered at toSvgX(0), near bottom
    fill="#e2e8f0" stroke="#a0aec0" strokeWidth={1}
  />

  <!-- Pitch dots (only where pitchX and pitchZ are non-null) -->
  {pitches
    .filter(p => p.pitchX != null && p.pitchZ != null)
    .map(p => (
      <g key={p.seq}>
        <circle
          cx={toSvgX(p.pitchX!)}
          cy={toSvgY(p.pitchZ!)}
          r={9}
          fill={getPitchColor(p.pitchTypeCode)}
          stroke={p.isLastPitch ? "#1a202c" : "white"}
          strokeWidth={p.isLastPitch ? 2 : 1}
        />
        <text
          x={toSvgX(p.pitchX!)}
          y={toSvgY(p.pitchZ!) + 4}
          textAnchor="middle"
          fontSize={9}
          fill="white"
          fontWeight="bold"
        >
          {p.seq}
        </text>
      </g>
    ))
  }
</svg>
```

---

## `BatterInfoPanel`

**File**: `client/src/components/AtBatCard/BatterInfoPanel.tsx`

**Props**:
```typescript
interface BatterInfoPanelProps {
  atBat: AtBatState;
  batterInfo: BatterInfo | null;
  isLoading: boolean;
}
```

**Layout**:
```
<div className="batter-info-panel">

  <!-- Headshot -->
  <img
    src={`https://img.mlbstatic.com/.../people/${atBat.batterId}/headshot/67/current`}
    onError={(e) => { e.currentTarget.src = GENERIC_HEADSHOT_URL; }}
    className="batter-headshot"
    alt={batterInfo?.name ?? "Batter"}
  />

  <!-- Bio -->
  <div className="batter-bio">
    <span className="batter-name">{batterInfo?.name ?? atBat.batterName}</span>
    <span className="batter-details">
      #{batterInfo?.jerseyNumber} · {batterInfo?.position} · {batterInfo?.teamAbbr}
    </span>
  </div>

  <!-- Season slash line (loading state: show dashes) -->
  <div className="batter-slash">
    {isLoading ? "—/—/—" : `${batterInfo?.avg ?? "—"}/${batterInfo?.obp ?? "—"}/${batterInfo?.slg ?? "—"}`}
  </div>

  <!-- Today's game stats -->
  <div className="batter-game-stats">
    <span>{atBat.gameAB != null ? `${atBat.gameH ?? 0}-for-${atBat.gameAB}` : "—"}</span>
    {atBat.gameR   != null && atBat.gameR   > 0 && <span>{atBat.gameR}R</span>}
    {atBat.gameRBI != null && atBat.gameRBI > 0 && <span>{atBat.gameRBI}RBI</span>}
  </div>

</div>
```

---

## `PitchLogTable`

**File**: `client/src/components/AtBatCard/PitchLogTable.tsx`

**Props**:
```typescript
interface PitchLogTableProps {
  pitches: PitchEntry[];
}
```

**Layout**:
```
<table className="pitch-log-table">
  <thead>
    <tr>
      <th>#</th><th>TYPE</th><th>RESULT</th><th>MPH</th><th>COUNT</th>
    </tr>
  </thead>
  <tbody>
    {pitches.map(p => (
      <tr
        key={p.seq}
        style={{ backgroundColor: getPitchColorMuted(p.pitchTypeCode) }}
        className={p.isLastPitch ? "pitch-log-row--final" : ""}
      >
        <td>{p.seq}</td>
        <td>
          <span
            className="pitch-type-dot"
            style={{ backgroundColor: getPitchColor(p.pitchTypeCode) }}
          />
          {p.pitchTypeName}
        </td>
        <td>
          {p.isLastPitch
            ? <strong className="pitch-result-badge">{p.result}</strong>
            : p.result
          }
        </td>
        <td>{p.speedMph != null ? p.speedMph.toFixed(1) : "—"}</td>
        <td>{p.count}</td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## `useAtBatHistory`

**File**: `client/src/hooks/useAtBatHistory.ts`

**State** (via `useReducer` or `useRef` + `useState`):
- Use `useRef` for the mutable `AtBatHistoryState` (avoids stale closure issues with the counter)
- Use `useState` for the return values `{ currentAtBat, completedAtBats }` to trigger re-renders

**Effect**:
```typescript
useEffect(() => {
  if (latestUpdate == null) return;
  // Run the state machine (see business-logic-model.md)
  // Update historyRef.current
  // setCurrentAtBat / setCompletedAtBats to trigger render
}, [latestUpdate]);
```

---

## `useBatterInfo`

**File**: `client/src/hooks/useBatterInfo.ts`

**Module-level cache**:
```typescript
const batterInfoCache = new Map<number, BatterInfo>();
```

**State**: `useState<BatterInfo | null>(null)` + `useState<boolean>(false)` for isLoading

**Effect**:
```typescript
useEffect(() => {
  if (batterId == null) return;

  const cached = batterInfoCache.get(batterId);
  if (cached != null) {
    setBatterInfo(cached);
    return;
  }

  setIsLoading(true);
  playersApi.playersGetBatterOverview(batterId)
    .then(resp => {
      const info = mapDtoToBatterInfo(batterId, resp.data);
      batterInfoCache.set(batterId, info);
      setBatterInfo(info);
    })
    .catch(() => { /* leave batterInfo null */ })
    .finally(() => setIsLoading(false));
}, [batterId]);
```

---

## Files to Delete

- `client/src/pages/PitchByPitchFeed.tsx`
- `client/src/pages/PitchByPitchFeed.css`
- Check `client/src/realtime/pitchFeedModel.ts` — delete if no longer imported after `PitchByPitchFeed` removal

## Files to Retain

- `client/src/realtime/playIds.ts` — used by new AtBatBlock for anchor IDs
- `client/src/components/GameTimeline.tsx` — unchanged
