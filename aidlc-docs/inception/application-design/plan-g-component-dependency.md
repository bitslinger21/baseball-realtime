# Plan G — Component Dependencies

## Dependency Graph

```
GamePage
  ├── useRealtimeGame (existing)        → emits PlayUpdateWire events
  ├── useAtBatHistory(latestUpdate)     → { currentAtBat, completedAtBats }
  │
  ├── AtBatBlock (× N completed)
  │   ├── useBatterInfo(batterId)       → { batterInfo, isLoading }
  │   └── AtBatCard
  │       ├── ZoneDiagram
  │       │   └── pitchColors.ts
  │       ├── BatterInfoPanel
  │       └── PitchLogTable
  │           └── pitchColors.ts
  │
  └── AtBatBlock (current, isActive=true)
      ├── useBatterInfo(batterId)
      └── AtBatCard
          ├── ZoneDiagram
          │   └── pitchColors.ts
          ├── BatterInfoPanel
          └── PitchLogTable
              └── pitchColors.ts
```

---

## Data Flow

```
MLB Live Feed
  └── poller.service.ts
        ├── extracts: pitchX, pitchZ, szTop, szBottom (pitchData.coordinates)
        ├── extracts: batterGameAB/H/R/RBI (boxscore player map)
        └── emits enriched PlayUpdateWire via WebSocket

Client WebSocket
  └── useRealtimeGame → latestUpdate: PlayUpdateWire | null
        └── useAtBatHistory(latestUpdate)
              ├── currentAtBat: AtBatState
              └── completedAtBats: AtBatState[]

AtBatBlock (active)
  ├── atBat = currentAtBat
  └── useBatterInfo(currentAtBat.batterId)
        └── GET /players/:id/overview  (lazy, once per batter)

ZoneDiagram
  └── maps atBat.pitches[].pitchX/pitchZ → SVG pixel coords
  └── uses atBat.strikeZoneTop/Bottom for zone height

PitchLogTable + ZoneDiagram
  └── getPitchColor(pitch.pitchTypeCode) from pitchColors.ts
```

---

## Dependency Matrix

| Component | Depends On | Provides To |
|---|---|---|
| `GamePage` | `useRealtimeGame`, `useAtBatHistory` | `AtBatBlock` props |
| `useAtBatHistory` | `PlayUpdateWire` (input) | `currentAtBat`, `completedAtBats` |
| `AtBatBlock` | `AtBatState`, `useBatterInfo` | `AtBatCard` props |
| `useBatterInfo` | `GET /players/:id/overview` | `BatterInfo`, `isLoading` |
| `AtBatCard` | `AtBatState`, `BatterInfo` | layout, passes to sub-components |
| `ZoneDiagram` | `PitchEntry[]`, `pitchColors.ts` | SVG zone render |
| `BatterInfoPanel` | `BatterInfo`, `AtBatState` (game stats) | batter display |
| `PitchLogTable` | `PitchEntry[]`, `pitchColors.ts` | pitch log table |
| `pitchColors.ts` | — | `ZoneDiagram`, `PitchLogTable` |
| `poller.service.ts` | MLB live feed `pitchData` + boxscore | enriched `PlayUpdateWire` |

---

## Cross-Package Boundary

```
api/  ──── WebSocket (PlayUpdateWire) ────  client/
           8 new optional fields
           (pitchX, pitchZ, szTop, szBottom,
            batterGameAB, batterGameH, batterGameR, batterGameRBI)

           SDK version bump required
           (spec:check → spec:gen → client:build → client:publish → install)
```

---

## New Files Summary

| File | Package | Type |
|---|---|---|
| `components/AtBatCard/AtBatBlock.tsx` | client | Component |
| `components/AtBatCard/AtBatCard.tsx` | client | Component |
| `components/AtBatCard/ZoneDiagram.tsx` | client | Component |
| `components/AtBatCard/BatterInfoPanel.tsx` | client | Component |
| `components/AtBatCard/PitchLogTable.tsx` | client | Component |
| `components/AtBatCard/atBatTypes.ts` | client | Types |
| `hooks/useAtBatHistory.ts` | client | Hook |
| `hooks/useBatterInfo.ts` | client | Hook |
| `utils/pitchColors.ts` | client | Utility |
| `realtime/realtime.types.ts` | api | Modified |
| `poller/poller.service.ts` | api | Modified |
