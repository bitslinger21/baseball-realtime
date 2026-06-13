# PROMPT — PR 11 acceptance verification (run BEFORE merging)

> **You are ON the existing `pr-011` branch. This is a VERIFICATION pass, not a rebuild.** Do not refactor, do not "improve," do not rewrite the feed. The only code you may add is **temporary `console.log` instrumentation**, which you remove before reporting. If a test fails, report it with evidence — don't start fixing until the human says so.
>
> Reference: `SPEC_position_model.md` (single source of truth) and `Game Position Prototype (standalone).html` (the intended behavior) in this folder.

---

## Goal

Confirm the PR 11 branch satisfies all live-feed acceptance criteria so it can be merged to main with confidence. Produce a **pass/fail checklist with evidence** for each item. Closes **BUG-009** only if every item passes.

---

## Part A — Static code audit (you can do this without running anything)

Open `client/src/pages/game/PitchByPitchV2.tsx` + `PitchByPitchV2.css` and confirm each. Quote the relevant lines in your report.

- [ ] **A1 — Full render, no drip-feed gate.** The default/live feed renders the **complete** `completedAtBats` on first paint. There is **no `replayCount` / `replayDelay` / counter slicing the default list.** Any such counter is scoped to **active replay only** (▶ pressed), not the live/idle path. *(This is the #1 historical defect — verify it explicitly.)*
- [ ] **A2 — Open target set after paint.** Initial `scrollTop` is set in a **layout effect that runs after the hydrated rows exist**, not on the empty first mount. Live target = `scrollTop = 0`.
- [ ] **A3 — `following` + ref mirror.** A `following` boolean exists and is mirrored in a ref so the scroll handler / live-update subscription read the current value (no stale closure).
- [ ] **A4 — Scroll compensation.** While `!following` and content prepends, a layout effect records `prevScrollHeight` and applies `scrollTop += (scrollHeight - prevScrollHeight)`. **Not** relying on CSS `overflow-anchor`.
- [ ] **A5 — Pill pins to PAGE scroll.** The "Jump to live" pill uses a `position: sticky` wrapper whose scroll context is the **page** (`top` = header offset), bounded by the feed column — **not** a `top:0` inside the 640px internal-scroll frame. Check no ancestor with `overflow:hidden/auto` traps it.
- [ ] **A6 — No `scrollIntoView`.** Grep the file: zero occurrences.
- [ ] **A7 — No restyle creep.** Row layout, the expanded live-PA table, and the single rust LIVE pill in `PageTitle` are unchanged from main.

---

## Part B — Instrument the firing order (the decisive check)

Add temporary logs, then open a **live** game:

```ts
// (a) when hydrate fills the list
console.log('[verify] hydrate', { plays: plays.length, atBats: completedAtBats.length });
// (b) any replay counter
console.log('[verify] replayCount', replayCount);
// (c) atBats on every change
console.log('[verify] atBats', completedAtBats.length);
// (d) when the initial-scroll effect fires
console.log('[verify] scroll-effect', { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop, atBats: completedAtBats.length });
```

- [ ] **B1 — The scroll-effect fires with the FULL `completedAtBats` already present** (not while it's still climbing 1→2→3…). Paste the console sequence into your report. If the effect fires against a partial list, **A1 is violated** — stop and report it as a fail; that's the old bug.

**Remove these logs before you finish.**

---

## Part C — Interactive acceptance tests (run in the browser)

For each: do the action, record observed result, mark pass/fail. (Ask the human to drive a real live game if you can't reach one; compare intended behavior against the prototype's Live mode.)

- [ ] **C1 — Live open.** Open a live game → feed lands on the **current** at-bat (live PA expanded at **top**), NOT the 1st-inning leadoff.
- [ ] **C2 — Pinned follow.** While at the top, new pitches keep the live PA in view automatically.
- [ ] **C3 — Look back without yank.** Scroll down into earlier at-bats → a new pitch arriving does **not** move your view.
- [ ] **C4 — Pill appears.** While scrolled away, a **"↑ Jump to live · N new"** pill appears and the count increments per new pitch.
- [ ] **C5 — Pill returns.** Click the pill (and separately: scroll back to top) → returns to the live edge, following re-armed, count reset.
- [ ] **C6 — Pill survives PAGE scroll.** With the feed visible, scroll the whole **page** down → the pill stays pinned just under the header; it leaves only when the **entire feed** is off-screen. *(The prototype can't show this — it must be verified here.)*
- [ ] **C7 — Live re-entry.** On a live game, scroll into history, navigate to a player, hit Back → you re-land at the **live edge**, following re-armed (open-at-live re-runs on mount; no cache needed in PR 11).
- [ ] **C8 — Final game has no live UI.** Open a final game → no pill, no follow. (Its full resume model is PR 12, not this branch.)

---

## Report format

Produce a single checklist (A1–A7, B1, C1–C8) with **PASS/FAIL + one line of evidence each** (a quoted line for static items, the console sequence for B1, observed behavior for interactive items). End with a verdict:

- **ALL PASS →** "PR 11 verified — safe to merge. BUG-009 closed." The human merges to main, then branches PR 12.
- **ANY FAIL →** list the failing items and the spec section each maps to (`SPEC_position_model.md`). Do **not** start fixing until told; if a fix is approved, the rebuild guidance is `PROMPT_PR11.md` in this folder.

## Rules

- No `scrollIntoView`; numerals stay mono; no visual/layout change.
- Remove all temporary instrumentation before finishing.
- Do **not** commit design files into the app repo (no `holistic/*.jsx`, no prototype HTML, no `*_standalone.md`).
