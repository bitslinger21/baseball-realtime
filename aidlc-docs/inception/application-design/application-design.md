# Application Design

Consolidated design for new components introduced by Units 7–10.  
Units 1–6 are changes within existing component boundaries and require no application design.

---

## Design Decisions Summary

| Q | Topic | Decision |
|---|---|---|
| Q1 | Standings branding | Server-side enrichment — `StandingsController` returns logo/colors in `StandingTeamDto` |
| Q2 | Division grouping | Client-side — flat array with `divisionName`; `StandingsPage` groups on render |
| Q3 | StandingsPage layout | Side-by-side: AL left column, NL right column |
| Q4 | Split categories | 6 splits: vs LHP, vs RHP, Home, Away, Day, Night |
| Q5 | Split stat columns | Extended: AVG / OBP / SLG / OPS / HR / RBI / PA |
| Q6 | Today team lookup | Scan all of today's games; match `homeTeam.id` or `awayTeam.id` to `currentTeam.id` |
| Q7 | AlertHistoryPanel style | Slide-in drawer (right side) |
| Q8 | Alert history fetch | On first drawer open (lazy) |
| Q9 | Alert live updates | Static snapshot — no WebSocket merge |
| Q10 | Standings season param | `GET /standings?season=YYYY`; defaults to current year |

---

## New Components

### Backend

#### `StandingsModule` (Unit 7)
New NestJS module at `api/src/standings/`.

**`StandingsController`**
- `GET /standings?season=YYYY` → `StandingTeamDto[]`
- Season defaults to current year via `DefaultValuePipe`

**`StandingsService`**
- Fetches `/api/v1/standings?leagueId=103,104&season=YYYY&standingsTypes=regularSeason`
- Flattens records → enriches each team with `TeamsMetaService.getByAbbr()`
- Returns flat `StandingTeamDto[]`
- Missing branding: include row with `logo: null` (don't drop)

**`StandingTeamDto`**
Fields: `leagueName`, `divisionName`, `divisionRank`, `teamName`, `abbreviation`, `wins`, `losses`, `winningPercentage`, `gamesBack`, `lastTen`, `streak`, `logo`, `primaryColor`, `secondaryColor`

**Module imports**: `MlbModule`, `TeamsMetaModule`  
**Registered in**: `AppModule`

---

#### `PlayersService` additions (Units 8 + 9)
No new module. Additive changes to existing `PlayersModule`.

**Unit 8 — Today enrichment** in `getBatterOverview()`:
1. Use `player.currentTeam.id` from the existing player fetch
2. Call `MlbService.getScheduleByDate(today)` — scan all games for team match
3. If live/final game found: call `MlbService.getLiveFeed(gamePk)` → extract batter boxscore line
4. Return `BatterOverviewTodayDto | null` in the `today` field

**Unit 9 — Splits** as new method `getPlayerSplits(mlbId, season)`:
1. Call `MlbService.getPlayerSplitStats(mlbId, season)` (new MlbService method)
2. Filter to split codes: `vl`, `vr`, `hm`, `aw`, `d`, `n`
3. Map to `PlayerSplitsDto[]` (missing splits → omit row)

**`PlayerSplitsDto`**
Fields: `splitType`, `splitCode`, `avg`, `obp`, `slg`, `ops`, `homeRuns`, `rbi`, `plateAppearances`

**New `PlayersController` endpoint**:
`GET /players/:id/splits?season=YYYY` → `PlayerSplitsDto[]`

---

#### `MlbService` — new methods (Units 7 + 9)
Two new methods added to the existing `MlbService`:
- `getStandings(season: number)` — calls `/api/v1/standings`
- `getPlayerSplitStats(mlbId: number, season: number)` — calls `/api/v1/people/{id}/stats?stats=statSplits`

---

### Frontend

#### `StandingsPage` (Unit 7)
Replaces the current stub at `client/src/pages/StandingsPage.tsx`.
- Fetches `GET /standings` on mount
- Groups `StandingTeamDto[]` by `leagueName` then `divisionName`
- Side-by-side layout: AL (left) | NL (right)
- Each division: sub-table with Rank / Team logo + name / W / L / PCT / GB

#### `AlertHistoryPanel` (Unit 10)
New component at `client/src/components/AlertHistoryPanel.tsx`.
- Slide-in drawer, right side, default closed
- Props: `gameId: string`, `isOpen: boolean`, `onClose: () => void`
- Fetches `GET /alerts?gameId=:gameId` on first open; caches in local state
- Chronological list: timestamp / type chip / note text
- No live WebSocket updates

#### `PlayerPage` — Splits tab (Unit 9)
Content replacement within existing `PlayerPage.tsx`.
- Lazy-fetches `GET /players/:mlbId/splits?season=YYYY` when Splits tab first activated
- Renders `SplitsTable`: 6 rows × 8 columns (Split label + 7 stat columns)
- Loading skeleton while fetching

---

## Dependency Overview

```
AppModule
  └─ StandingsModule (new)
       ├─ MlbModule (existing)
       └─ TeamsMetaModule (existing)

PlayersModule (existing, unchanged structure)
  └─ PlayersService (additive changes)
       └─ MlbService (existing, 2 new methods)

Client
  ├─ StandingsPage → GET /standings (new)
  ├─ PlayerPage → GET /players/:id/splits (new)
  ├─ GamePage
  │    └─ AlertHistoryPanel → GET /alerts?gameId=:id (existing endpoint)
  └─ BatterOverviewPanel → today field (now populated by enriched API response)
```

---

## Files Created / Modified

### New files
| File | Unit |
|---|---|
| `api/src/standings/standings.module.ts` | 7 |
| `api/src/standings/standings.controller.ts` | 7 |
| `api/src/standings/standings.service.ts` | 7 |
| `api/src/standings/dtos/standing-team.dto.ts` | 7 |
| `api/src/players/dtos/player-splits.dto.ts` | 9 |
| `client/src/pages/StandingsPage.tsx` | 7 (replacement) |
| `client/src/components/AlertHistoryPanel.tsx` | 10 |

### Modified files
| File | Unit | Change |
|---|---|---|
| `api/src/app.module.ts` | 7 | Import `StandingsModule` |
| `api/src/mlb/mlb.service.ts` | 7, 9 | Add `getStandings()`, `getPlayerSplitStats()` |
| `api/src/players/players.controller.ts` | 9 | Add `getPlayerSplits()` endpoint |
| `api/src/players/players.service.ts` | 8, 9 | Add `getPlayerSplits()`, enrich today in `getBatterOverview()` |
| `api/src/players/dtos/batter-overview.dto.ts` | 8 | Enrich `BatterOverviewTodayDto` fields |
| `client/src/pages/GamePage.tsx` | 10 | Add `AlertHistoryPanel` trigger button and render |
| `client/src/pages/PlayerPage.tsx` | 9 | Replace Splits tab stub with `SplitsTable` |
| `client/src/api/baseballApiClient.ts` | 7, 9, 10 | Add `getStandings()`, `getPlayerSplits()`, `getAlerts()` |
