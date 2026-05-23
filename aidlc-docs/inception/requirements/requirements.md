# Requirements Document

## Intent Analysis Summary

**User Request**: Build a comprehensive plan to address the improvements identified in `design/system-analysis-2025-05.md`, in priority order: (1) Architectural Recommendations §5, (2) High-Priority Feature Gaps §4.1, (3) Medium-Priority QoL §4.2, and (4) bug assessment + fix of high-priority bugs.

**Request Type**: Multi-scope enhancement — architectural improvement, feature completion, code quality

**Scope Estimate**: System-wide — both API and client, multiple modules

**Complexity Estimate**: Complex — 10+ architectural items, 9+ features, bug fixes across two packages

---

## Extension Configuration (from answers)

| Extension | Enabled |
|---|---|
| Security Baseline | No |
| Property-Based Testing | No |

---

## Deployment Context (from answers)

- **Target**: Local development only (localhost)
- **Implication**: WebSocket URL config (A5.1) is still worth doing as good practice but carries no urgency. Health endpoint (A5.8) is deprioritized — not needed for local dev. No multi-environment concerns.

---

## Functional Requirements

### FR-ARCH: Architectural Improvements

**FR-ARCH-1: Team Branding Unification**
Remove `TEAM_BRANDING_BY_ID` hardcoded 5-team map from `poller.service.ts`. Inject `TeamsMetaService` into `PollerService` and resolve team branding by abbreviation when building `PlayUpdateWire` objects. This closes the inconsistency where REST responses carry branding for all 30 teams but WebSocket play updates carry branding only for 5.

**FR-ARCH-2: TeamsMetaService Resilience**
Add startup failure handling to `TeamsMetaService.onModuleInit()` — catch ESPN API errors, log a warning, and schedule a retry (60s) rather than throwing and potentially blocking module initialization. Add a daily scheduled refresh.

**FR-ARCH-3: PlayersService Caching**
Add an in-memory TTL cache to `PlayersService`: 24-hour TTL for player biographical data, 5-minute TTL for season statistics. Pattern mirrors existing `fetchGameMeta()` in `PollerService`.

**FR-ARCH-4: BoxScoreService Caching**
Add an in-memory TTL cache to `BoxScoreService` keyed by `providerGameId`, with a 15-second TTL. Collapses concurrent requests from multiple browser tabs for the same game.

**FR-ARCH-5: GameDto Type Safety**
Add missing fields to `GameDto` with proper `@ApiPropertyOptional` decorators: `linescore`, `currentInning`, `isTopInning`, `halfInning`, `detailedState`. Add `awayTeamMeta` / `homeTeamMeta` to the declared return type of `GamesController.listByDate()`. Eliminate unsafe `as unknown as Record<string, unknown>` casts in `DailyGamesPage.tsx`. Update/regenerate SDK client types.

**FR-ARCH-6: WebSocket URL Configuration**
Replace the hardcoded `SOCKET_URL = "http://localhost:3000/realtime"` in `useRealtimeGame.ts` with a Vite environment variable (`VITE_SOCKET_URL`) that defaults to `http://localhost:3000/realtime`. Add `.env.local` template.

**FR-ARCH-7: NestJS Configuration Module** *(lower priority — local dev)*
Add `@nestjs/config` with a basic validation schema. Move hardcoded API base URLs and tunable constants out of inline code. Deprioritized given local-dev-only deployment.

**FR-ARCH-8: Queue Separation**
Create a dedicated `daily-poller` BullMQ queue with its own worker. Move daily schedule polling jobs out of `game-poller`. Adjust worker concurrency settings independently.

**FR-ARCH-9: Health Endpoint** *(deprioritized — local dev)*
Add a `/health` endpoint using `@nestjs/terminus`. Deprioritized given local-dev-only deployment; include in backlog.

**FR-ARCH-10: Daily Schedule Caching** *(nice to have)*
Short TTL cache in `GamesService.listByDate()` for the MLB schedule API call. For past dates, cache indefinitely; for today, cache 30s.

---

### FR-FEAT: Feature Completions (§4.1 High Priority)

**FR-FEAT-1: Standings Page**
Replace the stub `StandingsPage` with a working implementation. Backend: new `StandingsModule` with a controller and service that calls MLB Stats API `/api/v1/standings`. Frontend: render AL/NL division standings with W/L/PCT/GB columns, using existing team branding from `TeamsMetaService`.

**FR-FEAT-2: Player "Today" Performance**
Replace the hardcoded stub in `PlayersService.getBatterOverview()` `today` field. Backend: given the player's `mlbId`, look up today's scheduled games, find if the player's current team has a game in progress or completed today, and return the batter's today stat line. Frontend: `BatterOverviewPanel` already renders `today` — wire the live value.

**FR-FEAT-3: Player Splits Tab**
Replace the stub "Splits tab next." in `PlayerPage`. Backend: new endpoint `/api/players/:id/splits` calling MLB Stats API with `stats=statSplits` (vs LHP, vs RHP, home, away). Frontend: render a small splits table in the Splits tab.

**FR-FEAT-4: Debug Tab Gating**
Gate the `Debug` tab in `PlayerPage` behind `import.meta.env.DEV`. Tab is not visible in production builds.

**FR-FEAT-5: Consistent Replay Delay**
`GamePage.tsx` hardcodes `2000` ms replay delay. Replace with a call to the `getReplayDelayMs()` helper already defined in `DailyGamesPage.tsx`. Extract the helper to a shared utility module.

---

### FR-QOL: Quality-of-Life Improvements (§4.2 Medium Priority)

**FR-QOL-1: Alert History Panel**
Add a collapsible alert history section to `GamePage`. Wire to the existing `GET /alerts?gameId=:id` endpoint (already in `AlertsModule`). Show all alerts for the current game in chronological order, distinct from the "last 3 alerts" strip.

**FR-QOL-2: Game Page Back Navigation**
Add a "← Back" button to `GamePage` using `navigate(-1)`, matching the pattern in `PlayerPage`.

**FR-QOL-3: Date-Change Clears Selected Game**
When the user changes the date in `DailyGamesPage`, clear `selectedProviderGameId` state so the right panel doesn't hold the previous game's feed while the new date loads.

**FR-QOL-4: footerUiEnabled Cleanup**
In `BoxScorePanel.tsx`, either enable the R/H/E footer section (`footerUiEnabled = true`) or remove the dead code block and the flag entirely. Decision: remove (the summary R/H/E is already shown in the header table; the footer is redundant).

---

### FR-BUGS: Bug Assessment and Fixes

See `bug-priority-assessment.md` in this directory for the full table. High-priority bugs are to be fixed as a dedicated unit after the priority table is reviewed and approved. Medium and low bugs are backlog items included in the plan but not blocking.

---

## Non-Functional Requirements

**NFR-1: No regressions** — All changes must preserve existing behavior for game listing, pitch feed, box score, player profiles. Manual smoke test per unit.

**NFR-2: TypeScript strict mode** — All new code must pass existing TypeScript checks without new `any` additions.

**NFR-3: Backward compatibility** — No breaking changes to WebSocket event names or REST API shape.

---

## Out of Scope (Backlog — Do Not Lose Sight Of)

The following items from the system analysis are explicitly deferred to a future phase. They remain visible in the plan as backlog:

| Item | Source | Note |
|---|---|---|
| Standings: live update via WebSocket | §4.1 enhancement | After standings page is working |
| Social features | PDF planned feature | Not in scope |
| At-Bat Card System | PDF planned feature | Not in scope |
| Spray charts / pitch heat maps | PDF planned feature | Not in scope |
| Health endpoint | §5 A5.8 | Deprioritized (local dev only) |
| NestJS Config Module | §5 A5.7 | Deprioritized (local dev only) |
| Daily schedule caching | §5 A5.6 | Nice-to-have |
| Multi-game tracking on Game page | §4.2 F6 | Deferred |
| StatsService persistence | §6 bug #10 | Low priority |
| Advanced game timeline / scoreline | §4.3 future | Not in scope |
| Player Splits: full split breakdown | §4.2 F5 extended | Basic splits first |
