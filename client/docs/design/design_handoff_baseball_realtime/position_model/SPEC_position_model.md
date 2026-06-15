# Game-view position model — the ONE spec (supersedes split PR 11 / PR 12 prompts)

You are working in the `baseball-realtime` client (React 19 + Vite + TypeScript + react-router-dom v7). The "editorial scorebook" redesign is largely landed. **This document is the single source of truth for where the pitch-by-pitch feed lands. If anything in the older `PROMPT_PR11_standalone.md` / `PROMPT_PR12_standalone.md` conflicts with this file, THIS file wins.** Do only this behavior. Touch nothing else.

---

## The whole feature in one table

A game has a **position** — which at-bat the feed is focused on. Two axes decide it: the game's **state** (live vs final) and **how you arrived** (fresh open vs returning in-session). That is the entire feature. Implement exactly this:

| You arrived by… | **LIVE game** | **FINAL game** |
|---|---|---|
| **Fresh open** (click a game from the landing list) | **Current (live) at-bat**, follow armed | **First at-bat of the game** |
| **Return** (in-app nav back — e.g. you tapped a player's name, then Back — same browser session) | **Current (live) at-bat**, follow **re-armed** — **NOT** where you left off | **Exactly where you left off** (feed scroll position + which PA was expanded) |
| **Hard refresh / cold load** (no session memory) | Current (live) at-bat (= fresh open) | First at-bat (= fresh open) |

**Read the diagonal — it's the part that keeps getting missed:**
- A **live** game ALWAYS snaps to **now**, every time you land on it, fresh or returning. "Now" moved on while you were gone; you want the current at-bat, never a stale offset.
- A **final** game is frozen, so it behaves like a document: open at the **start** (first AB), and **resume your exact spot** when you come back.

**The trap that's been breaking the port:** "open at the first at-bat" is the **bug** for a live game (that's BUG-009 — you'd have to scroll to find the live action) but the **correct** behavior for a final game. The same scroll position, opposite verdict. The verdict flips on game state. Do not apply one rule to both.

---

## Feed ordering — LOCKED: newest-first in EVERY state

The feed renders **newest-first in both live and final games** — at-bats listed newest→oldest (the current / most-recent AB is the **top** row), and pitches **within** an expanded at-bat listed chronologically (pitch 1→N). This is the shipped game-v2 order; it is **identical for live and final** so the feed never changes shape between states. *(Explicit product call: consistency of display order over per-state ordering.)*

The open position then differs only by **where you scroll**, not by how rows are ordered:

- **Live** → the current AB is the **top** row ⇒ open at **`scrollTop = 0`** (the live edge). Auto-follow from here.
- **Final** → the first AB of the game is the **last/bottom** row of a newest-first list ⇒ open scrolled to the bottom: **`scrollTop = el.scrollHeight`** (the first AB sits at the foot of the list, in view). Newer at-bats are above it; scrolling **up** moves later into the game. No follow.

> **Net rule:** one render order (newest-first), two open targets — **live = top (`scrollTop 0`)**, **final = bottom (`scrollTop = scrollHeight`)**. Set it after the hydrated rows paint (timing rule below), never on the empty first mount.

*(Reference: the `Game Position` prototype already renders newest-first in both modes. Its Replay demo opens mid-game to show the scrubber — it does NOT demonstrate the final-game first-AB open target above; that's this spec's job, not the prototype's.)*

---

## Identity & storage

- **Key every position by `providerGameId`** so two different games keep separate positions.
- **Session-scoped memory only.** Persist across in-app navigation within the session (the player round-trip is the target case). Use an **in-memory module-level cache** (`Map<gameId, { scrollTop, expandedPaId }>`) **or `sessionStorage`** — **NEVER `localStorage`.** A stored scroll goes stale fast (especially for a live game); a hard refresh must fall back to the fresh-open default, not restore a stale offset.

---

## Why it doesn't "just work" (and the timing rule)

`react-router-dom` **unmounts** `GamePage` when you navigate to `/player/:mlbId`, destroying the feed's local scroll/expanded state; the remount starts empty. So you must: **(1) capture** position while on the page (debounced `onScroll` writing `{ scrollTop, expandedPaId }` to the cache, and/or an unmount cleanup effect), **(2) stash** it outside the component lifecycle (the module cache / `sessionStorage`), **(3) restore** it in a **layout effect that runs *after* the hydrated rows paint** — never on the empty first mount, or it does nothing / gets reset.

**No `scrollIntoView` anywhere** — set `scrollTop` on the scroll container directly. (`scrollIntoView` can disrupt the page.)

---

## CRITICAL — the feed renders the FULL history immediately; the replay drip-feed must NOT gate it

This is the single thing that has been breaking the port. Read it before touching position code.

**In the design, the default/live feed renders every available at-bat in one paint** — newest-first, no counter in front of it. Position is then *purely* a `scrollTop` on that fully-rendered list (top = live edge, bottom = first AB). There is **no `replayCount` / drip-feed gate between hydration and the default feed.**

The `replayCount` (or `replayDelay`) machinery is the **Replay transport** — the `▶ / ⏸ / speed / scrub` playback that exists **only for final-game replay mode**, an opt-in control. It is a *separate* feature from where the feed opens.

**The defect:** if `replayCount` sits in the **default render path**, the live/normal feed is fed its rows gradually, so the position layout-effect fires against an *incomplete* list and lands on the first pitch (the only row present yet). Every "it opens at the start again" report traces to this. You cannot fix position by making it *wait* for the gate — **remove the gate from the default path.**

**Do this:**
- The default feed (live games, and a final game you are simply scrolling — NOT actively replaying) must render the **complete** `completedAtBats` history on first paint. Do not slice/limit it by a replay counter.
- Scope `replayCount` strictly to **active replay playback** (user pressed ▶). When replay is idle/off, the feed shows all rows.
- The position layout-effect (open target + resume) then runs **once the full list has painted** — which, with the gate gone, is the normal first hydrated paint. No race.
- Do **not** "solve" this by lowering the replay delay to 0 globally, by changing `useAtBatHistory`'s signature, or with StrictMode ref hacks (all attempted, all wrong). The change is: *the gate is replay-only; the default feed is ungated.*

**Verify with a one-shot instrumentation log, not by reading code:** log (a) when hydrate fills `plays`, (b) `replayCount`, (c) `completedAtBats.length` on each change, (d) when the position effect fires and the container's `scrollHeight`/`scrollTop` at that instant. Click a live game, then a final game, then navigate away and back. The fix is correct when the position effect fires with the **full** `completedAtBats.length` already present.

---

## Live-game follow behavior (the rest of the live edge — was PR 11)

When a live game is at its position, it also has to **stay** there as pitches arrive, and let you look back without being yanked:

1. **Following (pinned).** Track a `following` boolean. While the feed is at the live edge (`scrollTop <= 8`), keep it pinned as new content prepends at the top — staying at `scrollTop 0` shows each new pitch.
2. **Looking back (broken) — with scroll compensation.** In `onScroll`: `atTop = scrollTop <= 8` sets `following`. While `!following` and new content prepends at the top, **preserve the read position**: in a `useLayoutEffect` keyed on feed content, record `prevScrollHeight`, then `scrollTop += (scrollHeight - prevScrollHeight)` when not following (and `scrollTop = 0` when following); always store `prevScrollHeight = scrollHeight`. **Set `overflow-anchor: none` on the scroll container** so the browser's native anchoring does NOT also fire — otherwise a prepend is compensated twice (your effect + the browser) and the view jumps the wrong way. The explicit `scrollTop` math must be the ONLY mechanism. **This compensation is load-bearing** — without it, a pitch arriving while you read history shifts the page under you.
3. **"Jump to live" pill.** While `!following`, render a floating pill: **"↑ Jump to live"** + a **"N new"** counter incremented on each live `PlayUpdate` since the break. Clicking it (or scrolling back to top) sets `scrollTop = 0`, `following = true`, counter `0`.
4. **The pill survives PAGE scroll, not just the feed's internal scroll.** Anchor the pill to the top of the feed's **visible region** via a `position: sticky` wrapper whose scroll context is the **page** (`top` = page-header offset), bounded by the feed column so it releases only when the whole feed leaves the viewport. A naïve `sticky; top:0` placed *inside* the 640px internal-scroll frame only pins against internal scroll and rides off-screen on page scroll — that's the reported bug. Watch for an ancestor with `overflow:hidden/auto` capturing the sticky. (This does NOT reproduce in the prototype, whose feed never page-scrolls — verify in the real page+frame composition.)
5. **Keep a ref mirror of `following`** so the `onScroll` handler and the live-update subscription read the current value without a stale closure.

## The `isLive` gate — ALL live behavior hangs off one flag (don't skip this)

Everything in the section above (open-at-live-edge, follow/break, scroll compensation, the Jump-to-live pill, the `newCount` counter) is **live-only**. Gate every bit of it behind a single `isLive` boolean derived from **game status** — reuse the *same* flag that drives the state-aware LIVE pill in `PageTitle` (the BUG-008 / PR 8 fix); do **not** invent a second source of truth.

- `isLive === true` → live edge + follow/break + pill, exactly as above.
- `isLive === false` (final / replay) → **none of it renders or runs.** No pill (this is the C8 failure if it leaks through), no `following` toggling, no `newCount`, no prepend scroll-compensation. The feed is a plain scroll list. Open target = `scrollTop = el.scrollHeight` (first AB at the foot of the newest-first list).

The most common port defect here is the live machinery running **by default** with no status check — which makes a final game show the pill and behave as if live. If you ever see live UI on a final game, this gate is missing or wrong.

A **final** game therefore has none of the live behavior — no live edge, no pill, no follow, no scroll compensation. It's a static (chronological) list you scroll and expand freely. *(Resuming a final game's exact spot on return is **PR 12**, not this spec — returning to the first AB is the expected pre-PR-12 behavior, BUG-010.)*

---

## Must-not-break

- A **live** re-entry must NOT restore a stale offset — it returns to the live edge with following re-armed.
- A **final** re-entry must restore the EXACT scroll + expanded PA.
- Never persist to `localStorage`. No `scrollIntoView`. Numerals stay mono. This is behavior, not a restyle — don't touch row layout, the expanded live-PA table, or the one rust LIVE pill in `PageTitle`.
- Don't fabricate a "live" pill or follow behavior on a final game.

---

## Acceptance tests — all eight must pass

**Fresh open**
1. Click a **live** game from the landing list → feed lands on the **current** at-bat (live PA expanded at top), not the 1st-inning leadoff. Following is armed.
2. Click a **final** game → feed lands on the **first** at-bat of the game — the **bottom** of the newest-first list (`scrollTop = scrollHeight`), first AB in view at the foot; newer at-bats are above it.

**Return (same session)**
3. On a **live** game, scroll back into history, tap a player name, hit Back → you land at the **live edge**, following re-armed — NOT your old offset, NOT the first AB.
4. On a **final** game, scroll several PAs in, expand one, tap a player name, hit Back → the feed is **exactly** where you left it (scroll position + expanded PA).

**Isolation & cold load**
5. Two different games keep **separate** positions.
6. **Hard refresh** falls back to the fresh-open default (live → live edge; final → first AB) — no stale restore.

**Live follow**
7. While pinned, new pitches keep the live PA in view; scroll down and a new pitch does **not** yank you, and a "Jump to live · N new" pill appears; the pill (or scrolling to top) returns to the live edge and resets the count.
8. With the feed visible, scroll the whole **page** down — the pill stays pinned just under the header, leaving only when the entire feed is off-screen.

Open one PR titled **"Game view — pitch-by-pitch position model (live edge + resume)"**; link **BUG-009** and **BUG-010** as closed; state your feed-ordering choice for finals in the description.
