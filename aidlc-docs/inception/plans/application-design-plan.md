# Application Design Plan

## Scope

Units 1–6 modify existing components within existing boundaries — no Application Design required.
Units 7–10 introduce genuinely new components and service methods. This plan covers those.

**New components in scope**:
- `StandingsModule` — backend (controller, service, DTO)
- `StandingsPage` — client (replaces stub)
- `PlayersService.getPlayerSplits()` + `PlayerSplitsDto` — backend
- Splits tab content in `PlayerPage` — client
- `AlertHistoryPanel` — client component
- `BatterOverviewTodayDto` enrichment — backend service logic

---

## Plan Checkboxes

- [x] Collect user answers to all questions below
- [x] Resolve any ambiguities from answers
- [x] Generate `components.md`
- [x] Generate `component-methods.md`
- [x] Generate `services.md`
- [x] Generate `component-dependency.md`
- [x] Generate consolidated `application-design.md`

---

## Design Questions

> **Instructions**: Fill in the `[Answer]:` lines below. Brief answers are fine — one sentence or a choice label is enough. Do not remove any questions.

---

### Q1 — Standings: Where does team branding enrichment happen?

The execution plan says the standings page should display team logos and colors using `TeamsMetaService` branding.

Option A: **Server-side enrichment** — `StandingsController` injects `TeamsMetaService` and returns a `StandingsDto` that already includes `logo`, `primaryColor`, `secondaryColor` per team row. The client receives everything it needs in one call. This is consistent with how `GamesController.listByDate()` already returns enriched `GameViewDto`.

Option B: **Client-side enrichment** — `StandingsController` returns plain standings (abbreviation, wins, losses, PCT, GB only). The client resolves branding via the existing `GET /teams` or `GET /games?date=today` response it already has cached. Simpler backend, but the client needs an additional lookup or must already have the branding in memory.

[Answer]: A

---

### Q2 — Standings: Division grouping on the server or client?

The MLB Stats API returns all divisions in one call. The response needs to be split into AL East / AL Central / AL West / NL East / NL Central / NL West for display.

Option A: **Server groups** — `StandingsService` produces a `StandingsDto` shaped as a map of division name → team array. The client just renders the groups it receives.

Option B: **Client groups** — `StandingsService` returns a flat array of `StandingTeamDto` rows with a `divisionName` field. The client groups by division name when rendering.

[Answer]: B

---

### Q3 — Standings page layout preference

How should AL and NL be displayed on the `StandingsPage`?

Option A: **Side-by-side columns** — AL divisions on the left half of the page, NL divisions on the right. Works well on wide screens, but may feel cramped on narrow viewports.

Option B: **Stacked sections** — AL section (3 division tables stacked), then NL section below. Simpler and more responsive-friendly.

Option C: **Tabbed** — An AL / NL tab toggle at the top, showing one league at a time.

[Answer]: A

---

### Q4 — Player Splits: Which split categories to include?

The MLB Stats API `/stats?stats=statSplits` returns dozens of split types. The execution plan mentions: vs LHP, vs RHP, home, away, day, night.

Option A: **Exactly those 6** — vs LHP, vs RHP, home, away, day, night. Simple and focused.

Option B: **Hits only** — vs LHP and vs RHP only (the most commonly referenced splits for batters). Minimalist first implementation.

Option C: **Extended** — Include the 6 above plus month-by-month or bases-empty/runners-on splits if the API returns them.

[Answer]: A

---

### Q5 — Player Splits: Stat columns to display

Which batting stats should appear in the splits table?

Option A: **Core rate stats** — AVG / OBP / SLG (plus PA or AB for context).

Option B: **Extended** — AVG / OBP / SLG / OPS / HR / RBI / PA. More complete but wider table.

Option C: **Match the existing Stats tab columns** — Whatever columns the current season stats view already shows, for visual consistency.

[Answer]: B

---

### Q6 — Player Today: Team ID lookup strategy

`PlayersService.getBatterOverview()` currently calls `MlbApiService.getPlayer(mlbId)` which returns the MLB player object. The MLB player API response includes `currentTeam.id` (a numeric MLB team ID).

Option A: **Use `currentTeam.id` from player profile** — After fetching the player, use `player.currentTeam.id` to call `getScheduleByDate(today, teamId)`. This is a targeted lookup and avoids scanning all games. Requires the MLB schedule API to accept a `teamId` filter (it does).

Option B: **Scan all games for today** — Fetch all of today's games and find one where `homeTeam.id === player.currentTeam.id || awayTeam.id === player.currentTeam.id`. More calls but avoids relying on the teamId filter.

[Answer]: B

---

### Q7 — AlertHistoryPanel: Collapse behavior

The requirements say the panel should be "collapsible" and "collapsed by default."

Option A: **In-page collapsible section** — A `<details>`/`<summary>` or a toggle button that expands a list below the existing alerts strip within `GamePage`. No overlay.

Option B: **Slide-in drawer** — A side drawer or bottom sheet that slides in over the existing content when triggered. Keeps the main layout clean but adds more animation complexity.

[Answer]: B

---

### Q8 — AlertHistoryPanel: Load timing

When should the alert history be fetched?

Option A: **On mount** — Fetch `GET /alerts?gameId=:id` immediately when `GamePage` mounts, regardless of whether the panel is open.

Option B: **On first expand** — Fetch only when the user first opens the alert history panel. Avoids an extra API call if the user never opens it.

[Answer]: B

---

### Q9 — AlertHistoryPanel: Live update behavior

Should the alert history list update in real-time as new alerts arrive during the game?

Option A: **Yes — merge incoming WebSocket alerts** — When a new alert arrives via the existing socket feed, append it to the history list if the panel is open. The `useRealtimeGame` hook already has `alerts` state.

Option B: **No — static snapshot at load** — Fetch once at mount/expand; user can refresh manually. Simpler for a first implementation.

[Answer]: B

---

### Q10 — StandingsPage: Season parameter

Should the standings endpoint support a `?season=YYYY` query parameter for historical seasons, or always return the current season only?

Option A: **Always current season** — No season parameter. The backend derives `new Date().getFullYear()` internally. Simpler.

Option B: **Season parameter with current-year default** — `GET /standings?season=YYYY` where season defaults to the current year if omitted. More flexible; the client can pass the current year explicitly or omit it.

[Answer]: B
