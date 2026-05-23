# Components

Scope: new components introduced by Units 7–10 only. Existing components are unchanged unless noted.

---

## Backend Components

### StandingsController
**Unit**: 7  
**Purpose**: Exposes a single REST endpoint for league standings, enriched with team branding.  
**Responsibilities**:
- Accept optional `?season=YYYY` query parameter; default to current year
- Delegate to `StandingsService` and return the enriched flat array
- Declare OpenAPI response type `StandingTeamDto[]`

**Interface**: `GET /standings?season=YYYY` → `StandingTeamDto[]`

---

### StandingsService
**Unit**: 7  
**Purpose**: Fetches division standings from the MLB Stats API and enriches each team row with branding from `TeamsMetaService`.  
**Responsibilities**:
- Call MLB Stats API `/api/v1/standings?leagueId=103,104&season=YYYY&standingsTypes=regularSeason`
- Flatten the nested `records[].teamRecords[]` structure into a `StandingTeamDto[]`
- Enrich each row: resolve team abbreviation → call `TeamsMetaService.getByAbbr()` → attach `logo`, `primaryColor`, `secondaryColor`
- Include `leagueName` (AL / NL), `divisionName`, `divisionRank`, `wins`, `losses`, `winningPercentage`, `gamesBack`

**Interface**: `getStandings(season: number): Promise<StandingTeamDto[]>`  
**Dependencies**: `MlbService`, `TeamsMetaService`

---

### StandingTeamDto
**Unit**: 7  
**Purpose**: Wire type for a single team's standing row. Flat — the client groups by `divisionName`.

| Field | Type | Notes |
|---|---|---|
| `leagueName` | `string` | "American League" or "National League" |
| `divisionName` | `string` | e.g. "AL West" |
| `divisionRank` | `number` | 1-based rank within division |
| `teamName` | `string` | Full team name |
| `abbreviation` | `string` | e.g. "HOU" |
| `wins` | `number` | |
| `losses` | `number` | |
| `winningPercentage` | `string` | e.g. ".625" |
| `gamesBack` | `string` | "-" for first place |
| `lastTen` | `string` | Last 10 games record, e.g. "7-3" — from `splitRecords[type=lastTen]` |
| `streak` | `string` | Current win/loss streak code, e.g. "W3" or "L2" — from `teamRecord.streak.streakCode` |
| `logo` | `string` | URL from TeamsMetaService |
| `primaryColor` | `string` | Hex color |
| `secondaryColor` | `string` | Hex color |

---

### PlayerSplitsDto
**Unit**: 9  
**Purpose**: Wire type for a single batter split row.

| Field | Type | Notes |
|---|---|---|
| `splitType` | `string` | e.g. "vs. Left", "Home" |
| `splitCode` | `string` | e.g. "vl", "hm" |
| `avg` | `string` | Batting average |
| `obp` | `string` | On-base percentage |
| `slg` | `string` | Slugging percentage |
| `ops` | `string` | OPS |
| `homeRuns` | `number` | |
| `rbi` | `number` | |
| `plateAppearances` | `number` | |

---

### BatterOverviewTodayDto (enrichment)
**Unit**: 8  
**Purpose**: Represents a batter's in-game or final stat line for today. Already declared in `batter-overview.dto.ts` as a stub — this enriches the shape.

| Field | Type | Notes |
|---|---|---|
| `gameId` | `string` | Provider game ID |
| `opponent` | `string` | Opposing team abbreviation |
| `plateAppearances` | `number` | All trips to the plate (AB + BB + HBP + SF + SH) |
| `atBats` | `number` | Official at-bats (excludes BB, HBP, SF, SH) |
| `hits` | `number` | |
| `homeRuns` | `number` | |
| `rbi` | `number` | |
| `walks` | `number` | |
| `strikeouts` | `number` | |
| `avg` | `string` | Season avg for context |
| `gameStatus` | `string` | "Live" or "Final" |

---

## Frontend Components

### StandingsPage (replacement)
**Unit**: 7  
**Purpose**: Replaces the existing stub. Displays AL and NL standings side-by-side, each league showing 3 division sub-tables.  
**Responsibilities**:
- Fetch `GET /standings` on mount (no season param → current year default)
- Group the flat `StandingTeamDto[]` by `leagueName` then `divisionName` (client-side grouping, Q2=B)
- Render two columns: AL left, NL right (Q3=A)
- Each division renders as a sub-table: Rank / Team logo + name / W / L / PCT / GB
- Use team `logo`, `primaryColor` from the enriched DTO

---

### AlertHistoryPanel
**Unit**: 10  
**Purpose**: A slide-in drawer (Q7=B) showing all historical alerts for the current game in chronological order.  
**Responsibilities**:
- Render as an overlay drawer (right-side slide-in) triggered by a button on `GamePage`
- Fetch `GET /alerts?gameId=:providerGameId` on first open only (Q8=B)
- Display static snapshot — no live WebSocket updates (Q9=B)
- Each row: timestamp, type chip (reuse existing alert CSS classes), note text
- Closed by default; toggle button opens/closes

**Props**:
- `gameId: string`
- `isOpen: boolean`
- `onClose: () => void`

---

### PlayerPage — Splits Tab (content replacement)
**Unit**: 9  
**Purpose**: Replaces "Splits tab next." stub with a real splits table.  
**Responsibilities**:
- Fetch `GET /players/:mlbId/splits?season=YYYY` when the Splits tab is activated (lazy load)
- Display a table with 6 rows (vs LHP, vs RHP, Home, Away, Day, Night) × 7 columns (Split / AVG / OBP / SLG / OPS / HR / RBI / PA)
- Show a loading state while fetching
