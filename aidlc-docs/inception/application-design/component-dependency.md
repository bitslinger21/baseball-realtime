# Component Dependencies

---

## Backend Dependency Matrix

| Component | Depends On | Communication |
|---|---|---|
| `StandingsController` | `StandingsService` | Direct injection (NestJS DI) |
| `StandingsService` | `MlbService` | Direct injection — HTTP call to MLB API |
| `StandingsService` | `TeamsMetaService` | Direct injection — in-memory synchronous lookup |
| `PlayersService` (existing) | `MlbService` | Direct injection — HTTP call (already exists) |
| `PlayersController` (existing) | `PlayersService` | Direct injection (already exists) |

### New module imports required

| Module | Imports Added |
|---|---|
| `StandingsModule` (new) | `MlbModule`, `TeamsMetaModule` |
| `AppModule` (existing) | `StandingsModule` |
| `PlayersModule` (existing) | No change — `MlbModule` already imported |

### New methods added to MlbService

| Method | Called By |
|---|---|
| `getStandings(season)` | `StandingsService` |
| `getPlayerSplitStats(mlbId, season)` | `PlayersService` |

---

## Frontend Dependency Map

```
GamePage
  └─ AlertHistoryPanel          (new component, rendered as sibling of alerts strip)
       └─ baseballApiClient.getAlerts(gameId)

StandingsPage (replacement)
  └─ baseballApiClient.getStandings()    (new SDK method)

PlayerPage (existing)
  └─ SplitsTable                (new sub-component, rendered in Splits tab)
       └─ baseballApiClient.getPlayerSplits(mlbId, season)  (new SDK method)

BatterOverviewPanel (existing — no structural change)
  └─ already renders today field; receives enriched value from API
```

### New baseballApiClient methods required

| Method | Endpoint | Used By |
|---|---|---|
| `getStandings(season?)` | `GET /standings?season=YYYY` | `StandingsPage` |
| `getPlayerSplits(mlbId, season?)` | `GET /players/:id/splits?season=YYYY` | `PlayerPage` Splits tab |
| `getAlerts(gameId)` | `GET /alerts?gameId=:id` | `AlertHistoryPanel` (endpoint already exists) |

---

## Data Flow Diagrams

### Standings page load

```
Browser
  → GET /standings
    → StandingsController
      → StandingsService.getStandings(year)
        → MlbService.getStandings(year)         [HTTP: MLB Stats API]
        ← MlbStandingsResponse
        → TeamsMetaService.getByAbbr(abbr)      [in-memory, per team]
        ← TeamMeta
      ← StandingTeamDto[]
    ← 200 StandingTeamDto[]
  ← Render: group by leagueName/divisionName → two-column table
```

### Player splits tab activation

```
User clicks Splits tab
  → GET /players/:id/splits?season=YYYY
    → PlayersController.getPlayerSplits()
      → PlayersService.getPlayerSplits(mlbId, season)
        → MlbService.getPlayerSplitStats(mlbId, season)  [HTTP: MLB Stats API]
        ← raw splits array
        → filter to [vl, vr, hm, aw, d, n]
        → map to PlayerSplitsDto[]
      ← PlayerSplitsDto[]
    ← 200 PlayerSplitsDto[]
  ← Render: SplitsTable (6 rows × 8 columns)
```

### Player today enrichment

```
GET /players/:id/overview (existing endpoint)
  → PlayersService.getBatterOverview(mlbId)
    → MlbService.getPlayer(mlbId)                        [existing]
    ← player (includes currentTeam.id)
    → MlbService.getScheduleByDate(today)                [existing method]
    ← all today's games
    → scan: find game where homeTeam.id or awayTeam.id === currentTeam.id
    → if found: MlbService.getLiveFeed(gamePk)           [existing]
    ← live feed
    → extract batter boxscore line for mlbId
    ← BatterOverviewTodayDto | null
  ← BatterOverviewDto (today field now populated)
```

### Alert history drawer open

```
User clicks "Alert History" button in GamePage
  → AlertHistoryPanel: isOpen = true (first time)
    → GET /alerts?gameId=:providerGameId               [existing endpoint]
    ← AlertDto[]
  ← Render: slide-in drawer with chronological alert list
  (subsequent open/close: no re-fetch, uses cached state)
```

---

## Coupling Summary

| Coupling | Nature | Risk |
|---|---|---|
| `StandingsService` ↔ `TeamsMetaService` | Read-only in-memory lookup | Low — TeamsMetaService is already a stable singleton |
| `PlayersService` ↔ `MlbService` | New method calls on existing dependency | Low — additive, no interface changes |
| `AlertHistoryPanel` ↔ `GET /alerts` | REST call to existing endpoint | Low — endpoint already exists and is stable |
| `StandingsPage` ↔ `GET /standings` | New endpoint, single consumer | Low — endpoint is new and purpose-built |
