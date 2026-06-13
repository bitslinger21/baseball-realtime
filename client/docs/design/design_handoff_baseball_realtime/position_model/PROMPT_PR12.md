# PROMPT — PR 12: Game-view **position persistence** (resume where you left off)

> **Prerequisite: PR 11 must be merged and passing its acceptance tests.** PR 12 builds on PR 11's open/follow/pill model — do not start it on a branch where the feed still drip-feeds or opens at the first pitch.
>
> **Read `SPEC_position_model.md` (in this folder) first — single source of truth.** Ignore and `git rm` any `PROMPT_PR11_standalone.md` / `PROMPT_PR12_standalone.md`.

---

## 0. Branch

```bash
git checkout main && git pull          # main now contains merged PR 11
git checkout -b pr-012-position-persistence
```

Branch from main **after PR 11 is merged**, not from the old abandoned `pr-012-position-persistence` — delete that one.

---

## 1. What you are building (and the bug it closes)

**BUG-010:** React Router **unmounts** `GamePage` when you navigate to `/player/:mlbId`; the remount starts the feed fresh. So: open a past game, read several PAs in, tap a player's name, hit Back → the game "starts over" at the top. It should **resume where you left off.**

A game has a **position**; the view should remember it across an in-app route round-trip. **No new API** — pure client-side persistence.

**Files you should touch:** `client/src/pages/game/PitchByPitchV2.tsx` (capture + restore), `GamePage.tsx` if the cache lives at the page level, and `PitchByPitchV2.css` only if needed. Plus a tiny module for the cache.

---

## 2. The rule — keyed by `providerGameId`, and it FLIPS on game state

This is the part the port keeps getting wrong. The verdict depends on whether the game is **live** or **final**:

| Game state | On return (in-session Back) |
|---|---|
| **Final / replay** | **Restore EXACTLY** — the feed's `scrollTop` AND which PA was expanded. |
| **Live** | **Ignore the cache. Return to the live edge and re-arm following** — PR 11 owns the landing. "Now" advanced while you were gone; a stale look-back offset is wrong. |

Also settle the **fresh-open** default for finals here (PR 11 only covered live): a final game opened fresh (no cached position) lands at the **first at-bat of the game** = the **bottom** of the newest-first list ⇒ **`scrollTop = el.scrollHeight`** (first AB in view at the foot; newer at-bats above it; scrolling **up** moves later into the game).

> **The trap:** "first at-bat / `scrollTop = scrollHeight`" is correct for a **final** game and **wrong** for a live one (that's BUG-009, which PR 11 fixed). Same machinery, opposite verdict — branch on game state, never apply one rule to both.

---

## 3. Scope of memory — SESSION ONLY

- Persist across **in-app navigation within the session** (the player round-trip is the target case).
- Use an **in-memory module-level `Map<gameId, { scrollTop, expandedPaId }>`** OR **`sessionStorage`**. **NEVER `localStorage`** — a stored scroll goes stale fast, especially for a live game.
- A **hard refresh / cold load** falls back to the PR 11 fresh-open default (live → live edge; final → first AB). Do **not** restore a stale scroll on a fresh load.
- **Key by `providerGameId`** so two different games keep separate positions.

---

## 4. The timing rule (same one that makes PR 11 work)

`GamePage` unmounts on navigate-away, destroying the feed's local scroll/expanded state; remount starts empty. So:

1. **Capture** position while on the page — a **debounced `onScroll`** writing `{ scrollTop, expandedPaId }` to the cache under `providerGameId`, and/or an **unmount cleanup effect** that writes the last-known values.
2. **Stash** it **outside the component lifecycle** — the module cache / `sessionStorage` — so it survives the unmount.
3. **Restore** in a **layout effect that runs AFTER the hydrated rows paint** — never on the empty first mount, or it does nothing / gets reset. Final/replay → apply cached `scrollTop` + expand the cached PA. Live → ignore the cache; let PR 11's open-at-live run.

**Inherit PR 11's full-render guarantee.** If PR 11 is correct, `completedAtBats` is fully present on the first hydrated paint, so the restore effect has real `scrollHeight` to work against. If you ever see restore landing at the top again, re-confirm PR 11's replay-gate fix is intact on this branch (re-run the instrumentation log from PROMPT_PR11 §3) before theorizing.

**No `scrollIntoView`** — set `scrollTop` directly. Don't fight PR 11: for live games, PR 11 owns the landing.

---

## 5. Acceptance — must pass before you open the PR

1. **Final game, resume:** scroll several PAs in, expand one, visit a player, hit Back → the feed is **exactly** where you left it (scroll position **and** the expanded PA).
2. **Final game, fresh open:** click a final game from the landing list with no cached position → lands on the **first** at-bat (`scrollTop = scrollHeight`, first AB at the foot), not the top.
3. **Live game, return:** scroll back into history, leave, return → you land at the **live edge** with following re-armed — NOT the old offset, NOT the first AB.
4. **Isolation:** two different games keep **separate** positions.
5. **Cold load:** a hard refresh falls back to PR 11 defaults (live → live edge; final → first AB) — no stale restore.
6. No `scrollIntoView`; numerals mono; no visual/layout change to rows, the expanded PA table, or the LIVE pill.

If any fail, diagnose from a log of the restore effect's firing order + the cached value + game state at that instant — not from a fresh guess.

---

## 6. Commit hygiene

- Keep the diff tight: the cache module + `PitchByPitchV2.tsx` (+ `GamePage.tsx` if the cache is page-level). Nothing unrelated; do not bundle stray doc add/deletes.
- **No design files in the app repo** — no `holistic/*.jsx`, no prototype HTML. Delete any `*_standalone.md`.
- PR title: **"PR 12 — Game view: position persistence"**. Link **BUG-010** as closed.
