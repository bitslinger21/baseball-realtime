# Scorecard transition: Back mirrors open · pre-first-pitch sidebar · reduced motion (Oct 21, 2026) · rev 1

> Version stamp: **rev 1, Oct 21, 2026.** If your copy has no stamp, it's stale.

**Ungated. No new API.** Answers the five open questions at the end of `HANDOFF_scorecard_transition.md` (the as-built doc,
@28f85a3). Everything in that doc that isn't changed here stays as built.

Files: `client/src/pages/GamePage.tsx` (`handleScorecardFlip`, hero grid), `GamePage.css`, `MatchupLeft.tsx/.css`,
`PitchByPitchV2.tsx/.css`.
Design reference (read, don't copy): `holistic/game-scout.jsx` → `openScorecard` / `closeScorecard`, `ScoutSidebar`,
`ScorecardPregameSidebar`, the `sc-*` keyframes; `holistic/scorecard-frozen.jsx` → the `phase` prop.
Preview: `Game Scout Mode.html` → Scorecard / ← Back. Add `?pregame` to the URL for §2.

## 1. Back mirrors open (answers Q1, Q2, Q3)

Open stays exactly as built. **Back becomes its mirror image**, using the same durations and easings in reverse order:

| Time | Left column | Right column |
|---|---|---|
| 0 ms | Sidebar fades **out**: `opacity 1 → 0`, **120 ms ease** (new: same as open's pre-fade). | Nothing yet. |
| **150 ms**: state flips | Sidebar removed. Full batter card + matchup card mount **at opacity 0** and fade **in**, staggered like the sidebar: batter card **1 s ease**; matchup card **0.9 s ease, 0.25 s delay** (new). Column widens **280 → 600 px, 1.2 s ease** (as built). | Header swaps back to the feed header (as built, now at 150 ms like open). Sheet drops `translateY(0 → 100%)`, **0.35 s cubic-bezier(.4,0,.2,1)** (as built). |
| ≈ 1.5 s | Settled. | Settled. |

- **Q2 (one clock?):** no. Keep the as-built split (0.35 s sheet / 1.2 s column) in **both** directions. Back mirroring
  open is what made it feel wrong, not the split.
- **Q3 (header cross-fade?):** no. The header swaps at the state flip in both directions (150 ms in each).
- Nothing pops in at full opacity any more; this fixes as-built quirk 1.
- Guard: ignore a second click while a transition is in flight (both directions), so a double-tap can't strand a half state.

## 2. Before the first pitch: starting pitchers sidebar (answers Q4: option A)

As-built quirk 5: in Scout with the head before the first pitch, the left column kept its "Waiting for updates" card in
scorecard mode. Instead, in scorecard mode before the first pitch the 280 px sidebar shows the **starting pitchers**:

```
┌ STARTING PITCHERS ─────── First pitch 7:05 ┐   eyebrow row, surfaceAlt ground
│ [headshot 52] [logo] AWAY · HOU             │
│               Framber Valdez                │   15px / 700
│               LHP · ERA 3.42 · WHIP 1.12    │   mono 11.5, textMuted, tabular
├─────────────────────────────────────────────┤
│ [headshot 52] [logo] HOME · CHC             │
│               …                             │
└─────────────────────────────────────────────┘
```

- Away first, then home (the order they pitch in is irrelevant; this matches the line-score order).
- Same fade-ins as the live sidebar: eyebrow 1 s; away row 1 s +0.1 s; home row 1 s +0.25 s.
- Source: the game's **probable / starting pitchers** (already used by the pregame band's "Line score & probables"). If one is
  TBD, show `TBD` in that row with a dashed empty headshot (the Upcoming tab's TBD pattern), not mock data.
- First-pitch time uses the viewer's timezone with no zone label (Oct 1 decision). Unknown start time → date only.
- The moment the head reaches pitch 1, the normal sidebar (batter · strip · zone) takes over. No transition needed: it's a
  content change inside a settled layout.
- Live pregame (if scorecard mode is reachable before first pitch there): same sidebar.

## 3. Reduced motion (answers Q5: best practice)

When `prefers-reduced-motion: reduce` is set: **remove movement, keep a brief fade** so the change still registers.
- **No** column resize animation (`transition: none` on the hero grid; the columns jump to the end state).
- **No** sheet slide. The sheet **fades** in on open and out on Back, **120 ms**.
- Sidebar / full-card fade-ins collapse to **120 ms, no delay, no stagger**. The pre-fade stays 120 ms.
- The full card's grow/shrink already honours this; keep it.
- Implement it as **one shared setting** (a CSS media block plus one `useReducedMotion()` hook for any JS timing), so the
  scorecard, full card and future transitions can't drift. React to the setting changing while the page is open.

## Acceptance
- Back: sidebar fades out, then the full batter card and matchup card fade in (staggered) while the column widens and the sheet
  drops. Nothing appears at full opacity before it fades in.
- Open is unchanged from the as-built doc.
- Double-clicking Scorecard or Back mid-transition does nothing extra.
- Scout before first pitch, scorecard mode: the left column shows Starting pitchers with the first-pitch time, never
  "Waiting for updates".
- With Reduce Motion on (macOS: System Settings → Accessibility → Display): no sliding or resizing anywhere in the
  scorecard transition, only short fades. The same goes for the full card.
