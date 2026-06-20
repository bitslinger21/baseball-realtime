# Baseball Realtime — Design Project

This project holds the holistic redesign of the **Baseball Realtime** application: a daily-games landing page, a live game view, and a per-player profile view with five tabs.

## Status

**Direction chosen and committed:** "Editorial scorebook" — warm cream foundation, DM Sans for UI, JetBrains Mono for ALL numerals. One design language across every screen.

A handoff package for Claude Code has been generated at `design_handoff_baseball_realtime/` (folder + README) and is ready to ship to a developer.

## Files of record

The live design — **all work happens here**:

```
Holistic.html              — entry point; loads everything below
design-canvas.jsx          — review-only canvas wrapper
holistic/shared.jsx        — design tokens (window.T), teams, atoms
holistic/foundations.jsx   — design-system swatch page (review-only)
holistic/landing.jsx       — Today's Games screen
holistic/game.jsx          — Game view screen (ORIGINAL v1 — superseded)
holistic/game-v2.jsx       — Game view v2 (SIGNED OFF — the current game view)
holistic/player.jsx        — Player view (Overview/Stats/Splits/Pitching/History tabs)
holistic/player-upcoming.jsx — Player view · Upcoming tab (window.UpcomingTab — next-3-games matchup projection; SIGNED OFF Jun 5, 2026)
holistic/app.jsx           — DesignCanvas assembly (review-only)
```

`game-v2-wireframe*.jsx` are the low-fi wireframes that led to v2 — reference only.

`holistic/game-position.jsx` + `Game Position — Live & Replay.html` are a **standalone prototype** (not loaded by `Holistic.html`) for the game-view **play-head** model — one position the whole screen reflects, in two modes: **Live** (open-at-live-PA + auto-follow/break + "Jump to live" pill — Part 1, written up as **MIGRATION PR 11**, closes BUG-009) and **Replay** (transport + scrub rail, with an at-bat-timeline rail that ships today and a win-prob-arc rail gated on data — Part 2, parked in `future.md` **F-002**). Designed Jun 12, 2026.

Older exploration files exist (`index.html` for scoreboard variations, `Page Layouts.html` for early page-layout options) — keep them as reference but **don't iterate on them**. All current work is in `Holistic.html`.

## Game view v2 — SIGNED OFF (May 30, 2026)

`holistic/game-v2.jsx` replaced the original game view. Final structure, top to bottom:

- **Dark line-score band** (full width): three zones — line score (innings 1-9 + R/H/E, current inning highlighted rust) · scoring summary (capped at 3 plays + "+N more" link) · game leaders (top batter each side). Fixed height; nothing scrolls in the band.
- **Two-column row** (above the fold): left = sticky `MatchupLeft` card; right = `PitchByPitchV2` with INTERNAL scroll (640px frame).
  - `MatchupLeft` = light play-state eyebrow (inning · bases · B/S/O pips · **"Lineups ▾" button** on the right) → zone + batter card side by side → dark "Last pitch" headline (no longer carries the count; eyebrow does). NOTE: the LIVE pill is NOT here — there's exactly one LIVE pill on the screen, in the PageTitle. **The batter card carries an "At-bats" scorebook row** (added Jun 7, 2026): the "Today" line is trimmed to just the summary (`1-for-4`), and below it a horizontally-scrolling row of **scorebook diamond cells** — one per plate appearance today — visualizes each at-bat (inning label · diamond tracing bases reached · result code). Newest/live PA is the last cell (neutral dashed, NOT rust). Uses the shared `ScorebookCell` atom (see Tokens/atoms). The scroll container needs `min-width:0` down the chain so it clips/scrolls inside the lane instead of expanding the batter-card column (that was the overlap bug).
  - `PitchByPitchV2` = newest PA at top; live PA expanded with chronological pitch table; finished PAs collapsed (click to expand). Filter `Segmented`: All / Runs / K / HR / BB (no "Outcomes"). **Scoring chip:** any PA that scored shows a soft-**green** pill (`positiveSoft`/`positive` — scoring is the positive event; rust is reserved for live/hot) to the right of the outcome — "N run(s) score · [resulting score]" (e.g. "2 runs score · HOU 8 – 5 CHC"), runs in green + score in mono.
- **Pitcher card** ("On the mound") full width below the fold.
- **Win probability timeline + Leverage** — two HALF-WIDTH cards side by side. Win prob is a split-fill line chart (rust above 50% = leader HOU at top, navy below = CHC at bottom), with axis team anchors + a "How to read" caption; header shows whoever's currently favored. Leverage kept as its own card with a scale bar and plain-language explanation.
- **Lineup** moved OFF the page; the "Lineups ▾" trigger lives in the play-state eyebrow (right slot, above the zone). **Lineup tray now built** (`LineupsTray` in `game-v2.jsx`): right-side slide-in contained to the game screen, dim backdrop, closes via ✕/Esc/backdrop, reverse-animates on close. One team at a time (Astros/Cubs toggle). Three sections — **Lineup / Bench / Bullpen** — with a slot gutter (1–9 + P) and a **substitution tree** (subbed-out starter stays greyed in Lineup; incoming player(s) indent beneath sharing one connector; multiple subs at a slot stack at the SAME indent, last = active; subbed-out players also listed on Bench; a pulled pitcher goes to Bench not Bullpen). Stats: dedicated aligned line column + faint single-row PA sequence; pitcher BB/HBP when non-zero; **IP formatted as thirds** (`5 2/3`, even innings drop the fraction) — also propagated to the `PitcherCard`.
- **Matchup context card** (`MatchupContext`) fills the space below `MatchupLeft`: left half = head-to-head (batter vs pitcher on the mound, Today + Career lines); right half = Due up (On deck / In the hole). The whole left column is one sticky wrapper so both cards travel together.
- **One header, one return** (decision): a single header bar owns one labeled contextual return ("← Today's games"); no stacked global "Back".
- **Real assets:** `TeamDot`/`TeamMark` render real MLB team logos (`mlbstatic.com/team-logos/{id}.svg`, ids on `window.TEAMS`) with the letter-mark as fallback; `Headshot` renders real MLB player photos at a portrait aspect (object-fit cover, center top) with initials as fallback. In the target app, logos + headshots already exist from prior iterations. **`Headshot` now lives in `shared.jsx` as a global atom (`window.Headshot`)** — promoted out of `game-v2.jsx` on June 2 so every screen uses ONE non-clipping rule (see “Global rules” below).

Strike zone geometry was reworked in `shared.jsx`: tall box (~0.77:1), full zone-width home plate drawn in perspective (side edges converge to the same vanishing point as the splayed batter's-box lines), dot-clamping so pitch dots never clip. **Port verbatim — don't reimplement** (Claude Code's first attempt rebuilt it and lost the plate/perspective/lines).

## Handoff status (updated June 7, 2026)

**Jun 7, 2026 — At-bats scorebook row added → handoff PR 10.** New `ScorebookCell` shared atom + the game-view batter-card "At-bats" row (see game-view spec above). Synced into the handoff: CLAUDE.md spec, README (component table + §2 game-view spec), MIGRATION **PR 10** (net-new, NOT gated on new API data — uses the existing play-by-play feed), and the handoff design-file copies (`shared.jsx`/`game-v2.jsx`/`foundations.jsx`/`app.jsx`) re-synced from live `holistic/`. Stroke-weight enhancement parked in `future.md` F-003.

**Jun 9, 2026 — PR 10 PORTED + SIGNED OFF.** Shipped to the app and signed off. The first port rendered the row but left the diamonds empty (every PA showed a "–" code) — root cause was `parsePA` matching human-readable text instead of the backend's normalized event ENUM (`'Single'`/`'Out'`/`'HomeRun'`/`'HBP'`…); fixed by mapping on exact enum equality first. No new endpoint, no field-name mismatch (confirmed `playResult` flows via `PlayUpdateWire → toPlayWire() → atBat.result`). The port gotcha is logged in MIGRATION.md PR 10 so a re-port won't reintroduce it. Foundations artboard crop fixed in `holistic/app.jsx` (1320 → 1480, handoff copy synced). Generic `'Out'` enum renders the truthful `OUT` code (richer K/F8/6-3 out-coding needs out-type + fielder data — parked `future.md` F-005). Claude Code's stray `holistic/*.jsx` design files were removed from the app repo by the user.

Handoff package at `design_handoff_baseball_realtime/` is refreshed for game view v2 (real-asset `shared.jsx` + `game-v2.jsx`, scoring chip, Lineups-in-eyebrow). README §2 + MIGRATION.md PR 3 rewritten, including a "fidelity notes" block. **Target-app progress: PR 1 (tokens/fonts) DONE, PR 2 (landing) DONE, PR 3 (game view) DONE, PR 4 + PR 6 + PR 7 (player view — all five tabs) DONE & APPROVED in-app (Jun 5, 2026).** The corrective pass closed the first-attempt fidelity gaps (StrikeZone ported verbatim, logos/headshots wired, names un-clipped, line-score per-inning runs mapped). **The win-probability + leverage row was split out of PR 3 into a new PR 3.5** (the only remaining game-view work) because it's gated on new API data — win-prob time series + leverage index — not on design. PR 3's structure now ends at `PitcherCard`; the analytics row renders only once PR 3.5 lands (feature-check stub, below the fold, no layout hole). See MIGRATION.md PR 3 + PR 3.5. A `client/CLAUDE.md` + root pointer were set up so Claude Code sessions auto-ground.

**Player-view handoff (June 1, 2026):** package design files re-synced from the live `holistic/` (notably `player.jsx` now uses `FormGuide` per-game total-bases bars in Recent form, not the old `Sparkline` — README §3 Tab 0 corrected to match). Player header carries the contextual "← Back to game" return (AppHeader `right` slot, same pattern as the game view's "← Today's games"). **PR 4 + PR 6 + PR 7 (the full player view — Overview, Stats, Splits, Pitching, History) are PORTED, REVIEWED IN-APP, and APPROVED (Jun 5, 2026).** All five tabs render their real bodies at parity with `holistic/player.jsx`. Open issues found during the in-app review are tracked ONLY in `bug-list.md` (root) — BUG-001…009 — not as outstanding PR work. **PR 5 (sweep + polish) is DONE (Jun 5, 2026 — dev-verified via grep-to-zero; no design gate, no visual change). PR 8 (Jun 3 polish pass — Headshot chin-clip fix, landing date-aware title + live-inning + "FINAL (N)", game-view pregame state + "← Back to games" relabel) is DONE & SIGNED OFF (Jun 5, 2026).**

**Upcoming tab — SIGNED OFF (June 5, 2026):** a **sixth player tab** (`holistic/player-upcoming.jsx`, `window.UpcomingTab`) projecting the player's next 3 games against the probable starter. **Design complete and signed off; tab order settled as LAST (after History).** Structure: a 3-game **selector rail** drives a **deep-dive that swaps** (NO nested tabs) — head-to-head card (with a first-class **"first meeting" empty state**), pitcher arsenal snapshot, a plain-language "read" with a batter↔pitcher edge meter, the star **"Arsenal vs your bat"** table (his pitch mix × batter pitch-type performance, KEY THREAT auto-flag), matchup splits, location heat-map overlay, and a single **"Sample data · live feed pending"** header flag while on mock data. Handoff = **MIGRATION PR 9** + **README §3 Tab 5** — design is signed off but the PR remains **gated on new API data** (schedule lookahead, probables, pitcher arsenal, batter×pitch-type, batter-vs-pitcher H2H with a null path), same posture as PR 3.5 / 6.5. The port that shipped to the live app was from a PRE-FIX build — MIGRATION PR 9 carries a numbered "fidelity deltas" re-sync list.

## Key decisions made

- **"Today's games"** — landing title; "slate" was rejected as jargon
- **No box score, no timeline** on the game view — removed during the design pass
- **Strike zone (left) + batter card (right)** is the game-view hero, with the dark "Last pitch" headline strip below
- **At-bats scorebook row** (in the batter card) — each of today's PAs as a scorebook diamond cell (`ScorebookCell` atom); the "Today" line shows only the summary, the per-AB results live in the diamonds. Live PA is neutral, not rust. Enhancement parked in `future.md` F-003 (bold PA-result stroke vs. lighter later-baserunning stroke).
- **Pitch-by-pitch list** is the primary scrolling content on game view (newest PA at top, current PA expanded with per-pitch table; scoring chip on run-producing PAs)
- **Lineup** moved to the play-state eyebrow trigger on game view v2 (was a reference card in v1; was briefly in the header before moving to the eyebrow)
- **One LIVE pill** on the game view (PageTitle) — the second one (eyebrow) was replaced by the Lineups button
- **Player hero is full-width** — killed the awkward left sidebar from the original
- **Overview = story.** Recent form, hot zones, "Now" context pills, Last 5 games, Notable milestones. NO comprehensive stat grids.
- **Stats = reference.** Sectioned cards each containing a **table** (NOT card grids) with columns: Statistic | 2026 | League | Δ | Percentile bar. User feedback was clear: card-grids felt chaotic; table form is what they want.
- **Pitching tab** — SIGNED OFF + PORTED + APPROVED IN-APP (Jun 5, PR-6) as the rich five-card "how pitchers attack this batter" (donut + table + heat map + count-attack grid). **BUT** the in-app port exposed **BUG-011**: that design is a single-player Peña mock with no per-`:mlbId` data path, and the rich cards (pitch-mix, whiff, location heat map, counts) have **no backing data in the current API** — wiring them needs a new Statcast/Savant ingest. **Decision (Jun 20, 2026): option 2 — "redesign down."** The live `PitchingTab` in `holistic/player.jsx` is now a **lean, player-specific** tab built only from real slash splits (Performance by pitch type · By pitcher hand, + a "Coming with pitch-level data" parked strip); the rich version is parked as `PitchingTabFull` to restore when Savant data lands (handoff PR 6.5). **Data-source correction (Jun 20): the "Performance by pitch type" card is NOT from `splits` group=pitchType (that returns zero rows for batters) — it's aggregated server-side from the `pitchLog` stat type, wired in handoff PR 6.6 (`PROMPT_pitching_pitchtype_wiring.md`, net-new + ungated, no Savant). The first port shipped with that card empty (subtitle "189" = the handedness sum); PR 6.6 supplies its data. Handedness card works.** _Design pending sign-off; port: handedness card landed, pitch-type card pending PR 6.6._ For an actual pitcher's view, the tab needs a separate design.
- **"Enter game"** = navigate to game page; **"Pitch-by-pitch"** = open live feed for that game

## Tokens (the foundation)

Defined in `holistic/shared.jsx` on `window.T`:

| Surface         | Type            | Accents                                      |
|-----------------|-----------------|----------------------------------------------|
| `bg #f4f1ea`    | DM Sans (UI)    | `accent #b8421e` (rust — live/hot)           |
| `surface #fcfaf6` | JetBrains Mono| `positive #4a7c3e` (green — wins)            |
| `surfaceAlt #efeae0` | (numerals) | `info #2c4a78` (navy)                        |
| `ink #15161a`   |                 | `highlight #c8941c` (gold — streaks)         |

**The single most important rule: ALL numbers use mono + `font-variant-numeric: tabular-nums`.** Slash lines, scores, stats, table cells — everything numeric. Sans is for labels and prose only.

**Global rule — player photos never clip the chin.** Always render people through the shared `Headshot` atom (`window.Headshot` in `shared.jsx`), never a hand-rolled square. It frames the photo PORTRAIT (taller than wide) with `object-position: center top` so the crop keeps the face. A 1:1 square on a head-and-shoulders photo cuts off at the mouth. `ratio` (height/width, default 1.28) tunes how tall; the player hero uses `1.18`.

## What's still open

_Player view is built across all SIX tabs, **all signed off** — Overview/Stats/Splits/Pitching/History (PR 4 + 6 + 7) and Upcoming (Tab 5, signed off Jun 5). Issues from the in-app review live in `bug-list.md`._

- **Mobile breakpoints** — not designed
- **Empty / loading / error states** — not designed
- **Slide-in Alerts panel** — discussed but not built in the holistic version
- **Postgame state** for the game view (no live at-bat) — not designed
- **Actual pitcher's Pitching tab** — current design is "vs pitcher" for a batter only (separate, undesigned screen — open question #4)
- **Pitch-by-pitch live-follow behavior (game view)** — **PORTED & SIGNED OFF Jun 14, 2026** (handoff MIGRATION PR 11). Open-at-live-PA + auto-follow/break + "Jump to live" pill; closes BUG-009 (and BUG-008 via the `isLive` gate). The port's real defect turned out to be a **replay drip-feed gate running on the live feed** (history revealed one AB at a time on the replay timer — the feed visibly "played back" from inning 1); fix = render full history in one paint for live/non-replaying games, scope the incremental-reveal timer to active replay only. Ordering + open-at-`scrollTop:0` were already correct once the drip-feed was removed.
- **Game-view position persistence (resume where you left off)** — **PORTED & SIGNED OFF Jun 14, 2026** (handoff MIGRATION PR 12). Final/replay games restore the exact feed scroll + expanded PA; live games return to the live edge (re-arm following). Session-scoped (in-memory / `sessionStorage`, not `localStorage`); a hard refresh falls back to the PR 11 default. Closes BUG-010; no new API.
  - **⚠️ PORT POSTMORTEM (Jun 14, 2026).** The consolidated `PROMPT_position_model.md` got the dev to the right ordering/open targets, but the port still failed repeatedly on a defect the spec didn't name: a **replay drip-feed gate in the default render path**. The whole loop was prolonged by **instrumentation reading the data array, not the DOM/pixels** — the data was newest-first while the screen looked wrong, sending us chasing a phantom list/CSS reversal. What finally cracked it: a `getBoundingClientRect` pixel probe (current AB at the top, y=383; inning 1 at the bottom) proved ordering was fine, and the user's plain description ("it plays back from the first inning") identified the drip-feed. **Lesson: instrument rendered geometry, not internal arrays; and the replay/drip-feed gate must be replay-only — now baked into the spec's CRITICAL + `isLive` sections.**
- **Scout mode (game view, finals)** — **AGREED Jun 20, 2026**, recorded in `future.md` **F-007**. One play head; **Play/Pause toggles Replay↔Scout** (Replay = pitches auto-advance, Scout = paused/analyze); finals open in Scout paused at game start; clicking a **pitch-feed PA** or a **batter-card scorebook cell** seeks the head to that AB's end; the head is a **past/future boundary** on both the feed and the scorebook row. No new API — reuses the existing feed + atoms. Ungated, near-term build.
- **Replay transport + scrub rail (game view)** — **DESIGNED Jun 12, 2026** (same prototype, Replay mode) as **Part 2**, parked in `future.md` **F-002**. **Re-framed Jun 20:** the transport graduated into F-007 (Scout mode); F-002 is now the **scrub-rail tier only** — the compact at-bat rail (a nicety; the feed already does game-wide seek) and the draggable/continuous timeline (→ win-prob-arc rail, gated on the PR 3.5 data).
- **Win prob + Leverage row (game view)** — **design SIGNED OFF Jun 20, 2026** (incl. the Jun 20 axis refinements: Y-axis reads **100/50/100** — each end = its anchored team's win %; **X-axis tracks the play head** — spans only innings played, not a fixed 1–9; **every-inning ticks**). Split to handoff **PR 3.5**. **Re-scoped Jun 12, 2026:** NOT a new integration — `winProbability` + `leverageIndex` already exist in the raw MLB `feed/live` JSON, just unmapped; the lift is ~3 backend changes each (type → mapper → wire field). Gated on that mapping, not on design.
- **Pitching tab filter rail wiring** — design is done (rail renders, inert); split to handoff **PR 6.5**, gated on new API data (per-filter pitch-level data), not on design
- **Upcoming tab data wiring** — **COMPLETE & SIGNED OFF (Jun 6, 2026).** PR 9.5a (MLB-data tier) + PR 9.5b (Statcast tier) both done & signed off; the tab is fully data-driven and the "Sample data" pill is removed. Undesigned edge states (sparse rookie / TBD probable / no games) parked in `future.md` (F-001).

## Working style preferences observed

- User wants restructuring, not just restyling. "Don't think the content or layout of each page is fixed."
- User reviews one screen at a time and signs off ("looks good") before moving on
- User dislikes jargon ("slate"), small fonts, "chaotic" card grids, and overlap between screens
- User prefers table form for dense reference data; card form for story/highlight content
- Approve-as-you-go cadence is working — don't try to design everything at once

## If continuing this work

1. Open `Holistic.html` and confirm the user's current screen of focus
2. Edit the relevant file in `holistic/` only — never edit copies elsewhere. **Game view = `game-v2.jsx`** (`game.jsx` is superseded); landing = `landing.jsx`; player = `player.jsx` (Overview…History) + `player-upcoming.jsx` (Upcoming tab); tokens/atoms = `shared.jsx`
3. Use the existing atoms (`Card`, `Stat`, `Pill`, `Th`/`Td`, `Tabs`, `Segmented`, `Bases`, `Pips`, `Inning`, `StrikeZone`, `TeamDot`/`TeamMark` (real MLB logos via `window.teamLogoUrl`), `Sparkline`, `Headshot`, `ScorebookCell`) — don't reinvent. `Headshot` and `ScorebookCell` are global atoms in `shared.jsx` (`window.Headshot`, `window.ScorebookCell`)
4. Hold the line on mono-for-numbers
5. After each change call `done` with `Holistic.html`, then `fork_verifier_agent`

## If shipping to dev

The handoff package at `design_handoff_baseball_realtime/` is the deliverable. It contains:
- `README.md` — design spec (tokens, components, screen specs, interactions, caveats)
- `MIGRATION.md` — codebase-specific integration plan for the target React 19 + Vite 7 + TypeScript client (token find-and-replace map, component diff, PR-sized chunks)
- The HTML/JSX design files for review

Re-generate either doc if the design moves further.

## Target codebase context (gathered May 25, 2026)

The redesign is being ported into the `baseball-realtime/client/` app:
- React 19, Vite 7, TypeScript 5.9, react-router-dom v7, Yarn 4
- Vanilla CSS files per component; no Tailwind / no CSS-in-JS / no UI lib
- Generated API client `@bitslinger21/baseball-realtime-client`, socket.io-client
- App shell is `<main className="app-main"><AppRoutes /></main>` — no global topbar
- Routes: `/` (DailyGamesPage), `/game/:providerGameId` (GamePage), `/player/:mlbId` (PlayerPage), plus `/standings`, `/leaders`, `/settings` (out of scope)
- Two coexisting gray scales today (Tailwind-ish in shell, Chakra-ish in `AtBatCard`) — both replaced by the new token set
- Today's `DailyGamesPage` is a 900-line hybrid (list + inline live feed); per the migration decisions it becomes a pure list (~200 lines)

## Migration decisions (final, May 25, 2026)

1. **Landing is pure list** — every card (incl. scheduled) navigates to `/game/:id`. Inline live-feed panel is killed.
2. **Late Game Focus toggle** stays, restyled as a filter chip.
3. **No multi-game watching UI**, but `useRealtimeGame` plumbing and the GamePage watching strip stay in code for a future feature.
4. **Replay (▶/⏸) for final games** stays, lives only on GamePage now.
5. **Standings / Leaders / Settings** — out of scope; will look visibly older after the redesign ships.
6. **Team-color left border** on game-card rows preserved (home team primary color, 4px in new design).
7. **No global topbar** today; each page owns its own `PageTitle`.
