# F-007 — Scout mode (finals) · design handoff

> Mirrors the `position_model/` pattern. One play head for a **final** game; the whole game view
> reflects it. **Play/Pause toggles Replay ↔ Scout.** Pure client — **no new API, no new data**
> (runs on the play-by-play history the game view already hydrates). Finals only (v1).

## Files
- **`../PROMPT_F007_scout_mode.md`** — the implementation prompt for Claude Code (self-contained spec).
- **`Game Scout Mode.html`** — runnable prototype (open in a browser).
- **`holistic/game-scout.jsx`** — the Scout-mode reference implementation (the model made runnable).
- **`holistic/game-v2.jsx`** — the real game view it's built on (layout + WinProb/Leverage reused).
- **`holistic/shared.jsx`** — tokens + atoms (`StrikeZone`, `ScorebookCell`, `Bases`, `Pips`, `OrderSpot`, `Headshot`, …).

## The model (what to port)
- **`MOMENTS`** — the game flattened to one moment per pitch; `head` is an index into it. Every panel derives from `head`.
- **`abStatus(ab, H)`** — `played` / `current` / `future` (current is inclusive of the last moment, so seeking lands on it).
- **`seek` / `togglePlay` / `stepAB`** (shell) — the only state transitions; any click-seek drops to Scout (pause).
- Feed auto-scroll via `scrollTop` off `offsetTop` (container `position: relative`); **never `scrollIntoView`**.

## Behaviour (v1)
- Open a final → **Scout, paused, head at the first at-bat** (reconcile with PR 12 on in-app return).
- Single control = **action icon (▶/⏸) + mode tag (Scout/Replay)**, docked under the feed.
- **Play** auto-advances pitch-by-pitch; **click a feed PA** = game-wide seek (+pause if playing);
  **click a scorebook diamond** = within-batter seek; **⏮/⏭** step one at-bat.
- **Past/future boundary** on both the feed and the scorebook row: played solid, current accented,
  future faded with no score chips.

## Out of scope
At-bat rail + draggable scrubber (parked, F-002); win-prob/leverage (PR 3.5, gated). No new API.

Unpark F-007 from `future.md` once signed off + ported.
