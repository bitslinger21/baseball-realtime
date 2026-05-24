# Plan G — Services & Utilities

## Client Hooks

### `useAtBatHistory` — At-Bat State Manager
**File**: `client/src/hooks/useAtBatHistory.ts`
**Pattern**: Pure React hook consuming a `PlayUpdateWire | null` prop

**Role**: Single source of truth for the at-bat feed. Maintains current at-bat being built and the list of completed at-bats for the game session. Handles all at-bat boundary detection and pitch accumulation internally so `GamePage` has no at-bat logic.

**Data flow**:
```
WebSocket event (PlayUpdateWire)
  → GamePage receives via useRealtimeGame
  → passes latestUpdate to useAtBatHistory
  → hook detects batterId change → archives current → opens new
  → hook appends pitch to currentAtBat.pitches
  → returns { currentAtBat, completedAtBats }
  → GamePage renders AtBatBlock list
```

**At-bat boundary detection rules**:
- New `batterId` !== current `currentAtBat.batterId` → new at-bat
- Initial update with no current at-bat → initialize first at-bat
- Completed at-bats stored in order (oldest index 0, newest last)

---

### `useBatterInfo` — Batter Overview Fetcher
**File**: `client/src/hooks/useBatterInfo.ts`
**Pattern**: React hook with internal session cache

**Role**: Lazy-fetches batter biographical and season stats from the existing `/players/:id/overview` endpoint when a new batterId appears. Caches per-session so each batter is fetched at most once per page load.

**Data flow**:
```
AtBatBlock receives batterId from AtBatState
  → calls useBatterInfo(batterId)
  → hook checks cache (Map<number, BatterInfo>)
  → cache miss: fetch GET /players/:id/overview
  → extract name, jerseyNumber, position, teamAbbr, avg, obp, slg
  → store in cache, return BatterInfo
  → BatterInfoPanel renders with full data
```

---

## API Service Additions

### `getBatterGameStats` — Boxscore Lookup Helper
**File**: `api/src/poller/poller.service.ts` (internal helper)

**Role**: Given the full live game state and a batter's MLB ID, locates the batter in the live boxscore (home or away team player map) and returns their current game batting stats.

**Data flow**:
```
poller.service.ts: buildPlayUpdate()
  → already has liveData (full MLB live feed response)
  → already has batterId
  → calls getBatterGameStats(liveData, batterId)
    → checks liveData.liveData.boxscore.teams.home.players["ID{id}"]
    → checks liveData.liveData.boxscore.teams.away.players["ID{id}"]
    → returns { atBats, hits, runs, rbi } or undefined
  → fields included in PlayUpdateWire as batterGameAB/H/R/RBI
```

---

## Utility

### `pitchColors.ts`
**File**: `client/src/utils/pitchColors.ts`

**Role**: Shared pitch type → color mapping. Consumed by both `ZoneDiagram` (dot fill) and `PitchLogTable` (row background tint). Keeping it shared ensures the two views are always visually consistent.

**Exports**: `getPitchColor(code)`, `getPitchColorMuted(code)`, `PITCH_COLORS` constant map.

---

## No New API Endpoints

Plan G requires no new REST endpoints. All data flows through:
1. Enriched WebSocket `play-update` events (new fields in `PlayUpdateWire`)
2. Existing `GET /players/:id/overview` endpoint (reused for batter info)
