
## Realtime pipeline & alerts

How MLB's live feed reaches the app, and where the header bell's alerts come from.

### 1. Poller (`poller/`)

- Repeatable BullMQ jobs poll each game (`PollerProducer` / `DailyPollerProcessor`).
- `PollerService.fetchHistory(gameId)` turns MLB's `liveData.plays.allPlays` into one
  `LiveUpdate` **per pitch** (`buildPitchFrames` → `mapFrameToLiveUpdate`). A play with no
  pitches (an automatic intentional walk, a caught stealing as its own play) gets one frame.
  Each frame carries:
  - inning / half / outs, count, and the bases **as of that pitch** (`basesAtPitch`);
  - the score **as of that pitch**, not the play's final score;
  - on an at-bat's last frame only: `isFinalPitchOfAtBat: true`, the normalised
    `playResult` (`PlayResult` — `Single`, `Groundout`, `DoublePlay`, `SacFly`,
    `CaughtStealing`, …) and a `scorebookCode` (`6-4-3`, `F8`, `ꓘ`);
  - `runners`: MLB's runner movements caused at or after that pitch and before the next one
    (`RunnerMove` — runner id, start, end, out, out base, the event index that caused it).
- `PollerProcessor` broadcasts every pitch that is **new or changed** since it was last sent
  (a per-game fingerprint per `playKey`): MLB fills in an at-bat's result on the same pitch
  seconds after first publishing it. The first tick for a game sends only the newest pitch.

### 2. Realtime gateway (`realtime/`)

- Socket.IO namespace `/realtime`. A client joins a game with `socket.emit('joinGame', id)`
  and receives `hydrate` (the game's full pitch list) once, then `play` events
  (`{ play }` per new/changed pitch, `{ iqUpdate }` for a Baseball IQ patch).
- The client keeps one entry per `playKey`, the latest copy winning.

### 3. Alerts — the header bell (`alerts/`)

- `AlertFeedService` reads every live game on tonight's schedule every 30s (independent of
  the game poller) and derives stories with `alert-detect.ts`: no-hitter / perfect game from
  the 7th, cycle watch, 3rd HR / 15th K, one-away career milestones.
- A story starts, updates in place under one alert, and ends with a second alert; one-off
  moments land as already over. Stored as `type: 'feed'` rows in the `alerts` table.
- `GET /api/alerts/feed` — tonight's alerts, newest first (PROMPT_alerts.md).
- The older per-game detector (score change, lead change, per-pitcher "no-hitter broken",
  `GET /api/games/:id/alerts` and its history drawer) was removed; old rows of its types may
  remain in the `alerts` table and are not read.

### Running tests

```bash
cd api
yarn test
```
