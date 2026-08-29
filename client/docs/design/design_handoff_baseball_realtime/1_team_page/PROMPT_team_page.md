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
- Venue + city and founded year are **wired, not optional** (decision, Aug 28). Both are on the MLB
  teams endpoint that `api/src/teams/teams-meta.service.ts` already exists to serve — read
  `venue.name`, `venue.city`/`locationName` and `firstYearOfPlay` from the team record rather than
  rendering `Est. —`. See §12.
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

- Ten equal-width chips, 34px tall, 4px radius, gap 5px. `positive` fill for W with `surface` text;
  `borderStrong` fill for L with **`ink` text**. Oldest left.
  - **Do not put `surface` text on the `borderStrong` L chip.** That combination is `#fcfaf6` on
    `#b4ae9b` — **2.13:1**, failing AA, and worse than the `textFaint` failure the Jul 4 contrast pass
    was run to fix. `borderStrong` is a *border* token; using it as a fill behind light text is the
    exact misuse that pass guarded against when it split `highlight` from `highlightText`.
  - `ink` on `borderStrong` is ~8.2:1 and keeps the intended asymmetry: the L chip still reads as
    recessive against the green W (5.98:1, fine as-is) — it is just legible.
  - 12px/700 does **not** qualify for the 3:1 large-text exemption; that starts at 18.66px bold.
- **Order is real chronological order, and the row must not be drawn from summary totals.** The ten
  chips are the last ten *completed* games in date order, read from the season game log —
  `fetchSeasonSchedule(teamId, season)`, already called by `SchedulePage.tsx`. Do not reconstruct the
  sequence from `lastTen` + `streak`: that yields a tidy, stable, fictional narrative (see
  `PROMPT_team_sync.md` BUG 1). The legend labels the row as ordered, so an unordered row is a lie
  told by the legend.
- **Each chip is bound to its game.** Every chip carries the date, opponent and score of the game it
  represents (`title` in the design; a tooltip or popover in the app). This is a correctness device,
  not a nicety: a chip that must name its game cannot be rendered from a season total, so the
  fabrication that shipped becomes structurally impossible rather than merely forbidden.
- Legend under: the oldest game's date / `Most recent · <date>`, 11px `textFaint`. Dates, not
  "10 games ago" — same reason.
- Three splits below a `borderLight` divider: **Home · Away · 1-Run**, equal columns with `borderLight`
  separators. Label 11.5px uppercase, value 17px mono. **Wired, not em-dashed** (decision, Aug 28) —
  from `records.splitRecords` on the MLB standings payload. See §12.
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

`max-width: 1240px`, `padding: 0 28px 64px` — the project standard column (the game view is the one
declared 1600 exception). Body grid `1fr 352px`, gap 28px, `align-items: start`. Cards stack with 20px
gap in each column. Sticky app bar, its inner wrap padded `14px 28px` to align with the content.

Cards: `surface` bg, `1px border`, 10px radius. Header `14px 18px` with `borderLight` bottom; title 12px/700/uppercase/`.09em`/`textFaint`. Body 18px.

---

## Data — resolved (Aug 28, 2026)

Every field on this page is **wired**. Nothing on the team page ships gated, and nothing ships
em-dashed. The three fields left open in the original spec were decided this session: wire all three.

| Field | Source |
|---|---|
| Record, division rank, GB, streak | Existing standings data |
| Last 10 W/L **in date order** | `fetchSeasonSchedule(teamId, season)` — last ten completed. Not `lastTen`+`streak` |
| **Home / Away / 1-Run splits** | `records.splitRecords` on the MLB standings payload → type → mapper → wire |
| **Team leaders (HR, AVG)** | **Team-scoped leaders query.** Not a client-side filter of the MLB top 10 |
| Roster + player season stats | Existing endpoints |
| Schedule lookahead | Wired (PR 9.5a) |
| Venue, founded year | MLB teams endpoint via `teams-meta.service.ts` |

The earlier instruction to feature-check the splits and leaders cards is **withdrawn** — both are
buildable from data that exists.

---

## 12. Wiring the three resolved fields

Decision, Aug 28: **wire all three.** Same answer as the player view's Contact quality rows, and for
the same reason — the data exists, and a card that renders `—` forever is a card that was never
finished.

### Home / Away / 1-Run splits
MLB's standings endpoint returns `records.splitRecords`, an array of `{ type, wins, losses }` with
`home`, `away` and `oneRun` among the types. `StandingTeamDto` has no breakdown today, so this is a
three-step addition of exactly the shape the PR 3.5 win-prob work took:

1. **type** — add `splitRecords` (or three explicit `homeRecord` / `awayRecord` / `oneRunRecord`
   fields) to `StandingTeamDto`.
2. **mapper** — pick the three types out of the raw payload in `standings.service.ts`; the data is
   already in the response being parsed.
3. **wire** — format `W–L` and render into the three split columns.

Prefer three explicit fields over passing the array through: the card wants exactly three, and the
type list from MLB is longer and unstable.

### Venue + city, founded year
Both are on the MLB teams endpoint. `api/src/teams/teams-meta.service.ts` already exists to serve
team metadata — check first whether it is simply unwired on this route before adding anything.
Fields: `venue.name`, `venue.city` (or `locationName`), `firstYearOfPlay`. Render as
`Daikin Park · Houston, TX` and `Est. 1962`.

### If a value genuinely is missing
Keep the em-dash. An honest `—` is correct when the API has nothing; what is being withdrawn is the
*plan* to leave them permanently em-dashed, not the fallback.

---

## Out of scope

Mobile breakpoints · empty / loading / error states · Pitchers roster + pitching leaders · postseason and offseason states.

(The full-schedule view was previously out of scope and is now built — see §11.)


## 11. Schedule page — season picker

- **Team switcher.** The team name in the page head is the trigger — a button carrying the same
  uppercase eyebrow type plus a chevron that rotates on open, so switching team happens where you are
  already looking rather than in a separate control. Hover and open state go to `ink`.
  - Menu: 280px, `surface` on a `borderStrong` edge, 8px radius, `max-height: 340px` with its own
    scroll, `box-shadow: 0 10px 30px rgba(21,22,26,.18)`.
  - All 30 teams, grouped by division under 9.5px `textFaint` uppercase headers (AL East → NL West).
    Rows are logo (20px) + nickname, 13px/600, hover `surfaceAlt`.
  - Current team is marked `aria-current="true"` — `surfaceAlt` fill and a rust bullet at the right —
    and the menu scrolls it into view on open.
  - Closes on selection, outside click, or `Esc` (which returns focus to the trigger).
  - Selecting a team loads that team's schedule for the **currently selected season**; the season
    picker does not reset.
  - **Switch the whole page head together** — trigger label, page-head logo (`src` + `alt`) and the
    app-bar return link. The label must use the **full name** ("Chicago Cubs"), matching the initial
    render, not the menu row's nickname. A half-applied switch (nickname beside the previous team's
    logo, under a stale return link) reads as a bug rather than a mock boundary.
  - Note: scope logo sizing as `.tmmenu .tmrow img` — a bare `.tmrow img` loses to the page head's
    existing `.phead-id img` rule (same specificity, defined earlier) and the logos render at 42px.

- **Month rail and season picker share ONE style.** Both are bare mono text — 11px `textFaint`
  unselected, **13px `ink` selected** (one size up and darker is the whole treatment), `gap: 9px`,
  `align-items: baseline`, hover to `ink`. The month chips' box treatment (border, background,
  padding, radius) was removed (Aug 28) so the two rails read as one system. If the app still renders
  boxed month chips, restyle them to match.

- **No filter rail.** The `All / Results / Upcoming / Home / Away` Segmented was removed (Aug 28) —
  the month rail is the only control in the bar, left-aligned and filling the width. The bar is a
  plain `display: flex` with no `justify-content: space-between`. If the app still renders those
  chips, remove them.

The page head's eyebrow is a **season picker**, not static text: the team name followed by three
selectable years — previous, current, next.

```
HOUSTON ASTROS   2025   2026   2027
```

- **Default is the current season.** Range is `season-1 … season+1`, derived — never hardcoded.
- Selected year: **13px, `ink`**. Unselected: **11px, `textFaint`**, hover to `ink`.
  One size larger and darker is the whole selected treatment — no pill, no underline, no rule.
- Years are mono (they are numerals) with `letter-spacing: .06em`; the team name stays sans uppercase.
- Real `<button>`s in a `display: flex` row, `gap: 9px`, `align-items: baseline` so the larger
  selected year sits on the same baseline as its neighbours. Mark the selection with
  `aria-current="true"` — that attribute, not a class, drives the selected styling.
- Changing year reloads the schedule for that season and resets month accordions to the default
  (current month for the live season, otherwise the first month with games).
- A future season with no schedule published yet shows the empty state, not a blank grid.
