# F-007 — Game review (finals) · handoff package

> **Status: designed + prototyped, pending port + sign-off.** Port reference: `PROMPT_F007_scout_mode.md` + `PROMPT_F007_fixes.md`. Two follow-up fixes already documented.

One play head for a **final** game; the whole game view reflects it. **Play/Pause toggles Play ↔ Review** (▶ Review when paused, ⏸ Play when playing). Pure client — **no new API, no new data** (runs on the play-by-play history the game view already hydrates).

## What's in here
- **`PROMPT_F007_scout_mode.md`** — the implementation prompt for Claude Code (self-contained spec: the play-head model, the control, navigation, past/future boundary, PR-12 entry reconciliation, the critical port lessons, must-not-build, acceptance).
- **`PROMPT_F007_fixes.md`** — two follow-up fixes: position restore on in-app return + selected-cell prominence.
- **`Game Scout Mode.html`** — runnable prototype. Open it in a browser and drive it:
  - **▶ Review / ⏸ Play** — the single control, docked under the feed.
  - Click any **at-bat in the feed** → seek the head there (and pause if playing).
  - Click any **diamond in the batter card** → seek among that batter's at-bats.
  - **⏮ / ⏭** → step one at-bat at a time.
  - Watch the **line score, scoring summary, count/outs/runners, last pitch, batter card and feed** all move with the head; **played** at-bats are solid, **future** ones faded — on both the feed and the scorebook row.
- **`holistic/`** — the design sources the prototype loads:
  - `game-scout.jsx` — the Scout-mode prototype (the reference implementation of the model).
  - `game-v2.jsx` — the real game view it's built on (layout + WinProb/Leverage reused verbatim).
  - `shared.jsx` — design tokens + atoms (`StrikeZone`, `ScorebookCell`, `Bases`, `Pips`, `OrderSpot`, `Headshot`, …).

## How to read the prototype
`game-scout.jsx` is the spec made runnable. The load-bearing pieces:
- **`MOMENTS`** — the game flattened to one moment per pitch; `head` is an index into it. Every panel is derived from `head`.
- **`abStatus(ab, H)`** — `played` / `current` / `future` (current is inclusive of the last moment, so seeking lands on it).
- **`seek` / `togglePlay` / `stepAB`** in the shell — the only state transitions; a seek always drops to Review (pause).
- The feed auto-scroll (`setTimeout` + `scrollTop` off `offsetTop`, container `position: relative`) — **never `scrollIntoView`**.

## Scope reminders
- **Finals only.** Live games keep PR 11 follow / Jump-to-live untouched.
- **Out of scope:** the at-bat rail and the draggable scrubber (parked, F-002); win-prob/leverage (PR 3.5, gated).
- The ⏮/⏭ steps are **per-at-bat**, not per-inning.

Built on the signed-off game-v2 design. Unpark F-007 from `future.md` once ported + signed off.
