# Handoff — Scorebook architecture & backend traffic

**As of Oct 10, 2026 · `main` @ `8fba61d`.**
Monorepo: `client/` (React) and `api/` (NestJS). Read the repo's `CLAUDE.md`, then
`client/CLAUDE.md` before UI work. Use **yarn**, never npm. Don't commit or push without
an explicit request from the user.

---

## 1. Client — `client/`

- React 19 + TypeScript, Vite 7, React Router 7, Yarn 4. Plain CSS per component.
- Pages: Home, Games, Highlights, Game, Player, Team, Standings, Leaders, Settings.
- **REST** to the API through the generated SDK `@bitslinger21/scorebook-client` (renamed
  Oct 9 from `@bitslinger21/baseball-realtime-client`; same version line) or plain `fetch`.
  Vite proxies `/api` to `localhost:3000`.
- **Realtime (Socket.IO, namespace `/realtime`)** — `client/src/realtime/useRealtimeGame.ts`.
  A browser joins a game room → receives `hydrate` (the game's full pitch list) once, then a
  `play` event per **new or changed** pitch (the newer copy replaces the old one by `playKey`).
  The Games page subscribes to a date the same way (`useRealtimeDailyGames.ts`).
- Panels that poll on their own: the alert bell (`components/alerts/AlertsProvider.tsx`,
  every 30 s), Home's Following cards (30 s), the game page's clip index (60 s).
- Team logos and player photos load in the browser straight from MLB's image CDN — no API cost.
- The scorecard grid is drawn by a plain script, `client/public/scorebook-cell.js`
  (`window.buildScorebookGrid`, `window._cwCellHTML`).

## 2. API — `api/`

- NestJS + TypeScript. One module per feature: Games, Players, Teams, Standings, Leaders,
  Home, Clips, BoxScore, IQ, Alerts, Statcast, SeasonPulse, plus Realtime (Socket.IO gateway).
- **Storage:** MySQL via TypeORM (`docker exec baseball-db …`; password in `api/.env`
  `DB_PASSWORD`). **Redis** backs the BullMQ queues `game-poller` and `daily-poller`.
- **SDK workflow** after any REST surface change: bump `api/package.json` version →
  `yarn client:publish` (needs Docker) → `yarn spec:gen` → `yarn spec:check` → in `client/`,
  `yarn up @bitslinger21/scorebook-client@X`. Socket payload changes don't need it.

### The poller (`api/src/poller/`)
- `poller.service.ts` turns MLB's live feed into **one record per pitch**
  (`buildPitchFrames` → `mapFrameToLiveUpdate`): bases and score *as of that pitch*;
  `isFinalPitchOfAtBat`, `playResult`, `scorebookCode`, `scorebookSub`, `spray` on an
  at-bat's last frame; MLB's runner moves (`runners`) on the pitch they followed. Plays with
  no pitches get one frame.
- `poller.processor.ts` broadcasts every pitch whose fingerprint changed, then feeds
  Home's "What's hot" (`home/hot-events.service.ts`), Baseball IQ insights and clip ingest.
- **Two things start a game's poll:**
  - **Background seeding** — `poller.bootstrap.service.ts` (rewritten Oct 10, `280711f`). A
    reconciler runs at startup and every 5 min: one **15 s** `poll-game` job (repeat key
    `seed:<gamePk>`) for each game that is live, starts within 30 min, or went final within
    the last 30 min **after this process saw it live**; every other `poll-game` job is
    removed. At startup it also removes viewer and daily jobs orphaned by the restart
    (browsers re-join on reconnect).
  - **Viewers** — `realtime/realtime.gateway.ts`: the first browser to join a game adds a
    **3 s** `poll` job (`poller.producer.ts` `upsertGamePoll`); the last one leaving removes it.
- `daily-poller.processor.ts` — while a browser subscribes to a date (Games page): the
  schedule plus each live game's feed, every 3 s while games are live, 60 s otherwise.

### Other background work
- **Alert feed** — `alerts/alert-feed.service.ts`, a 30 s timer independent of the poller:
  tonight's schedule + each live game's feed (`getLiveFeedCached`, 20 s TTL) →
  `alert-detect.ts` → `GET /api/alerts/feed`. Rows live in the `alerts` table as `type: 'feed'`.
- **Clip ingest** — `clips/clips.service.ts`, MLB game content at most once a minute per
  polled game, plus a few polls after the final.
- **Daily jobs** — `statcast/statcast.scheduler.ts` (Baseball Savant CSV) and
  `season-pulse/season-pulse.scheduler.ts`, each every 24 h.
- **ESPN** team metadata — `teams/teams-meta.service.ts`, at startup / refresh.

## 3. External APIs

| Service | Used for | Where |
|---|---|---|
| MLB Stats API (`statsapi.mlb.com`) | Schedule, live feed, win probability, box scores, standings, leaders, rosters, people / career stats, postseason series, video content | `providers/mlb/mlb.service.ts`, `poller/poller.service.ts`, `iq/iq-grounding.service.ts` |
| Baseball Savant | Daily Statcast CSV | `statcast/statcast.service.ts` |
| Anthropic (Claude) | Baseball IQ: Haiku for insights + question classification, Sonnet for answers | `iq/iq.service.ts` |
| ESPN (`site.api.espn.com`) | Team names, colours, logos | `teams/teams-meta.service.ts` |

Measured MLB response sizes, compressed as Node `fetch` receives them: a finished game's
live feed ≈ **141 KB** (863 KB raw); `winProbability` ≈ **131 KB** (1.09 MB raw). **A poll
job makes 2 MLB calls** (feed + win probability; win probability's 30 s cache rarely helps).

## 4. Backend traffic with no clients

Assumes a regular-season day: ~15 games of ~3 h each.

| Source | MLB requests / day |
|---|---|
| Seeded polls: ~15 games × ~3.5 h × every 15 s × 2 calls | ~25,000 |
| Alert feed: schedule every 30 s + each live game's feed | ~8,000 |
| Clip ingest | ~3,000 |
| Seed reconciler: schedule every 5 min | ~600 |
| Statcast, season pulse, ESPN, career lookups | hundreds |
| **Total** | **~37,000 requests, ~4–5 GB** |
| Claude (in-game insights, ≤ ~1/min per live game) | ≤ ~2,700 calls |

**Before the Oct 10 fix it was ~3.5 M MLB requests and ~470 GB a day.** The old seeding added
a 15 s job per game at every API restart and never removed any: 1,058 had piled up since
December 2025, saturating the 5 workers (~1,200 jobs/min, ~1,000 always waiting) with polls of
long-finished games. **After the seeding fix: 20 jobs/min, 0 waiting** — all of it one open
browser tab's 3 s viewer poll of a finished game; **after the finished-game fix (§6): 0
jobs/min** with that tab still open. On a day with no games, background traffic is close to zero.

Re-measure (Redis):
```bash
r() { docker exec baseball-redis redis-cli "$@"; }
a=$(r GET bull:game-poller:id); sleep 60; echo "jobs/min: $(( $(r GET bull:game-poller:id) - a ))"
r ZCARD bull:game-poller:repeat; r LLEN bull:game-poller:wait; r ZCARD bull:daily-poller:repeat
```

## 5. Impact of a single client

| Action | Backend cost |
|---|---|
| **Watching a live game** | Adds a 3 s poll: ~40 MLB calls (~5 MB) a minute while open, plus one full-feed `hydrate` on joining. Shared — more viewers of the same game add nothing. Stops itself once the game is final |
| Opening a finished game | One `hydrate` (2 MLB calls) plus a tick or two of polling before it stops (§6) |
| Opening a page | Typically 5–20 MLB calls, many cached 20 s – 6 h; Home and Player are the heaviest |
| Games page with live games | The date's daily poller at 3 s: schedule + each live game's feed |
| Home's Following cards | ~1 cached feed call per followed live team / player every 30 s |
| Alert bell (every 30 s) | No MLB calls — served from memory |
| A Baseball IQ question (`POST /iq/ask` or `/iq/query`) | 2 Claude calls + 1–5 MLB calls (grounding, cached 5 min) |
| Logos, photos | None |

One viewer of one live game ≈ 2,400 MLB calls an hour — about 7% of a whole day's background
traffic per game-hour — shared by everyone watching that game.

## 6. Done Oct 10 (committed and pushed)

- **Seeding reconciler** — `280711f`, `api/src/poller/poller.bootstrap.service.ts` (§2/§4).
  A reconciler test (fake queue + schedule) passed: adds live and about-to-start games, no
  churn on a second run, removes stale jobs, keeps a game 30 min after it goes final, then
  drops it. In production the poll rate went from ~1,200 to 20 jobs/min (the remaining 20
  were the finished-game viewer poll the next fix removed).
- **Viewer polls stop on finished games** — `4ad4fd6`, `api/src/poller/poller.processor.ts`.
  A viewer's 3 s `poll` job removes itself once its game is final and every pitch has been
  sent (`hydrate` already gave the viewer the whole game). Seeded `poll-game` jobs keep their
  30-min post-final tail. Verified: an open tab on finished game 849832 re-joined, its poll
  stopped itself within a couple of ticks, and the page still showed all 87 at-bats.

## 7. Open items for the next agent

1. **Old SDK package on GitHub Packages** — `@bitslinger21/baseball-realtime-client` should be
   deleted; it needs the user to grant scopes first
   (`gh auth refresh -h github.com -s read:packages,delete:packages`).
2. **`future.md` housekeeping** — F-007 (Scout mode) looks already built but is still listed;
   F-011 (alert settings / mute), injured-list markers in the History game log, and merging
   Home's "What's hot" detector onto the alert bell's have no entries yet.
