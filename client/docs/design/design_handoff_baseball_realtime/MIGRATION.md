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
| `StrikeZone` | `holistic/shared.jsx` | Tall zone + home plate + perspective. Two modes: `dots` (game view) and **`heat`** (player hot zones — a 3×3 color grid in the SAME frame). Port verbatim (PR 3), reuse the `heat` prop for the player view. Your existing `AtBatBlock` zone diagram is conceptually identical. |
| `Bases` | `holistic/shared.jsx` | Rotated diamond. |
| `Pips` | `holistic/shared.jsx` | Row of dots for balls/strikes/outs. |
| `Inning` | `holistic/shared.jsx` | Triangle + number (▼9). |
| `Sparkline` | `holistic/shared.jsx` | Line + end-dot. |
| `TeamDot` / `TeamMark` | `holistic/shared.jsx` | First-letter mark. **Real app should swap for actual team logos** when an image is available — the team-color fill is the fallback. |
| `PageTitle` | `holistic/shared.jsx` | Title row + subtitle + right-side actions. Used by every screen. |

The design-canvas wrapper (`design-canvas.jsx`, `holistic/app.jsx`, `holistic/foundations.jsx`) is **review-only** — do not port.

---

## 5. Screen migration — order and PR-sized chunks

Chunks below, each a separate PR. Stop and review at each boundary. (PR 3.5 was split out of PR 3 on June 1; **PR 8 — the Jun 3 polish pass — and PR 9 — the Upcoming tab, gated on new API data — are appended at the end, both pending review.**)

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

Split out of PR 3 on June 1, 2026. These two half-width cards sit in a row directly below `PitcherCard` on the game view. **Gated on new API data, not on design** — the design is signed off in `holistic/game-v2.jsx` (`WinProbTimeline` + `LeverageCard`); do this PR once the data below exists. **Self-contained build prompt: `PROMPT_PR3.5_standalone.md`.**

**Not a new integration (re-scoped Jun 12, 2026).** Both fields **already exist in the raw MLB `feed/live` JSON**, per-play — just unmapped. The lift is ~**3 backend changes each**: type (`MlbPlay`) → mapper (`MlbPlay → LiveUpdate`) → wire field (`PlayUpdateWire`, the socket payload the client already consumes). Grep a raw `feed/live` payload for the exact paths before writing the type; don't assume.

**New data this PR needs (the reason it was split out):**
- Win-probability time series across the game — per-play **home-team** win probability, 0–100 (for `WinProbTimeline`)
- Leverage index for the current moment (for `LeverageCard`); plus the game's running max for "peak today"

**Scope:**
- Add the `[WinProbTimeline | LeverageCard]` row below `PitcherCard`. Port both verbatim from `game-v2.jsx`.
- `WinProbTimeline` is a split-fill line chart (rust above 50% = current leader anchored top, navy below = trailing team anchored bottom), with axis team anchors and a "How to read" caption; the header names whoever's currently favored.
- `LeverageCard` keeps its scale bar + plain-language explanation.
- Until this PR lands, the row simply doesn't render (feature-check stub from PR 3). No placeholder — it's below the fold. If only one field maps cleanly, render just that card; if neither, the row stays unrendered. **Never fabricate a value.**

**Mock-literal deltas — must de-hardcode when porting (the mock components carry sample literals):**
- **Win prob `pts`** — replace the inlined `[t, homeWinPct]` array with the real series (`t = playIndex/lastPlayIndex` or inning fraction, monotonic; `homeWinPct` 0–100).
- **X-axis tracks the head** — the domain spans only innings **played so far** (up to the current head), not a fixed 1–9; a replay to the 6th fills the width with 1–6, a completed final spans 1–9. (`domainMax = last point`; line right edge + dot at the head.) **Inning ticks label every inning** (`[1..9]`, extend for extra innings), filtered through the head. No empty tail mid-replay.
- **Y-axis labels = 100 / 50 / 100** (NOT 100 / 50 / 0) — each end is 100% for its anchored team (top = home, bottom = away), middle = 50/50 (`label = v >= 50 ? v : 100 - v`).
- **Team objects** — bind the chart's top/bottom anchors + header to the **real home/away teams**; don't ship the `TEAMS.HOU`/`TEAMS.CHC` literals.
- **"How to read" caption** — drop the hardcoded last sentence ("The sharp rise in the 8th is the bases-clearing double"); keep the rest (generic + correct), or derive a callout from the largest single-play swing.
- **Leverage `cur`/`peak`/`maxLev`** — feed real current + game-max; keep `avg = 1.0` (the normalized reference marker, not data); `maxLev = Math.max(3.5, peak)` so a high-leverage moment can't overflow the bar.
- **Leverage tone pill** (`HIGH`/`MED`/`LOW`) — derive from `cur` thresholds (e.g. `≥2.0 HIGH` → `tone="accent"`, `≥1.0 MED`, else `LOW`), not the hardcoded `HIGH`.
- **Leverage plain-language line** ("Runners on 1st & 2nd, 2 outs, tying run aboard") — build from the live base/out/score state you already have; don't hardcode.

**Acceptance:** The analytics row renders below `PitcherCard`. Win-prob chart split-fills correctly around the 50% line and the favored team reads correctly in the header (real teams). **The x-axis tracks the head — a game replayed to the Nth inning spans 1–N, not a fixed 1–9; the Y-axis reads 100 / 50 / 100 (each end = its anchored team's win %), not 100 / 50 / 0.** Leverage scale bar, `{cur}×`, tone pill, and "peak today" reflect real values with `avg` at 1.0. No HOU/CHC literals, no "bases-clearing double" caption, no fabricated values. Numerals stay mono.

### PR 4 — Player view (`/player/:mlbId`) — Overview + Stats + Splits tabs · ✅ DONE & APPROVED IN-APP (Jun 5, 2026)

The **three formally signed-off tabs** (Overview, Stats, Splits — all signed off Jun 2, 2026). Build `PlayerPage.tsx` against the new design (README §3). **Ported and reviewed in the real app; approved. Residual issues live in `bug-list.md` (BUG-001/002/003), not here.**

**Out of scope for this PR:**
- Pitching tab — built, ported for visual review in PR 6 (batter-scoped) — **now ✅ signed off (Jun 5)**
- History tab — built, ported for review in PR 7 — **now ✅ signed off (Jun 5)**

Render those two as "Coming soon" placeholders so the tab nav is complete but the bodies are empty.

**New primitives needed:** `Tabs`, `Th`/`Td`/`Tr`, `Sparkline`, `TeamMark`, `VBar`, and the **`HotZone` helper** — which is NOT a new component but a thin wrapper over the already-ported `StrikeZone` in **heat mode** (`<StrikeZone heat={9 vals} />`). The player heat maps reuse the game-view strike-zone frame (tall box + home plate + perspective); do not build a separate flat 3×3 grid.

**Hero action buttons (build in this PR — they live in the hero, not a deferred tab):**
- **Watch live ▸** → navigate to the player's live game: `navigate(`/game/${providerGameId}`)` (mock calls `window.openGameView()`).
- **Compare ▾** → anchored player-picker popover (outside-click/Esc close, controlled `open` + `selectedPlayer` + `notified` state). **Ship as a fake-door** — wire the search input to your player-search endpoint, but selecting a player leads to a "Notify me when this ships" CTA (→ green confirmation), NOT a comparison view. Fire `window.track()` events: `compare_opened`, `compare_player_selected`, `compare_notify_requested`. **Do not build the side-by-side comparison screen** — it's ungated until the notify funnel justifies it.
- **Global focus CSS:** port the `shared.jsx` focus-ring reset (default ring off on mouse click; accent `:focus-visible` ring for keyboard) and the `window.track()` stub.

**Splits tab** (`SplitsTab`) — in scope (signed off): two filter rails over **six** `SplitTable`s — Pitcher handedness, Venue, Day/Night, **Baserunners**, Count leverage, **Pitch type**. Each table is `Split | G AB H HR RBI BB K AVG OBP SLG OPS | vs Lg`; the **vs Lg** column pairs a `VBar` (OPS magnitude) with a green/rust ±delta-vs-league marker. AVG + OPS accented; zero HR dimmed. The **category** rail (`All splits · Handedness · Venue · Day/Night · Bases · Count · Pitch type`) filters which tables render via each table's `cat` key (`All splits` = show all); every option resolves to a real table. The **timeframe** rail (`2026 / Career / Last 30d`) is controlled and updates a caption — but **only the 2026 dataset exists in the mock**; wire each timeframe to the splits API range param to refetch Career / Last-30d numbers.

**Acceptance:** Overview + Stats + Splits render at parity with `holistic/player.jsx`. Hero band is full-width (no left sidebar). Stats + Splits are tables, not card grids. Watch navigates to the game route; Compare opens the picker popover. Splits category rail filters tables; timeframe rail updates the caption.

### PR 5 — Sweep + polish · ✅ DONE (Jun 5, 2026 — dev-verified via grep-to-zero; no design gate, no visual change)

- Replace remaining stale grays caught by the sweep
- Delete dead CSS (`.bs-seg-*` if `Segmented` replaced all usages, `.watching-strip*`, `.feed-panel`, etc.)

### PR 6 — Player view: Pitching tab · ✅ PORTED & APPROVED IN-APP (Jun 5, 2026) · ⚠️ SUPERSEDED by the BUG-011 redesign (Jun 20, 2026)

> **⚠️ BUG-011 (Jun 20, 2026) — the PR 6 tab shipped fabricated, non-player-specific data.** Four of its five cards (pitch-mix donut, Whiff%, location heat map, counts-attacked) have **no backing data in the current API**, and the whole tab was a single-player Peña mock. **Decision: redesign down** to a lean, player-specific tab built only from real slash splits. **Build prompt: `PROMPT_BUG011_pitching_lean.md`** — that replaces the rendered PR 6 tab now (no new API). The rich version below is **parked** (kept in `holistic/player.jsx` as `PitchingTabFull`) and restored by **PR 6.5** when the Statcast ingest lands. The PR 6 spec below is retained as the description of the parked/full tab.
>
> **⚠️ Data-source correction (Jun 20, 2026).** The lean tab's two cards do NOT both come from `statSplits`. The **handedness** card works via the existing splits, but the MLB `statSplits` pitch-type sit codes (`pff`, `psi`, `psl`, …) return **zero rows for batters** (confirmed across `statSplits` / `statSplitsAdvanced` / `careerStatSplits`, every season; Savant CSV blocks server-side too). So the **"Performance by pitch type"** card came back empty and collapsed — the symptom is the subtitle reading **"189 at-bats" (= 144 + 45, the handedness sum)** and "By pitcher hand" sitting in the wide left grid slot with empty space to its right. The pitch-type slash line is **derivable** — aggregate it server-side from the **`pitchLog`** stat type (one entry per pitch). That wiring is **PR 6.6** (below) — net-new and ungated. The BUG-011 lean tab fully renders only once PR 6.6 lands; until then it shows the handedness card alone.

**Status:** ported into the real app and **approved in the in-app review (Jun 5, 2026)** — no longer an open review-port. Residual issues live in `bug-list.md` (BUG-004/005), not here. (Original review-port note retained below for context.) Port it (graduating it out of the PR 4 "Coming soon" placeholder) so the design owner can review it in the real app, then approve or request changes. Port verbatim — don't redesign.

**Three settled decisions (Jun 2, 2026) — honor them in the port:**
1. **Keep the pitch-type colors.** The bright per-pitch palette (four-seam red `#dc2626`, sinker `#ea580c`, slider `#0891b2`, curve `#3b82f6`, change `#16a34a`, cutter `#a3a3a3`) is a **sanctioned exception** to the cream/rust/navy token system — pitch coloring is a recognized convention the donut/table/heat-map rely on. Do NOT remap to token tints.
2. **Top filter rail is display-only.** `All / vs LHP / vs RHP / In strike zone / Outside zone` renders but is NOT wired (no per-filter data in the mock) — same posture as the Splits timeframe rail. Wire it later when the data exists.
3. **Batter-scoped.** This tab is "how pitchers attack this **batter**." On a **pitcher's** profile it's meaningless — render a "Pitcher arsenal — coming separately" placeholder there so the tab nav doesn't break. A real pitcher arsenal view is a separate, undesigned tab (open question #4).

**Data note:** the tab needs pitch-level data (pitch mix %, per-pitch AVG/SLG/whiff, location SLG for the 3×3 heat map, count-attack tendencies). If the API doesn't expose this yet, port with the mock data purely for the visual review (same gating pattern as the win-prob row, PR 3.5) and wire real data after sign-off.

**Components to port:**
- **New atom: `Donut`** (inline SVG in `holistic/player.jsx`) — pitch-mix ring.
- **Pitch mix** card (Donut + usage-% legend) · **Performance vs pitch type** table `Pitch | AVG | SLG | Whiff` where the **SLG cell embeds a colored bar beside the value** (no separate bar column) · **Damage by location** card — a flex row: `StrikeZone` in **heat mode** (SLG by location, via the `HotZone` wrapper — NOT a separate flat grid; reuse the ported StrikeZone) on the left, and on the right an **SLG color scale** + data-derived **Hottest/Coldest** callouts (max/min cell of the zone array; mono value + zone name).
- **By pitcher handedness** table (`vs` | FB% | BRK% | OS% | Zone% | First-pitch strike | Put-away for LHP/RHP). **Each header has a `StatInfo` `?` tooltip** (right-anchor the rightmost three so the popover doesn't overflow). **`BRK%` was renamed from `BB%` (Jun 3)** — it's breaking-ball share, NOT base-on-balls; FB%+BRK%+OS% sum to 100%. Do not map BRK% to walk rate.
- **Counts attacked** card: a single **3-column × 2-row** grid (6 tiles). Row 1: `0-2 Slider` `1-2 Slider` `Ahead Sinker`; row 2: `2-2 4-Seam` `3-2 4-Seam` `Behind 4-Seam`. The four two-strike tiles (solid border) show **two** labeled mono numbers — `thrown` % and `put-away K` % (K rate accented rust); the two count-state tiles (Ahead/Behind) have a **dashed** border and a single `thrown` %.

**Acceptance:** Pitching renders at parity with `holistic/player.jsx` (pitch colors intact; SLG value+bar in one cell; Counts-attacked shows thrown% + put-away K% with dashed count-state tiles). Filter rail present but inert. On a pitcher profile, the placeholder shows. ✅ **Met — reviewed in-app and approved Jun 5, 2026.** The inert filter rail's data wiring is split out to **PR 6.5** (below); the real pitcher's-arsenal tab remains a separate, undesigned item (open question #4).

### PR 6.6 — Pitching tab: wire "Performance by pitch type" from pitchLog aggregation · NET-NEW, UNGATED (Jun 20, 2026)

**Build prompt: `PROMPT_pitching_pitchtype_wiring.md`.** Follow-up to the BUG-011 lean redesign: the lean tab shipped with **only the "By pitcher hand" card rendering** because its pitch-type source (`statSplits` sit codes) is empty for batters (see the data-source correction in the PR 6 note above). This PR adds the missing card's data. **Not gated** — the source already exists in the API; it just needs server-side aggregation, no Savant/external dependency. Sequencing: lands **before** the gated PR 6.5.

**Backend (one method, `PlayersService`):** for an `mlbId` + season, fetch the **`pitchLog`** stat type, group **AB-ending pitches** by `stat.play.details.type.description`, accumulate hits + total bases + walks/HBP from `stat.play.details.event` (`single`/`double`/`triple`/`home_run`/`walk`/`hit_by_pitch`) over `isAtBat` / `isPlateAppearance`, compute **AVG = H/AB**, **SLG = TB/AB**, **OBP**, **OPS = OBP + SLG**, and emit `SplitRowDto` rows with **`group = 'pitchType'`**. Verified: player `665161` / 2026 `pitchLog` = 642 pitches; aggregated AB totals sum to the player's real season AB. No new API key.

**Frontend:** wire the already-designed "Performance by pitch type" card (`PitchingTab` in `holistic/player.jsx`) to the `group:'pitchType'` rows — columns **Pitch | AB | AVG | SLG-bar | OPS**, sorted by AB; render **all** returned pitch types (incl. Sweeper / Splitter — extend the sanctioned palette: sweeper `#0e7490`, splitter `#15803d`, unknown → `#a3a3a3`); hot accents AVG ≥ .280 / OPS ≥ .800; derived "most vulnerable / quietest" footer; **subtitle AB now sums the pitch-type rows** (fixes the "189" symptom). Numerals mono + `tabular-nums` throughout.

**Acceptance:** two different batters show different pitch-type tables summing to each player's real season AB; "Performance by pitch type" fills the wide left slot and "By pitcher hand" moves to the narrow right slot (the empty-gap layout bug self-resolves once the card has data); subtitle AB matches the pitch-type total, not 144+45; no `statSplits`/Savant dependency. Does NOT touch the handedness card, the parked strip, the other tabs, or the player hero.

### PR 6.5 — Pitching tab: restore the rich tab + wire pitch-level data (game-data-gated)

**Re-scoped Jun 20, 2026 by BUG-011.** Originally "activate the inert filter rail." Now it's the **restoration of the full five-card tab** (`PitchingTabFull`, parked in `holistic/player.jsx`) once a Statcast/Savant pitch-level ingest exists — the lean `PitchingTab` ships in the interim (see the BUG-011 prompt). **No design work; gated on new API data, not on review.** **Both** the rich tab's restoration AND its filter rail are gated on the same source: the PR 6 rail (`All / vs LHP / vs RHP / In strike zone / Outside zone`) was display-only because the mock has no per-filter pitch-level data. This PR brings the rich tab back and makes the rail live.

**New data this PR needs (the reason it was split out):** pitch-level data sufficient to recompute the whole tab per filter — pitch mix %, per-pitch AVG/SLG/whiff, location SLG for the 3×3 heat map, and count-attack tendencies — sliceable by `vs LHP`, `vs RHP`, `in strike zone`, `outside zone`.

**Scope:**
- Wire the top filter rail to controlled state (`active` + `onClick`) and refetch/recompute the Pitch-mix donut, Performance-vs-pitch-type table, Damage-by-location heat map, By-pitcher-handedness table, and Counts-attacked grid for the selected filter.
- Until the data exists, the rail stays inert exactly as shipped in PR 6 — no layout change, no placeholder.

**Acceptance:** Selecting any rail option re-slices all five Pitching sub-components from real data; `All` matches the PR 6 baseline. No visual regression to the PR 6 layout when on `All`.

### PR 7 — Player History tab · ✅ PORTED & APPROVED IN-APP (Jun 5, 2026)

**Status:** ported and **approved in the in-app review (Jun 5, 2026).** Residual issues live in `bug-list.md` (BUG-006/007), not here. (Original review-port note retained below for context.)

Graduate the History tab out of its `<ComingSoon>` placeholder (replace `tab === 4`'s placeholder with the real body). Built-but-unreviewed, same review-port posture as PR 6. Port `HistoryTab` from `holistic/player.jsx` verbatim. See README §3 Tab 4.

**Four WORKING sub-tabs** (the segmented control switches content — it is NOT display-only; this is the key difference from the old inert version). Default = Game log. The right-side controls are contextual (season picker on Game log only; sort toggle in the vs-Team card header).

- **Game log** — wired season picker (`2026…2022`) re-filters the log + updates the caption; W/L pill + notes column. Keep alongside Overview's "Last 5 games" (different reading modes — do not dedupe).
- **Career** — `Career arc` year-cards (story) + `Season by season` table with a bold **Career totals** row (reference) + a `Milestones & transactions` date-anchored list (award/record = gold/navy pill, injury = live pill).
- **vs Team** — `Career vs opponent` table (logo+nickname) with a wired **sort toggle** in the card header (`OPS / Games / Team`). Production = all ~29 opponents (mock = 11); flat list, no division grouping.
- **Postseason** — `Postseason career` card (gold MVP honor pills + G/AVG/HR/RBI/OPS stat row) + `By series` table with a Career-totals row. **Build the empty state** (`post.length === 0` → "No postseason appearances" card) — most players hit it.

**New primitives:** none — reuses `Segmented`, `Th`/`Td`, `Pill` (gold `highlight` for honors), `TeamDot`, `Card` (`action` slot for the sort toggle), `Eyebrow`. Honors use gold, NOT rust.

**Data the tab needs:** per-season game logs; season-by-season career totals; career splits by opponent; postseason line by series + career postseason totals; a milestones/transactions feed. Where the API lacks any of these (likely milestones + per-opponent splits), port with mock data for the visual review and wire real data after sign-off (same gating as PR 3.5 / PR 6).

**Acceptance:** History renders at parity with `holistic/player.jsx`; all four sub-tabs switch; the season picker re-filters the log; the vs-Team sort toggle re-sorts; honors are gold; the postseason empty state renders for a player with no playoff history. **Then: design-owner review → sign-off or change requests.**

### PR 8 — Jun 3 polish pass · ✅ DONE & SIGNED OFF (Jun 5, 2026)

A batch of refinements from the Jun 3 review — **ported and signed off Jun 5, 2026.** (The Headshot fix landed immediately as a bug fix; the rest was reviewed in-app and approved.) The pregame state (part c) was ported via dedicated prompts; its real-data wiring + logo fix were handled as port issues (see bug-list history), separate from this design sign-off.

**(a) `Headshot` chin-clip fix — atom-level BUG FIX, applies retroactively to the PR-1 primitive and every screen.** The MLB source photo is ~1.50 tall (h/w); the old frame ratios (0.78-ish defaults / 1.18 hero) plus a stripe that **consumed** image height were cropping the chin. Fix: (1) default `ratio` → **1.40**, player hero → **1.32**; (2) render the team-color stripe as an **absolute overlay** so it does NOT reduce the image area. `object-fit: cover; object-position: center top` stays. Verify across the player hero, the game-view batter/pitcher cards, and the pregame leadoff/starters cards — no clipped chins.

**(b) Landing (`DailyGamesPage.tsx`, extends PR 2):**
- **Date-aware title.** The page `<h1>` is derived from the selected date: "Today's games" only when it IS today; otherwise "Yesterday's games" / "Tomorrow's games" / "{Weekday}'s games". Wire it to the existing date state; add a **Today** button (appears only when off-today) that resets to today. (README §1.)
- **Live-inning indicator** on `GameCardLive` — the `Inning` atom (caret + number) + "Top"/"Bottom" to the right of the `LivePill`. Drive from the game's `inning` + `half`.
- **"FINAL (11)" extras** on `GameCardFinal` — append the inning count (mono/rust) when `innings > 9`; plain "FINAL" otherwise.

**(c) Game view (`GamePage.tsx`, extends PR 3):**
- **Pregame state** — render `GameScreenV2Pregame` (README §2b) when game status is *scheduled / pre-start* instead of the live `GameScreenV2`. Status-driven branch: `scheduled → pregame`, `live → GameScreenV2`, `final → (postgame, not yet designed — fall back to the live layout reading final, or a minimal final card)`. Every pregame section is filled with static pre-start info; the ONLY "waiting" copy is the pitch-by-pitch empty state ("Waiting for the game to begin"). New pregame sub-components live in `game-v2.jsx`: `PregameLineScoreBand`, `PregameMatchupLeft`, `PregameContext`, `PregamePitchByPitch`, `PregameStarters`, `PregameOdds`, `PregameSeries` (the `LineupsTray` is reused as-is). Pregame win-prob is a **single static split bar** (not the PR-3.5 time series) — no new API gate.
- **Return relabel → "← Back to games."** The game-view AppHeader return now reads "← Back to games" and goes to the daily schedule **for the date this game belongs to** (preserve the browsed date — do NOT snap to today). Update the navigation note from "← Today's games". (README §2 header note + Navigation.)

**Acceptance:** Headshots never clip the chin anywhere. Landing title reflects the selected date and the Today button works; live cards show the inning; extra-inning finals show "FINAL (N)". A scheduled game renders the filled pregame layout (no blank "waiting" panels except the pitch-by-pitch empty state). The game return reads "← Back to games" and preserves the date. ✅ **Met — ported and signed off Jun 5, 2026.**

### PR 9 — Player view: Upcoming tab (matchup projection) · ✅ DESIGN SIGNED OFF (Jun 5, 2026) · structure PORTED — data split into PR 9.5a / 9.5b

> **Split posture (mirrors PR 3 → 3.5).** PR 9 = the tab's **structure + design** on mock data (ported, signed off). The **data wiring** is split out, gated on new API data:
> - **PR 9.5a — MLB-data tier** (schedule, probables, batter-vs-pitcher H2H + null path, reuse handedness/pitch-class splits). **✅ DONE & APPROVED (Jun 6, 2026)** — signed off with the caveat that results are hard to fully vet because upcoming/probable data is intermittently unavailable (expected; see Probables horizon).
> - **PR 9.5b — Statcast tier** (pitcher arsenal: usage % + velo + 9-zone location; batter × pitch-type AVG/SLG/whiff). **✅ DONE & SIGNED OFF (Jun 6, 2026).** The "Sample data · live feed pending" pill is removed; the Upcoming tab is now fully data-driven end to end. **Note:** 9.5b shares only the batter×pitch-type *source* with PR 6.5 — it consumed the unfiltered slice. **PR 6.5 is NOT closed by this** (it still needs that data sliced per filter + the Pitching-tab rail wired to recompute). A deliberate "sparse-Statcast rookie" degraded state is parked in `future.md` (F-001).
>
> Field-by-field data audit: `DATA-REQUIREMENTS-Upcoming.md`.

A **net-new sixth player tab** added Jun 5, 2026. The only forward-looking tab: the player's next 3 scheduled games × the probable starter, projecting how this batter does against that arm. **Design is built (`holistic/player-upcoming.jsx`, `window.UpcomingTab`) but NOT yet signed off; and it is gated on new API data, so it ships AFTER the design review AND once the data exists** — same posture as PR 3.5 / PR 6.5. See README §3 Tab 5 for the full layout.

**Wiring (already reflected in the design files):**
- `tabs` array in `PlayerHero` gains `'Upcoming'`; `PlayerScreen` renders `tab === 5 && <UpcomingTab />`. **Tab is appended LAST** to avoid renumbering the signed-off tabs — *order is an open decision* (may move to right after Overview; trivial change to the `tabs` array + switch + artboard `tab` props).
- New file `player-upcoming.jsx` loads after `player.jsx`, before `app.jsx`. Reuses existing primitives (`Card`, `Pill`, `Th`/`Td`, `Segmented`, `StrikeZone` heat mode, `Headshot`, `TeamDot`, `Eyebrow`) — **no new primitives**. Defines local `UBar` (kept distinct from Splits' `VBar`) and `GameSelectCard` / `H2HCard` / `PitcherSnapshot` / `ReadCard` / `ArsenalCross` / `MatchupSplits` / `LocationOverlap` / `RecentMeetings`.
- **No nested tabs** — a game-rail selection swaps the deep-dive (controlled `sel` state). Honor this; do not reintroduce a tab-in-tab.

**New data this PR needs (the reason it's gated):**
- **Schedule lookahead** — the player's team's next ~3 games (date, time, venue, home/away, opponent).
- **Probable starters** — the projected starting pitcher per upcoming game (name, hand, MLB id for the headshot, season W–L/ERA/WHIP/K-9, rookie flag).
- **Pitcher arsenal** — per-pitcher pitch mix % + velo (drives "What he throws" + the location heat array).
- **Batter × pitch-type performance** — the batter's AVG/SLG/whiff by pitch type (drives "Arsenal vs your bat"; same source the Pitching tab needs in PR 6.5 — share it).
- **Batter vs pitcher head-to-head** — career line + recent PA log against that specific starter, **with a clean null path** when they've never faced each other (the "first meeting" state must be a real, supported response — not an error).
- **Handedness + pitch-class splits** — already needed by the Splits tab; reuse.
- The `lean` / `read` verdict text is **authored mock copy** today — decide whether to (a) author these editorially per matchup, or (b) derive a lean from the data (e.g. weight platoon split + arsenal-vs-weakness) and template the prose. Flag for product.

**Until the data exists:** keep the tab behind a feature check (or ship with the mock dataset clearly flagged), exactly like PR 6.5's inert rail — don't block the other five tabs. **Flag the mock state ONCE, at the tab header** — render the designed **"Sample data · live feed pending"** pill in the intro row (next to "Probables · subject to change"). **Do NOT append "(MOCK)" to individual card/section subtitles** — that scatters the flag and reads as noise. Remove the "Sample data" pill (not the "Probables" one) when live data is wired.

**Fidelity deltas — apply if the tab was ported from a pre-Jun-5 build.** The first port captured an earlier `player-upcoming.jsx`. Re-sync from the current design file; the concrete changes are:
1. **Game dates were in the past.** Old mock used `May 27 / May 28 / May 30` (before "today"), which makes an "upcoming" tab nonsensical. Now `Sat · Jun 6 / Sun · Jun 7 / Tue · Jun 9`. In the real port these come from the schedule API — but any placeholder dates MUST be in the future relative to "today."
2. **Game-3 venue** `Steinbrenner Field` → `Tropicana Field` (consistency with the landing mock).
3. **Casey Mize head-to-head didn't reconcile with its own game log** (log had 2 BB / 5 K; totals said 1 BB / 4 K / 3 RBI on a solo HR). Corrected to **15 PA · .308 / .400 / .538 · .938 OPS · 1 RBI · 2 BB · 5 K**. The rail verdict pill (`.938 OPS · 15 PA`) and the "read" copy (".938 OPS in 15 career PA") were updated to match. Lesson: when wiring real data, derive the H2H totals FROM the PA log, don't hardcode them separately.
4. **Headshots clipped the chin.** Pitcher headshots passed `ratio={1.18}`/`1.4`, shorter than the ~1.5-tall MLB source photo, so the top-anchored cover-crop shaved the chin. Now **`ratio={1.5}`** on BOTH the rail (36px) and the "What he throws" snapshot (56px). General rule (already in PR 8's Headshot fix): the `Headshot` box ratio must be ≥ the source photo's ~1.5, never less.
5. **Rail card header layout bug.** The team-name/date text column collapsed to its min-content (~60px) and the name + date overflowed and overlapped (the dates looked "wrong" because they were painted over the team name). Fix: the text wrapper needs `flex: 1; min-width: 0`; the opponent label is `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`; the date is `white-space: nowrap`; the time is `flex-shrink: 0`. The pitcher-name `<span>` likewise needs `min-width: 0` inside its `flex` row. (Don't rely on `min-width:0` alone — the wrapper also needs `flex:1` to actually claim the width.)
6. **Mock flag** — see the paragraph above: one header pill, not per-card "(MOCK)".

**Acceptance:** Upcoming renders at parity with `holistic/player-upcoming.jsx`; the 3-game rail selects and swaps the deep-dive; the head-to-head + recent-meetings show real history when it exists and the "first meeting" / "no prior meetings" empty states when it doesn't; the Arsenal-vs-bat KEY THREAT flag derives from real per-pitch SLG; numbers are mono. **✅ FULLY COMPLETE & SIGNED OFF — design signed off Jun 5; structure ported; PR 9.5a (MLB-data tier) approved Jun 6; PR 9.5b (Statcast tier) signed off Jun 6. The tab is fully data-driven. Remaining undesigned edge states parked in `future.md` (F-001).**

### PR 9.6 — Upcoming tab: rotation-projected starters · ✅ DONE & SIGNED OFF (Jun 20, 2026) · NET-NEW, UNGATED

**Build prompt: `PROMPT_PR9.6_rotation_projection.md`.** Unparks `future.md` **F-001 #2**. When MLB hasn't posted a probable for an upcoming game (typical for games 2–3, set ~1 day out), **project** the opponent's likely starter from their recent rotation order instead of showing a dead "TBD" card. **Not Statcast-gated** — uses schedule + recent-starters-per-game, **now confirmed available in the API (Jun 20, 2026)** — the blocker F-001 #2 was waiting on.

**Design source:** `holistic/player-upcoming.jsx` — components + config already exist; this PR wires them. Each game carries a `starter` object: `{status:'confirmed'}` · `{status:'projected', confidence, lastStart, basis}` · `{status:'tbd'}`.

**Surfaces (port verbatim):** `StarterChip` (rail + deep-dive header — Confirmed green / Projected·{conf} navy / TBD grey; `STARTER` map + `CONF_W` High .92/Med .58/Low .30 + `CONF_FILL`) · **dashed navy headshot ring** on projected cards · `ProjectionBanner` (deep-dive, only when `status!=='confirmed'`: "PROJECTED STARTER · not an announced probable" + `basis` sentence + confidence meter) · `ReadCard` subtitle reframes to "Projection · if he takes his turn". **A projection must NEVER look as authoritative as a confirmed probable** (navy not green, dashed ring, "not announced" caption, confidence meter).

**API / data requirements:** (1) schedule lookahead — team's next ~3 games *(reuse PR 9.5a)*; (2) confirmed probable where MLB posted it → `confirmed`; (3) **recent-starters-per-game for the opponent, in date order** *(the newly-confirmed data)* → rotation sequence; (4) pitcher metadata (name/throws/num/mlbId-nullable/record/era/rookie) *(reuse 9.5a shape)*. No Statcast, no new provider.

**Projection algorithm (service layer):** build the opponent's rotation order from recent starters → count their games to the target date accounting for off-days → advance the rotation (mod ~5) from the most recent starter → set confidence (High ≈1 turn/normal rest/no disruptive off-day; Medium ≈2 turns or off-day could realign; Low ≈3 turns/rotation in flux) → generate the `basis` sentence + `lastStart`. If the rotation can't be resolved → `status:'tbd'`, not a low-confidence guess.

**Acceptance:** game 1 (probable posted) = Confirmed green, no banner/ring; a no-probable game = Projected·{conf} navy + dashed ring + PROJECTED STARTER banner with real `basis` + confidence meter, projected pitcher matches the actual rotation turn; confidence varies by distance/off-days; unresolvable rotation = TBD grey, no banner; `mlbId:null` rookie still falls back to initials. Confirmed path unchanged. F-001 #1 (sparse-Statcast rookie arsenal) + #3 (no-games empty state) stay parked.

### PR 10 — Game view: "At-bats" scorebook row (batter card)

Added to the design Jun 7, 2026 — **net-new, not yet ported.** A horizontally-scrolling row of scorebook diamond cells in the game-view batter card (`MatchupLeft`), one per plate appearance the current batter has had today. **No new API tier needed** (unlike PR 3.5 / 6.5) — the data comes from the same play-by-play the pitch-by-pitch feed already consumes.

**New shared atom — `ScorebookCell`** (`window.ScorebookCell` in `shared.jsx`; port verbatim, it's a game-state primitive like `StrikeZone`/`Bases`):
- Props: `inn` (inning label) · `code` (result, e.g. `1B`/`K`/`F8`/`BB`) · `kind` (`hit`/`out`/`walk`) · `reached` (0–4) · `scored` (bool) · `live` (bool) · `width` (default 50).
- Renders a small bordered cell: mono inning label on top, a 44×44 diamond SVG (home→1B→2B→3B), a mono result code below.
- Diamond logic: empty diamond = no base reached; a traced basepath in `T.ink` + a filled corner dot = bases reached; **dashed path + open dot** = walk; `reached>=4 || scored` shades the diamond interior `T.positiveSoft` (run). `live` = neutral **dashed** `borderStrong` frame + muted text (NOT rust — there's exactly one rust/live accent on the screen, the PageTitle pill).
- `inn` and `code` get `white-space:nowrap` so short tokens don't wrap.

**Batter-card changes (`MatchupLeft`):**
- The **"Today" row value is trimmed to the summary only** (`1-for-4`) — drop the trailing `· 1B · K · F8 · BB`; those results now live in the diamonds.
- Insert, between the Today row and the "vs [pitcher]" row, an **"At-bats" block**: a small uppercase label + a `display:flex; gap:6; overflow-x:auto` row mapping `todayPAs → <ScorebookCell width={44} …/>`, with the live/in-progress PA as a trailing `<ScorebookCell live/>`.
- **CRITICAL — the overflow/overlap fix.** The scroll row's intrinsic width will otherwise inflate the batter-card `1fr` grid track and push the card over the PitchByPitch column. Set `min-width:0` on: the batter-card column, the inner stat grid (change `grid-template-columns:1fr` → **`minmax(0,1fr)`**), the "At-bats" wrapper, AND the scroll row. (This is the classic CSS grid/flex `min-width:auto` trap — without it `overflow-x:auto` never engages.)

**Data:** per-PA `{ inning, resultCode, kind, basesReached }` for the batter, ordered oldest→newest, + the in-progress PA flagged `live`. Source from the play-by-play feed already powering PitchByPitchV2 (each PA's final event → result code + kind + bases). No Statcast/new endpoint required.

**Deferred (NOT this PR):** the **bold-PA-result vs. lighter-later-baserunning** stroke treatment and the scored/stranded/out-on-bases end-states (`future.md` **F-003**) — needs a `reachedOnPA` vs `finalBase` data split. Ship PR 10 with the single-`reached` model first.

**Acceptance:** Game-view batter card shows the At-bats row; the "Today" line is summary-only; ~5 cells fit at the design width and the row scrolls beyond that **without** overlapping the PitchByPitch column or the "vs [pitcher]" row; live PA is the trailing neutral-dashed cell; all numerals mono. `ScorebookCell` also appears in the Foundations page. **✅ PORTED & SIGNED OFF (Jun 9, 2026)** — diamonds populate from the play feed; the `parsePA` enum gotcha (below) was the only fidelity bug and is fixed. Generic `'Out'` → `OUT`; richer out-coding parked in `future.md` F-005.

> **⚠️ Port gotcha — `parsePA` must match the backend ENUM, not human-readable text (found Jun 8, 2026).** The backend normalizes every MLB event to a short enum **before the wire** — `'Single'`, `'Double'`, `'HomeRun'`, `'Out'`, `'HBP'`, etc. (NOT `"home run"`, `"grounded into…"`, `"hit by pitch"`). The first port wrote `parsePA` against the raw human-readable strings, so **every PA fell through to the "–" fallback with `basesReached: 0`** → empty diamonds. Map on **exact enum equality first** (`r === 'homerun'`, `r === 'out'`, `r === 'hbp'`, …), keeping substring checks only as a fallback; a generic `'Out'` must resolve to `code: 'OUT'` / `reached: 0`, never "–". `playResult` flows correctly through `PlayUpdateWire → toPlayWire() → atBat.result` — no new endpoint, no field-name mismatch; the bug was purely the result→`{code,kind,reached}` mapping. Confirm against the real enum set, not remembered text.

---

### PR 11 — Game view: pitch-by-pitch live-follow behavior (open at the live PA + Jump to live)

Designed Jun 12, 2026. Prototype: **`Game Position — Live & Replay.html`** (`holistic/game-position.jsx`, **Live** mode). Net-new behavior on the existing `PitchByPitchV2` feed. **No new API tier** — runs entirely on the socket play feed already wired (the `joinGame` → `hydrate` replay + live `PlayUpdate` events). **This is Part 1 of a two-part split**; Part 2 (the replay transport + scrubber rail) is parked in `future.md` **F-002**, NOT this PR. **Closes BUG-009** and upgrades it from a one-line scroll fix to the full follow / break / return spec.

**The model.** The feed reflects a *position* in the game. For a live game that position is "now" — the live PA, expanded at the **top** of the newest-first list. The user can scroll back to read earlier at-bats and the feed must never yank them forward.

**Five behavior states:**
1. **On mount → open at the live PA.** Initial scroll position is the live edge (the current PA is the first row, expanded), **not** the first pitch of the 1st. Do **not** use `scrollIntoView` (it can disrupt the page) — set the scroll container's `scrollTop = 0` (newest-first ⇒ live edge is the top), or anchor to the live PA's offset.
2. **Following (pinned).** While the feed sits at the live edge (`scrollTop <= ~8px`), new pitches/PAs keep the live PA in view automatically. New content prepends at the top; staying pinned (scrollTop 0) shows it.
3. **Looking back (broken).** The instant the user scrolls away from the live edge, auto-follow **stops** — the feed does not move when new pitches arrive. **Critically:** when new content prepends at the top while the user is scrolled away, **compensate `scrollTop` by the inserted height delta** so what they're reading stays fixed. This is the classic prepend-shift / scroll-anchoring problem — don't rely on `overflow-anchor`; set it explicitly in a layout effect (record `prevScrollHeight`, then `scrollTop += scrollHeight - prevScrollHeight`).
4. **Jump to live.** While looking back, a floating **"Jump to live"** pill appears (centered, near the top of the feed) carrying a **"N new"** count of pitches that arrived since the break. Click → scroll to the live edge + re-arm following + reset the counter. Scrolling back to the top manually also re-arms and clears the count.
5. **Pill pins to the VISIBLE feed region — through page scroll.** The pill anchors to the top edge of the feed's **visible** region, not the top of the feed container. The game page scrolls AND the feed has its own internal scroll; the pill must survive **both**. As the page scrolls and the feed's top slides under the page header, the pill **sticks just below the header** (clamped to the feed column width); it leaves only when the **entire feed scrolls out of view** (or following re-arms). Use a `position: sticky` pill wrapper whose scroll context is the **page** (`top` = page-header offset), bounded by the feed column. **Gotcha:** a naïve `sticky; top:0` placed *inside* the internal-scroll frame pins only against the internal scroll and still rides off-screen on **page** scroll (the reported bug); and any ancestor with `overflow:hidden/auto` will silently capture the sticky. This does **not** reproduce in the prototype (fixed-height card, no page scroll) — verify in the real page+frame composition.

**Re-arm rule:** `following = (scrollTop at the live edge)`. Break when they leave it; re-arm when they return — by scroll or by the pill.

**Implementation notes (React):**
- `following` state + a **ref mirror** so the scroll handler and the live-update interval read the current value without stale closures.
- `onScroll`: `atTop = scrollTop <= 8` → set `following` accordingly; clear `newCount` when re-pinned.
- `useLayoutEffect` keyed on the feed content / head: if `following` → `scrollTop = 0`; else → `scrollTop += (scrollHeight - prevScrollHeight)`; always store `prevScrollHeight = scrollHeight`.
- On each live `PlayUpdate` that advances the head, bump `newCount` when `!following`.

**Acceptance:** Opening a **live** game lands on the current at-bat (live PA expanded at the top), not the 1st-inning leadoff. While pinned, new pitches keep the live PA in view. Scrolling down to an earlier at-bat stops the feed from moving and a new pitch does **not** yank the view; a **"Jump to live · N new"** pill appears. The pill — or scrolling back to the top — returns to the live edge and resumes following. **With the feed visible, scrolling the whole page down keeps the pill pinned at the top of the visible feed (under the header), not riding off with the container** — it disappears only when the entire feed leaves the viewport. No `scrollIntoView`. **A final game has no live edge** — open at the top is fine (the play-head/replay treatment of finals is Part 2 / F-002).

**Scope boundary (NOT this PR):** the replay transport (play/pause, speed, step-by-PA), the **at-bat scrub rail**, and the **win-prob arc** rail are **Part 2** (`future.md` F-002). PR 11 is the live-feed position behavior only — and it ships with zero backend changes.

---

### PR 12 — Game view: position persistence (resume where you left off)

Designed Jun 13, 2026. Sibling to PR 11. Net-new behavior on `GamePage` + the `PitchByPitchV2` feed. **No new API** — pure client-side persistence of the game's position across an in-app route unmount/remount. **Closes BUG-010.**

**The problem.** React Router unmounts `GamePage` when you navigate away (e.g. to `/player/:mlbId`); remount starts the feed fresh at the top. So: open a past game, read several PAs in, tap a player name, hit Back → the game "starts over." It should resume where you left off — a game has a *position* and the view should remember it.

**The rule (return to the position you left, keyed by `providerGameId`):**
- **Final / replay game:** restore EXACTLY — the feed's `scrollTop` AND which PA is expanded.
- **Live game:** return to the **live edge** and re-arm following — regardless of whether you were following or looking back when you left. "Now" has advanced; that's where you land, and PR 11's follow/break model takes over. *(Decision Jun 13: live re-entry does NOT restore a stale look-back offset.)*

**Scope of memory — SESSION only (decision Jun 13).** Persist across in-app navigation within the session (the player round-trip). A hard refresh / cold load falls back to the PR 11 default (live edge for live, top for final) — do not restore a stale scroll on a fresh load. Use an in-memory module-level `Map<gameId, { scrollTop, expandedPaId }>` or `sessionStorage` — **NOT `localStorage`** (a stored scroll goes stale fast, especially for a live game).

**Implementation notes (React):**
- Capture position on the feed's debounced `onScroll` (and/or an unmount cleanup): write `{ scrollTop, expandedPaId }` under `providerGameId`.
- Restore in a layout effect AFTER the hydrate rows paint (same timing rule as PR 11 — not on empty first mount): final/replay → apply cached scroll + expand that PA; live → ignore the cache, run PR 11's open-at-live.
- No `scrollIntoView`; set `scrollTop` directly. Don't fight PR 11 — for live games PR 11 owns the landing.

**Acceptance:** Final game — scroll in, expand a PA, visit a player, come Back → feed is exactly where you left it (scroll + expanded PA). Live game — scroll back, leave, return → you land at the live edge with following re-armed (not the old offset). Two different games keep separate positions. A hard refresh falls back to PR 11 defaults. No `scrollIntoView`; numerals mono.

Open one PR titled **"PR 12 — Game view: position persistence"**; link BUG-010 as closed.

---

### PR 15 — Game view: Head-to-head matchup screen + on-dark logo fix

Designed Jul 27, 2026. Net-new, ungated (mock data — see below). **Build prompt:
`PROMPT_headtohead_and_logo_fix.md`.** THIS WAS HANDED OFF BUT NEVER GIVEN A MIGRATION.md
ENTRY — that's the likely reason the port didn't land; re-verify against the checklist below.

**New component:** `window.HeadToHeadScreen` in new file `holistic/game-headtohead.jsx`
(loaded in `Holistic.html` right after `game-v2.jsx`, before `player.jsx` — it reads
`window.LINEUPS`/`window.PROBABLES`, now exported from `game-v2.jsx` for this purpose).

**Entry point:** a **Preview/Head-to-head** segmented toggle next to the page title, present
on BOTH `GameScreenV2Pregame` and the live `GameScreenV2` — this view is intentionally NOT
pregame-only; it stays reachable after first pitch. Live view opens Head-to-head pre-selected
to the current live batter; pregame defaults to the #2 hitter.

**Structure:**
- `StarterPair` — both probable starters side by side, always visible.
- **Batter/Pitcher mode toggle:** Batter mode = pick a team → 9-batter chip rail → deep-dive
  vs the opposing starter. Pitcher mode = pick any pitcher (starter or bullpen, either team,
  sourced from `LINEUPS[side].bullpen`) → chip rail of the OPPOSING full lineup → deep-dive
  of the selected batter vs the CHOSEN pitcher (not just the starter).
- `DeepDive` — one batter's scouting report vs one specific pitcher: career H2H line (or
  "First meeting" pill), an arsenal table (that pitcher's pitch types × batter AVG/SLG/
  whiff%), a heat-map zone, a plain-language read line, real headshot (`PLAYER_MLB_IDS` map
  added for the mock lineup names).

**Data note — mock only, do not port as-is:** `mockH2H()` deterministically hashes
batter+pitcher name pairs into plausible stats. Replace with the real batter-vs-pitcher /
batter-vs-pitch-type data (same class the player Upcoming tab's H2H card already uses — see
`player-upcoming.jsx` for the real shape). The mock's SLG math is simplified (HR-only extra
bases) — do not carry that formula over.

**Bundled in the same PR — on-dark logo legibility fix:** `TeamDot`/`TeamMark` (`shared.jsx`)
gained an `onDark` boolean — wraps the logo in a small white plate so dark-dominant marks
(Twins, Royals, etc.) stay legible on the ink-dark line-score band. Applied to `LineScoreBand`/
`PregameLineScoreBand` (`game-v2.jsx`) and the dark Row/leaders line in `game-scout.jsx`. Light-
surface `TeamDot` usages elsewhere are unchanged (no `onDark`).

**Files touched:** `holistic/shared.jsx`, `holistic/game-v2.jsx`, `holistic/game-scout.jsx`,
new `holistic/game-headtohead.jsx`, `Holistic.html` (script tag added).

**Re-verification checklist (do this first):**
1. Confirm `holistic/game-headtohead.jsx` (or its ported equivalent) actually exists in the
   target app's source tree and is imported/rendered somewhere reachable.
2. Confirm the Preview/Head-to-head toggle renders on both the pregame AND live game screens
   — not just one.
3. Confirm `onDark` logo plates render on the dark line-score band (test with a dark-logo team
   like Twins/Royals if in the roster).
4. If none of this is present in the app, treat PR 15 as **not yet ported** and re-run it from
   this prompt with an explicit MIGRATION.md-tracked PR number this time.

---

### PR 14 — Game view: live scorecard flip, per-team card driven by real game state

Designed Jul 25-26, 2026. Net-new, ungated. **Build prompt: `PROMPT_PR14_scorecard_flip.md`.** Adds a
flip icon to `PitchByPitchV2`'s header that 3D-flips the panel to a pannable/zoomable scorecard.
**Each team has its own card** (HOU/CHC toggle in the scorecard header). One shared builder
(`window.buildScorebookGrid` in `scorebook-cell.js`) is used by BOTH the print reference
(`Scorebook Page.html`, blank) and the live game view (`game-v2.jsx`, filled). Lineup rows (order,
number, name, position, up to 2 subs) come from the real `LINEUPS` roster data (same source as the
Lineups tray); per-inning cells and AB/R/H/RBI + R/H/K/BB tallies (rendered as scorebook tick marks,
not numbers) come from the `PAs` feed, filled up to the live play head only. Pitching section lists the
real starter + relief chain with ERA/hand. E(rror) column removed. See the prompt for full data rules
and a known gap (runners advanced/scored by another batter's PA aren't credited — no baserunner-state
tracking yet).

**Acceptance:** team toggle swaps rosters; lineup/pitching data is real, not placeholder; tick-mark
tallies; cells fill only up to the live head; flip/pan/zoom mechanics unchanged.

---

### PR 13 — Game view: scorebook depth + batting-order spot (three small enhancements)

Designed Jun 14, 2026. Three contained game-view enhancements that share the same files (`ScorebookCell` in `shared.jsx`, the `MatchupLeft` batter card + `PitchByPitchV2` rows in `game-v2.jsx`). **Bundled into one PR because they touch the same code.** Source of truth: re-synced `holistic/shared.jsx`, `holistic/game-v2.jsx`, `holistic/foundations.jsx`.

**Split posture (read first): an UNGATED visual core + GATED data enrichments.** Ship the visual core now on existing data; the enrichments light up when their data lands — no layout hole either way, because the atom degrades to today's rendering.

#### F-004 — batting-order spot (UNGATED, ship now)
A small squared mono chip (`OrderSpot`) showing the batter's lineup position (1–9), placed before the batter name in three spots for consistency: the **pitch-by-pitch rows**, the **"At bat" batter card**, and the **Due-up** on-deck/in-the-hole rows. Deliberately distinct from the jersey number (`#27`, inline) and the result-icon circle.
- **No new API** — the batting-order slot is already known from the same lineup feed that powers the Lineups tray. Wire that slot through to the feed PA rows + batter card + due-up.
- **Acceptance:** every PA row, the batter card, and both due-up rows show the correct order spot (matches the Lineups tray). Hover title reads "Batting Nth". Three numbers per row (order, jersey, result) stay visually distinct.

#### F-003 — `ScorebookCell`: result vs. baserunning (UNGATED atom + GATED enrichment)
The diamond now tells two stories with **stroke weight**: a **bold** basepath = what the batter did at the plate (bases earned off the bat; dashed for a walk), and a **light** basepath = how far he advanced **afterward** as a baserunner. End-states: **green** shade = run; **hollow ring** at the final base = left on base; **×** = thrown out on the bases (distinct from a plate out = empty diamond).
- **New optional props:** `reachedOnPA` (bold endpoint), `finalBase` (light endpoint), `outAt` (× base), `stranded`. The old `reached` shorthand still works.
- **UNGATED:** the atom + the bold/light two-tone system ship now. **If you pass only `reachedOnPA` (= today's `reached`), it renders identically to today** — bold path + dot, no light segment. So the visual upgrade is safe on current data.
- **GATED on baserunning-outcome data:** the *light segment* and the scored/stranded/out-on-bases end-states need per-runner baserunning tracking (did this runner later score / get stranded / get thrown out). The `scored` flag already exists (PR 10 path); `finalBase` / `outAt` / `stranded` need baserunning data the feed may not carry yet. Until it does, omit those props and the cell shows the PA result only — no hole.
- **Acceptance:** the `ScorebookCell` vocabulary in `holistic/foundations.jsx` (Single / Double / Walk / Singled·scored / Walked·stranded / Caught stealing / Strikeout / Groundout / Out·generic / Home run / Live) renders at parity. The batter-card "At-bats" row uses the enriched props where baserunning data exists, degrades cleanly where it doesn't.

#### F-005 — out-code enrichment (GATED on the play enum) · ✅ DONE & SIGNED OFF (Jun 20, 2026)
`ScorebookCell` already renders whatever `code` string it's handed; the design contribution is the **degradation rule** + legibility at 44px. Show the real code (`K`, `F8`, `F9`, `6-3`, `L4`…) **when the feed carries fielder/out-type detail**, and the honest catch-all **`OUT`** when it doesn't. A fabricated `F8` is worse than a truthful `OUT`.
- **The data question to answer first (this is the gate):** *what values can the normalized play enum take, and does any out carry the out-type + fielder/position detail* (e.g. position 8 = CF vs 9 = RF)? That determines how much is reachable. If the enum only says generic "Out", you get `OUT`; if it carries position, `F8`/`F9`/`6-3` render for free. Build a play-event → scorebook-code mapper that degrades to `OUT`.
- **Standalone handoff (Jun 20, 2026):** the F-005 slice now has its own self-contained prompt — **`PROMPT_F005_outcodes.md`** — written as investigate-then-build with a three-tier degradation ladder (Tier A fielder-coded `K`/`F8`/`6-3`/`6-4-3` → Tier B type-only `GO`/`FO`/`LO`/`PO` → Tier C honest `OUT`) + a length-aware font shrink for 5+ glyph codes. Use it to ship F-005 independently of the rest of PR 13.
- **Acceptance:** outs show specific codes where the data supports them, `OUT` otherwise; longer codes stay legible at the 44px cell.

**Out of scope (parked `future.md` F-006):** full traditional scorekeeping notation — fielder's choice (batter safe + a *different* runner out — needs a not-a-hit `kind` + cross-runner linkage the per-PA cell doesn't have), bunt vs. clean-hit distinction, and spray/location. A deeper data + notation layer; do not fold into PR 13.

**One PR titled "PR 13 — Game view: scorebook depth + batting-order spot."** Ship F-004 + the F-003 atom (ungated) immediately; land the F-003 baserunning enrichment and F-005 out-codes behind their data as it arrives. No new endpoints for the ungated core.

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
