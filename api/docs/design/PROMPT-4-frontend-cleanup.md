# Frontend — API cleanup batch (4 sections)

You are working in the **`baseball-realtime` client** (React 19 + Vite + TypeScript; vanilla CSS per component; generated client `@bitslinger21/baseball-realtime-client`). Cleanup batch. **§1 is independent and can ship now; §2–§4 each consume a backend change** (see `PROMPT_api_cleanup_backend.md` §B/§C/§D) — do them after that section's client package regen lands.

> Separately tracked, prompts already exist — **not** in this file: **BUG-010** (`PROMPT_BUG010_stats_hr_note.md`) and **PR 3.5 card wiring** (`PROMPT_PR3.5_standalone.md`). Don't duplicate them.

---

## §1 — BUG-013: gate/label the Overview hot-zones heat map (interim, ship now)

**Bug.** Overview tab hot-zones map is a **hardcoded 9-cell stub** (`PlayerPage.tsx:509`, comment "stub data, real grid structure"); insight text (`.720`/`.083`) is hardcoded prose. **No zone data exists in the API** and won't until the Statcast ingest (PR 6.5). Today it's shown under "Batting average by location · season" **with no label** → fabricated values read as real, identical for every player.

**Do (interim — real data is deferred to PR 6.5):** stop showing the fabricated grid as real. Pick the treatment that matches the app's other Statcast-gated surfaces (the Stats advanced rows use an explicit "not available" label):
- Preferred: **gate** the card — replace the stub grid + hardcoded insight with a labeled placeholder ("Location data coming with pitch-level stats" — same voice as the Pitching tab's parked strip), so no fake zone values render.
- Acceptable alt: keep the visual but add a clear **"Sample data"** label and remove the specific hardcoded insight numbers.
- Remove the hardcoded `.720` / `.083` insight prose either way.

**Acceptance.** No unlabeled fabricated zone values on Overview. The card is either gated with an honest placeholder or clearly marked sample. No per-player implication that the grid is real.

---

## §2 — BUG-001: bind the Overview "Today" widget to the real join

**After** backend §B ships `todayGame` (see its contract). **Do:**
- Read `todayGame` on the player page; drive the Today widget from it.
- When `status:'live'`: show the player's live state (`playerState` → at-bat / on-deck / in-the-hole pill), the `todayLine` (e.g. `1-for-3`), and **enable Watch live ▸** routing to `/game/{providerGameId}`.
- When absent / `idle` with no game: the existing empty state — but now it's a **true** "no game today", not a failed join.

**Acceptance.** A player at bat in a live game shows the live pill + today's line + enabled Watch live (routes to the right game). A player with no game shows the honest empty state. Numerals mono.

---

## §3 — Upcoming: flip the AVG/SLG-by-pitch-type card to real (keep whiff% labeled)

**After** backend §C ships real per-pitch-type slash. **Do:**
- For the now-wired **batter × pitch-type** card, **flip `MOCK_SECTION.statcast` off** for that card and bind real **AVG/SLG/OPS (+ AB)** per pitch type.
- **Whiff%** (and any pitcher-arsenal metric backend §C left unavailable) **stays labeled** "sample"/"not available" — do not show it as real, do not remove its label.
- Remove the card-level "sample" subtitle **only** from the parts now backed by real data; keep it on the still-mock parts.

**Acceptance.** Different batters show different real AVG/SLG-by-pitch-type tables; whiff% remains visibly labeled. No real value carries a stale "sample" tag and no mock value loses its label.

---

## §4 — BUG-014: replace the Splits `SPLIT_TABLES` mock with real per-player data

**After** backend §D ships the real splits endpoint + its Step-0 availability matrix. **Do:**
- Replace the `SPLIT_TABLES` constant render with a real fetch keyed by **`:mlbId` + timeframe**; the **2026 / Career / Last-30d** toggle must **refetch** (not relabel).
- Render each group's real `rows`; show `vsLeague` ±delta only where present.
- For any group/timeframe the backend flags `available:false`, render an explicit **"not available"** (or Statcast-gated) state — never the old mock.
- Keep the existing visual system (VBar, green/rust ±delta, AVG+OPS accented, zero-HR dimmed, mono numerals).

**Acceptance.** Two different players show different splits; switching timeframe changes the numbers; unavailable groups are labeled; the `SPLIT_TABLES` mock no longer reaches the user.

---

## Batch-wide must-not
- Mono numerals + `tabular-nums` everywhere numeric (don't regress).
- Never show a fabricated value as real — gate or label anything the backend reports unavailable.
- Keep the editorial-scorebook token system; don't restyle these surfaces, just fix the data path.
- Don't touch the Statcast-gated rich surfaces (rich Pitching tab, real hot-zones, whiff%) — those are PR 6.5.

Update `data-provenance.md` (flip codes) + `bug-list.md` (close BUG-001 / BUG-013 / BUG-014) at each sign-off.
