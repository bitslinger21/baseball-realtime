# Handoff: Baseball Realtime — Holistic Redesign

## Overview

A holistic redesign of the **Baseball Realtime** application covering three screens:

- **Today's games** — Daily slate landing page
- **Game view** — Live game dashboard with pitch-by-pitch
- **Player view** — Per-player profile with five tabs (Overview, Stats, Splits, Pitching, History)

The redesign establishes a unified design language ("editorial scorebook") and restructures each screen's content so the most-important information dominates the page and reference data sits in a calmer second tier.

## About the Design Files

The files in this bundle are **design references created in HTML/React** — prototypes showing intended look, layout, structure, and behavior. They are **not production code to ship as-is**.

The task is to **recreate these designs in the existing Baseball Realtime codebase** using its established framework, component library, state management, and routing. The inline-styled React components in this bundle are illustrative — translate them into whatever component pattern the target codebase uses (CSS modules, Tailwind, styled-components, a design-system library, etc.).

The HTML files use a custom design-canvas component to lay multiple screens side-by-side on a pannable surface — that's for review only. In the real app, each screen is its own route.

## Fidelity

**High-fidelity.** The bundle has final colors, typography, spacing, copy, and a working component vocabulary. Recreate them pixel-close in the target app — adapt only where the target codebase has stronger conventions (e.g., its own button/card primitives).

**Known port pitfalls (have recurred — get these right):**
1. **ONE header row, not two.** `AppHeader` is the only top bar: hamburger (left) · brand (center) · a **page-specific return slot** (right). On the game view that slot holds the bell + a single **"← Back to games"** return (relabeled from "← Today's games" — see the navigation note below: it returns to the schedule for the date the game belongs to, which isn't necessarily today). Do NOT render a separate global "Back" row above/below it, and do NOT stack a second return line. One bar, one labeled return.
2. **Date / inning sits ABOVE the team names, not below.** That string ("Wrigley Field · Sun May 24 · ▼ 9th") is `PageTitle`'s `subtitle`, which renders as a small eyebrow **above** the `<h1>` team-matchup title. Nothing about the date/inning belongs below the team names.
3. **The matchup title row is edge-aligned with the line-score band below it.** The team-names (left) + `LivePill` (right) row must share the same left/right insets as the dark `LineScoreBand` — no extra horizontal margin that makes the title sit inboard of the box edges.

## Files

The primary entry point is `Holistic.html`, which loads these in order:

```
design-canvas.jsx       — review-only canvas wrapper; do NOT port
holistic/shared.jsx     — design tokens (window.T), team data, atoms (Card, Pill, Stat, etc.)
holistic/foundations.jsx— design-system "swatch" page (review-only, do NOT port as a screen)
holistic/landing.jsx    — Today's Games screen
holistic/game.jsx       — Game view v1 (SUPERSEDED — historical reference only)
holistic/game-v2.jsx    — Game view v2 (PORT THIS — current signed-off game view)
holistic/player.jsx     — Player view (all five tabs)
holistic/app.jsx        — DesignCanvas assembly (review-only)
```

Open `Holistic.html` in a browser to see all screens at full resolution.

## Design Tokens

All tokens are defined in `holistic/shared.jsx` on `window.T`. Port these into the codebase's token system first.

### Color

| Token         | Hex       | Use                                            |
|---------------|-----------|------------------------------------------------|
| `bg`          | `#f4f1ea` | Page background — warm cream                   |
| `surface`     | `#fcfaf6` | Card / panel background                        |
| `surfaceAlt`  | `#efeae0` | Subdued surface (table headers, hero card bg)  |
| `border`      | `#e0dccd` | Hairline borders                               |
| `borderStrong`| `#c4bfae` | Stronger borders (empty base outlines)         |
| `ink`         | `#15161a` | Near-black primary surface (dark scoreboard)   |
| `text`        | `#1a1612` | Body text                                      |
| `textMuted`   | `#75706a` | Secondary text, labels                         |
| `textFaint`   | `#a39d92` | Tertiary text (zero values, placeholders)      |
| `accent`      | `#b8421e` | Live indicators, hot values, alert badges      |
| `accentSoft`  | `#fbe9dd` | Accent background tints                        |
| `positive`    | `#4a7c3e` | Wins, positive deltas, "in play"               |
| `positiveSoft`| `#e6efd9` | Positive background tint                       |
| `info`        | `#2c4a78` | Inning markers, information                    |
| `infoSoft`    | `#dde6f1` | Info background tint                           |
| `highlight`   | `#c8941c` | Streaks, special callouts                      |
| `highlightSoft`|`#fbf0d2` | Highlight background tint                      |
| `danger`      | `#a31621` | Errors, losses                                 |

### Typography

- **Sans (UI):** `"DM Sans", system-ui, sans-serif` — weights 400/500/600/700/800
- **Mono (numerals):** `"JetBrains Mono", ui-monospace, monospace` — weights 400/500/600/700

**Critical rule: ALL numbers use the mono font with `font-variant-numeric: tabular-nums`** — slash lines, scores, stats, table cells, etc. The mono is the workhorse of the system. Sans is for labels and prose only.

Type scale used in the designs:
- Display 36–38, weight 700, tracking -0.02em (page titles, big slash lines)
- Heading 22–28, weight 700, tracking -0.01em (section titles, scoreboard numbers)
- Heading 18–20, weight 700 (card headlines)
- Body 14, weight 400–600
- Mono 30 / 26 / 22 / 18 / 16 (stat values; tabular-nums)
- Eyebrow 10–11, weight 700, `letter-spacing: 0.14em`, `text-transform: uppercase` (used SPARINGLY — section labels only)

### Radius

| Token | px  | Use                          |
|-------|-----|------------------------------|
| `sm`  | 6   | Pills inside zone chips, etc |
| `md`  | 10  | Stat blocks, small cards     |
| `lg`  | 14  | Top-level cards              |
| `xl`  | 18  | (reserved)                   |
| `pill`| 999 | Pills, segmented controls    |

### Shadow

| Token | Value                                          | Use                       |
|-------|------------------------------------------------|---------------------------|
| `sm`  | `0 1px 2px rgba(20,16,12,0.04)`                | Card resting state        |
| `md`  | `0 4px 14px -6px rgba(20,16,12,0.08)`          | Hover, raised cards       |
| `lg`  | `0 12px 32px -10px rgba(20,16,12,0.18)`        | Modals, floating overlays |

### Team brand colors

Defined in `window.TEAMS` (see `shared.jsx`). 12 teams included with `{primary, secondary}` hex colors. The app should have all 30; extend the object accordingly. **Do not invent team colors — use the official primary/secondary from MLB style guides.**

In this design, team brand colors appear as:
- 3-px left border on game cards
- Background of `TeamDot` (circular abbreviation marks)
- Accent ring on player portrait circles

Logos are NOT used. Instead, a `TeamDot` component renders the first letter of the team abbreviation on the team's primary background. **The real app should swap these for actual team logos.**

## Component Vocabulary

All components are defined in `holistic/shared.jsx`. Port these as primitives.

### Atoms

| Component     | Props                                          | What it does                                              |
|---------------|------------------------------------------------|-----------------------------------------------------------|
| `TeamDot`     | `team, size, square`                           | Circular team mark with abbreviation letter               |
| `TeamMark`    | `team, size`                                   | Larger circular mark with full abbreviation + accent ring |
| `Pips`        | `count, total, size, gap, color, emptyColor`   | Row of filled/empty dots (count: balls/strikes/outs)      |
| `Bases`       | `on:[b1,b2,b3], size, fill, empty, strokeWidth`| Rotated-diamond base indicator (3 bases visible)          |
| `Inning`      | `half:'top'/'bottom', num, size, color`        | Triangle + number (▼9 / ▲9)                               |
| `StrikeZone`  | `size, dots:[{x,y,label,color}]`, `heat:[9 vals]`| Tall strike zone w/ home plate + perspective. Dots mode plots pitches; **`heat` mode** fills the box as a 3×3 color grid (the player "hot zone") — SAME frame/plate/perspective |
| `Sparkline`   | `values, width, height, color, fill`           | Mini line chart with end-point dot                        |
| `Eyebrow`     | text content                                   | Small uppercase tracked label                             |
| `Pill`        | `tone, children`                               | Pill badge — tones: neutral, soft, ink, accent, positive, info, highlight, live |
| `LivePill`    | `label`                                        | Red-dotted LIVE pill with pulse                           |

### Layout components

| Component     | Props                                          | What it does                                              |
|---------------|------------------------------------------------|-----------------------------------------------------------|
| `Card`        | `title, subtitle, action, padless, children`   | White-surface card with optional header                   |
| `Tabs`        | `items, active, onClick`                       | Underline-style tab nav                                   |
| `Segmented`   | `items, active, onClick, size`                 | Pill-rail segmented control (in-card toggles)             |
| `Stat`        | `label, value, sub, size:'hero'/'md'/'sm', accent, trend, align` | Single stat readout (label + value + sub)        |
| `StatBlock`   | same as Stat + bordered card wrapper           | Stat inside a bordered card                               |
| `Th`, `Td`, `Tr` | table cell primitives with style props      | Use for editorial-scorebook tables                        |
| `Headshot`    | `team, initials, mlbId, size, ratio` (h/w, default **1.40**) | Player photo — ALWAYS portrait, `object-position:center top`, initials fallback. Use everywhere a person appears; never a 1:1 square (clips the chin). The MLB source photo is ~1.50 tall, so the box must be tall: **default ratio 1.40, player hero 1.32**. The team-color stripe is an **absolute overlay** (it must NOT consume image height, or the chin clips). |
| `AppHeader`   | `title, right, left`                           | Top app bar                                               |
| `Page`        | `width, children`                              | Page wrapper (cream bg, max width)                        |
| `PageTitle`   | `title, subtitle, right`                       | Page title row                                            |

### Buttons

Two button styles, both inline (`window.btn` and `window.btnPrimary`):
- **Secondary** — white surface, hairline border, body text color
- **Primary** — ink-black surface, white text, no border

## Screens

### 1. Today's games (landing)

**File:** `holistic/landing.jsx` → exports `window.LandingScreen`

**Purpose:** Show today's slate of games. User can enter a live game's view, open its pitch-by-pitch feed, see finals at a glance, and preview upcoming matchups.

**Layout (full-width, 1440 design width):**

1. **AppHeader** (top, persistent)
2. **PageTitle** — **date-aware title** + subtitle + right-side date controls (Prev · date picker · Next · **Today** when off-today). The `<h1>` reads **"Today's games" only when the selected date IS today**; otherwise it names the day — "Yesterday's games", "Tomorrow's games", or "{Weekday}'s games" (e.g. "Saturday's games"). Subtitle is the long date + game count ("Sunday, May 24 · 8 games"). The title must never say "Today's" after the user pages Prev/Next.
3. **Filter strip** — Segmented filter (All / Live · 2 / Final · 4 / Upcoming · 2) on left, "Watching" pills + connection indicator on right
4. **Live now section** — 2-column grid of rich live-game cards
5. **Final section** — 4-column grid of compact final-game cards
6. **Upcoming section** — 4-column grid of upcoming matchup cards

**Live game card** (`GameCardLive`):
- Top bar: `LivePill` + **inning indicator** (left) / `Bases` + count pips (right). The inning sits **to the right of the LIVE pill** in the standard format used everywhere else — the `Inning` atom (caret + number, ▼ for bottom / ▲ for top) plus the word "Top"/"Bottom" (e.g. **▼9 Bottom**). This is the only place on the landing that tells you what inning a live game is in — it must be present and legible (not buried in a muted eyebrow).
- Score rows: one per team. Team color as 3px left border; team currently batting is highlighted (light accent tint + "● AT BAT" label). Big mono score on the right.
- At-bat strip: pitcher (left) + at-bat batter (right) with names and stat lines
- Last pitch strip: "Last pitch" eyebrow + summary text (`4-Seam, 100 mph · Ball (1-1)`)
- CTA row: **Enter game →** (primary, flex 1) + **Pitch-by-pitch** (secondary)

**Final game card** (`GameCardFinal`):
- Top bar: a **"FINAL" pill** + venue name. If the game went to **extra innings**, the pill appends the inning count in mono/rust — **"FINAL (11)"** (driven by an `innings` prop; only shown when `innings > 9`). A regulation game shows plain "FINAL".
- Two score rows with team color stripe; losing team at 0.55 opacity; winning team gets a "W" badge
- Recap strip at bottom with a "Box" button

**Upcoming game card** (`GameCardUpcoming`):
- Top bar: "UPCOMING" info-pill + game time (mono)
- Two team rows showing probable pitcher with ERA
- Bottom strip with venue + "🔔 Alert" button

**Buttons & their handlers:**
- "Enter game →" → navigate to game view for this game
- "Pitch-by-pitch" → open the existing live-feed/pitch-by-pitch panel for this game (slide-in or full-page, however it currently works)
- "Box" (on final cards) → navigate to game's box score
- "🔔 Alert" (on upcoming cards) → set notification for game start

### 2. Game view

**File:** `holistic/game-v2.jsx` → exports `window.GameScreenV2`
*(The original `holistic/game.jsx` / `window.GameScreen` is SUPERSEDED — kept only as historical reference. Port v2.)*

**Purpose:** Watch a single live game. The current at-bat is the visual hero (strike zone + batter), the pitch-by-pitch list is the primary scrolling content, and game-wide context (line score, scoring summary, leaders, win probability, leverage) frames it.

**Layout (1440 design width), top to bottom:**

1. **AppHeader** — right side has the bell-with-badge and the single contextual return **"← Back to games"**. *(Pure navigation — the lineup trigger is NOT here; it's in the play-state eyebrow, see §4.)*

   > **One header, one return (decision).** There is exactly ONE header bar; it owns the single, **labeled** contextual return. It reads **"← Back to games"** and returns to the **daily schedule for the date this game belongs to** (preserving the date the user was browsing) — NOT a hardcoded jump to today, and NOT a generic "Back". The earlier "← Today's games" label was dropped because it lies once the user has paged to another date. Do **not** stack a global app-shell topbar carrying a generic "Back" on top of the page's own labeled return — that produces two competing back affordances. If the app keeps persistent global chrome (hamburger / brand / alerts), fold the labeled contextual return INTO that one bar.
2. **PageTitle** — game name / "Wrigley Field · Sun May 24 · ▼ 9th" / right-side `LivePill` + elapsed-time pill.
3. **LineScoreBand** — full-width dark band (`T.ink`), CSS grid `660px / 1fr / 1fr`, three zones divided by `#27272a` rules:
   - **Line score** — team marks (HOU/CHC) + runs per inning (1–9) + R/H/E. Current inning column highlighted `rgba(184,66,30,0.22)`; inning header number for the current inning is `T.accent`. Innings not yet played render `–`.
   - **Scoring summary** — capped at 3 scoring plays (inning tag in `T.accent` + play text). A "+N more scoring plays →" button reveals the rest (popover/expand — not the band growing).
   - **Game leaders** — top batter each side: team mark + name + line (e.g. "2-4 · HR · 3 RBI").
   - Band is FIXED height; nothing scrolls inside it.
4. **Two-column row** (`600px / 1fr`, `align-items: start`) — above the fold. The **entire left column is one sticky wrapper** (`top:16`) holding TWO stacked cards (`MatchupLeft` + `MatchupContext`) so they travel together; the wrapper height fills out to roughly match the 640px pitch-by-pitch frame on the right.
   - **Left card A — `MatchupLeft`:**
     - **Light play-state eyebrow** (`T.surfaceAlt`): inning glyph (▼ 9th) + `Bases` diamond + B/S/O `Pips` (balls navy, strikes ink, outs rust) on the left; a **"Lineups ▾" button** on the right (opens the lineup tray — **now built**, see §2a). *This is the only place the count lives now.* (There is exactly ONE LIVE pill on the screen — in the PageTitle; do not repeat it here.)
     - **Zone + batter** in a `280px / 1fr` grid: `StrikeZone` (240px) with all pitches of the current AB plotted as numbered dots + outcome legend; batter card (headshot, name, pos/B-T, slash line, "Today" line, "vs [pitcher]" career line).
     - **Dark "Last pitch" headline** (`T.ink`, full width below): pitch name (Four-Seam Fastball) + velocity mono (100 MPH) + result pill (BALL) with a short descriptor ("missed away"). No longer carries the count.
   - **Left card B — `MatchupContext`** (fills the space below `MatchupLeft`): a two-column card.
     - **Left half — "This matchup":** the batter vs the pitcher currently on the mound — "Bregman vs Pearson" with a **Today** line (`0-1 · K`) and a **Career** line (`4-12 · .333 · 1 HR`). Labels in faint sans, numbers in mono.
     - **Right half — "Due up":** the next two hitters labeled **On deck** and **In the hole**, each styled like a lineup-tray row (jersey `#` · name dotted-underline → player view · `– POS` · today's line right-aligned in mono).
   - **Right — `PitchByPitchV2`** — fixed-height (640px) card with **INTERNAL scroll**:
     - Header: "Pitch by pitch · N at-bats" + filter `Segmented` (All / Runs / K / HR / BB).
     - Body scrolls internally. **Newest PA at top.** Each PA row: inning + team chip, outcome icon (or live ● dot), batter name (dotted-underline → player view), summary, expand chevron. The **live PA** has `T.accentSoft` bg + 3px `T.accent` left border and is expanded by default showing its pitches in **chronological order** (oldest pitch first) in an indented table: #, Pitch type (color dot), Velocity, Zone chip, Result, Count. Finished PAs are collapsed (click to expand).
     - Pitch-type dot colors: Four-Seam `#dc2626`, Sinker `#ea580c`, Slider `#0891b2`, Curveball `#3b82f6`, Changeup `#16a34a`, Cutter `#a3a3a3`, Sweeper `#7c3aed`.
     - **Scoring chip:** a PA that scored runs shows a soft-**green** pill (`T.positiveSoft` bg, `T.positive` border/text) to the right of its outcome — "N run(s) score · [resulting score]" (e.g. "2 runs score · HOU 8 – 5 CHC"). Runs count in `T.positive`, score in mono `T.text`. Green (not rust) — scoring is the positive event in our palette. Non-scoring PAs have no chip.
5. **`PitcherCard`** ("On the mound") — full-width below the fold: headshot + name + RHP/# + 4 stat blocks (Today IP/H/R/K, Pitches, ERA, WHIP).
6. **Win probability + Leverage** — two **HALF-WIDTH** cards side by side (`1fr / 1fr`):
   - **`WinProbTimeline`** — split-fill SVG line chart of the favored team's win % across the game. Y-axis: 100 (top, anchored "HOU") → 50 (dashed midline) → 0 (bottom, anchored "CHC"); area above the line filled `T.accentSoft`, below filled `T.infoSoft`. Header shows whoever is **currently favored** (computed, not hardcoded) as "84% HOU". A "How to read:" caption explains the chart in plain language. X-axis ticks at innings 1/3/5/7/9.
   - **`LeverageCard`** — "2.4× HIGH" + plain-language explanation + a horizontal leverage scale bar (current value filled rust, `avg 1.0` marker, peak label, 0→3.5 range).

**No box score. No standalone timeline. No on-page lineup table.** (All removed/relocated during the design pass — lineup → slide-in tray, see §2a.)

**Strike-zone geometry (`StrikeZone` in `shared.jsx`):** container is `size × 1.3` tall; zone box inset `12% 23% 34% 23%` (a realistic ~0.77:1 tall rectangle); home plate is drawn full zone-width as an SVG pentagon **in perspective**, its side edges converging to the same vanishing point as the splayed batter's-box chalk lines below it. Pitch dots are **clamped** so a dot's full circle never clips the frame regardless of input coordinates.

**Interactions:**
- Click any player name **anywhere** (PitchByPitchV2 batters, the at-bat batter card, the "On the mound" pitcher, game leaders, the lineup tray, due-up, and the head-to-head) → navigate to that player's Player Overview. In the design these all call one helper (`window.openPlayerOverview()`); **in the real app, replace each with `<Link to={`/player/${mlbId}`}>`** — every name carries the player's `mlbId`.
- Click expand chevron on a finished PA → toggle pitch-level detail
- **"Lineups ▾" in the play-state eyebrow → open the lineup tray** (slide-in from the right; see §2a). Trigger chevron flips ▾→▸ and the button goes dark while open.
- "+N more scoring plays →" in the line-score band → reveal remaining scoring plays
- Filter `Segmented` (All / Runs / K / HR / BB) → filter the play list
- Auto-scroll behavior: list is newest-at-top, so the live PA is always visible without scrolling

### 2a. Lineup tray (game view)

**Component:** `LineupsTray` + `LineupEntry` / `BenchRow` / `BullpenRow` in `game-v2.jsx`; opened from the "Lineups ▾" trigger in `MatchupLeft`'s eyebrow.

- **Right-side slide-in tray**, contained to the game-screen artboard (NOT the browser viewport): the screen root is `position: relative; overflow: hidden`, the tray is `position: absolute; top/right/bottom: 0; width: 560px`, over a dim `rgba(20,16,12,0.28)` backdrop. Opens by sliding in from the right (`translateX(100%)→0`, ~0.24s); **the close animation reverses it** (slides back out + backdrop fades) before unmount — don't just `display:none`.
- **Closes three ways:** ✕ button, **Esc** key, and **backdrop click**. All required.
- **One team at a time**, switched by an **Astros / Cubs `Segmented` toggle** in the header (defaults to the team at bat). A team strip below shows logo + full club name + "At bat"/"In field".
- **Three sections per team — `Lineup` / `Bench` / `Bullpen`:**
  - **Lineup** is the historical in-game roster (10 rows: 9 batting slots + the pitcher, slot `P`). **It never shrinks.** A left gutter numbers the batting slots `1–9` (`P` for the pitcher); subs leave the gutter blank.
  - **Substitutions render as a tree, not a replacement.** The original starter STAYS in the Lineup (greyed) and the incoming player(s) render **indented beneath** him, sharing ONE continuous vertical connector line with a horizontal tick into each name. **Multiple subs at the same slot stack at the SAME indent** (no deepening) — only the LAST is the active player (rust ● + "In · Nth"); earlier subs grey out. The subbed-out starter (and any earlier subs) ALSO appear on the **Bench**.
  - **Bench** = everyone out of the game: unused reserves + anyone subbed out, **including a pulled pitcher** (tagged "Out · Nth · P" — a pulled pitcher can't return to the bullpen).
  - **Bullpen** = relievers still eligible to enter (name · hand · ERA). A reliever who enters leaves the bullpen.
- **Stat columns** (aligned across starter + sub rows via a shared grid `20px 34px 1fr 40px {statCol}px`): batters show a **dedicated line column** (`1-4`, right-aligned, vertically aligned down the list) then a gap (≈20px) then the **full PA sequence** faint and left-aligned on the SAME row (`1B · K · F8 · BB`). **Pitchers** show their line starting in the sequence column (left-aligned), so it sits under the batters' sequences: `5 2/3 IP · 3 R · 6 K · 2 BB · 1 HBP` (walks + HBP shown when non-zero).
- **The tray width is DYNAMIC, sized to its content — nothing truncates.** `useTrayMetrics(team)` measures (canvas `measureText`, with `document.fonts.load(...)` resolved first so the real DM Sans / JetBrains Mono metrics are used, NOT fallback fonts) the widest player name+pos and the widest stat/sequence string for the **currently selected team**, then derives the stat-column width (`statCol`) and the overall `trayWidth` (clamped 560–900px). It recomputes when you toggle Astros/Cubs (and the tray `width` transitions). Do **not** hard-code a 200px stat column or a 560px tray — the longest pitcher line (`5 2/3 IP · 3 R · 6 K · 2 BB · 1 HBP`) overflows a fixed 200px column. Names render in full (no ellipsis).
- **Innings pitched are formatted as thirds** everywhere — `5 2/3 IP`, `3 1/3 IP`, even innings drop the fraction (`6 IP`). NOT decimal (`6.1`/`6.2`). This applies to the tray AND the `PitcherCard` "Today" stat.

### 2b. Pregame state (game view, before first pitch)

**Component:** `GameScreenV2Pregame` in `game-v2.jsx` (artboard `game-v2-pregame`). **Status: built, PENDING REVIEW (not signed off).**

The game view has a distinct **pregame** state for a scheduled-but-not-started game. The guiding rule from review: **do NOT show a blank "Waiting for updates" panel in each section** — fill every section with the static info we already know. The same skeleton as the live screen, section-for-section:

- **Dark band** (`PregameLineScoreBand`): the line score renders as an **empty 1–9 grid of `–`** with `R/H/E` dashes (clear "not started" signal); the status reads **"Scheduled · 8:05p"** with a grey dot (not the red LIVE dot). Zone 2 becomes **"Probable pitchers"** (both starters, hand · # · ERA); zone 3 becomes **"Coming in"** (each team's record · L10 · streak).
- **Play-state eyebrow** (`PregameMatchupLeft`): **top of the 1st** (▲ 1st), **empty bases**, **0 balls / 0 strikes / 0 outs** pips, and the **"Lineups ▾" button** present (opens the same `LineupsTray`). The strike zone renders **empty** (no dots) with a caption "Pitches plot here once the game starts."
- **Batter card:** the **leadoff hitter** of the team batting first (away team bats top 1st — here HOU's Altuve), with season slash, a recent-form line, and a vs-starter career line.
- **Headline strip** (the dark strip that carries "Last pitch" when live): becomes a **"First pitch"** strip — "Valdez vs Imanaga" + big mono time (8:05 PM ET) + a gates/weather pill.
- **Context card** (`PregameContext`): left = **"First matchup"** (leadoff batter vs the starter who pitches the top of the 1st, career + vs-hand lines); right = **"Top of the order"** (the first three hitters with AVG).
- **Below the fold:** `PregameStarters` ("Starting pitchers" — BOTH probables side by side with season Record/ERA/WHIP/K, replacing the live "On the mound" single-pitcher card); then a half-width row of `PregameOdds` (a **pregame win-probability split bar**, HOU/CHC, with a "how to read" caption) + `PregameSeries` (the **season series** record + the recent head-to-head results).
- **The ONLY literal waiting copy** is the pitch-by-pitch empty state (`PregamePitchByPitch`): a centered ⚾ + **"Waiting for the game to begin"** + "First pitch is scheduled for 8:05p ET…". (The header still reads "Pitch by pitch · 0 at-bats" with the filter rail.)

The app should select pregame vs live vs (future) postgame off the game's status. **Postgame** (final, no live at-bat) is **not designed** yet.

### 3. Player view

**File:** `holistic/player.jsx` → exports `window.PlayerScreen({ tab })`

**Purpose:** Per-player profile and stats. Replaces the old left-sidebar layout with a full-width hero band so tables and grids have room to breathe.

**Layout (1440 design width):**

1. **AppHeader** with the contextual return in the right slot. **Label + target are derived from the route the user came from, NOT hardcoded** (the mock hardcodes "← Back to game" because a static artboard has no referrer state — do not copy that literally). Rule: arrived from a game → **"← Back to game"** → that `/game/:id`; no in-app referrer (deep link, search, name-click from landing) → fall back to **"← Today's games"** → `/`. Same context-aware pattern the game view's return already uses.
2. **PageTitle** — "Player" / "Roster · #3 · Houston Astros"
3. **PlayerHero card** (full width):
   - Top row (grid: 124px / flex / 220px):
     - **Photo** — the shared **`Headshot`** atom (NOT a square). It frames the player photo **portrait** (taller than wide, `ratio` height/width ≈ **1.32** here → 124×164) with `object-fit: cover; object-position: center top`, a thin team-color stripe **overlaid** on top (absolute — does not eat image height), and rounded corners. **Global rule: never use a 1:1 square for a person — a square crop on a head-and-shoulders photo clips the chin/mouth; the MLB source photo is ~1.50 tall so the frame must be tall too.** Initials are the fallback when no photo loads.
     - **Headline** — team dot + team name + position eyebrow row; player name in 38px display weight; slash line `.239 / .278 / .299` in 28px mono + OPS + games
     - **Today widget** — surfaceAlt panel showing today's status (ON DECK live pill, today's at-bats line)
   - Bio strip (below, in surfaceAlt): From / Debut / Height / Weight / Bats / Throws as inline label-value pairs; right side has **"Watch live ▸"** and **"Compare ▾"** buttons (both wired — see below)
   - Tabs row: Overview · Stats · Splits · Pitching · History · Upcoming

   **Hero action buttons (wired):**
   - **Watch live ▸** — navigates to this player's live game. In the design canvas this calls `window.openGameView()` (focuses the game artboard); in the target app replace with `<Link to={`/game/${providerGameId}`}>` / `navigate()`. (The old "+ Watch" watchlist label was dropped — this is a navigation CTA, not an add-to-list.)
   - **Compare ▾** — opens an anchored **player-picker popover** (closes on outside-click / Esc): an eyebrow header, a search input (`Search players…`, not yet wired to a query), and a list of candidate players (TeamDot + name + `ABBR · POS · slash`). **This is intentionally a fake-door** to measure demand before building the real comparison view: selecting a player shows "Peña vs [player] breakdown is in the works" + a **"Notify me when this ships"** primary CTA, which swaps to a green "✓ Thanks — we'll let you know" confirmation. It fires analytics via `window.track()` — `compare_opened` (on open), `compare_player_selected` (on pick), `compare_notify_requested` (on notify). **The actual side-by-side comparison screen is NOT designed** — keep the fake-door until the `compare_opened → compare_notify_requested` funnel justifies the build.

4. **Tab content** below — varies by tab.

#### Tab 0 — Overview

Story-focused. NO comprehensive stat grids (those live in Stats).

- 3-column grid:
  - **Recent form** card (1.4fr) — last 15 games. Hero stat (`.286` AVG, "14-for-49") + **`FormGuide`** (210×56): one bar per game, oldest→newest, bar height = total bases that game (hitless games show a faint stub, multi-base games saturate in `T.accent`); a HR game gets a small gold (`T.highlight`) dot above its bar. Caption: "Total bases / game" · "last night →". Below: 4 small StatBlocks (OPS, HR, RBI, K%). NOT a flat sparkline — the per-game bars are deliberate so form reads game-to-game.
  - **Hot zones** card (1fr) — `StrikeZone` in **heat mode** (`<StrikeZone heat={9 AVG vals} />`) — the SAME tall frame + plate + perspective as the game view, filled as a 3×3 grid colored by intensity (`rgba(184,66,30, value)`), white text on dark cells. Right side: 3 quick insight lines. (Wrapped as the local `HotZone` helper in `player.jsx`.)
  - **Now** card (1fr) — 4 contextual rows: each is a label-text + tone-colored pill (on-base streak, vs starter, day/night AVG, defensive errors).

- **Last 5 games** card (full width) — 5 evenly-divided cells, each: date eyebrow + W/L pill + opponent + batting line (mono 20px) + per-AB detail (mono 10px).
- **Notable** card (full width) — 4 milestone cards in a grid: eyebrow + heading + progress bar (tone-colored) + detail.

#### Tab 1 — Stats

**Comprehensive reference — tabular layout, NOT card grids.**

- Range filter row: Segmented `[2026 season, Last 30d, Last 7d, Today, Career]` (left) + "Compare" toggle (right).
- 5 sectioned cards, each containing a table:
  - **Rate** — Batting Average, On-Base %, Slugging %, OPS, wOBA, wRC+
  - **Production** — Runs, RBI, Home Runs, Extra-base hits, Total bases
  - **Plate discipline** — Walk %, Strikeout %, Chase %, Whiff %, Contact %, Swing %
  - **Contact quality · Statcast** — Exit Velocity (avg/max), Hard Hit %, Barrel %, Launch Angle
  - **Volume + speed** — Games, At-Bats, Plate Appearances, Stolen Bases, BsR

Table columns: **Statistic | 2026 | League | Δ | Percentile (bar + nth)**

> **Comparative columns (League / Δ / Percentile) apply to RATE & quality stats only** — Rate, Plate discipline, Contact quality, and BsR. **Counting stats** (all of Production — Runs/RBI/HR/XBH/Total bases — and the counting rows in Volume + speed — Games/At-Bats/PA/Stolen Bases) are **raw totals**: they render the 2026 value plus a per-game/per-PA context note, and **em-dash (—) the League, Δ, and Percentile cells.** Percentiling a counting total conflates playing time with skill, so those cells are intentionally blank — not an unwired gap.

- Statistic — 14px sans semibold, sentence case
- 2026 — 18px mono bold, right-aligned; uses `T.accent` on the marquee stat per section
- League — 14px mono muted
- Δ — colored: positive green, negative red, neutral muted
- Percentile bar — 6px high bar, colored by tier: green ≥60th, amber ≥40th, red <40th; numeric label "Nth"

#### Tab 2 — Splits

**Six** sub-tables of splits, each a card with a table inside:

- Pitcher handedness (vs LHP / vs RHP)
- Venue (Home / Away)
- Day / Night
- Baserunners (Bases empty / Runners on / RISP)
- Count leverage (Ahead / Even / Behind)
- Pitch type (vs Fastball / vs Breaking / vs Offspeed)

Columns: Split | G | AB | H | HR | RBI | BB | K | AVG | OBP | SLG | OPS | **vs Lg**. The **vs Lg** cell pairs a `VBar` (OPS magnitude) with a ±delta-vs-league marker (green when above league, rust when below).

Above the tables, two filter rails — **both are wired** (interactive `Segmented` with controlled `active`/`onClick`):
- **Category** (left): `All splits · Handedness · Venue · Day/Night · Bases · Count · Pitch type`. Selecting a category filters which table(s) render; `All splits` shows all six. Each table carries a `cat` key; the visible list is `cat === 'All splits' ? tables : tables.filter(t => t.cat === selected)`. **Every rail option resolves to a real table** — "Bases" → Baserunners, "Pitch type" → Pitch type (these two tables were added so no rail option is a dead end).
- **Timeframe** (right): `2026 / Career / Last 30d`. Controlled selection that updates a context caption under the rails (`Showing … · 2026 season`). NOTE: the mock only carries the **2026** dataset; in the target app each timeframe selection must refetch/recompute the split tables (Career, Last 30d) — wire it to the splits API range param. The caption is the only thing that changes today.

The "hot" row in each split gets `T.positive`-colored stats and a positive `+` delta; AVG + OPS are the accented anchor columns; a zero HR is dimmed.

#### Tab 3 — Pitching

**For a batter, this tab shows "How pitchers attack this batter."** (For a pitcher, redesign as their own arsenal — out of scope for this design pass.)

- Title bar: heading + segmented filter (All / vs LHP / vs RHP / In zone / Outside)
- 3-column grid:
  - **Pitch mix** card — Donut chart (center "SEEN / {count}") + legend with % per type
  - **Performance vs pitch type** card — Table: Pitch (with color dot) | AVG | **SLG** | Whiff. The **SLG cell embeds a small colored bar beside the value** — there is NO separate "SLG bar" column (it was merged on Jun 2).
  - **Damage by location** card — a flex row: `StrikeZone` in **heat mode** (SLG by location, 150px, via the `HotZone` wrapper) on the left; on the right a compact panel — an **SLG color scale** (cold→hot gradient, `.000`→`.840+`) and **Hottest / Coldest** callouts (derived from the zone array: max + min cell, value in mono + zone name like "middle-middle" / "down & in"). A 62%-outside-the-zone insight line sits full-width below.
- Below, 2-column grid:
  - **By pitcher handedness** table — `vs` | FB% | BRK% | OS% | Zone% | First-pitch strike | Put-away, for LHP / RHP. FB% + BRK% + OS% are a pitch-mix triplet that sums to 100%. **Every column header carries a `StatInfo` `?` tooltip** (hover/click, dark popover) — right-anchored on Zone%/First-pitch strike/Put-away so the 268px tooltip doesn't overflow the card. **Glossary:** FB% = fastball share (four-seam/sinker/cutter); BRK% = breaking-ball share (slider/curve); OS% = offspeed share (change/splitter); Zone% = pitches inside the strike zone; First-pitch strike = PAs where pitch 1 is a strike; Put-away = share of two-strike counts that end in a K. **Note: BRK% was renamed from BB% (Jun 3)** — `BB` collides with base-on-balls; in this table it means breaking balls. Do not wire it to walk rate.
  - **Counts attacked** card — a single **3-column × 2-row** grid (6 tiles, no divider/eyebrow). Order: row 1 = `0-2 Slider` · `1-2 Slider` · `Ahead Sinker`; row 2 = `2-2 4-Seam` · `3-2 4-Seam` · `Behind 4-Seam`. The four two-strike tiles (solid border) show **two** labeled mono numbers, `thrown` % and `put-away K` % (K rate accented rust); the two count-state tiles in the 3rd column (Ahead/Behind) have a **dashed** border and show a single `thrown` %. Dashed vs solid carries the state-vs-count distinction.

#### Tab 4 — History

**Four WORKING sub-tabs** (the segmented control switches content — not display-only). Default lands on **Game log**. Right-side controls are contextual: the season picker shows only on Game log; the sort toggle lives in the vs-Team card header.

- **Game log** — season picker (`2026…2022`, **wired** — re-filters the log per season + updates the caption) + table: Date | Result (W/L pill) | Opp | H/AB | HR | RBI | BB | K | AVG | Notes. (This is the deeper, full-season log; Overview's "Last 5 games" is the quick glance — both intentionally kept.)
- **Career** — two cards stacked:
  - **Career arc** card — 5 year-cards (2022–2026): year eyebrow + OPS value (mono 22px) + bar (OPS/0.9 normalized) + slash + games; current year highlighted `T.accentSoft`/`T.accent` + "CURRENT" pill. (The at-a-glance story.)
  - **Season by season** table — Season | G | AB | H | HR | RBI | SB | BB | K | AVG | OBP | SLG | OPS, with a bold **Career totals** row (top-bordered, `T.surfaceAlt`). (The reference.)
  - **Milestones & transactions** card — a date-anchored list (mono date | event + sub-line | tag pill). Tag tones: Award/Record = gold `highlight` / navy `info`; Injury = `live`. Debut, WS MVP, records, IL stints, 500-hit pace.
- **vs Team** — **Career vs opponent** table (Team logo+nickname | G | AB | H | HR | RBI | AVG | OBP | SLG | OPS). Header carries a **sort toggle** (`OPS / Games / Team`, wired). Production = all ~29 opponents (mock shows 11); flat list, no division grouping.
- **Postseason** — **Postseason career** card (gold MVP honor pills + a stat row: G / AVG / HR / RBI / OPS) then a **By series** table (Year | Round | Opp | G | AB | H | HR | RBI | AVG | OPS | Honors) with a Career-totals row. **Empty state required:** when the player has no playoff history, render the "No postseason appearances" card instead (most players hit this — it is NOT a 2022-WS-MVP résumé by default).

> **Honors palette note:** awards/records use gold `highlight` (streaks/achievements), NOT rust. Rust stays reserved for live/hot.

#### Tab 5 — Upcoming

**File:** `holistic/player-upcoming.jsx` → exports `window.UpcomingTab`. **Status: SIGNED OFF (Jun 5, 2026). Tab order settled as LAST (after History). Gated on new API data — see PR 9.**

**The only forward-looking tab.** Where History looks back, Upcoming projects the player's next **3 scheduled games** against the **probable starting pitcher** of each — anchored on the question "how does this batter project against that arm?"

**Structure decision (important): NO nested tabs.** A nested tab-in-tab was explicitly rejected. Instead: a **game-selector rail** at top (the next 3 games as pickable cards) drives a **deep-dive that swaps below it** — the same "pick-one-then-detail" idiom already used by History sub-tabs and the Splits rails. Selecting a card sets `sel` state; the deep-dive re-renders for that game.

**Why it leans on projection, not raw history:** a batter's record against ONE specific pitcher is almost always a tiny sample (or zero). So the screen treats head-to-head as a *headline when it exists* and otherwise leans on always-available signal: the pitcher's **arsenal crossed with the batter's pitch-type performance**, plus handedness / pitch-class splits and location overlap. This is also why the **"first meeting" empty state is a first-class design**, not an afterthought (the middle mock game, rookie LHP Marco Salas, demonstrates it).

**Layout:**

1. **Intro row** — "Next 3 games" heading + "Probables · subject to change" pill.
2. **Game rail** — 3-column grid of `GameSelectCard`. Each: opponent `TeamDot` + `vs/@ SHORT` + date · game time (mono) · a probable-pitcher row (`Headshot` + name + `R/LHP` + ROOKIE pill when applicable + record · ERA) · a full-width **verdict pill** — career `OPS · PA` when there's history (green ≥.700 OPS, else rust), or **"First meeting"** (soft) when there isn't. The active card gets an ink top-rule + border + shadow.
3. **Deep-dive header** — opponent dot + "Peña vs {pitcher}" + date · time · venue. Swaps with selection.
4. **Row 1 (3 cards):**
   - **Head-to-head** — career slash + OPS (green/rust) vs this pitcher, a 6-up `PA / H / HR / RBI / BB / K` strip, "last faced" in the subtitle. **No-history variant:** a centered ⚾ + **"{Player} has never faced this pitcher"** + an explanatory line + a **"Projection-only matchup"** info pill.
   - **What he throws** — pitcher `Headshot` + season `W–L / ERA / WHIP / K-9` + an **arsenal usage list** (pitch name · usage bar · usage % · velo) + a one-line attack summary.
   - **The read** — a plain-language verdict with a **batter↔pitcher advantage meter** (green/rust split) and an `Edge: Peña / Edge: pitcher / Even` label driven by the game's `lean`.
5. **Row 2 (1.25fr / 1fr):**
   - **Arsenal vs your bat** *(the star table)* — joins the pitcher's arsenal to the batter's 2026 pitch-type performance: `Pitch | He throws % | Velo | Peña AVG | Peña SLG | Whiff`. The pitcher's **most-used pitch that is also a batter weakness** (SLG < .250) is auto-flagged with a **KEY THREAT** pill + `accentSoft` row tint, and a caption calls it out ("expect to see it in two-strike counts"). Pitch-type numbers are kept consistent with the Pitching tab (`PENA_VS_PITCH`).
   - **Matchup splits** — the always-available "stats and splits": `vs RHP/LHP` (handedness, from Splits) on top, then `vs Fastball / Breaking / Offspeed` pitch-class rows, each line + OPS + ±vs-Lg delta (green/rust). A caption summarizes the platoon/breaking-ball read.
6. **Row 3 (1.25fr / 1fr):**
   - **Location** — two `StrikeZone` heat maps side by side: **Peña damage (SLG)** (`PENA_DAMAGE`, same array as Pitching) vs **{pitcher} pitch %** (per-pitcher `heat` array), with a read on whether his attack zone overlaps the batter's hot zone.
   - **Recent meetings** — the head-to-head game log (date · result · detail), tone-colored result. **No-history variant:** "No prior meetings" empty card.

**Mock data** lives at the top of `player-upcoming.jsx`: `PENA`, `PENA_VS_PITCH`, `PENA_DAMAGE`, `PENA_VS_HAND`, `PENA_VS_CLASS`, and `UPCOMING_GAMES` (3 games — Casey Mize / history, Marco Salas / rookie no-history, Taj Bradley / history). Pitcher headshots use real `mlbId`s where known and fall back to initials otherwise. **All of this is placeholder** — see PR 9 for the real data dependencies.

**Open decision (resolved):** tab **order** — **settled as LAST** (after History), Jun 5, 2026. **Mock-data flag:** while on placeholder data, render the single **"Sample data · live feed pending"** pill in the intro row — do NOT append "(MOCK)" to individual cards.

## Interactions & Behavior

### Live updates (game view)

The hero scoreboard and pitch info must update on each new pitch (websocket or polling). When a new pitch arrives:
- Update count pips (B/S/O)
- Update last-pitch headline (pitch type, velocity, result pill)
- Append new pitch row to current PA in pitch-by-pitch list
- Update strike zone — add new dot, may need to fade older dots
- If at-bat ends: collapse current PA, mark with its outcome icon, advance to the next batter (highlight new PA with `T.accentSoft`)
- If inning changes: scoreboard inning marker flips half/number; new inning header row appears in pitch-by-pitch

### Navigation

- AppHeader's back button — context-aware **label AND target, derived from the route the user came from (never hardcoded).** Back to game from player ("← Back to game" → that `/game/:id`); back to the daily schedule from a game ("← Back to games" → `/`, **for the date that game belongs to** — preserve the browsed date, do not snap to today). **Fallback:** if there is no in-app referrer (deep link, browser-typed URL, search result, name-click from landing), return to the current day's schedule. There is exactly one return, in the AppHeader right slot, persistent across all **six** player tabs.
- **Landing date paging** — Prev/Next shift the selected date; the title re-derives ("Today's games" only on today, else the named day) and a **Today** button appears to jump back. The selected date drives which slate loads.
- Clicking a player name anywhere → player view, set tab to Overview
- Clicking a game card's "Enter game →" → game view
- Date picker on landing → load that day's slate

### State

The mocks are static. Real state to manage:
- Current selected date (landing)
- Watching set (which games are subscribed to live updates)
- Active tab per screen (Game view has no tabs; Player has **6**: Overview, Stats, Splits, Pitching, History, Upcoming)
- Filter selections (PitchByPitchV2 filter, Stats range/compare, **Splits category + timeframe** — both controlled, History year)
- **Compare picker** open/closed + selected comparison player (player hero)
- Lineup tray open/closed + Astros/Cubs team toggle (game view)

**Cross-screen navigation helpers** (design-canvas shims; replace with router links in the target app): `window.openPlayerOverview()` → player route; `window.openGameView()` → game route. Both currently focus a design-canvas artboard via `window.dcFocusArtboard(...)`.

### Responsive

This design is sized for desktop (1440 design width). Mobile breakpoints are NOT in this pass. When implementing, the strongest natural breakpoints will be:
- Landing — collapse Live cards to single column at narrow widths; Finals/Upcoming go from 4-col → 2-col → 1-col
- Game view — the `600px / 1fr` hero row stacks (MatchupLeft above PitchByPitchV2); the line-score band's three zones stack or the scoring-summary/leaders zones move below; win-prob + leverage go single-column. PitchByPitchV2 keeps its internal scroll.
- Player view — PlayerHero's 3-column row collapses (photo + headline above, today widget below); tables get horizontal scroll inside their cards

### Empty / loading / error states

Not designed in this pass — add per the codebase's conventions.

## Assets

- **Logos + headshots** — `TeamDot`/`TeamMark` already render real MLB team logos and `Headshot` renders real MLB player photos (initials/letter-mark fallbacks if a load fails). Headshots are **portrait, top-anchored** — keep that framing (never a square) so faces aren't clipped. Everything else is CSS/SVG.
- **Fonts** — DM Sans + JetBrains Mono. The mocks load them from Google Fonts; the real app should self-host or use its existing font infrastructure.
- **Icons** — None used in the heavy way. Bell (🔔), gear (⚙), hamburger (≡), back arrow (←), down-arrow (▾, ▸), and triangles (▼▲) appear as emoji/characters. Replace with whichever icon library the codebase uses (Lucide, Heroicons, etc.).

## Implementation Order (Recommended)

1. **Port design tokens** — colors, type, radius, shadow into the codebase's token system
2. **Build atoms** — TeamDot, TeamMark, Bases, Pips, Inning, StrikeZone, Eyebrow, Pill, LivePill, Sparkline, Donut (used in Pitching tab), VBar (used in Splits)
3. **Build layout primitives** — Card, Tabs, Segmented, Stat / StatBlock, Th/Td table primitives, AppHeader, Page, PageTitle, button styles
4. **Implement Today's games** — uses landing-specific composites (GameCardLive, GameCardFinal, GameCardUpcoming)
5. **Implement Game view** — LineScoreBand, MatchupLeft (sticky), PitchByPitchV2 (internal scroll), PitcherCard, WinProbTimeline, LeverageCard. Port from `game-v2.jsx`, NOT `game.jsx`.
6. **Implement Player view** — PlayerHero shared across tabs; then one tab at a time. **Overview → Stats → Splits → Pitching → History first (all signed off); Upcoming (Tab 5) lands last and is gated on new API data — see PR 9.**

## Notes & Caveats

- **Sign-off status (as of Jun 5, 2026):** Landing ✅ · Game view v2 ✅ · Player **Overview ✅, Stats ✅, Splits ✅, Pitching ✅, History ✅, Upcoming ✅** (all six player tabs signed off; Pitching is batter-scoped; Upcoming is gated on new API data — PR 9). **Pending review — built but NOT yet signed off:** the **Pregame game-view state** (§2b). The **`Headshot` chin-clip fix** (taller ratios + overlay stripe) is an atom-level **bug fix** and is applied everywhere. Mobile breakpoints, empty/loading/error states, postgame game-view state, and the Compare side-by-side view are not designed (Compare ships as a fake-door — see §3 Tab hero).
- **Pitching tab decisions (settled Jun 2):** (1) the bright per-pitch color palette is a **sanctioned exception** to the token system — keep it, don't token-ify; (2) the top filter rail (`All / vs LHP / vs RHP / In zone / Outside zone`) is **display-only** for now; (3) the tab is **batter-scoped** — on a pitcher's profile show a "Pitcher arsenal — coming separately" placeholder.
- **Global focus chrome.** `shared.jsx` injects a small stylesheet that removes the browser's default focus ring on mouse click and restores an accent ring for keyboard users only (`:focus-visible`). Match this in the app — otherwise active tabs/segmented controls show a heavy blue box on click.
- **`window.track()` is a stub.** Replace with the real analytics pipeline; the Compare fake-door depends on it firing `compare_opened` / `compare_player_selected` / `compare_notify_requested`.
- **Numbers always mono.** This is the single most important rule. Sans for numbers will break the entire aesthetic.
- **Reserve color for state.** The cream base + ink-dark scoreboard is calm by design. Accent (`#b8421e`) should only land on LIVE indicators, hot/featured values, the in-progress PA highlight, and a few highlight pills. Positive/info/highlight are equally restrained. **The one sanctioned exception is the Pitching tab's per-pitch color palette** (see sign-off note above).
- **The strike zone (`StrikeZone`) is ONE component, ported once** (PR 3), then reused everywhere. It has two modes: **dots** (game view PitchHero — plotted pitches) and **heat** (player view — a 3×3 color grid). Port the game-view `StrikeZone` from `shared.jsx` verbatim, then drive the player heat maps through its `heat` prop.
- **Hot zone heat map** (Overview "Hot zones" + Pitching "Damage by location") is NOT a separate component — it's `StrikeZone` in heat mode, wrapped by the tiny local `HotZone` helper in `player.jsx`. It keeps the SAME tall frame + home plate + perspective as the game view. Do NOT build a standalone flat 3×3 grid (that was the pre-Jun-2 approach; the zones were unified to match the game page).
- **Don't ship the design canvas.** `design-canvas.jsx`, `holistic/foundations.jsx`, `holistic/app.jsx` are review-only.
