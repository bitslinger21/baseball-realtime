# Migration Guide — Holistic Redesign → Baseball Realtime Client

> Companion to `README.md`. The README documents **what the redesign is**.
> This doc documents **how to integrate it into the existing client codebase.**

**Target codebase:** `client/` — React 19 + Vite 7 + TypeScript 5.9 + react-router-dom v7, vanilla CSS files per component. No CSS-in-JS, no Tailwind, no UI library.

**This is a prod-bound migration.** No `/v2` parallel routes — we replace contents of existing route components.

---

## 1. Settled product decisions

Before reading the rest of this doc, internalize the decisions baked into the redesign. These came out of design review and are final unless re-opened:

| # | Decision | Implication for migration |
|---|---|---|
| 1 | **Landing page is pure list.** No embedded live-feed panel. Clicking any game (including scheduled games) navigates to `/game/:providerGameId`. | `DailyGamesPage.tsx` drops from ~900 lines to a list-only page. The right-column `<div className="live-feed daily-live-panel">` and its entire subtree are deleted. ResizeObserver / `livePanelHeightPx` / `feedScrollHeightPx` / `liveFeedFrameRef` all go. |
| 2 | **Late Game Focus toggle stays.** Redesigned as a filter chip in the new filter strip. | Keep `lateFocusMode` state, `isLateGame()`, and `displayedGames` filtering logic. |
| 3 | **No multi-game watching UI**, but keep the watching plumbing for a future feature. | Keep `useRealtimeGame`, `watchedGameIds`, `toggleGame`, `isActive`. The `.watching-strip` / `.watching-chip` / `WATCHING` UI in `DailyGamesPage` is deleted. The watching strip on **GamePage** stays in the codebase (dormant) for the future feature. |
| 4 | **Replay (▶ Play / ⏸ Pause) for final games stays.** | Keep `replayCount`, `isReplayPaused`, the `setInterval` effect. Restyle the button to match new design language. Lives on `/game/:id` only — it had no home on the landing once we killed the inline panel. |
| 5 | **Standings / Leaders / Settings out of scope.** They will look like the old style after this migration. That's intentional and acceptable. | Don't touch `StandingsPage`, `LeadersPage`, `SettingsPage`. Be prepared for visual inconsistency during the interim. |
| 6 | **Preserve team-color left border** on game-card rows (it's the **home team's primary color**, not status). | The 8px left border in the current design becomes a **4px** rule in the new design — still home team color. |
| 7 | **No global topbar today**, and that doesn't change. | `App.tsx` keeps `<main className="app-main"><AppRoutes /></main>`. Each page owns its own `PageTitle` row. |

---

## 2. Setup — tokens, fonts, file structure

### 2.1 Add the design tokens file

Create `client/src/styles/tokens.css`:

```css
:root {
  /* Surfaces */
  --color-bg: #f4f1ea;
  --color-surface: #fcfaf6;
  --color-surface-alt: #efeae0;
  --color-border: #e0dccd;
  --color-border-strong: #c4bfae;

  /* Ink + text */
  --color-ink: #15161a;
  --color-text: #1a1612;
  --color-text-muted: #75706a;
  --color-text-faint: #a39d92;

  /* Accents */
  --color-accent: #b8421e;
  --color-accent-soft: #fbe9dd;
  --color-positive: #4a7c3e;
  --color-positive-soft: #e6efd9;
  --color-info: #2c4a78;
  --color-info-soft: #dde6f1;
  --color-highlight: #c8941c;
  --color-highlight-soft: #fbf0d2;
  --color-danger: #a31621;

  /* Type */
  --font-sans: "DM Sans", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-pill: 999px;

  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(20, 16, 12, 0.04);
  --shadow-md: 0 4px 14px -6px rgba(20, 16, 12, 0.08);
  --shadow-lg: 0 12px 32px -10px rgba(20, 16, 12, 0.18);
}

/* Base type — sans for everything that isn't a number */
html, body {
  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--color-bg);
}

/* Mono utility — apply to every numeric element */
.num {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
```

Import once in `client/src/main.tsx` **before** `App.css` / `index.css`:

```ts
import "./styles/tokens.css";
import "./index.css";
import "./App.css";
```

### 2.2 Load the fonts

```bash
yarn add @fontsource/dm-sans @fontsource/jetbrains-mono
```

In `main.tsx`, after the token import:

```ts
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/dm-sans/800.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
```

### 2.3 Recommended source layout

The redesign introduces enough new primitives that a `components/` and `styles/` reorganization is justified. Suggested:

```
client/src/
  styles/
    tokens.css            ← from §2.1
    primitives.css        ← .num, type scale helpers, button base
  components/
    primitives/
      Card.tsx + .css
      Pill.tsx + .css
      Stat.tsx + .css
      Segmented.tsx + .css
      Tabs.tsx + .css
      StrikeZone.tsx + .css
      Bases.tsx + .css
      Pips.tsx + .css
      Inning.tsx + .css
      Sparkline.tsx + .css
      TeamDot.tsx + .css
      LivePill.tsx + .css
    PageTitle.tsx + .css
  features/
    dailyGames/            ← existing
    game/                  ← existing
    player/                ← new — see §6
```

You don't have to do this all at once, but every new component from the redesign should land under `components/primitives/`.

---

## 3. Token find-and-replace map

Run these as a sweep across `client/src/**/*.{css,tsx,ts}` after §2 lands. The redesign's neutrals replace **both** of your current gray scales (Tailwind-ish in shell, Chakra-ish in `AtBatCard`).

### 3.1 CSS variables (in `index.css` / `App.css`)

| Current value | New value (token) |
|---|---|
| `--color-text-primary: #111827;` | `--color-text: #1a1612;` (or just delete and use `--color-text`) |
| `--color-text-secondary: #4b5563;` | `--color-text-muted: #75706a;` |
| `--color-text-muted: #6b7280;` | `--color-text-faint: #a39d92;` |
| `--color-border: #e5e7eb;` | `--color-border: #e0dccd;` |
| `--color-border-subtle: #ddd;` | `--color-border: #e0dccd;` (collapse to one) |
| `--color-bg: #ffffff;` | `--color-surface: #fcfaf6;` |
| `--color-bg-subtle: #f9fafb;` | `--color-bg: #f4f1ea;` |
| `--color-bg-muted: #f3f4f6;` | `--color-surface-alt: #efeae0;` |
| `--color-active-bg: #d7eaff;` | `--color-accent-soft: #fbe9dd;` |
| `--color-active-border: #93c5fd;` | `--color-accent: #b8421e;` |
| `--color-live-bg: #f0fdf4;` | `--color-positive-soft: #e6efd9;` |
| `--color-live-border: #22c55e;` | `--color-positive: #4a7c3e;` |

> **LIVE is now rust (`--color-accent`), not green.** Green is reserved for **positive deltas / wins**. The old "live = green" mapping inverts. Read every live-state CSS rule when sweeping.

### 3.2 Chakra-ish gray scale (in `AtBatBlock.css` and any other Chakra-ish hex)

| Current hex | New token |
|---|---|
| `#1a202c` | `var(--color-ink)` |
| `#2d3748` | `var(--color-text)` |
| `#4a5568` | `var(--color-text)` |
| `#718096` | `var(--color-text-muted)` |
| `#a0aec0` | `var(--color-text-faint)` |
| `#e2e8f0` | `var(--color-border)` |
| `#ebf8ff` (active) | `var(--color-accent-soft)` |
| `#bee3f8` (active border) | `var(--color-accent)` |

### 3.3 Badge tokens (in `DailyGamesPage.css :root`)

All `--badge-*-bg` / `--badge-*-text` pairs map onto the new `Pill` tones (see README §Component Vocabulary). The badge variant → pill tone map:

| Current | New `<Pill tone="…">` |
|---|---|
| `--badge-green-*` (final) | `tone="neutral"` (final is not celebrated; just stamped) |
| `--badge-red-*` (live) | `tone="live"` (uses `LivePill`) |
| `--badge-teal-*` (no-hitter, extras) | `tone="info"` |
| `--badge-amber-*` (delayed) | `tone="highlight"` |
| `--badge-slate-*` (scheduled) | `tone="soft"` |
| `--badge-orange-*` (cancelled, postponed) | `tone="accent"` (use sparingly) |

Delete the `--badge-*` block from `DailyGamesPage.css` once `<Pill>` is in place.

---

## 4. Component primitives — port these first

These are net-new primitives that every screen depends on. Port them once, into `components/primitives/`, and reuse across all three screens.

| Primitive | Source in design bundle | Notes for porting |
|---|---|---|
| `Card` | `holistic/shared.jsx` | Header (title, subtitle, action) + body. Use as `<Card title="…">…</Card>`. |
| `Pill` | `holistic/shared.jsx` | Tones: `neutral`, `soft`, `ink`, `accent`, `positive`, `info`, `highlight`, `live`. |
| `LivePill` | `holistic/shared.jsx` | Self-contained pulsing red dot + label. Replaces existing `.game-card--live` chrome. |
| `Stat` / `StatBlock` | `holistic/shared.jsx` | Label / value / sub. Value is mono. Sizes: `hero` / `md` / `sm`. |
| `Segmented` | `holistic/shared.jsx` | Drop-in replacement for `.bs-seg` / `.bs-seg-btn`. **Same DOM shape, new styles.** This is the easiest existing-→-new port. |
| `Tabs` | `holistic/shared.jsx` | Underline tabs for the player view. |
| `Th` / `Td` / `Tr` | `holistic/shared.jsx` | Table primitives — used heavily in Player Stats / Splits. |
| `StrikeZone` | `holistic/shared.jsx` | 3×3 grid with home plate; takes a `dots` array. **Your existing `AtBatBlock` zone diagram is conceptually identical** — same component, restyled. |
| `Bases` | `holistic/shared.jsx` | Rotated diamond. |
| `Pips` | `holistic/shared.jsx` | Row of dots for balls/strikes/outs. |
| `Inning` | `holistic/shared.jsx` | Triangle + number (▼9). |
| `Sparkline` | `holistic/shared.jsx` | Line + end-dot. |
| `TeamDot` / `TeamMark` | `holistic/shared.jsx` | First-letter mark. **Real app should swap for actual team logos** when an image is available — the team-color fill is the fallback. |
| `PageTitle` | `holistic/shared.jsx` | Title row + subtitle + right-side actions. Used by every screen. |

The design-canvas wrapper (`design-canvas.jsx`, `holistic/app.jsx`, `holistic/foundations.jsx`) is **review-only** — do not port.

---

## 5. Screen migration — order and PR-sized chunks

Six chunks. Each is a separate PR. Stop and review at each boundary. (PR 3.5 was split out of PR 3 on June 1 — see its note.)

### PR 1 — Foundation (no visible change)

- Add `tokens.css`, font packages, import order in `main.tsx`
- Run the find-and-replace sweep in §3
- Add `components/primitives/` directory with **just** `Card`, `Pill`, `Segmented`, `Stat`, `PageTitle` (the ones used by Today's Games)
- **No screen changes yet.** App should still render exactly as before, but with:
  - Cream `--color-bg` instead of white
  - DM Sans rendering
  - Live-state colors shifted from green to rust

**Acceptance:** App boots, no console errors, screens look "slightly different but still recognizable." Push, deploy to staging, sanity-check, merge.

### PR 2 — Today's Games (`/`)

Rewrite `DailyGamesPage.tsx` against the new design (see README §1).

**What goes:**
- Right column `<div className="live-feed daily-live-panel">` and everything inside it
- `livePanelHeightPx`, `feedScrollHeightPx`, `liveFeedFrameRef`, `liveFeedPanelRef`, `feedScrollRef`, `gameListContainerRef`, `liveFeedPanelRef`
- The `useLayoutEffect` ResizeObserver block
- `optimisticWatchGameId` state and its effect (no inline join button to optimistically respond to)
- The `.watching-strip` / `.watching-strip__*` UI and CSS
- The `.feed-panel`, `.feed-scroll`, `.live-feed-toprow`, `.live-feed-message` CSS rules in `DailyGamesPage.css`
- The replay-toggle button (moves to GamePage in PR 3)
- All "join live" / `▶` icon buttons on cards (no longer relevant — every card is a tap-to-navigate row)

**What stays:**
- Date picker + Prev/Next/Late-Game buttons (restyled into new filter strip)
- `lateFocusMode` + `displayedGames` filtering
- `applyDailyOverride` + `useRealtimeDailyGames` (data layer untouched)
- `withBadgeTestOverrides` (dev affordance)
- `getGameBadges()`, `formatGameStateCell()`, `formatStartTime()`, `getVenueText()`, `getInningNumber()`, `getScores()`, `isLateGame()` — all helpers
- `useRealtimeGame` hook usage (kept dormant — supports future multi-watch revival)

**New structure:**

```tsx
return (
  <Page>
    <PageTitle
      title="Today's games"
      subtitle={prettyDate(selectedDate) + " · " + safeGames.length + " games"}
      right={<DateControls … />}
    />

    <FilterStrip
      filter={filter}            // 'all' | 'live' | 'final' | 'upcoming'
      onChange={setFilter}
      counts={{ live, final, upcoming }}
      lateFocus={lateFocusMode}
      onLateFocusToggle={() => setLateFocusMode(v => !v)}
    />

    {isLoading && <StatusBanner kind="loading">Loading games…</StatusBanner>}
    {error && <StatusBanner kind="error">Failed to load games. Details: {error}</StatusBanner>}
    {!isLoading && !error && displayedGames.length === 0 && (
      <StatusBanner kind="empty">No games match this filter.</StatusBanner>
    )}

    <Section label={`Live now · ${liveGames.length}`}>
      <Grid cols={2}>
        {liveGames.map(g => (
          <GameCardLive
            key={g.providerGameId}
            game={g}
            onEnter={() => navigate(`/game/${g.providerGameId}`)}
          />
        ))}
      </Grid>
    </Section>

    <Section label={`Final · ${finalGames.length}`}>
      <Grid cols={4}>
        {finalGames.map(g => (
          <GameCardFinal
            key={g.providerGameId}
            game={g}
            onEnter={() => navigate(`/game/${g.providerGameId}`)}
          />
        ))}
      </Grid>
    </Section>

    <Section label={`Upcoming · ${upcomingGames.length}`}>
      <Grid cols={4}>
        {upcomingGames.map(g => (
          <GameCardUpcoming
            key={g.providerGameId}
            game={g}
            onEnter={() => navigate(`/game/${g.providerGameId}`)}
          />
        ))}
      </Grid>
    </Section>
  </Page>
);
```

**Interaction note:** Tap target is the **entire card**, not a button on the card. Every card navigates. Scheduled cards navigate too — no disabled state.

**Acceptance:** Landing page matches `holistic/landing.jsx`. Late Game filter works. Cards click-through to `/game/:id` for all states.

### PR 3 — Game view (`/game/:providerGameId`)

Rewrite `GamePage.tsx` against the new design (README §2). **Port `holistic/game-v2.jsx` (`window.GameScreenV2`), NOT the superseded `game.jsx`.**

**What goes:**
- `BoxScorePanel` and its column (we explicitly removed it during design)
- The JS-driven height matching between left and right columns (the new layout uses a sticky left column + an internally-scrolling right card — no height-sync needed)
- The standalone timeline (we removed it)
- Any on-page lineup table (lineup moves to a header drawer)

**What stays:**
- `LiveScoreboard` data → feeds the new dark **`LineScoreBand`** (line score + scoring summary + game leaders). Note this is now a line score (runs per inning + R/H/E), not the old single-score strip — you'll need per-inning run data and a scoring-plays list.
- `PitchByPitchFeed` → becomes **`PitchByPitchV2`**: a fixed-height (640px) card with INTERNAL scroll, newest PA at top, live PA expanded with its pitches in chronological order, finished PAs collapsed.
- `AtBatBlock` zone diagram → migrated to the **`MatchupLeft`** card's `<StrikeZone>` (new tall geometry + perspective plate — see README §2 "Strike-zone geometry").
- Alerts strip (kept, restyled)
- Watching strip (kept in component, dormant — route to populate it went away in PR 2)
- **Replay (▶ Play / ⏸ Pause) lives here now** when game status is `final`
- All realtime hooks unchanged

**New structure:** see README §2 "Game view" — `AppHeader` (with "Lineup ▾") / `PageTitle` / `LineScoreBand` / `[MatchupLeft (sticky) | PitchByPitchV2 (internal scroll)]` / `PitcherCard`. The bottom analytics row (`[WinProbTimeline | LeverageCard]`) was **split into PR 3.5** — leave it out of this PR; the screen ends cleanly at `PitcherCard` (the row is below the fold, so its absence leaves no layout hole).

**New data the v2 design needs (flag early — may require API work):**
- Per-inning runs for both teams + R/H/E totals (line score)
- Scoring-plays list (inning + description) for the scoring summary
- Top batter per side (game leaders)
If any of these aren't available from the current API, either add them server-side or stub the corresponding sub-component behind a feature check — don't block the whole screen.

**Deferred (not in this PR):** the **win-probability + leverage row** (PR 3.5 — gated on new API data), the **lineup drawer** (header button exists, drawer UI not designed yet), postgame state, mobile breakpoints.

**Acceptance:** Live game view matches `holistic/game-v2.jsx` through `PitcherCard`. Pitch list scrolls internally without pushing the page. Strike zone renders tall with a perspective plate and no clipped dots. Final-game replay still works. (Win-prob/leverage moved to PR 3.5.)

**Fidelity notes from the first PR 3 review (May 31, 2026) — don't repeat these misses:**
- **Port `StrikeZone` from `shared.jsx` VERBATIM — do not re-implement it.** The first attempt rebuilt it and lost the batter's-box chalk lines, the linear perspective, the gap between zone/plate, and the dot-clamping. The component is an inline SVG: full-zone-width home plate whose side edges converge to the SAME vanishing point as the splayed batter's-box lines; pitch dots clamped so a dot's full circle never clips. Copy it exactly.
- **Team logos AND player headshots already exist in the app** (prior iterations used them). Wire them everywhere the design uses `TeamDot`/`TeamMark` (line score, game leaders, pitch-by-pitch rows) and `Headshot` (batter + pitcher cards). Letter-mark / initials are FALLBACK only, not the default. Do not render "HME"/"AWY" text.
- **Headshots are portrait (~2:3).** MLB headshot sources are ~107×150. Render the photo box at a portrait aspect (the design uses `size × 1.28`) with `object-fit: cover`, `object-position: center top`, so the face is never clipped at the bottom. A square box crops at the mouth — that was the bug.
- **Line score "–" everywhere = per-inning run data not mapped**, not a visual bug. An inning shows "–" only if not yet played. Wire real per-inning runs + R/H/E.
- **The current batter's headshot is required in `MatchupLeft`.** The batter card (right of the strike zone) leads with a portrait `Headshot` (mlbId → MLB photo, initials fallback) — the first attempt dropped it. Same for the pitcher headshot in `PitcherCard`.
- **Completed PAs collapse to one row: batter name + outcome summary** (e.g. "Michael Busch · Single to LF · 2-2") with the outcome icon and expand chevron. Only the live PA is expanded with its pitch table. Don't render pitch tables for finished PAs by default.
- **Scoring chip is pale GREEN, not rust.** Any PA that scored runs gets a `T.positiveSoft` pill (`T.positive` text/border) — "N run(s) score · [resulting score]". Scoring is the positive event in this palette; rust (`T.accent`) is reserved for live/hot. The first attempt omitted the chip.
- **Line-score band uses the team's NICKNAME** (e.g. "Astros", "Cubs", "Mets", "Yankees", "Dodgers", "Angels"), NOT the city and NOT the full club name. The city alone is ambiguous for same-city matchups (Mets vs Yankees would both read "New York"; Dodgers vs Angels both "Los Angeles"; Cubs vs White Sox both "Chicago"); nicknames are unique across all 30 clubs and the logo carries the city. **Store the nickname explicitly** — `shared.jsx` now has a `short` field on each `TEAMS` entry; mirror that in the app's team model. Do NOT derive it as "the last word of the club name": Red Sox / White Sox / Blue Jays are two-word nicknames, and a bare "Sox" is itself ambiguous between Boston and Chicago. The full club name ("Los Angeles Dodgers") overflows the fixed 132px column into the inning numbers — don't pass it here. The name cell is also clamped (`overflow:hidden; text-overflow:ellipsis; min-width:0`) as a safety net. (This is only the dark line-score band — game-card rows and PageTitle still use full names.)
- **Filter set is All / Runs / K / HR / BB** — "Outcomes" was removed.
- **Lineup button** lives in the **play-state eyebrow** (right slot, above the zone, "Lineups ▾") — NOT the AppHeader. The **tray IS built and fully specced in README §2a** — port it (don't leave the button inert). There is exactly one LIVE pill (in the PageTitle); don't add a second.
- **Lineup tray indentation must come from the GUTTER COLUMN ONLY — never shift the whole sub row.** Substitute rows use the SAME right-anchored stat grid as starters (`… 1fr 40px 200px`); only the leading gutter column widens (`20px → 68px`) to create the indent. If you indent by adding `margin-left`/`padding-left` to the entire row, the line + PA-sequence columns drift right and stop aligning with the starters above (and the starter pitcher's stat ends up too far left of its subs). Starter and sub stat columns MUST line up vertically.
- **Mock-data integrity (line score ⇆ scoring summary ⇆ pitch-by-pitch).** When wiring real data, keep the three in sync: every scoring play is credited to a player ON the team that scored; the running score in the scoring summary and the pitch-by-pitch scoring chips must reconcile with the per-inning line score; batters only appear in their team's half-inning (away = TOP, home = BOT). (The design's placeholder data was corrected June 1 after a review caught a Cub credited with a Houston run.)

### PR 3.5 — Win probability + Leverage (game view, below the fold)

Split out of PR 3 on June 1, 2026. These two half-width cards sit in a row directly below `PitcherCard` on the game view. **Gated on new API data, not on design** — the design is signed off in `holistic/game-v2.jsx` (`WinProbTimeline` + `LeverageCard`); do this PR once the data below exists.

**New data this PR needs (the reason it was split out):**
- Win-probability time series across the game (for `WinProbTimeline`)
- Leverage index for the current moment (for `LeverageCard`)

**Scope:**
- Add the `[WinProbTimeline | LeverageCard]` row below `PitcherCard`. Port both verbatim from `game-v2.jsx`.
- `WinProbTimeline` is a split-fill line chart (rust above 50% = current leader anchored top, navy below = trailing team anchored bottom), with axis team anchors and a "How to read" caption; the header names whoever's currently favored.
- `LeverageCard` keeps its scale bar + plain-language explanation.
- Until this PR lands, the row simply doesn't render (feature-check stub from PR 3). No placeholder — it's below the fold.

**Acceptance:** The analytics row renders below `PitcherCard`. Win-prob chart split-fills correctly around the 50% line and the favored team reads correctly in the header. Leverage scale bar reflects the current leverage index.

### PR 4 — Player view (`/player/:mlbId`) — Overview + Stats tabs

The two tabs that have been signed off. Build `PlayerPage.tsx` against the new design (README §3).

**Out of scope for this PR (deferred to PR 5 or later):**
- Splits tab — designed but not signed off
- Pitching tab — designed but not reviewed
- History tab — designed but not reviewed

In PR 4, render placeholders for those three tabs ("Coming soon") so the tab nav is complete but the bodies are empty.

**New primitives needed:** `Tabs`, `Th`/`Td`/`Tr`, `Sparkline`, `TeamMark`, the hot-zone heat-map cell component (inline in `holistic/player.jsx`).

**Acceptance:** Overview + Stats render at parity with `holistic/player.jsx`. Hero band is full-width (no left sidebar). Stats are tables, not card grids.

### PR 5 — Sweep + polish

- Replace remaining stale grays caught by the sweep
- Delete dead CSS (`.bs-seg-*` if `Segmented` replaced all usages, `.watching-strip*`, `.feed-panel`, etc.)
- Sign-off review for **Splits** tab → ship it
- Sign-off review for **Pitching** + **History** tabs → ship them

---

## 6. Where each existing CSS file ends up

| File | Action | Notes |
|---|---|---|
| `DailyGamesPage.css` | **Mostly deleted, partially rewritten.** Keep only the page-shell rules (`.page-container`, `.page-header`, `.status-banner`). | The `.game-card*`, `.watching-strip*`, `.live-feed*`, `.feed-*`, `.daily-live-panel*`, `.gc-badge*`, `--badge-*` blocks are replaced by new components' CSS. |
| `AtBatBlock.css` | **Replaced** by new pitch-by-pitch row + `PitchHero` card CSS. | The expand/collapse pattern is preserved conceptually; the colors and chrome change. Chakra-ish hexes go away. |
| `App.css` / `index.css` | **Token sweep** per §3. | Keep layout rules (`.app-main`, etc.). |
| `LiveScoreboard.css` (if exists) | **Restyle** to dark `ScoreboardStrip` (`--color-ink` bg, mono numerals). | Same component, new look. |
| `PitchByPitchFeed.css` (if exists) | **Restyle** to inning-grouped list with PA highlighting. | Component DOM may need restructuring to support grouping. |
| `JumpToBottomButton.css` | **Restyle** (rounded pill, mono). | Behavior unchanged. |
| `BoxScorePanel.css` | **Delete** along with the component. | Removed from design. |
| All `Standings*` / `Leaders*` / `Settings*` CSS | **Untouched.** | Out of scope per Decision #5. |

---

## 7. Open product questions (revisit before PR 5)

These were called out in the design phase but not resolved:

1. **Mobile breakpoints** — not designed. Define a breakpoint strategy before the redesign hits mobile users. The current design is 1440-wide.
2. **Empty / loading / error states** — partially designed (`StatusBanner` covers the page level), but per-card and per-tab empty states are not specified.
3. **Postgame Game view** — `/game/:id` after a game ends. Currently it just shows final scores + the replay control. Spec a real "postgame" mode (final stats, recap, highlights) before that path sees real users.
4. **Pitcher's Pitching tab** — the current Pitching tab is "how pitchers attack this batter." A real pitcher's view of their own arsenal is a separate design.
5. **Slide-in Alerts panel** — discussed during design but not built. If alerts grow beyond the inline strip on Game view, we need a destination.
6. **Standings / Leaders / Settings** — per Decision #5 they're explicitly out of scope, but they'll look out of place once PR 1–4 ship. Decide before launch whether to do a quick token-only restyle on those three or let them stay visibly older.

---

## 8. Quick reference — file paths

**Source of truth for the design (this folder):**
- `README.md` — design spec
- `MIGRATION.md` — this doc
- `Holistic.html` + `holistic/*.jsx` — open in browser, review-only

**Target codebase:**
- `client/src/AppRoutes.tsx` — routes (do not change)
- `client/src/main.tsx` — token + font imports go here
- `client/src/App.tsx` — `<main className="app-main"><AppRoutes /></main>` (unchanged)
- `client/src/components/primitives/` — new primitives land here
- `client/src/features/dailyGames/DailyGamesPage.tsx` — PR 2 rewrite target
- `client/src/features/game/GamePage.tsx` — PR 3 rewrite target
- `client/src/features/player/PlayerPage.tsx` — PR 4 build target
