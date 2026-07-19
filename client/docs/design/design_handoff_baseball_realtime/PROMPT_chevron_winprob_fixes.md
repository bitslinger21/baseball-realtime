# Scorebook chevron + Win probability fixes (dev handoff, Jul 18, 2026)

Two unrelated bugs fixed in the game view. No new API, no new components.

---

## FIX 1 — Scorebook at-bats chevrons

Three related defects in the "At-bats" scorebook row's ‹ › overflow chevrons
(`MatchupLeft` component, `client/src/pages/game/MatchupLeft.tsx`).

### Background

The at-bats row is a horizontally-scrollable strip of `ScorebookCell` diamonds. When
content overflows, ‹ (scroll left) and › (scroll right) chevrons appear as `position:
absolute` overlays — they don't affect the scroll container's own width. Chevron
visibility is state (`canScrollLeft`, `canScrollRight`) synced by `syncChevrons()`, which
reads `el.scrollLeft`, `el.clientWidth`, and `el.scrollWidth` directly from the DOM.

### Defect A — Left chevron stays visible after clicking it

**Symptom.** Click ‹ → content scrolls to position 0 correctly, but the left chevron
stays on screen. Right chevron also fails to appear even though content now overflows to
the right.

**Root cause.** The chevron click handlers used `scrollTo({ left: 0, behavior: "smooth" })`.
Smooth scroll is async; browsers do not reliably fire a final `scroll` event once the
animation settles at position 0, so `syncChevrons` was never called with `scrollLeft = 0`.
`scrollend` event listeners (a previous attempt) didn't fix it because `scrollend` on
elements has inconsistent cross-browser support.

**Fix.** Replace `scrollTo({ behavior: "smooth" })` with a direct `el.scrollLeft = 0`
assignment (instant, synchronous), then call `syncChevrons()` immediately after. The DOM
property assignment is synchronous — `el.scrollLeft` is 0 before the next line executes —
so `syncChevrons` always reads the correct final position. Same treatment for the ›
button (`el.scrollLeft = el.scrollWidth`).

```typescript
// ‹ button
onClick={() => {
  const el = atbatsScrollRef.current;
  if (!el) return;
  el.scrollLeft = 0;
  syncChevrons();
}}

// › button
onClick={() => {
  const el = atbatsScrollRef.current;
  if (!el) return;
  el.scrollLeft = el.scrollWidth;
  syncChevrons();
}}
```

Note: smooth scroll animation is intentionally dropped. Chevron buttons are navigation
controls; users expect immediate response.

### Defect B — Right chevron absent on initial render when overflow exists

**Symptom.** On page load, when the batter has enough past at-bats to overflow the row,
the › chevron doesn't appear. It only shows after the user manually scrolls or after the
first live update.

**Root cause.** The `useEffect` that attaches scroll listeners and calls `syncChevrons()`
has `[syncChevrons]` as its only dependency — a stable value — so it runs exactly once:
at component mount. At mount, the scroll div isn't in the DOM yet because `showAtBats`
is false (data arrives asynchronously). `atbatsScrollRef.current` is null, so the effect
exits early and never calls `syncChevrons`. When cells appear on the next render, no
effect re-fires.

**Fix.** Compute `totalCellCount` — the number of cells about to render, covering both
live mode (`liveCellCount`) and scout/replay mode (`allCompletedAtBats` filter) — before
the component's early `if (latest == null)` return so it can be a `useEffect` dependency
without violating Rules of Hooks. Add it to the listener effect's dependency array:

```typescript
const liveCellCount = allCompletedAtBats == null
  ? completedAtBats.filter(ab => ab.batterId === latest?.batterId).length
    + (currentAtBat != null ? 1 : 0)
  : 0;
const totalCellCount = allCompletedAtBats == null
  ? liveCellCount
  : allCompletedAtBats.filter(ab => ab.batterId === latest?.batterId).length;

useEffect(() => {
  const el = atbatsScrollRef.current;
  if (el == null) return;
  el.addEventListener("scroll",    syncChevrons, { passive: true });
  el.addEventListener("scrollend", syncChevrons, { passive: true });
  syncChevrons();
  return () => {
    el.removeEventListener("scroll",    syncChevrons);
    el.removeEventListener("scrollend", syncChevrons);
  };
}, [syncChevrons, totalCellCount]);
```

When `totalCellCount` transitions from 0 → N (cells arrive), the effect re-runs. At that
point `atbatsScrollRef.current` is the now-mounted scroll div, so `syncChevrons()` reads
the real `scrollWidth` and correctly sets `canScrollRight = true`. The listener pair is
also re-attached at this point (on mount it was a no-op because `el` was null).

### Acceptance

- Initial load with 5+ past at-bats for current batter: › chevron visible immediately,
  no scroll or interaction required.
- Click ‹: content snaps to start, ‹ disappears, › appears — on the first click.
- Click ›: content snaps to end, › disappears, ‹ appears — on the first click.
- Live game auto-scrolls to the rightmost cell as usual; ‹ chevron appears when
  overflow exists.

---

## FIX 2 — Win probability chart ends at wrong value for completed games

**Symptom.** On a final game with the play head at the last at-bat (full game revealed),
the win probability chart's last data point shows something other than 100% / 0% — it
shows whatever intermediate probability the MLB model emitted for the final play.

**Root cause.** The MLB `homeTeamWinProbability` field is a model output that doesn't
necessarily resolve to exactly 0 or 100 after the final out. The `winProbPts` memo in
`GamePage` passes these values through unchanged.

**Fix.** When the play head is at the very end of a final game
(`replayUpdates.length === stableUpdates.length`), overwrite the last point's `pct` with
the deterministic result: 100 if home team won, 0 if away team won, derived from the
actual final scores.

```typescript
if (isFinalGame && pts.length > 0 && replayUpdates.length === stableUpdates.length) {
  const last = replayUpdates[replayUpdates.length - 1];
  if (last.homeScore != null && last.awayScore != null) {
    pts[pts.length - 1].pct = last.homeScore > last.awayScore ? 100 : 0;
  }
}
```

The `replayUpdates.length === stableUpdates.length` guard is essential: in scout/replay
mode the user can scrub to any point mid-game, where the last *visible* point is a
legitimate probability — it must not be clamped. The clamp only fires when the full
game is revealed.

**Where.** `client/src/pages/GamePage.tsx`, inside the `winProbPts` `useMemo`. Add
`isFinalGame` and `stableUpdates.length` to the memo's dependency array.

### Acceptance

- Final game, head at end: chart terminates at the top edge (home won) or bottom
  edge (away won); header shows 100%.
- Final game, head mid-game (scout/replay scrubbing): last visible point shows the
  model's probability at that moment, not 100%.
- Live game: unaffected (the guard never fires when `isFinalGame` is false).
