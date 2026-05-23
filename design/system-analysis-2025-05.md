# Baseball Realtime — System Analysis
**Date:** May 2025  
**Scope:** Full codebase audit against prior design document; includes drift analysis, current feature inventory, architecture description, and recommendations.

---

## 1. Drift Analysis

Comparison against *Baseball Realtime Application Overview And Current Features (ChatGPT).pdf*.

### 1.1 Features the PDF describes accurately

| Feature | Notes |
|---|---|
| Real-time pitch-by-pitch feed | Implemented. Structured into innings → at-bats → pitch events via `pitchFeedModel.ts`. |
| Daily schedule with date navigation | Implemented. Prev/Next buttons, date input, localStorage persistence of last-viewed date. |
| Demand-driven polling | Implemented. Gateway subscriber counts control `enableGame`/`disableGame`; BullMQ job added on first viewer, removed on last. |
| WebSocket with Socket.io | Implemented at `/realtime` namespace. |
| Alert notifications | Implemented: `cycle-watch`, `cycle-achieved`, `no-hitter-watch`, `no-hitter-broken`, `score-change`, `game-tied`, `lead-change`. Persisted to DB. |
| Box score panel | Implemented. Batting and pitching tabs, substitution tracking, R/H/E summary. |
| Player pages | Implemented. Season stats (batting and pitching), headshot from MLB CDN, team info. |
| Venue name and city/state display | Implemented. Stored in `Game.snapshot`; displayed on game cards in daily list. |
| Event deduplication | Implemented in both the backend processor (composite event key) and frontend hook (`dedupePlays`). |

### 1.2 Features the PDF describes inaccurately or incompletely

**Team branding coverage.**
The PDF implies a hardcoded 5-team branding map is the only source of team logos and colors. In reality there are two separate code paths:

- `TeamsMetaService` fetches all 30 MLB teams from ESPN at startup and exposes them by abbreviation. The `GamesController` enriches every `GameDto` and `GameViewDto` with this data before sending to clients. Game cards in the daily list do show logos and colors for all teams.
- `poller.service.ts` keeps a separate hardcoded `TEAM_BRANDING_BY_ID` map covering only 5 teams (Astros 117, Yankees 147, Dodgers 119, Cubs 112, Red Sox 111). This path is used when building `PlayUpdateWire` objects sent over the WebSocket. Play updates for teams outside the 5 will carry no branding.

**Result:** Game list UI has full 30-team branding. The live play feed carries branding only for those 5 teams. This inconsistency is not described in the PDF.

**Game status taxonomy.**
The PDF says the backend handles SCHEDULED, LIVE, FINAL, DELAYED, POSTPONED, SUSPENDED, and CANCELLED. The code's `DailyGamesPage` also handles WARMUP and UNKNOWN via the processor, and the badge system on game cards handles all of these visually (EXTRAS is added as a badge when inning ≥ 10). The status enum in `Game` entity is only `scheduled | live | final` — extended statuses exist as `detailedState` string passed through `GameDto`.

**Alert sophistication.**
The PDF broadly describes "score alerts." The actual implementation in `AlertsService` has three independent trackers running concurrently per play: cycle detector (batter hit types accumulate), no-hitter detector (pitcher hit/out counts), and score tracker (score-change, game-tied, lead-change). The cycle and no-hitter detectors are only activated when `batterId` / `pitcherId` fields are present on the play update — which depends on the MLB feed including them.

### 1.3 Features mentioned as planned but absent from code

| PDF Item | Status in Code |
|---|---|
| Standings view | Stub only. Page renders "Standings view coming next." |
| At-Bat Card System | No trace in client or API. |
| Advanced game timeline / scoreline graph | Not implemented. The `GameTimeline` component is a scrub bar showing inning-change and scoring-play dots only. |
| Social features (game room, reactions) | Not implemented. |
| Expanded pitch analytics (spray chart, pitch heat map) | Not implemented. |

### 1.4 Code realities not described in the PDF at all

- **Replay mode.** Finished games can be "replayed" pitch by pitch with a configurable inter-pitch delay (50–5000 ms, stored in `localStorage` under `br-replay-delay-ms`). A pause/play button appears on the daily games page when a final game is selected. The game page always uses a 2-second fixed replay delay.
- **GameTimeline scrub bar.** A horizontal progress bar above the pitch feed shows clickable dots for inning transitions (blue squares) and scoring plays (green circles). Clicking jumps the feed scroll to that point.
- **Hydration on join.** When a client joins a game room, the gateway immediately emits a `hydrate` event with all stored pitch history (capped at 250 plays). No full page reload is needed.
- **Singleton socket pattern.** `useRealtimeGame.ts` uses a module-level singleton socket to avoid React StrictMode double-connect/disconnect in development.
- **BoxScorePanel transient highlights.** Stat cells flash for 1.7 seconds when their value changes, providing visual feedback during live updates.
- **Player name linkthrough.** Player names in the box score link to `/player/:mlbId`, wiring the box score to the player profile page.
- **`TeamsMetaService` startup-only load.** Team metadata from ESPN loads once at module init. There is no scheduled refresh or TTL-based invalidation.
- **`StatsService` in-memory counters.** Play and alert counts are tracked in RAM and reset on every server restart. No persistence.
- **`DEBUG` tab in production.** The `PlayerPage` has a "Debug" tab that renders the raw MLB API JSON response, always visible to end users.
- **Hardcoded WebSocket URL.** `useRealtimeGame.ts` connects to `http://localhost:3000/realtime`. This is a build-time constant, not configurable via environment variable.
- **`badgeTest` URL parameter.** `DailyGamesPage` has a developer override (`?badgeTest=1`) that forces certain game cards into live/extras states to preview badge rendering.
- **`footerUiEnabled = false`.** `BoxScorePanel` has a dead code flag that disables an R/H/E footer section. The section is fully implemented but permanently hidden.

---

## 2. Current Feature Set

### 2.1 Daily Games View (home page)

- Lists all MLB games for a selected date, fetched live from the MLB schedule API and upserted to MySQL on every request.
- Date navigation: previous/next day buttons; date picker input; last-selected date persisted in `localStorage`.
- Per-game cards show: team logos (from ESPN via `TeamsMetaService`), team names, scores (live and final), current inning/half/outs (live games), venue name and city/state, status badges (LIVE, FINAL, EXTRAS, NO-HITTER, DELAYED, CANCELLED, POSTPONED, SUSPENDED, SCHEDULED).
- Each card has two action buttons: toggle live feed (▶/■) and open full game page (external link icon).
- A live pitch-by-pitch panel on the right shows the feed for the currently selected game. Multiple games can be watched simultaneously; "watching" chips show which games are streaming.
- For finished games, the feed plays back with a configurable delay. Pause/play toggle available.

### 2.2 Game Page (full-screen detail view)

- Two-column layout: left column is the box score, right column is the live feed.
- Box score refreshes every 10 seconds while the game is live; stops polling when final.
- Live feed column includes: connection status indicator, `LiveScoreboard` (current count, bases, outs, scores), alerts strip (last 3 alerts), `GameTimeline` scrub bar, scrollable pitch-by-pitch feed.
- Feed auto-scrolls to newest pitch when the user is near the bottom; stops auto-scrolling if the user scrolls up; a "jump to bottom" button reappears when the user is not at the bottom.
- The page joins the game room on mount and leaves on unmount, triggering demand-driven polling start/stop.

### 2.3 Live Scoreboard

- Displays current game state: inning/half, balls/strikes/outs, base occupancy (visual diamond), scores, current batter name and season average, current pitcher name and ERA, last pitch type and speed.

### 2.4 Pitch-by-Pitch Feed

- Hierarchical: innings → at-bats → individual pitch events.
- Each at-bat shows the batter vs. pitcher matchup header, intermediate pitches, and a highlighted result row.
- Result is determined by searching backwards through the at-bat's events for terminal descriptions (walk, strikeout, single, double, etc.); inference handles edge cases (4 balls → Walk label, 3 strikes → Strikeout label).
- Scoring events (score increased or description contains "scores"/"home run") are visually distinguished with a score delta label.
- The current (most recent) at-bat is styled differently from completed at-bats.

### 2.5 Game Timeline

- Horizontal scrub bar with up to 30 clickable markers.
- Blue square markers = inning transitions; green circle markers = scoring plays.
- Clicking a marker scrolls the pitch feed to the corresponding inning header or batter row.

### 2.6 Box Score Panel

- Toggle between away and home teams; toggle between batting and pitching.
- **Batting:** Lineup starters in batting order with substitution tracking (replacements shown with ↳ prefix). Bench section for players not in the batting order. Columns: Order, #, Batter (linked to player page), AB, R, H, RBI, BB, SO, HR.
- **Pitching:** All pitchers who appeared. Columns: #, Pitcher (linked), IP, H, R, ER, BB, SO, P (pitches), S (strikes).
- Stat cells flash briefly when updated (transient highlight, 1.7 s duration).

### 2.7 Player Page

- Left sidebar: headshot (from MLB CDN, falls back to initials), name, jersey number, position, team name, team logo, birth city/country, MLB debut, age, height, weight, bats/throws.
- Right panel with tabs:
  - **Overview:** Season batting stats headline (AVG, OBP, SLG, OPS, HR, RBI) and secondary stats via the batter overview API. "Today" section is a stub.
  - **Stats:** Full season stat tiles grouped by Rate, Production, Contact, Volume, Speed (batting) or IP/ERA/WHIP/SO/W-L (pitching).
  - **Splits:** Stub ("Splits tab next.").
  - **Debug:** Raw JSON dump of the MLB API response.
- Season stats fall back to the prior year if the current season has no data yet.

### 2.8 Standings Page

Stub only. No data displayed.

### 2.9 Alerts

Backend `AlertsService` runs three detectors concurrently for every play event:
- **Cycle detector**: tracks hit types per batter per game. Emits `cycle-watch` at 3 distinct hit types, `cycle-achieved` at all 4.
- **No-hitter detector**: tracks hits allowed and outs recorded per pitcher. Emits `no-hitter-watch` at 21+ outs with 0 hits; emits `no-hitter-broken` on first hit after having 0.
- **Score detector**: emits `score-change` on any score movement; `game-tied` when scores equalize; `lead-change` when the leading team flips.

All alerts are persisted to the `alerts` MySQL table and broadcast over WebSocket to all subscribers of the relevant game room.

### 2.10 Settings

Inline settings panel (no dedicated backend): one control for "replay delay" (50–5000 ms), stored in `localStorage`.

---

## 3. Current Architecture

### 3.1 System Overview

```
Browser (React + Vite)
    │
    ├── REST (HTTP/JSON)  ──► NestJS API (port 3000)
    │                             │
    └── WebSocket (Socket.io) ───►│
                                  ├── MySQL (TypeORM)
                                  ├── Redis (BullMQ)
                                  └── External APIs
                                       ├── MLB Stats API v1 / v1.1
                                       └── ESPN Site API (team meta)
```

### 3.2 Backend (NestJS API)

**Module structure:**

| Module | Role |
|---|---|
| `GamesModule` | REST: list by date, find by ID. Enriches DTOs with team metadata. |
| `AlertsModule` | REST: alert history. Service: in-memory cycle/no-hitter/score detectors. |
| `BoxScoreModule` | REST: live box score. Fetches and maps MLB live feed on demand. |
| `PlayersModule` | REST: player profile, season stats, batter overview. Directly calls MLB Stats API. |
| `TeamsMetaModule` | Loads all 30 teams from ESPN at startup; provides branding by abbreviation. |
| `PersistenceModule` | TypeORM integration. Provides `Game` and `Alert` repositories. |
| `PollerModule` | BullMQ producer, processor, scheduler. Manages polling lifecycle. |
| `RealtimeModule` | Socket.io gateway. Manages game/date subscriptions and publishes events. |
| `InfrastructureModule` | Redis and BullMQ queue configuration. |

**Persistence:**
- MySQL with two tables: `games` (schedule + snapshot + scores) and `alerts` (per-game alert history).
- `Game` entity: UUID PK, `providerGameId` (unique), `gameDate`, team abbreviations and full names, `status` (scheduled/live/final), `startTimeUtc`, `snapshot` (JSON), `homeScore`/`awayScore`.

**Polling pipeline:**

1. Browser sends `joinGame` via WebSocket.
2. Gateway tracks subscriber counts. First subscriber triggers `pollerProducer.enableGame()` and `upsertGamePoll()`.
3. BullMQ adds a repeating job in the `game-poller` queue (kind: `game`).
4. Processor fetches the MLB live feed, calls `pollerService.buildPitchFrames()` to iterate `allPlays` at pitch granularity.
5. Event key deduplication suppresses re-emissions of already-seen pitches.
6. New pitches are mapped to `PlayUpdateWire`, the `Game` entity is upserted, alerts are evaluated via `AlertsService.onPlay()`.
7. Gateway emits `play` events to all subscribers of that game room.
8. Last subscriber leaving triggers `pollerProducer.removeGamePoll()` and `disableGame()`.

A parallel `daily` job type polls the MLB schedule API for a given date and broadcasts a `DailyGameStatusWire[]` snapshot to all `joinDaily` subscribers.

**Team branding — two paths:**
- `TeamsMetaService`: all 30 teams, by abbreviation, from ESPN. Used in `GamesController` to enrich REST responses.
- `poller.service.ts` `TEAM_BRANDING_BY_ID`: 5 teams, by MLB numeric team ID. Used when building `PlayUpdateWire` objects sent over WebSocket. Teams outside this set receive no branding on play updates.

**External API dependencies:**

| API | Endpoint pattern | Usage |
|---|---|---|
| MLB Stats API v1 | `/api/v1/schedule` | Daily game schedule |
| MLB Stats API v1.1 | `/api/v1.1/game/:id/feed/live` | Live feed (plays, linescore, box score) |
| MLB Stats API v1 | `/api/v1/people/:id` | Player profiles |
| MLB Stats API v1 | `/api/v1/people/:id/stats` | Season stats |
| MLB Stats API v1 | `/api/v1/venues/:id` | Venue city/state (cached in memory) |
| ESPN Site API | `/apis/site/v2/sports/baseball/mlb/teams` | All-team logo/color metadata |

### 3.3 Frontend (React + Vite)

**Routes:**

| Path | Component | Description |
|---|---|---|
| `/` | `DailyGamesPage` | Daily schedule + inline live feed |
| `/game/:providerGameId` | `GamePage` | Full-screen game detail |
| `/player/:mlbId` | `PlayerPage` | Player profile and stats |
| `/standings` | `StandingsPage` | Stub |
| `/settings` | inline | Replay delay setting |

**Real-time state management:**
- `useRealtimeGame(selectedGameId)` hook owns all WebSocket state.
- Singleton `Socket` instance prevents React StrictMode double-connection.
- Per-game `plays` and `alerts` maps keyed by game ID, allowing multiple simultaneous game subscriptions.
- `hydrate` events replace the full play buffer for a game on join.
- `play` events append to the buffer and deduplicate by composite identity key.

**Data fetching:**
- REST calls via OpenAPI-generated SDK (`@bitslinger21/baseball-realtime-client`).
- Box score polled every 10 seconds while the game is live, via a self-scheduling timer in `GamePage`.
- Player data fetched directly from `/api/players/:id` and `/api/players/:id/overview/batter` using raw `fetch()` (bypasses the generated SDK).

**Replay:**
- `DailyGamesPage`: final games replay at the configured `br-replay-delay-ms` delay (default 2000 ms). Pause/play toggle.
- `GamePage`: always replays at a fixed 2000 ms delay (ignores the settings preference).

---

## 4. Feature Recommendations

### 4.1 High priority — visible gaps

**F1: Complete the Standings page.**  
The MLB Stats API exposes `/api/v1/standings?leagueId=103,104&season={year}&standingsTypes=regularSeason`. A new `StandingsService` and controller endpoint would provide the data; the client already has the route. This is one of the most expected features in any baseball app.

**F2: Wire "Today" performance on player overview.**  
The `BatterOverviewTodayDto` shape exists and `BatterOverviewPanel` renders it, but `PlayersService.getBatterOverview()` always returns `{ label: 'Today', statLine: 'No current game data.', isLive: false }`. Implement: look up today's schedule for the player's team, check if a game is live, and return the batter's current at-bat stats from the live feed.

**F3: Remove the Debug tab from production.**  
`PlayerPage` shows a "Debug" tab rendering raw MLB API JSON. Gate this tab behind `import.meta.env.DEV` or remove it entirely.

**F4: Consistent replay delay.**  
`GamePage` hardcodes a 2000 ms replay delay while `DailyGamesPage` reads from the user's setting. Align both to use the same `getReplayDelayMs()` helper already defined in `DailyGamesPage`.

**F5: Implement Player Splits tab.**  
The tab is visible but shows only "Splits tab next." The MLB Stats API supports `?stats=statSplits` with various groupings (vs LHP/RHP, home/away, by month). Even a small subset would complete the page.

### 4.2 Medium priority — quality of life

**F6: Multi-game tracking on the Game page.**  
`DailyGamesPage` supports watching multiple games simultaneously via the watching strip. `GamePage` joins exactly one game. Consider letting `GamePage` show a "watch another game" control, or surfacing the watching strip so users can monitor a second game while viewing a box score.

**F7: Persistent alert history view.**  
Alerts are persisted to MySQL but the only in-app display is the "last 3 alerts" strip in the feed. Add an alert history panel or drawer accessible from the game page that shows the full alert timeline for that game.

**F8: Live scoreboard in the daily games list.**  
The daily game cards show current score and inning for live games, but the inline pitch feed for a selected game has no scoreboard header. Consider surfacing the `LiveScoreboard` component above the pitch feed in the daily panel (it is already shown in `DailyGamesPage` — verify it is not accidentally hidden on smaller viewports).

**F9: `footerUiEnabled` cleanup.**  
`BoxScorePanel` has `const footerUiEnabled = false` with a complete but permanently disabled R/H/E footer section. Either enable it or delete the dead code.

### 4.3 Lower priority — polish

**F10: Configurable replay on Game page.**  
See F4. Small change, meaningfully improves consistency.

**F11: Game page navigation back to daily list.**  
`PlayerPage` has a "← Back" button using `navigate(-1)`. `GamePage` has no navigation affordance. Add a breadcrumb or back link.

**F12: Loading state on game list date change.**  
When changing the date on `DailyGamesPage`, the right panel retains the previous game's pitch feed until the new date's games load. Clear the selected game on date change.

---

## 5. Architectural Recommendations

### 5.1 Eliminate the hardcoded WebSocket URL

**Current:** `useRealtimeGame.ts` line 11: `const SOCKET_URL = "http://localhost:3000/realtime";`  
**Impact:** The built frontend can only connect to localhost. Any staging or production deployment requires a code change.  
**Fix:** Use `import.meta.env.VITE_SOCKET_URL` (defaulting to `http://localhost:3000/realtime` for local dev). Add `VITE_SOCKET_URL` to `.env.production`.

### 5.2 Unify team branding onto a single source

**Current:** Two separate branding paths — `TeamsMetaService` (all 30 teams, by abbreviation) and `TEAM_BRANDING_BY_ID` in `poller.service.ts` (5 teams, by MLB numeric ID).  
**Impact:** Play updates broadcast over WebSocket carry branding only for 5 teams. The disconnect is invisible to consumers.  
**Fix:** Remove `TEAM_BRANDING_BY_ID`. Inject `TeamsMetaService` into `PollerService`. When building `PlayUpdateWire`, resolve team meta by abbreviation from `fetchGameMeta()` which already has `homeAbbr`/`awayAbbr`.

### 5.3 Add a NestJS configuration module

**Current:** Environment variables are read via raw `process.env` with no validation. Several values are hardcoded constants (API base URLs, MLB API version paths).  
**Fix:** Add `@nestjs/config` with a Joi or Zod validation schema. Define a single `AppConfig` shape. This also enables typed access to config values and surfaces misconfiguration at startup.

### 5.4 Add HTTP caching to PlayersService

**Current:** `PlayersService.getPlayer()` makes two sequential MLB API calls (person profile + season stats) on every request, with no caching.  
**Impact:** Repeated player page loads hammer the MLB API and increase latency.  
**Fix:** Add an in-memory `Map` with a TTL (e.g., 5 minutes for season stats, 24 hours for biographical data) mirroring the pattern used by `fetchGameMeta()` in `PollerService`. Alternatively, use a Redis-backed cache if the service is ever horizontally scaled.

### 5.5 Add a BoxScoreService cache

**Current:** `BoxScoreService.getBoxScore()` fetches the full MLB live feed on every call. `GamePage` calls it every 10 seconds while a game is live.  
**Fix:** Cache the response in memory keyed by `providerGameId` with a short TTL (10–15 seconds). This collapses concurrent requests from multiple browser tabs watching the same game into a single upstream fetch.

### 5.6 Schedule a TeamsMetaService refresh

**Current:** Team metadata loads once at module init. If the ESPN API is unreachable at startup, the service holds an empty map and all team cards show no logo or color.  
**Fix:** Add a `@Cron()` scheduled task (e.g., daily at 6 AM) to call `TeamsMetaService.refresh()`. Also add error resilience: catch the failure at startup and schedule a retry (e.g., 60 seconds later) rather than throwing and potentially blocking module initialization.

### 5.7 Separate the daily schedule queue from the game polling queue

**Current:** Both `daily` and `game` job types share the `game-poller` BullMQ queue.  
**Impact:** On heavy game days (up to 15 simultaneous games), `daily` jobs that update the schedule ticker compete with per-game pitch-fetching jobs for the same worker concurrency slots.  
**Fix:** Create a dedicated `daily-poller` queue with its own worker. `game-poller` handles only live game polling with higher concurrency.

### 5.8 Add a health endpoint

**Current:** No `/health` or `/readiness` endpoint.  
**Impact:** Cannot deploy behind a load balancer or container orchestrator without a liveness probe.  
**Fix:** Add a `HealthController` at `/health` using `@nestjs/terminus`. Check: MySQL ping, Redis ping, optional MLB API reachability.

### 5.9 Eliminate duplicate pitch-frame construction logic

**Current:** `buildPitchFrames()` in `poller.service.ts` and a functionally similar inline path inside `fetchLatest()` both iterate `allPlays` and filter pitch events.  
**Fix:** Extract a single pure function (likely already the intent of `buildPitchFrames`) and call it from both sites. This removes a bug-surface where fixes to one path are not applied to the other.

### 5.10 Fix type safety in GameDto / OpenAPI spec

**Current:** `DailyGamesPage.tsx` accesses `linescore`, `currentInning`, `isTopInning`, `halfInning`, `awayTeamMeta`, `homeTeamMeta`, and `detailedState` via `as unknown as Record<string, unknown>` casts because these fields are not on the typed `GameDto` interface.  
**Impact:** Compile-time safety is lost. Field name mismatches produce silent `undefined` values.  
**Fix:** Add the missing fields to `GameDto` with `@ApiPropertyOptional` decorators, regenerate the client SDK. `GameViewDto` already exists for the team meta fields but is not used in `listByDate`'s declared return type.

---

## 6. Known Bugs and Code Issues

| Location | Issue |
|---|---|
| `PlayerPage.tsx:287` | `p?.pnrimaryNumber` is a typo for `p?.primaryNumber`. The field is shadowed by the correct `view.number` a few lines later, so jersey number displays correctly, but the unused read is confusing. |
| `GamePage.tsx:447–470` | Multiple `console.log` calls inside the timeline jump handler run in production. They log DOM coordinates on every timeline click. |
| `useRealtimeGame.ts` (multiple) | `console.log` calls prefixed with `// eslint-disable-next-line no-console` run in production for every socket event. |
| `GamesService.ts:49` | `console.log('[GamesService] listByDate CALLED', date)` runs in production on every game list request. |
| `poller.service.ts` `TEAM_BRANDING_BY_ID` | Stale 5-entry map coexists with `TeamsMetaService` covering all 30 teams. The map is a maintenance liability. |
| `BoxScorePanel.tsx:420` | `const footerUiEnabled = false` permanently disables a complete UI section. Remove the dead code or enable the feature. |
| `BatterOverviewPanel` | `today` section always shows "No current game data." regardless of whether a live game is in progress. |
| `realtime.gateway.ts:129` | `ts: typeof u.meta === "object" ? new Date().toISOString() : new Date().toISOString()` — both branches of the ternary produce the same value. The condition does nothing. |
| `GamesService.ts` | `upsertSnapshot()` method signature uses `any` for both the snapshot and `meta` parameters. |
| `StatsService` | In-memory play/alert counters reset on every server restart with no persistence. |

---

*Generated from full codebase analysis, May 2025. Reference the source files for authoritative truth; this document will drift as the code evolves.*
