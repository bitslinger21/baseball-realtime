# F-007 Review mode — fixes (position restore on return + selected-cell prominence)

> **Naming:** the paused mode is **Review**, the playing mode is **Play** (the single control's tag).
> Internal identifiers may stay `scout*`; only the labels matter.

Two fixes to the Review-mode (Play / Review) implementation. **No new API.** Reference design: this
folder's `scout_mode/` prototype (`holistic/game-scout.jsx`).

---

## FIX 1 — In-app return must restore the play head (don't reset to game start)

**Symptom.** Enter a final → Review, paused at the first at-bat. Press Play, let a few innings go by,
then click a player name → player page → **Back**. The game view resets to **Review-at-start** instead
of resuming where the head was.

**Expected (this is the PR-12 reconciliation — already in the spec).**
- A **freshly selected** final (from the landing list, or selecting a *different* final) opens in
  **Review, paused, head at the first at-bat.**
- An **in-app RETURN** to a final you were just viewing (player page → Back, or any React-Router
  unmount/remount of the same `providerGameId`) **restores the exact play head**: the same at-bat
  selected, the same expanded PA, the same feed scroll — **paused, in Review** (do NOT resume
  auto-play even if you left while playing).
- **Hard refresh** falls back to Review-at-start (session-scoped, not persisted across reload).

**Root cause.** The play-head position isn't wired into the **PR-12 position-persistence** that already
exists for the feed. PR 12 saves/restores feed scroll + expanded PA per game (session-scoped:
in-memory / `sessionStorage`, keyed by `providerGameId`); the **head** (which moment/at-bat the whole
screen reflects) must travel in that same record.

**Do.**
1. Make the **play head** part of the persisted position record (alongside feed scroll + expanded PA):
   store it as a stable id — the **at-bat id (+ pitch index)**, not a raw array index — keyed by
   `providerGameId`, in the same PR-12 session store.
2. **Save** on unmount / route change (the same lifecycle hook PR 12 uses).
3. **On mount:** if a saved record exists for *this same* `providerGameId` → restore head + expanded
   PA + scroll, **mode = Review (paused)**. If no record (fresh select / different game / hard refresh)
   → Review-at-start.
4. If the user left mid-play, persist the **current head** and return **paused** at it — never
   auto-resume playback on return.

**Where to look.** The GamePage Review-mode state + the PR-12 persistence hook/store. This is the same
mount/unmount save-restore PR 12 added; extend its payload with the head, don't build a second system.

**Acceptance.**
- Play to ~inning 5, open a player, Back → **same at-bat highlighted, same expanded PA, same scroll**,
  paused in Review (not inning 1, not auto-playing).
- Select that final fresh from the landing → Review-at-start.
- Hard refresh → Review-at-start.
- A **live** game still returns to the live edge per PR 11 (unchanged).

---

## FIX 2 — Selected scorebook diamond looks faded/disabled

**Symptom.** In the batter card's "At-bats" scorebook row, when the head is paused **mid-at-bat**, the
**selected** diamond renders in the muted/dashed "in-progress" style, so the *selected* cell looks
faded while the finished cells look solid — backwards. The head's cell should be the **most**
prominent.

**Do.** In the scorebook row, the **current/head** cell renders **solid** (never the `live`
dashed/muted style) with a clear selection treatment: **ink (`--ink`) outline ring + a subtle
`--surface-alt` fill + small padding**. Played cells: solid/normal. Future cells: faded (~**0.55**
opacity — enough to read as "upcoming," not disabled). A final is fully known, so showing the selected
at-bat's solid diamond is correct — no spoiler concern.

**Reference (prototype).** `scout_mode/holistic/game-scout.jsx` → `MatchupLeft`, the `day.map(...)`
scorebook row: `<ScorebookCell live={false} />`, and the button style `isCur ? { outline: 2px solid
ink, background: surfaceAlt, padding: 2 } : …`, `opacity: future ? 0.55 : 1`.

**Acceptance.** Pause mid-at-bat (or seek to any at-bat): the head's diamond is clearly the prominent,
selected cell — solid with an ink ring — not faded; played solid, future faded but legible.

---

Scope: Review mode only, finals only, no new API. Open one PR; call out that FIX 1 extends the PR-12
position record with the head (no second persistence system).
