# League Leaders — dev handoff (Jul 4, 2026)

Restyle of the existing **League Leaders** page (`/leaders`) to the editorial-scorebook design system,
**plus** a new **MLB · AL · NL** league filter. Net-new to the redesign scope (this route was previously
"out of scope / older-looking"). Design source: `holistic/leaders.jsx` → `window.LeadersScreen`
(standalone review: `League Leaders.html`). Uses only existing atoms from `shared.jsx`.

## Port pitfalls (seen in the first port — get these right)
1. **Unit tag = the compact `unit` string, NOT the category name uppercased.** The header tag must read
   **HR / AVG / RBI / R / H / SB / OPS · W / ERA / SO / WHIP / SV / IP** — take it from each category's
   `unit` field. The first port rendered "HOMERUNS / BATTINGAVERAGE / RUNSBATTEDIN" by uppercasing the
   key/label; that's wrong.
2. **The content must be a centered `max-width:1200; margin:0 auto` column under a full-bleed header.**
   The first port let the content run flush-left and **clipped the "League Leaders" title at the window
   edge**. The header spans full width; everything below it is centered with symmetric side margins
   (same as the landing page).

## Layout (top → bottom)
**Full-bleed header, centered content column** (matches the landing page). The `AppHeader` spans the
full width; everything below it lives in a **`max-width: 1200px; margin: 0 auto`** column so there are
symmetric left/right margins on wide screens (do NOT let the content run edge-to-edge).

1. **`AppHeader`** (full width) — hamburger · brand · right slot holds the single contextual return
   **"← Today's games"** (`btn`). Same one-header/one-return rule as the other screens.
2. **`PageTitle`** — title **"League Leaders"**, subtitle eyebrow **"2026 Season · through {date}"**,
   right slot = a mono eyebrow "Top 10 · each category".
3. **Controls row** (`padding: 4px 28px 12px`, space-between):
   - Left: **`Segmented` [Batting | Pitching]** — swaps the whole card set.
   - Right: **`Segmented` [MLB | AL | NL]** with a small "LEAGUE" eyebrow — the new filter.
4. **Card grid** (inside the centered column) — `display:grid; grid-template-columns:repeat(auto-fill,
   minmax(270px,1fr)); gap:16; align-items:start`; `0 28px` inner inset. One `Card` (padless) per
   stat category. ~4 columns at the 1200 max width, reflowing down on narrow screens.

## Category card
- **Header band:** `background: T.info` (navy — our palette's stand-in for the original blue bar),
  white category label (DM Sans 700, 13.5px) left + unit tag (mono, `rgba(255,255,255,.62)`) right
  (HR / AVG / RBI / R / H / SB / OPS · W / ERA / SO / WHIP / SV / IP).
- **Rows:** grid `22px 22px 1fr auto`, `padding:7px 14px`, hairline `T.border` top-border between rows.
  - Rank — **mono tabular** 12px, right-aligned; leader (rank 1) `T.accent` bold, else `T.textFaint`.
  - Logo — `TeamDot` size 20 (real MLB SVG via `teamLogoUrl`, letter-mark fallback).
  - Name — DM Sans 13.5px; **rank-1 bold**, else 500; clickable → player view (`openPlayerOverview` in
    the mock; wire to `/player/:mlbId`). Dotted underline appears on hover only.
  - Value — **mono tabular 13.5px**; rank-1 `T.accent` bold, else `T.text` 600.
  - **Leader row** gets a faint rust tint `rgba(184,66,30,0.055)`.
- **Empty state:** "No qualifiers" (only reachable if a league filter empties a category).

## The MLB · AL · NL filter — ranking logic
Each leader row carries a team whose `lg` is `'AL'` or `'NL'`. The filter:
1. Filters the category pool to the selected league (`MLB` = no filter).
2. Sorts by value — **descending** for most; **ascending** for ERA & WHIP (lower is better) via an
   `asc` flag on the category.
3. Assigns **standard competition ranking** (ties share a rank, next rank skips: 1-2-2-4…).
4. Keeps everyone ranked **≤ 10** (so a 6-way tie at 10 all show, as in the source screenshot).
`ranked(rows, league, asc)` in `leaders.jsx` is the whole implementation — port it verbatim.

## Number formatting (all mono + tabular-nums)
- Counting stats (HR, RBI, R, H, SB, W, SO, SV) → integer.
- AVG / OPS → 3 decimals, **strip leading zero** when < 1 (`.337`; OPS `1.056` keeps the 1).
- ERA → 2 decimals (`2.14`). WHIP → 2 decimals, strip leading zero when < 1 (`.88`, `1.05`).
- IP → 1 decimal, thirds notation preserved (`128.1` = 128⅓).

## Data / porting notes
- **Mock data** in `leaders.jsx` matches the source screenshot's batting numbers; pitching is
  plausible-2026. Replace with the real leaders endpoint. Expected shape per row: `{ team, name,
  mlbId, value }` per `{ category, side:'batting'|'pitching' }`; league is derivable from the team.
- **Team → league map:** the mock ships a local 30-team `LTEAMS` map (`abbr`, `id`, `primary`, `lg`).
  In the app, get AL/NL from the team record instead of hardcoding; `id` feeds `teamLogoUrl`.
- **Categories** are data-driven (`BATTING` / `PITCHING` arrays). Add/remove/reorder by editing the
  arrays; the grid reflows. Each: `{ key, label, unit, fmt, asc?, rows }`.
- Everything is **ungated** — no new data model beyond the leaders feed the old page already used;
  the AL/NL split is a client-side re-rank.

## Acceptance
- Batting/Pitching toggle swaps card sets; MLB/AL/NL re-ranks each visible card (verified: AL Home-Run
  leader = Yordan Alvarez 27; NL = Kyle Schwarber 30).
- All numerals mono/tabular; leader rows tinted + accented; logos real with fallback.
- One header, one "← Today's games" return; no second global back.
