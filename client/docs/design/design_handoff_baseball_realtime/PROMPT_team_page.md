# PROMPT — Team Page (`/team/:teamId`)

Build a new team overview page in `baseball-realtime/client/`. React 19 + Vite 7 + TypeScript, vanilla CSS per component, no Tailwind / no CSS-in-JS.

**Pixel reference:** `Team Page — Overview.html`. Match spacing, type sizes, and token values exactly.
**Today card states:** `Team Page — Today card states.html` — three states of the same card.

---

## 1. Route + entry points

Add `/team/:teamId` → `TeamPage`.

Entry points to wire:
- Team logo / abbreviation on a game card (landing) → team page
- Team name in the game view header
- A standings row
- The player page's team label

The page owns its own `PageTitle` (no global topbar). Header carries one labeled contextual return — `← Today's games` — matching the game view's pattern.

---

## 2. Tokens

All from `client` token set (post-contrast-pass values — do not use superseded ones):

```
bg          #f4f1ea      ink          #15161a
surface     #fcfaf6      text         #15161a
surfaceAlt  #efeae0      textMuted    #5c574f
border      #cfc8b4      textFaint    #6f685f
borderLight #e0dccd      accent       #b8421e   (rust — live/hot)
borderStrong #b4ae9b     positive     #3f6b34   (green — wins)
```

Fonts: **DM Sans** for UI and prose, **JetBrains Mono** + `font-variant-numeric: tabular-nums` for **every numeral**. Records, scores, ERAs, times, dates, rank numbers, GB — all mono. This is the project's hardest rule.

Type floor: 11px on word labels. The compact pills/badges (10–10.5px) are exempt.

Define `a` and `a:hover` (`#b8421e` / `#8f3317`).

---

## 3. Hero

```
[logo 96px]  AMERICAN LEAGUE WEST          Record    Division   Streak
             Houston Astros                78–52     1st        W4
             Daikin Park · Houston, TX     .600      +4.5 GA    8–2 L10
             Est. 1962
```

- Logo: real MLB asset via `mlbstatic.com/team-logos/{id}.svg`, 96×96, `object-fit: contain`. Letter-mark fallback.
- Name: 42px / 700 / `letter-spacing: -.02em`.
- Eyebrow: 11px / 700 / uppercase / `.09em` tracking / `textFaint`.
- Three stats right-aligned to the hero baseline. Value 26px mono. Streak value takes `positive` when winning, `textMuted` when losing.
- Bottom border `1px border`.

---

## 4. Today card — three states

One card, one frame, one destination. All three states link to `/game/:providerGameId`.

Game row is a 5-zone flex: `[away team] [away score] [center] [home score] [home team]`. Logos 28px, scores 28px mono, center column min 56px, gap 10px. Team names 14px/700 `nowrap` + ellipsis (must fit "Diamondbacks"). Records under names, 12px mono.

### Live
- Header: `Today` + rust `LIVE` pill
- Center: `▲ 11th` in accent, `2 out · 1B, 3B` beneath
- Footer: both pitchers' live lines · `Enter game →`

### Final
- Header: `Last game` + neutral `Final` tag (`surfaceAlt` bg)
- Loser's score drops to `textFaint`; winner's stays ink
- Center: `F` or `F/11` for extras, in `textMuted` — not accent
- Footer: `W Pressly (4–2) · L Romano (3–5) · Alvarez 2 HR, 4 RBI` — W/L letters in `positive` / `textMuted` · `Enter game →`

### Upcoming
- Header: `Next game` + tag with start time (`Sat` + mono `6:10 PM`)
- **Scores absent, not zeroed.** Center column widens to ~96px and stacks: day+date (mono numeral), first pitch 24px mono, venue
- Footer: `Probables: Gausman (3.41 ERA) vs. Valdez (2.98 ERA)` · `Enter game →`
- No LIVE pill

**State selection:** live game today → Live. No game today but one completed → Next game (Recent form already carries yesterday's result). No games remaining → Last game.

---

## 5. Recent form

- Ten equal-width chips, 34px tall, 4px radius, gap 5px. `positive` fill for W, `borderStrong` for L, `surface` text. Oldest left.
- Legend under: `10 games ago` / `Most recent`, 11px `textFaint`.
- Three splits below a `borderLight` divider: **Home · Away · 1-Run**, equal columns with `borderLight` separators. Label 11.5px uppercase, value 17px mono.
- No header link.

---

## 6. Roster

A **table**, not cards. Grouped by position with `surfaceAlt` group rows (`Infield` / `Outfield` / `Catcher`).

Columns: `# · Name · Pos · AVG · HR · RBI · OPS`. Numerals right-aligned and mono. Number column `textFaint` 12px. Name 600, links to `/player/:mlbId`. Row hover `surfaceAlt`.

Header: `Roster` + a Batters / Pitchers `Segmented`. **Batters only for now** — the Pitchers view is a separate design; render the toggle inert or hide it until designed.

---

## 7. AL West standings

Their division only, five rows. Grid `20px 1fr 42px 42px 46px`, columns `rank · team · W · L · GB`.

Their own row: `surfaceAlt` background, negative margin + padding so it reads as a pulled-out chip, 5px radius, weight 700. Logos 19px. `GB` shows `—` for the leader.

Header links to `/standings` for the full league.

---

## 8. Team leaders

Two stacked top-3 lists — **Home runs**, then **Batting average** — separated by a `borderLight` divider. Each row: rank (mono, `textFaint`), name (links to player page), value (mono 14px, right).

Header: `Team leaders` + Bat / Pitch `Segmented`. Bat only for now.

---

## 9. Next up

Next three games. Each row: opponent logo 22px · `vs Blue Jays` / `@ Mariners` · day + time (mono, `textMuted`, right).

Data comes from the schedule lookahead already wired in PR 9.5a for the player Upcoming tab.

---

## 10. Layout

`max-width: 1180px`, `padding: 0 32px 64px`. Body grid `1fr 352px`, gap 28px, `align-items: start`. Cards stack with 20px gap in each column. Sticky app bar.

Cards: `surface` bg, `1px border`, 10px radius. Header `14px 18px` with `borderLight` bottom; title 12px/700/uppercase/`.09em`/`textFaint`. Body 18px.

---

## Data to confirm before building

| Field | Status |
|---|---|
| Record, division rank, GB, streak | Should come from existing standings data |
| Last 10 W/L | Derivable from schedule/results |
| **Home / Away / 1-Run splits** | **Source unconfirmed** |
| **Team leaders (HR, AVG)** | **May be `/leaders` filtered by team, or a new team-scoped query** |
| Roster + player season stats | Existing endpoints |
| Schedule lookahead | Wired (PR 9.5a) |
| Venue, founded year | Confirm on the team record |

If the splits or leaders data isn't there, render those two cards behind a feature check — below the fold, no layout hole — same posture as PR 3.5.

---

## Out of scope

Mobile breakpoints · empty / loading / error states · Pitchers roster + pitching leaders · postseason and offseason states · a full-schedule view.
