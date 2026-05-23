# Component Methods

Method signatures for all new components. Detailed business logic is deferred to Functional Design (Construction phase, per-unit).

---

## Backend

### StandingsController

```typescript
// GET /standings?season=YYYY
@Get()
getStandings(
  @Query('season', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe)
  season: number,
): Promise<StandingTeamDto[]>
```

---

### StandingsService

```typescript
// Primary entry point called by StandingsController
async getStandings(season: number): Promise<StandingTeamDto[]>

// Internal: calls MLB Stats API standings endpoint
private async fetchStandingsFromMlb(season: number): Promise<MlbStandingsResponse>

// Internal: maps a single teamRecord + division context to StandingTeamDto
private mapTeamRecord(
  teamRecord: MlbTeamRecord,
  divisionName: string,
  leagueName: string,
  branding: TeamMeta | undefined,
): StandingTeamDto
```

---

### PlayersController (new method)

```typescript
// GET /players/:id/splits?season=YYYY
@Get(':id/splits')
getPlayerSplits(
  @Param('id', ParseIntPipe) mlbId: number,
  @Query('season', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe)
  season: number,
): Promise<PlayerSplitsDto[]>
```

---

### PlayersService (new and modified methods)

```typescript
// NEW — returns 6 split rows for the requested player/season
async getPlayerSplits(mlbId: number, season: number): Promise<PlayerSplitsDto[]>

// Internal: filters MLB split response to the 6 desired split codes
private filterSplits(
  splits: MlbStatSplit[],
  codes: string[],  // ['vl','vr','hm','aw','d','n']
): MlbStatSplit[]

// Internal: maps a single MlbStatSplit to PlayerSplitsDto
private mapSplitRow(split: MlbStatSplit): PlayerSplitsDto

// MODIFIED — existing method; today field now populated
async getBatterOverview(mlbId: number): Promise<BatterOverviewDto>

// Internal (new) — resolves today's game stat line for the given player
private async resolveTodayStats(
  player: MlbPlayer,
): Promise<BatterOverviewTodayDto | null>

// Internal — scans today's schedule for the player's team
private async findTodaysGame(
  teamId: number,
): Promise<MlbScheduleGame | null>

// Internal — extracts batter boxscore line from live feed
private extractBatterLine(
  liveFeed: MlbLiveFeed,
  mlbId: number,
): BatterOverviewTodayDto | null
```

---

## Frontend

### StandingsPage

```typescript
// Component — no props (uses router, fetches on mount)
function StandingsPage(): JSX.Element

// Internal hook
function useStandings(): {
  rows: StandingTeamDto[];
  loading: boolean;
  error: string | null;
}

// Internal utility — groups flat rows into AL/NL → division map
function groupByLeagueAndDivision(
  rows: StandingTeamDto[],
): Record<'American League' | 'National League', Record<string, StandingTeamDto[]>>
```

---

### AlertHistoryPanel

```typescript
// Component
function AlertHistoryPanel(props: {
  gameId: string;
  isOpen: boolean;
  onClose: () => void;
}): JSX.Element

// Internal hook — fetches on first open, caches in local state
function useAlertHistory(gameId: string, triggered: boolean): {
  alerts: AlertDto[];
  loading: boolean;
  error: string | null;
}
```

---

### PlayerPage — Splits tab

```typescript
// Internal hook inside PlayerPage (or extracted to useSplits.ts)
function usePlayerSplits(mlbId: number, active: boolean): {
  splits: PlayerSplitsDto[];
  loading: boolean;
  error: string | null;
}

// Internal sub-component rendered in the Splits tab panel
function SplitsTable(props: { splits: PlayerSplitsDto[] }): JSX.Element
```
