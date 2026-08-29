# Handoff — 28 August 2026

Two packages. Build the team page; then run the no-mocks program.

## 1 · Team page — `1_team_page/`

New screen: Overview, Schedule, Roster, Team leaders. Design files are the three HTML mocks; the
prompts carry the spec.

| File | What it is |
|---|---|
| `README.md` | Screen spec — structure, tokens, components |
| `PROMPT_team_build.md` | **Start here.** Build order for the new page |
| `PROMPT_team_page.md` | Page spec detail |
| `PROMPT_team_sync.md` | Reconciliation against the shipped app, incl. the Recent form chips bug |
| `Team Page - *.html` | Design source — Overview, Schedule, Today card states |

Two things to carry across from the review:

- **Recent form chips must read the game log**, not be reconstructed from `lastTen` + `streak`.
  Each chip carries a tooltip naming its date, opponent and score — that binding is the point, not
  decoration. A chip that cannot name its game does not render.
- **Roster is roster spots**, not today's lineup. Groups stay stable when a player is injured or
  moved to DH.

## 2 · No more mocked data — `2_no_mocks/`

Nine surfaces still showing fabricated values, grouped by root cause rather than by page.

| File | What it is |
|---|---|
| `PROMPT_no_mocks.md` | **Start here.** Every remaining mock, its source, a nine-PR sequence |
| `README.md` | Program summary and what to fix first |
| `data-provenance.md` | Field-by-field inventory across all screens + the derived-sequence sweep |

Six of the nine are covered by existing packages, referenced from the prompt rather than duplicated
here: `handoff_player_statcast/`, `handoff_standings_sync/`, `handoff_leaders_sync/`.

Three still need design before they can be built, and are called out as such in the prompt:
**N3** (six landing-widget empty states), **N4/N5** (Statcast rollups and their sample-size rules),
**N9** (cleanup sweep deleting the fabricators).

### Two corrections to the record

Both were believed done for weeks:

- **Rank History was never wired.** The Jul 18 "data LIVE" note is inaccurate — no per-day series
  exists and the client still contains `seedFromStr`, `mulberry32` and `buildWinsSeries`.
- **PR 9.5b was never wired.** `MOCK_SECTION.statcast` was never flipped; the Upcoming pitcher
  arsenal has always rendered mock behind its "sample" subtitle.

Sign-off on a data PR should require seeing the value change for two different players or teams, not
seeing the card render.

## Done means

`data-provenance.md` has no 🔴 and no 🟡 rows. `MOCK_SECTION` is deleted. `seedFromStr`,
`mulberry32`, `buildWinsSeries`, `buildFormChips` and the `SAMPLE_*` constants are gone from the
client.
