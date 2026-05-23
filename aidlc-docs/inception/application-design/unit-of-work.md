# Unit of Work

## Configuration

| Setting | Value |
|---|---|
| Branch naming | `unit/<N>-<slug>` (e.g. `unit/1-code-cleanup`) |
| Within-wave parallelism | Allowed — branches base off `main` independently |
| Merge strategy | Merge commit (preserves intra-unit commit history) |
| U6 disposition | Standalone verification branch (Q1=B) |

---

## Units

### Unit 1 — Production Code Cleanup
**Branch**: `unit/1-code-cleanup`  
**Wave**: 1  
**Packages**: `api/`, `client/`  
**Estimated size**: Small (2–3 hrs)

**Scope**:
- Remove all production `console.log` calls: `GamePage.tsx` (timeline handler), `useRealtimeGame.ts` (socket lifecycle), `GamesService.ts:49`
- Gate `Debug` tab in `PlayerPage` behind `import.meta.env.DEV`
- Extract `getReplayDelayMs()` to `client/src/utils/replayDelay.ts`; use in `GamePage.tsx` and `DailyGamesPage.tsx`
- Add "← Back" button to `GamePage`
- Remove `footerUiEnabled = false` dead code block from `BoxScorePanel.tsx`
- Fix identical ternary in `realtime.gateway.ts:129`
- Fix `pnrimaryNumber` typo in `PlayerPage.tsx`
- Clear `selectedProviderGameId` on date change in `DailyGamesPage`

**Key files**:
- `client/src/pages/GamePage.tsx`
- `client/src/pages/DailyGamesPage.tsx`
- `client/src/pages/PlayerPage.tsx`
- `client/src/pages/BoxScorePanel.tsx`
- `client/src/utils/replayDelay.ts` *(new)*
- `client/src/realtime/useRealtimeGame.ts`
- `api/src/games/games.service.ts`
- `api/src/realtime/realtime.gateway.ts`

**Completion criteria**:
- No `console.log` output during normal browser use
- Debug tab absent in non-dev mode (`import.meta.env.DEV === false`)
- Replay delay consistent between `GamePage` and `DailyGamesPage`
- Back button present on `GamePage`
- No `footerUiEnabled` reference in `BoxScorePanel.tsx`
- `realtime.gateway.ts:129` ternary branches are distinct

---

### Unit 2 — Team Branding Unification
**Branch**: `unit/2-branding-unification`  
**Wave**: 1  
**Packages**: `api/`  
**Estimated size**: Small–Medium (2–3 hrs)

**Scope**:
- Inject `TeamsMetaService` into `PollerService`
- Resolve `homeTeamMeta` / `awayTeamMeta` in `fetchGameMeta()` via `TeamsMetaService.getByAbbr()` instead of `TEAM_BRANDING_BY_ID`
- Remove `TEAM_BRANDING_BY_ID` map entirely
- Add startup error handling to `TeamsMetaService.onModuleInit()`: catch ESPN API errors, log warning, schedule 60s retry
- Add `@Cron('0 6 * * *')` daily refresh to `TeamsMetaService`

**Key files**:
- `api/src/poller/poller.service.ts`
- `api/src/teams/teams-meta.service.ts`
- `api/src/poller/poller.module.ts`

**Completion criteria**:
- Play update wire objects carry branding for all 30 teams
- `TEAM_BRANDING_BY_ID` absent from codebase
- Server starts cleanly even if ESPN API is unreachable at boot

---

### Unit 3 — API Response Caching
**Branch**: `unit/3-api-caching`  
**Wave**: 1  
**Packages**: `api/`  
**Estimated size**: Medium (3–4 hrs)

**Scope**:
- Add in-memory TTL cache to `PlayersService`: 24h TTL for player bios, 5min TTL for season stats
- Add in-memory TTL cache to `BoxScoreService`: 15s TTL keyed by `providerGameId`
- Pattern: `Map<string, { data: T; expiresAt: number }>`

**Key files**:
- `api/src/players/players.service.ts`
- `api/src/boxscore/boxscore.service.ts`

**Completion criteria**:
- Repeated player page loads within TTL produce no MLB API calls (verifiable via network tab)
- Repeated box score fetches within 15s produce no MLB API calls

---

### Unit 4 — BullMQ Queue Separation
**Branch**: `unit/4-queue-separation`  
**Wave**: 1  
**Packages**: `api/`  
**Estimated size**: Medium (3 hrs)

**Scope**:
- Create dedicated `daily-poller` BullMQ queue in `InfrastructureModule`
- Move `daily` job type to new queue and its own processor
- Keep `game-poller` for per-game live polling only
- Set independent concurrency: `game-poller` concurrency=5, `daily-poller` concurrency=2

**Key files**:
- `api/src/infrastructure/infrastructure.module.ts`
- `api/src/poller/poller.module.ts`
- `api/src/poller/poller.processor.ts` *(split into two)*
- `api/src/poller/poller.producer.ts`
- `api/src/domains/config/bullmq.config.ts`

**Completion criteria**:
- Daily schedule polls run on `daily-poller` queue
- Per-game live polls run on `game-poller` queue
- No queue contention between the two job types

---

### Unit 5 — GameDto Type Safety + WebSocket URL Config
**Branch**: `unit/5-gameDtoTypeSafety`  
**Wave**: 2  
**Packages**: `api/`, `client/`  
**Estimated size**: Medium (3–4 hrs)

**Scope**:
- Add missing fields to `GameDto`: `linescore`, `currentInning`, `isTopInning`, `halfInning`, `detailedState`
- Update `GamesController.listByDate()` return type to `GameViewDto[]`
- Remove `as unknown as Record<string, unknown>` casts in `DailyGamesPage.tsx`
- Replace hardcoded `SOCKET_URL` with `import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3000/realtime"`
- Add `.env.local.example` documenting `VITE_SOCKET_URL`

**Key files**:
- `api/src/games/dtos/game.dto.ts`
- `api/src/games/dtos/game-view.dto.ts`
- `api/src/games/games.controller.ts`
- `client/src/realtime/useRealtimeGame.ts`
- `client/src/pages/DailyGamesPage.tsx`
- `.env.local.example` *(new)*

**Completion criteria**:
- No `as unknown` casts in `DailyGamesPage.tsx`
- TypeScript compiles without new errors
- `VITE_SOCKET_URL` env var documented

---

### Unit 6 — High-Priority Bug Verification
**Branch**: `unit/6-bug-verification`  
**Wave**: 3  
**Packages**: `api/`, `client/`  
**Estimated size**: Small (1–2 hrs)

**Scope**:
- Verify all HIGH bugs confirmed resolved by U1 (bugs #2, #3)
- Verify MEDIUM bugs resolved in their respective units (bug #4 in U1, bug #5 in U2)
- Document any remaining HIGH bugs discovered during verification and fix them in this branch

**Key files**: Whatever files need patching if any HIGH bug was missed

**Completion criteria**:
- All HIGH bugs from `bug-priority-assessment.md` confirmed resolved
- Verification checklist complete and committed to this branch

---

### Unit 7 — Standings Page
**Branch**: `unit/7-standings-page`  
**Wave**: 4  
**Packages**: `api/`, `client/`  
**Estimated size**: Medium–Large (5–7 hrs)

**Scope**:
- New `StandingsModule`: `StandingsController`, `StandingsService`, `StandingTeamDto`
- `GET /standings?season=YYYY` (defaults to current year)
- Server enriches each row with `TeamsMetaService` branding
- Flat `StandingTeamDto[]` returned; client groups by `leagueName` then `divisionName`
- `StandingsPage`: side-by-side AL/NL layout; columns: Rank / Team / W / L / PCT / GB / L10 / STRK
- Add `getStandings()` to `MlbService`

**Key files**:
- `api/src/standings/standings.module.ts` *(new)*
- `api/src/standings/standings.controller.ts` *(new)*
- `api/src/standings/standings.service.ts` *(new)*
- `api/src/standings/dtos/standing-team.dto.ts` *(new)*
- `api/src/app.module.ts`
- `api/src/mlb/mlb.service.ts`
- `client/src/pages/StandingsPage.tsx` *(replacement)*
- `client/src/api/baseballApiClient.ts`

**Completion criteria**:
- `GET /standings` returns enriched `StandingTeamDto[]` for all 30 teams
- `StandingsPage` renders AL/NL side-by-side with team logos and all 8 columns

---

### Unit 8 — Player "Today" Performance
**Branch**: `unit/8-player-today`  
**Wave**: 4  
**Packages**: `api/`  
**Estimated size**: Medium (4–5 hrs)

**Scope**:
- Enrich `BatterOverviewTodayDto`: add `plateAppearances`, `atBats`, `hits`, `homeRuns`, `rbi`, `walks`, `strikeouts`, `avg`, `gameStatus`, `opponent`, `gameId`
- In `PlayersService.getBatterOverview()`: scan today's schedule, find player's team game, extract live boxscore line
- Restore stashed client changes (`git stash pop`) — `BatterOverviewPanel.tsx` / `.css` / `PlayerPage.tsx`

**Key files**:
- `api/src/players/players.service.ts`
- `api/src/players/dtos/batter-overview.dto.ts`
- `client/src/pages/player/BatterOverviewPanel.tsx` *(from stash)*
- `client/src/pages/player/BatterOverviewPanel.css` *(from stash)*
- `client/src/pages/PlayerPage.tsx` *(from stash)*

**Completion criteria**:
- `today` field populated with real game-day stat line when a game exists
- `today: null` returned gracefully on off days
- `BatterOverviewPanel` displays the live stat line

---

### Unit 9 — Player Splits Tab
**Branch**: `unit/9-player-splits`  
**Wave**: 4  
**Packages**: `api/`, `client/`  
**Estimated size**: Medium (4–5 hrs)

**Scope**:
- `GET /players/:id/splits?season=YYYY` — new endpoint in `PlayersController`
- `PlayersService.getPlayerSplits()` — filters to 6 split codes (vl, vr, hm, aw, d, n)
- `PlayerSplitsDto`: `splitType`, `splitCode`, `avg`, `obp`, `slg`, `ops`, `homeRuns`, `rbi`, `plateAppearances`
- Add `getPlayerSplitStats()` to `MlbService`
- Replace "Splits tab next." stub in `PlayerPage` with `SplitsTable` (6 rows × 8 cols: Split / AVG / OBP / SLG / OPS / HR / RBI / PA)
- Lazy-fetch: only loads when Splits tab first activated

**Key files**:
- `api/src/players/players.controller.ts`
- `api/src/players/players.service.ts`
- `api/src/players/dtos/player-splits.dto.ts` *(new)*
- `api/src/mlb/mlb.service.ts`
- `client/src/pages/PlayerPage.tsx`
- `client/src/api/baseballApiClient.ts`

**Completion criteria**:
- Splits tab shows 6 rows with all 7 stat columns for the current player
- No fetch triggered until user clicks Splits tab

---

### Unit 10 — Alert History Panel
**Branch**: `unit/10-alert-history`  
**Wave**: 5  
**Packages**: `client/`  
**Estimated size**: Medium (3–4 hrs)

**Scope**:
- New `AlertHistoryPanel` slide-in drawer component
- Triggered by a button in `GamePage`; closed by default
- Fetches `GET /alerts?gameId=:providerGameId` on first open only (lazy, static snapshot)
- Chronological list: timestamp / type chip / note text
- Add `getAlerts(gameId)` to `baseballApiClient.ts`

**Key files**:
- `client/src/components/AlertHistoryPanel.tsx` *(new)*
- `client/src/pages/GamePage.tsx`
- `client/src/api/baseballApiClient.ts`

**Completion criteria**:
- Drawer opens/closes via toggle button
- Alert list displays in chronological order with type chips matching existing CSS
- No API call made until first open
