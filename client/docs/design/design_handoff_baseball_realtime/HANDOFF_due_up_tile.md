# Handoff to design — "Due Up" tile + half-inning transition (shipped ad hoc, Sep 2026)

This shipped directly from a live bug report during a Claude Code session, not from a design
spec — there is no `PROMPT_due_up.md` in this folder and no prior mock. Writing this up so
the design side has a source of truth if it wants to formalize, restyle, or fold this into
`game-v2.jsx` properly.

---

## The problem

Between the 3rd out of a half-inning and the next half's first pitch — a real gap, often a
minute or more for commercial breaks — the game view kept showing the batter who just made
the last out as if he were still at bat: stale batter card, stale count, stale strike zone,
stale bases. Reported live: *"Altuve just struck out to finish the inning. It still shows
him as the batter during commercial break."*

## Root cause (backend, for context — not a design concern)

MLB's per-pitch `count.outs` reflects outs BEFORE that pitch, so it never reaches 3 on the
play that actually ends a half-inning; `about.outs` is unpopulated in the live feed. Fixed in
`api/src/poller/poller.service.ts` by deriving outs on the final pitch-frame of a completed
play from that play's `runners[].movement.outNumber` instead — confirmed live against
real MLB data. This makes `outs === 3` a reliable signal of the gap.

## What the client does with the signal

`client/src/pages/game/halfInningTransition.ts` (new file):
- `isHalfInningTransition(latest)` — true exactly when `latest.outs === 3`.
- `deriveDueUpNext(...)` — derives the next **three** batters for the incoming team from
  box-score lineup order (cycling forward from whoever last batted for that side). No new
  API data — this is all derivable from the existing play-by-play + box score.

`client/src/pages/game/MatchupLeft.tsx` — the right half of the left card (previously the
"At bat · TEAM" batter-identity block) swaps to a "Due Up" tile for the duration of the gap.
Separately, the rest of the card resets to the incoming half's blank slate **the instant the
3rd out is recorded**, not on the next pitch:
- Inning/half arrow flips to the incoming half (e.g. ▲6 → ▼6)
- Bases clear, and the BALLS / STRIKES / OUTS pip row all show 0
- The strike zone and its pitch-type legend clear — no stale dots left over from the AB that
  just ended

---

## Current visual spec (as shipped — plain CSS values, not run through a design pass)

Replaces the batter-identity block. One vertical stack:
- `gap: 12px`, `padding: 12px`
- `border: 1px dashed var(--color-border-strong)`, `border-radius: 8px`

1. **Team row** — real MLB team logo (20px, via the shared `TeamDot` atom, same one used
   elsewhere for team branding) + full team name, 14px/700, `var(--color-text)`.
2. **"DUE UP" label** — 11px/700, uppercase, `0.08em` letter-spacing, `var(--color-text-muted)`.
3. **Hint line** — *"Between innings — waiting for first pitch"*, 12px italic,
   `var(--color-text-faint)`.
4. **Three batter tiles**, `gap: 10px` between rows. Each row: 40px headshot (shared
   `Headshot` atom, team-color initials fallback) + the standard `OrderSpot` batting-order
   chip + name (14px/600, `var(--color-text)`, links to the player page). All three tiles are
   the **same size and treatment** — there's no "next batter is bigger than on-deck/in-hole"
   hierarchy the way `MatchupContext`'s existing due-up section has one.

---

## Open questions for design

1. **Is a dashed border + reused atoms the right long-term treatment?** This was built
   inside the existing card with zero new visual language, purely to get something correct
   and shippable fast. Pregame and Scout mode both got real designed states — this arguably
   deserves the same pass.
2. **The incoming pitcher isn't addressed.** The pitcher strip above (in `MatchupContext`)
   still shows the OUTGOING pitcher's stats until his replacement, if any, throws a real
   pitch. Not fixed as part of this — worth deciding whether the transition state should say
   anything about who's coming in to pitch.
3. **`MatchupContext`'s own "Due up" (on-deck/in-hole) section doesn't reset.** It still
   reflects the half that just ended during this same gap — two different "who's up" signals
   on screen at once, potentially disagreeing. Worth deciding whether it should gate off too,
   or whether that's intentionally out of scope.
4. **Scorecard-flip mode wasn't touched.** The reset/tile only applies to the normal
   (non-flipped) view; scorecard mode (`scorecardOpen`) still shows the pre-transition state.
   Not designed for scorecard mode at all yet.

## Files touched

- `api/src/poller/poller.service.ts` (backend fix — outs computation)
- `client/src/pages/game/halfInningTransition.ts` (new)
- `client/src/pages/game/lineupUtils.ts` (new — shared `slotOf`/`activeLineup`/`dueUp` helpers,
  extracted so `MatchupContext` and this new logic don't duplicate them)
- `client/src/pages/game/MatchupLeft.tsx` / `MatchupLeft.css`
- `client/src/pages/GamePage.tsx` (wiring: `isHalfInningTransition` / `deriveDueUpNext` calls)
