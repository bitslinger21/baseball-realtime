
## Alerts & Realtime Pipeline

This project wires MLB’s live feed into a small “realtime + alerts” stack that surfaces interesting events in the UI.

### High-level flow

1. **Poller** (`PollerProcessor` / `PollerService`)
   - `PollerService.fetchLatest(gameId)`:
     - Calls `MlbApiService.getLiveFeed(gameId)`.
     - Picks a completed play from `liveData.plays.allPlays` (or falls back to `currentPlay`).
     - Normalizes it into a `LiveUpdate`:
       - Inning / half / outs
       - Balls / strikes
       - Bases (runners on 1/2/3)
       - Batter / pitcher IDs + names
       - Normalized `playResult` union (`Single`, `Double`, `HomeRun`, `Strikeout`, etc.)
       - `creditedHit`, `pitcherOutsRecordedThisPlay`
       - `homeScore`, `awayScore`
       - A stable `playKey` to de-duplicate events.

   - `PollerProcessor.process({ gameId })`:
     - Calls `fetchLatest(gameId)` to get a `LiveUpdate`.
     - Skips duplicates using an in-memory `lastPlayKeyByGame` map.
     - Upserts a `Game` row via `gamesRepo.upsert` keyed by `providerGameId`.
     - Calls `alerts.onPlay(gameId, { ...u, ts })` to drive alert logic.
     - Maps `LiveUpdate` → `PlayUpdateWire` and calls:
       ```ts
       this.realtime.publishGameUpdate(gameId, { play: payload });
       ```

2. **Alerts** (`AlertsService`)
   - Entry point:
     ```ts
     await alerts.onPlay(gameId, playUpdate);
     ```
   - Internally fans out to three detectors:
     - **Cycle detector**
       - Tracks per-game, per-batter hit types (`1B`, `2B`, `3B`, `HR`).
       - After 3 distinct types → emits `cycle-watch` (“needs a HR for the cycle”).
       - After all 4 → emits `cycle-achieved`.
     - **No-hitter detector**
       - Tracks hits allowed and outs per pitcher.
       - At `>= 21` outs and 0 hits → `no-hitter-watch`.
       - On the first hit after 0 hits → `no-hitter-broken`.
     - **Score / lead / tie detector**
       - Tracks last known `homeScore`/`awayScore` per game.
       - On score change:
         - Always emits `score-change`.
         - Emits `game-tied` if scores are equal.
         - Emits `lead-change` if leader flips from home ↔ away.

   - All detectors eventually call:
     ```ts
     this.gw.publishGameUpdate(gameId, { alert: payload });
     await this.alertsRepo.save({
       gameId,
       type: payload.type as AlertType,
       payload: payload as Record<string, unknown>,
     });
     ```
   - Alerts are stored in the `alerts` table:
     - `id: uuid`
     - `gameId: varchar(64)`
     - `type: AlertType` (`cycle-watch`, `cycle-achieved`, `no-hitter-watch`, `no-hitter-broken`, `score-change`, `game-tied`, `lead-change`)
     - `payload: json`
     - `createdAt: datetime` (compatible with both MySQL & SQLite)

3. **Realtime Gateway** (`RealtimeGateway`)
   - Provides a Socket.IO namespace at `/realtime`.
   - `publishGameUpdate(gameId, { play?, alert? })`:
     - Emits a `"play"` event to the room keyed by `gameId`:
       ```ts
       this.server.to(gameId).emit('play', { play, alert });
       ```
   - Clients join a room with:
     ```ts
     socket.emit('joinGame', providerGameId);
     ```

4. **API endpoints**

   - **Games**
     - `GET /api/games?date=YYYY-MM-DD`  
       Returns schedule for the given date (via `MlbApiService.getScheduleByDate`).
     - `GET /api/games/today`  
       Convenience wrapper for today’s date.
     - `GET /api/games/providerId/:providerGameId`  
       Finds a `Game` row by `providerGameId` (used by the game detail page).
     - `GET /api/games/:gameId/alerts?limit=N`  
       Returns recent alerts for a game from the `alerts` table.

   - **Poller**
     - Repeatable BullMQ jobs seeded in `PollerModule` / `onModuleInit`:
       ```ts
       pollerQueue.add('poll-game', { gameId }, {
         jobId: `poll-${gameId}`,
         repeat: { every: 15000 },
         removeOnComplete: true,
         removeOnFail: true,
       });
       ```
     - (Optional) `POST /api/poller/kick` can be used to seed jobs manually.

5. **Client usage**

   - **DailyGamesPage**
     - Fetches games for a date via `gamesApi.gamesListByDate(date)`.
     - Uses `useRealtimeGame(selectedProviderGameId)`:
       ```ts
       const { plays, alerts } = useRealtimeGame(selectedProviderGameId);
       ```
     - Left column: scrollable game list with “Join live” and “Open game page”.
     - Right column: live feed + mini scoreboard + recent alerts.

   - **GamePage**
     - Route: `/game/:providerGameId`.
     - Fetches one game via `gamesApi.gamesFindByProviderId(providerGameId)`.
     - Subscribes to realtime updates:
       ```ts
       const { plays, alerts } = useRealtimeGame(providerGameId);
       ```
     - Shows:
       - Game metadata (teams, status, date).
       - Scoreboard from latest play.
       - “Alert chips” for the last few alerts.
       - Full play-by-play list, with the most recent play highlighted.

### Running tests

Alerts tests are split into fast unit tests and a small sqlite-backed integration suite:

- **All tests**
  ```bash
  cd api
  yarn test
  