# Services

Service layer definitions, responsibilities, and orchestration patterns for new functionality.

---

## New Services

### StandingsService
**Module**: `StandingsModule` (new)  
**File**: `api/src/standings/standings.service.ts`

**Responsibilities**:
1. Call MLB Stats API standings endpoint with `leagueId=103,104` (AL + NL) and the requested season
2. Flatten the nested `records[].division + records[].teamRecords[]` structure into a flat array
3. For each team, call `TeamsMetaService.getByAbbr(abbreviation)` to attach logo and colors
4. Return `StandingTeamDto[]` — the client groups by league and division

**Orchestration pattern**: Linear pipeline (fetch → flatten → enrich). No parallelism needed; `TeamsMetaService` is in-memory so enrichment is synchronous.

**Error handling**: If MLB API is unreachable, propagate a 502 upstream. If a team abbreviation isn't found in `TeamsMetaService` (e.g. edge case abbreviation mismatch), include the row with `logo: null` rather than dropping it.

**Injected services**:
- `MlbService` — for the MLB Stats API call
- `TeamsMetaService` — for in-memory branding lookup

---

## Modified Services

### PlayersService (Unit 8 + Unit 9 additions)
**Module**: `PlayersModule` (existing)  
**File**: `api/src/players/players.service.ts`

#### Today enrichment (Unit 8)

**New orchestration** in `getBatterOverview()`:

```
getPlayer(mlbId)              ← already called
    └─ currentTeam.id
         └─ getScheduleByDate(today)   ← MlbService (Q6=B: scan all games)
              └─ find game where home/away team matches currentTeam.id
                   └─ if game found (Live or Final):
                        └─ getLiveFeed(gamePk)
                             └─ extract batter boxscore line for mlbId
                                  └─ populate BatterOverviewTodayDto
```

**No game found** (off-day or no data): return `today: null`. The existing `BatterOverviewPanel` already handles a null today gracefully with "No current game data."

**Injected services** (no new injections needed — `MlbService` already injected):
- `MlbService` — `getScheduleByDate()` and `getLiveFeed()` are already present

#### Splits (Unit 9)

**New method** `getPlayerSplits(mlbId, season)` orchestration:

```
MLB Stats API: GET /v1/people/{mlbId}/stats
  ?stats=statSplits&group=hitting&sportId=1&season=YYYY
       └─ filter to 6 split codes: vl, vr, hm, aw, d, n
            └─ map each to PlayerSplitsDto
                 └─ return PlayerSplitsDto[]
```

**Split code filter**: Only the 6 codes are returned. Any split types not matching the whitelist are discarded. If a split is missing (e.g. player hasn't played a day game), that row is omitted from the response rather than returned with zeroes.

---

## Service Module Registration

### StandingsModule (new)

```typescript
@Module({
  imports: [MlbModule, TeamsMetaModule],
  controllers: [StandingsController],
  providers: [StandingsService],
})
export class StandingsModule {}
```

`StandingsModule` is imported into `AppModule`.

### PlayersModule (existing — no structural change)

No new imports needed. `MlbService` is already available. The new `getPlayerSplits()` method and `getBatterOverview()` enrichment are additive changes inside the existing service class.

---

## MlbService — Existing Calls Used (reference)

| Method | Used By | Notes |
|---|---|---|
| `getScheduleByDate(date)` | `PlayersService.resolveTodayStats()` | Already exists; returns full schedule for a date |
| `getLiveFeed(gamePk)` | `PlayersService.extractBatterLine()` | Already exists; returns full live feed |
| New: `getStandings(season)` | `StandingsService.fetchStandingsFromMlb()` | New method to add to `MlbService` — calls `/api/v1/standings` |
| New: `getPlayerSplitStats(mlbId, season)` | `PlayersService.getPlayerSplits()` | New method — calls `/api/v1/people/{id}/stats?stats=statSplits` |
