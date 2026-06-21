# Build F-007 — Game-view Scout mode (finals): one play head, Replay ↔ Scout

You are working in the `baseball-realtime` client (React 19 + Vite 7 + TypeScript, vanilla CSS per component, generated API client + socket.io). The "editorial scorebook" redesign is landed through the game view (PRs 1–12, F-005). **Do only this feature. Touch nothing else.**

> **No new API. No new data.** Scout mode runs entirely on the play-by-play history the game view already consumes (the same `hydrate` replay the live feed uses). It is a pure client feature. If you find yourself adding an endpoint or a wire field, stop — that's the wrong change.

> Runnable reference in this package: `Game Scout Mode.html` (+ `holistic/game-scout.jsx`, `holistic/shared.jsx`, `holistic/game-v2.jsx`). Open it and drive it — press **▶ Scout/Replay**, click a feed at-bat, click a scorebook diamond, use ⏮/⏭. It is built on the real game-v2 layout, so what you see is the target composition.

---

## What F-007 is

A **final** game's view gets **one play head** — a position in the game = a specific **pitch within a specific at-bat**. The line score, count, last-pitch strip, scoring summary, the batter (matchup) card **and** the pitch feed all render whatever the head is on. Two modes, one control:

- **Replay** = *playing* — pitches auto-advance on the feed's existing replay timing.
- **Scout** = *paused* — the head is frozen; the user analyzes.

**Pause** freezes at the current head (→ Scout). **Play** resumes from that same head (→ Replay). **Nothing rewinds on pause/play.**

**Scope: finals only (v1).** Live games keep their PR 11 follow / Jump-to-live behavior untouched; Scout does **not** apply to live in v1.

This re-frames the transport half of F-002. The at-bat rail and the draggable scrubber are **explicitly out of scope** (still parked in F-002) — the pitch feed already does game-wide seek, so v1 needs no rail.

---

## The model — implement this exactly

Think of the game's play history as an ordered list of **moments**, one per pitch (flatten the at-bats you already hydrate: for each AB, one moment per pitch; an AB's last moment is its result). **`head` is an index into that list.** Everything else is derived from `head`:

- **current AB / batter** = the AB the head's moment belongs to.
- **count, last pitch, strike-zone dots** = the head's pitch (zone dots = the current AB's pitches **up to and including** the head's pitch).
- **score, line score, scoring summary, outs, runners** = accumulated over moments **through** the head only (temporal coherence — an inning the head hasn't reached shows blank, not its eventual runs).
- **"Today: H-for-AB"** in the batter card = that batter's completed ABs through the head.

A seek is just `setHead(n)`. **"Expand an AB", "click a feed PA", and "click a scorebook cell" are the same action: seek the head to that AB's last moment.** There is no inspect-without-moving surface (two positions would be incoherent).

### Status of every AB relative to the head (drives all styling)
- **played**: `head > ab.lastMoment`
- **current**: `ab.firstMoment <= head <= ab.lastMoment`  ← inclusive of the last moment (seeking lands here)
- **future**: `head < ab.firstMoment`

---

## The control — action icon + mode tag (one control)

A single Play/Pause control carries **both** the action and the mode vocabulary:
- **icon = the action**: `▶` when paused, `⏸` when playing.
- **persistent tag = the current mode**: "Scout" when paused, "Replay" when playing.

A bare `▶/⏸` loses the word "Scout"; a bare segmented "Replay/Scout" loses the motion affordance — keep both in one control. (The prototype also shows a passive `SCOUT/REPLAY` status echo in the band; optional.)

**Placement: dock the control in the right column, directly under the pitch feed.** The left column (MatchupLeft + matchup/due-up) is taller than the feed, leaving dead space below the feed — the control fills it and stays above the fold. Do **not** put it in a full-width bar below the fold.

Optional convenience controls beside it: **⏮ / ⏭ step by one at-bat** (seek to the prev/next AB's last moment). These are **per-at-bat**, not per-inning. (Replay speed — inherit the existing single replay interval for v1; 1×/2×/4× is optional, see "open choices".)

---

## Navigation — every path seeks the one head

- **Play** → sequential auto-advance, pitch by pitch, on the existing replay interval. At the end, stop (stay in Scout at the final moment).
- **Pitch-feed PA (click)** → game-wide seek: scroll to any inning, click a PA → head jumps to that AB's last moment and the PA expands (reuse the feed's existing click-to-expand). This is the jump-anywhere navigator — **so build NO at-bat rail.**
- **Batter-card scorebook cell (click)** → within-batter seek: jumps the head among the **current batter's** ABs; the zone + last-pitch reflect that AB.
- **Clicking a past AB while in Replay → seek AND pause** (enter Scout), so what you clicked doesn't run away. Clicking **while in Scout → seek, stay in Scout.** (Cleanest rule: any click-seek sets `playing = false`.)

---

## Past/future boundary (temporal coherence on the screen)

Show **all** of the game's ABs (so you can click an inning-1 AB and jump back), but draw the head as a boundary on **both** the pitch feed **and** the batter-card scorebook row:
- ABs/PAs **through the head** (played + current): full weight; the **current** AB gets the head accent (ink border/outline) and is the expanded one.
- ABs/PAs **beyond the head** (future): visually de-emphasized (the prototype uses ~0.4 opacity and a hollow/pale result chip), reachable, marked not-yet-happened. **Suppress run/score chips on future rows** (don't spoil the running score ahead of the head).

The feed stays **newest-first** (consistent with PR 11). Consequence: at game start the head is on the **oldest** AB at the **bottom**; everything above is future/faded and the played region grows upward as you advance. **Auto-scroll the feed to keep the head's AB centered** on every head change (set `scrollTop` directly off the row's `offsetTop` — the scroll container must be `position: relative` for `offsetTop` to be relative to it; **never `scrollIntoView`**).

---

## Entry + PR 12 reconciliation

- **Default entry: opening a final → Scout, paused, head at the START of the game** (first moment). Selecting a different final re-enters Scout-at-start.
- **Reconcile with PR 12 position-persistence:** a *freshly selected* final opens Scout-at-start; an in-app **RETURN** to a final you were just viewing should **restore** the saved position (head + expanded PA) per PR 12, in Scout (paused). A hard refresh falls back to Scout-at-start. (PR 12 is session-scoped; keep that.)

---

## ⚠️ CRITICAL port lessons (from PR 11 / PR 12 — do not relearn these the hard way)

1. **The replay drip-feed gate must be REPLAY-only.** The single worst defect in the position-model ports was an incremental-reveal timer (history revealed one AB at a time on the replay clock) running in the **default** render path, so the screen visibly "played back from inning 1". For Scout/paused and for any non-replaying state, **render the full history in one paint.** Scope the incremental reveal strictly to active Replay.
2. **Instrument rendered geometry, not internal arrays.** The play history is newest-first in data while the screen reads top-to-bottom; debugging off the array sent past ports chasing a phantom reversal. Verify ordering/position with a `getBoundingClientRect` pixel probe (e.g. current AB at the top of the played region; inning 1 at the bottom), and trust the user's plain description of what the pixels do.
3. **Finals only.** Don't fabricate a "live" pill or follow behavior here; the LIVE pill is gated on `isLive` (BUG-008). Scout is a finals state.
4. **Numerals stay mono** (`JetBrains Mono`, `tabular-nums`) — scores, counts, velo, line score, everything numeric. **Reuse the existing atoms** — `StrikeZone` (port verbatim — see CLAUDE.md), `ScorebookCell`, the count/last-pitch strip, the feed row + expanded pitch table. Don't reimplement them.

---

## Must-not-build (out of scope)
- **No at-bat rail** and **no scrub/timeline scrubber** (parked in F-002 — the feed covers game-wide seek).
- **No win-probability or leverage work** (that's PR 3.5, gated on new backend fields). The Scout prototype reuses the existing WinProb/Leverage cards as-is below the fold — leave them as they are.
- **No new API, no new wire fields, no socket changes.**
- **No live-game changes** — PR 11 follow / Jump-to-live and the live LIVE pill are untouched.
- **No "mode toggle" that rewinds** — Play resumes from the current head; pause freezes in place.

## Open choices to settle in review (call them out in the PR)
- Replay speed: inherit the single existing interval (v1 default) vs expose 1×/2×/4×.
- Exact played-vs-future visual weights (border weight / opacity) for cells + feed rows.
- Whether ⏮/⏭ stays per-at-bat or also offers jump-to-inning / jump-to-scoring-play.

## Acceptance
- Opening a **final** lands in **Scout, paused, at the first at-bat** (or PR-12-restored position on in-app return).
- The control shows `▶ Scout` when paused / `⏸ Replay` when playing, and sits **docked under the feed**.
- **Play** advances the head pitch-by-pitch and the **whole screen** (line score, count, runners/outs, last pitch, batter card, scoring summary, feed highlight) moves together; it does **not** drip-feed from inning 1.
- Clicking any **feed PA** seeks the head there and expands it; clicking while playing also **pauses**.
- Clicking a **scorebook diamond** in the batter card seeks among that batter's ABs (zone + last pitch follow).
- **Played** ABs are solid with the current one accented; **future** ABs are faded with no score chips — on **both** the feed and the scorebook row.
- ⏮/⏭ step **one at-bat**. The feed auto-scrolls to keep the head's AB in view; **no `scrollIntoView`**.
- **Live games are unchanged.** No new network calls. Numerals stay mono.

Open one PR titled **"F-007 — Game view: Scout mode (finals) — one play head, Replay ↔ Scout"**; in the description, call out the replay-only drip-feed gate, the no-`scrollIntoView` auto-scroll, and the PR-12 entry reconciliation. Unpark F-007 from `future.md` when it lands.
