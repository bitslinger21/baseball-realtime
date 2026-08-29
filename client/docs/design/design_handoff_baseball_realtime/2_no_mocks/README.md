# No more mocked data — handoff

28 August 2026. A program, not a ticket: retire every fabricated value still reaching a user.

**Target state.** Every field is either **real** or **explicitly absent** — an em-dash, an empty
state, a hidden card. Nothing in between. Labels like "sample data" were an interim posture while the
data was missing; the data now mostly exists.

---

## Files

| File | What it is |
|---|---|
| `PROMPT_no_mocks.md` | **Start here.** Every remaining mock, its source, and a nine-PR sequence |
| `data-provenance.md` | Field-by-field inventory across all screens, plus the derived-sequence sweep |

Related packages, referenced but not duplicated here: `handoff_team_build/` (team page),
`handoff_player_statcast/` (Contact quality spec), `handoff_standings_sync/` (Rank History),
`handoff_leaders_sync/` (league filter).

---

## What's actually left

Nine surfaces, three root causes.

**Three fabricated values shown as real.** Standings' Rank History (`buildWinsSeries` — a seeded PRNG
shuffle, still live despite the record saying it was fixed in July), the team page's Recent form
chips, and the landing widget's `SAMPLE_*` fallbacks.

**Four surfaces the Statcast ingest already covers.** The Jul 19 ingest landed pitch-level rows and
was consumed only for the Pitching tab's pitch-type rollup. Contact quality, hot zones, pitcher
arsenal and whiff % all need a rollup off that same table — not a new ingest.

**Two scoped rankings built by filtering a broader leaderboard.** The Leaders AL/NL filter slices the
MLB top 10, so it shows the AL players who happened to make it, re-ranked. The unbuilt Team leaders
card would do the same thing if built the obvious way.

Plus the small stuff: wOBA/wRC+ are computable today, BsR probably is not, and three team-page fields
are one mapper away.

---

## Fix first

**N1 Rank History, N2 Recent form chips, N3 landing widget.** These are the only places a user is
shown an invented number with no indication. Everything else is either labeled or absent, which is
honest if imperfect.

N1 and N2 are the same defect twice — a per-game series reconstructed from season totals — and both
are fixed by reading a game log the app already fetches.

---

## Correction to the record

Two tracker entries are wrong and this program depends on knowing it:

- **Rank History was never wired.** CLAUDE.md's Jul 18 "data LIVE" note is inaccurate; no per-day
  series exists and the client still contains all three PRNG helpers.
- **PR 9.5b was never wired.** Logged as signed off, but `MOCK_SECTION.statcast` was never flipped —
  the Upcoming pitcher arsenal has always rendered mock.

---

## Done means

`data-provenance.md` has no 🔴 and no 🟡 rows. `MOCK_SECTION` is deleted. `seedFromStr`,
`mulberry32`, `buildWinsSeries`, `buildFormChips` and the `SAMPLE_*` constants are gone from the
client.
