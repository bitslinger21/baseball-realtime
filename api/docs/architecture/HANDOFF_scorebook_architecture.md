# Handoff — Scorebook architecture & backend traffic

**As of Oct 10, 2026 · describes the code at `main` @ `4ad4fd6` (later commits only edit this doc).**
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
  schedule plus each live game's feed, **every 3 s** — the gateway always starts it at the
  `'live'` cadence and nothing slows it, even when no game is live (see §7).

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
live feed ≈ **141 KB** (863 KB raw); `winProbability` ≈ **131 KB** (1.09 MB raw).

**What one poll job costs (from the code):**
- the live feed — every poll (uncached);
- win probability — cached 30 s per game, so about once per 30 s however often it's polled;
- **3 schedule calls** (today, yesterday, tomorrow; uncached) — only on a poll that finds a new
  or changed pitch (`findScheduleMeta`). In a live game that is most polls; a finished game's
  polls find nothing and stop after the feed.

## 4. Backend traffic with no clients

**Estimated from the code, not measured.** Assumes a regular-season day: ~15 games of ~3 h
each (~3.5 h seeded, with the 30-min lookahead).

| Source | Per live game | MLB requests / day |
|---|---|---|
| Seeded polls (15 s): feed 4/min + win prob 2/min + schedule ~3 calls × ~2.5 changed polls/min | ~13.5 calls/min | ~42,000 |
| Alert feed: schedule every 30 s + each live game's feed | | ~8,000 |
| Clip ingest: once a minute per live game + a few after the final | | ~3,000 |
| Seed reconciler: schedule for 2 dates every 5 min | | ~600 |
| Statcast, season pulse, ESPN (daily), career lookups | | hundreds |
| **Total** | | **~55,000 requests, roughly 3–4 GB** |
| Claude (in-game insights, at most ~1/min per live game) | | ≤ ~2,700 calls |

**Before the Oct 10 fix it was ~3.5 M MLB requests and ~470 GB a day** — derived from the
measured job rate (~1,200/min, almost all finished games: feed + win probability each) × the
measured response sizes. The old seeding added
a 15 s job per game at every API restart and never removed any: 1,058 had piled up since
December 2025, saturating the 5 workers (~1,200 jobs/min, ~1,000 always waiting) with polls of
long-finished games. **After the seeding fix: 20 jobs/min, 0 waiting** — all of it one open
browser tab's 3 s viewer poll of a finished game; **after the finished-game fix (§6): 0
jobs/min** with that tab still open. On a day with no games, background traffic should be close
to zero — no game is live, so nothing is seeded — but that is inferred from the code, not
measured.

Re-measure (Redis):
```bash
r() { docker exec baseball-redis redis-cli "$@"; }
a=$(r GET bull:game-poller:id); sleep 60; echo "jobs/min: $(( $(r GET bull:game-poller:id) - a ))"
r ZCARD bull:game-poller:repeat; r LLEN bull:game-poller:wait; r ZCARD bull:daily-poller:repeat
```

## 5. Impact of a single client

| Action | Backend cost |
|---|---|
| **Watching a live game** | Adds a 3 s poll: **~23 extra MLB calls a minute** (~20 feeds; win probability is shared through its cache; ~3 more schedule calls as changes are caught sooner), plus one `hydrate` (feed + win probability) on joining. Shared — more viewers of the same game add nothing. Stops itself once the game is final. *Estimated from the code, not measured* |
| Opening a finished game | One `hydrate` (feed + win probability) plus a tick or two of polling before it stops (§6) — verified |
| Opening a page | Rough estimate, not measured: 5–20 MLB calls, many cached 20 s – 6 h; Home and Player are the heaviest |
| **Games page open** | The date's daily poller every 3 s: 1 schedule call + 1 feed per live game → ~20 calls/min with no game live, ~180/min with 8 live. *From the code* |
| Home's Following cards | Refresh every 30 s; ~1 cached feed call (20 s TTL) per followed live team / player. *From the code* |
| Alert bell (every 30 s) | No MLB calls — served from memory |
| A Baseball IQ question (`POST /iq/ask` or `/iq/query`) | 2 Claude calls + 1–5 MLB calls (grounding, cached 5 min) |
| Logos, photos | None |

One viewer of one live game ≈ ~1,400 extra MLB calls an hour (estimate) — about 2.5% of a whole
day's estimated background traffic per game-hour — shared by everyone watching that game. An
open Games page on a busy night can cost more than that.

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
2. **Daily poller never slows down** — `daily-poller.processor.ts` runs every 3 s for as long
   as a Games page is open, even when no game is live (~20 schedule calls a minute for nothing).
   It should drop to the 60 s `cold` cadence (already defined in `poller.producer.ts`) when no
   game on that date is live.
3. **Not yet measured** — the §4 and §5 per-game figures are estimated from the code. To measure,
   count the API's outbound MLB requests during a live game, with and without a viewer.
4. **`future.md` housekeeping** — F-007 (Scout mode) looks already built but is still listed;
   F-011 (alert settings / mute), injured-list markers in the History game log, and merging
   Home's "What's hot" detector onto the alert bell's have no entries yet.
