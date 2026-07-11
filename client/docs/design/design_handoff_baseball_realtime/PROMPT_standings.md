# Standings — dev handoff (Jul 6, 2026)

Restyles the app's Standings page to the editorial-scorebook system and adds two views. Source of
truth: `holistic/standings.jsx` + standalone `Standings.html` (+ handoff copies under
`design_handoff_baseball_realtime/holistic/`).

## ⚠️ Data prerequisite (the one real blocker)
The current app renders every team under **"UNKNOWN LEAGUE / UNKNOWN DIVISION"** — i.e. the standings
payload is not carrying **league (AL/NL)** or **division (East/Central/West)** metadata per team. This
design **requires** that mapping: both views group by division/league. Wire team → `{ league, division }`
(MLB StatsAPI provides `team.league.id/name` + `team.division.id/name`) before this page can render
real data. Everything below is design-complete and ungated once that metadata flows.

## Views — a Divisional | Wild Card toggle (replaces the old MLB/AL/NL filter)
A `Segmented` control ("Divisional" / "Wild Card"). No league filter.

### Divisional
Two equal 50% columns — **AL left, NL right** — each stacking its three divisions
(East / Central / West) top-down. Each division = one `Card`:
- Navy header band (`T.info`) with the division name + league tag, then column labels.
- Rows sorted by win% (PCT). Columns: **seed# · logo · Team · W · L · PCT · GB · L10 · STRK**.
- **Division leader** (row 1): rust tint `rgba(184,66,30,0.055)`, bold name, accent PCT, GB "–".
- 40px gutter between the two columns; each card fills 100% of its column.

### Wild Card
Two equal 50% columns — **AL left, NL right** — each ONE `Card` showing the playoff picture
"if the season ended today":
1. **Three division leaders** (seeds 1–3), sorted by record, highlighted (rust tint + bold), GB "–".
2. **Bold divider** ("WILD CARD").
3. **Three wild-card teams** (seeds 4–6) — the next 3 by record among non-leaders; highlighted.
4. **Bold divider** ("OUT").
5. **The rest** in record order (no tint).
- The GB column becomes **WCGB** — games from the **3rd (last) wild-card spot** (the cutoff): the
  cutoff team shows "–", teams ahead show a "+" cushion (e.g. `+1.5`), teams behind show games back.

## Derived, not hardcoded
`PCT = W/(W+L)`, division `GB = ((leadW−W)+(L−leadL))/2`, and `WCGB` (vs the cutoff team) are all
computed in render. Store only raw **W / L / L10 / STRK** per team; grouping comes from the
league/division metadata above. Standard competition ranking (record order) determines seeds.

## Component map (`standings.jsx`)
- `HeaderBand({title, tag, gbLabel})` — shared navy band + column labels (`gbLabel` = "GB" | "WCGB").
- `TeamRow({x, pos, gb, tint, strong, topBorder})` — one row; `strong` = bold+accent (leaders/seeds 1–3).
- `DivisionCard({div})` — a division table.
- `WildCardCard({lg, title})` — the 3-group playoff card; `buildWildCard(lg)` splits leaders / wildcard /
  below and returns the cutoff; `WCDivider({label})` is the bold separator.
- `StandingsScreen` — the toggle + the two 50/50 columns.

## Tokens / rules
- All numbers **mono + tabular** (`T.mono`, `fontVariantNumeric:'tabular-nums'`). Sans for labels only.
- Real MLB logos via the shared `TeamDot` (`teamLogoUrl`, id per team), letter-mark fallback.
- W-streaks render `T.positive` (green), L-streaks `T.textMuted`.
- Row name links to a team/game view — currently `window.openGameView` as a placeholder; wire to the
  real route (team page if one exists, else the div/team destination).

## Acceptance
- Toggle swaps Divisional ↔ Wild Card; no MLB/AL/NL filter remains.
- Divisional: AL left / NL right, 3 divisions each, leader highlighted, GB/PCT correct.
- Wild Card: 3 leaders · bold line · 3 wild cards · bold line · rest; WCGB "–" at the cutoff, "+" cushions
  above; AL left / NL right.
- Columns are equal 50% with a clear gutter; cards fill their column; names don't truncate at ≥1200px.
