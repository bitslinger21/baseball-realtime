# PROMPT — PR 11: Game-view pitch-by-pitch **live position** (open at the live AB + follow/break + Jump-to-live)

> **Read `SPEC_position_model.md` (in this folder) first — it is the single source of truth.** This prompt is PR 11 of that spec. PR 12 (resume-on-return) is a separate prompt and a separate PR; do **not** start it until PR 11 passes its tests.
>
> **Ignore — and delete from the repo — any `PROMPT_PR11_standalone.md` / `PROMPT_PR12_standalone.md`.** They are superseded and one of them contradicts this spec (it says finals "open at the top," which is wrong). If they exist in `client/docs/design/`, `git rm` them.

---

## 0. Start clean — this branch has been thrashed

The previous attempt is being abandoned. Do not try to salvage it.

```bash
git checkout main && git pull
git checkout -b pr-011-live-position
```

Confirm you are branching from a **known-good main** (the redesign through PR 10 is landed there). Do NOT branch from `pr-012-position-persistence` — that branch is dead.

---

## 1. What you are building (and the bug it closes)

**BUG-009:** opening a **live** game, the pitch-by-pitch feed lands on the **first** at-bat of the 1st inning. The user has to scroll to find the live action. That is wrong.

A live game has a **position** = "now" = the current/most-recent at-bat. The feed must **open there**, **stay there** as pitches arrive, let the user **scroll back without being yanked**, and offer a **"Jump to live" pill** to return. That is the whole of PR 11.

**No new API.** Everything runs on the socket play feed already wired (`joinGame` → `hydrate` replay + live `PlayUpdate` events). Zero backend changes.

**Files you should touch:** `client/src/pages/game/PitchByPitchV2.tsx` and `PitchByPitchV2.css`. Nothing else, unless your instrumentation (§3) proves the gate (§4) lives in a shared hook.

---

## 2. Ground truth — feed ordering & open target (from the spec, do not re-derive)

The feed is **newest-first in every state** — at-bats newest→oldest (current/most-recent AB is the **top** row), pitches **within** an expanded AB chronological (1→N). This is the shipped game-v2 order and it does NOT change between live and final.

Position is then **purely a `scrollTop`** on the fully-rendered list:

| State | Open target |
|---|---|
| **Live** | **`scrollTop = 0`** — current AB is the top row (the live edge). Follow armed. |
| **Final** | (PR 12's concern for resume; default = bottom) — **not this PR.** A final game has no live edge, no pill, no follow. |

> Set the scroll **after the hydrated rows paint** (the timing rule in §5) — never on the empty first mount, or it silently does nothing.

---

## 3. ⛔ MANDATORY FIRST STEP — instrument, do not guess

The previous attempts failed because each declared a confident "root cause" and committed it blind. **You will not propose a root cause until you have a log.** Before changing any behavior, add temporary `console.log`s and capture the real firing order:

- (a) when `hydrate` fills the play list (`plays.length` / `completedAtBats.length`)
- (b) the value of any `replayCount` / `replayDelay` / drip-feed counter on each change
- (c) `completedAtBats.length` on every change
- (d) when the initial-scroll layout-effect fires, and the container's `scrollHeight` **and** `scrollTop` *at that instant*

Then click a **live** game and paste the console sequence. **The bug is almost certainly visible right here:** if the position effect fires while `completedAtBats.length` is still climbing (1, then 2, then 3…), the feed is being drip-fed and the scroll lands on the only row present yet — the first pitch. That is §4. Diagnose from this log, not from reading code.

---

## 4. 🔴 THE DEFECT THAT KEEPS COMING BACK — the replay gate must not feed the default list

This is the single thing that broke every prior attempt. Read it twice.

**In the design, the live/default feed renders the COMPLETE at-bat history in one paint** — newest-first, with **no counter in front of it.** Position is then just a `scrollTop`. There is **no `replayCount` / drip-feed gate between hydration and the default feed.**

`replayCount` belongs to the **Replay transport** — the `▶ / ⏸ / speed / scrub` playback for **final-game replay only**, an opt-in control. It is a *separate* feature from where the live feed opens.

**The defect:** if `replayCount` sits in the **default render path**, the live feed gets its rows gradually, the position effect fires against an incomplete list, and you land on the first pitch. Every "it opens at the start again" report traces to this.

**The fix is to remove the gate from the default path — NOT to make position wait for it:**
- The live/default feed must render the **complete** `completedAtBats` on first paint. Do not slice/limit it by a replay counter.
- Scope `replayCount` strictly to **active replay playback** (user pressed ▶). When replay is idle/off, the feed shows all rows.
- With the gate gone, the position layout-effect naturally runs against the full list on the first hydrated paint. No race.

**Do NOT "solve" this by any of these (all tried, all wrong):**
- ❌ lowering the global replay delay to 0
- ❌ changing `useAtBatHistory`'s signature
- ❌ StrictMode ref hacks / double-mount workarounds
- ❌ a singleton-socket rewrite

The change is one idea: *the gate is replay-only; the default feed is ungated.*

---

## 5. Live follow / break / pill (the behavior, once the list renders whole)

1. **Following (pinned).** Track a `following` boolean. While the feed is at the live edge (`scrollTop <= 8`), keep it pinned as new content prepends — staying at `scrollTop 0` shows each new pitch.
2. **Looking back (broken) — with scroll compensation.** In `onScroll`, `atTop = scrollTop <= 8` sets `following`. While `!following` and content prepends at the top, **preserve the read position**: in a `useLayoutEffect` keyed on feed content, record `prevScrollHeight`, then when not following `scrollTop += (scrollHeight - prevScrollHeight)` (when following, `scrollTop = 0`); always store `prevScrollHeight = scrollHeight`. **Do not rely on CSS `overflow-anchor`.** This compensation is load-bearing — without it, a pitch arriving while you read history shifts the view under you.
3. **"Jump to live" pill.** While `!following`, render a floating pill: **"↑ Jump to live"** + a **"N new"** counter incremented on each live `PlayUpdate` since the break. Click (or scrolling back to top) → `scrollTop = 0`, `following = true`, counter `0`.
4. **The pill must survive PAGE scroll, not just the feed's internal scroll.** Anchor it to the top of the feed's **visible region** with a `position: sticky` wrapper whose scroll context is the **page** (`top` = page-header offset), bounded by the feed column so it releases only when the whole feed leaves the viewport. ⚠️ A naïve `sticky; top:0` placed *inside* the 640px internal-scroll frame pins only against internal scroll and rides off-screen on page scroll — **that is the reported bug.** Watch for an ancestor with `overflow:hidden/auto` capturing the sticky. This does NOT reproduce in the prototype (its feed never page-scrolls) — verify in the real page+frame composition.
5. **Ref-mirror `following`** so the `onScroll` handler and the live-update subscription read the current value without a stale closure.

**Re-arm rule:** `following = (scrollTop at the live edge)`. Break when they leave it; re-arm when they return (scroll or pill).

**Timing rule (why it "does nothing"):** set the initial `scrollTop` in a **layout effect that runs after the hydrated rows paint**, never on the empty first mount. With §4 fixed, that is the first real hydrated paint.

**Live re-entry note (no persistence needed in PR 11):** because open-at-live runs on **every** mount, a live game that is unmounted (player round-trip) and remounted will naturally re-land at the live edge with following re-armed. PR 11 needs no cache for this — PR 12 only adds the *final-game* resume.

---

## 6. See the intended behavior

Open **`Game Position Prototype (standalone).html`** (in this folder) — it demonstrates the live open-at-current-AB, follow, break, scroll-compensation, and the Jump-to-live pill with the "N new" counter. The "Feed opens at" toggle shows the **today (broken)** vs **PR 11 (fixed)** open targets side by side. (Caveat: the prototype's feed never page-scrolls, so it cannot demonstrate behavior-state #4's page-scroll pinning — you must verify that in the real composition.)

---

## 7. Acceptance — must pass before you open the PR

1. Open a **live** game → feed lands on the **current** at-bat (live PA expanded at top), NOT the 1st-inning leadoff. Following armed.
2. While pinned, new pitches keep the live PA in view automatically.
3. Scroll down into earlier at-bats → a new pitch does **not** yank the view; a **"Jump to live · N new"** pill appears.
4. Click the pill (or scroll back to top) → returns to the live edge, following re-armed, counter reset.
5. With the feed visible, scroll the whole **page** down → the pill stays pinned just under the header; it leaves only when the **entire feed** is off-screen.
6. Live game, navigate to a player and Back → re-lands at the live edge with following re-armed (no stale offset) — via open-at-live re-running on mount.
7. A **final** game shows no pill, no follow (its full position model = PR 12).
8. No `scrollIntoView` anywhere. Numerals stay mono. Row layout, the expanded live-PA table, and the single rust LIVE pill in `PageTitle` are unchanged.

If any fail, you are not done. Re-run the §3 log to see why; the answer is in the firing order, not in a new theory.

---

## 8. Commit hygiene (this has bitten the repo twice)

- **Do NOT commit design files into the app repo.** No `holistic/*.jsx`, no prototype HTML, no `PROMPT_*` except — if you want a grounding doc in-repo — `SPEC_position_model.md` and this prompt under `client/docs/design/`. Delete any `*_standalone.md`.
- Keep the PR diff tight: `PitchByPitchV2.tsx` + `PitchByPitchV2.css` (+ the gate fix wherever §3 located it). Nothing unrelated — do not bundle stray doc deletions/additions.
- PR title: **"PR 11 — Game view: pitch-by-pitch live position (open at live AB + Jump to live)"**. Link **BUG-009** as closed. In the description, paste your §3 instrumentation log proving the position effect fires against the full `completedAtBats` list.
