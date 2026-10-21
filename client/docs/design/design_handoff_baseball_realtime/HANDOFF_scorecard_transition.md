# Handoff — the scorecard transition (open and back), as built

**As of Oct 21, 2026 · `main` @ `28f85a3`.** Describes what the app does today, measured in Chrome on game 849815
(Scout, head in the top of the 5th, 1440 × 1000 window). Nothing here is a proposal; open questions are at the end.

Where it lives: `client/src/pages/GamePage.tsx` (`handleScorecardFlip`, the hero grid), `GamePage.css`
(`.game-page__hero-grid`), `client/src/pages/game/MatchupLeft.tsx` + `.css` (left column), and
`client/src/pages/game/PitchByPitchV2.tsx` + `.css` (right column: header, the scorecard sheet).

---

## The two states

| | Feed (default) | Scorecard mode |
|---|---|---|
| Hero grid columns | `600px 1fr` | `280px 1fr` |
| Left column | Batter card (zone + batter, At-bats row) **and** the matchup card below it | Narrow **sidebar**: batter identity → inning / bases / B-S-O strip → strike zone filling the height. No matchup card |
| Right column header | "Pitch by pitch" (or Scout controls) + `Scorecard` button | `◆ SCOREBOOK ‹ Innings 3–8 of 9 ›` + controls + team toggle + `Full card` + `← Back` (+ the compact timeline in Scout) |
| Right column body | Pitch-by-pitch feed | The scorecard sheet, covering the feed |

The feed stays mounted under the sheet the whole time; the sheet is a layer that slides over it.

---

## Open: clicking `Scorecard`

Triggers: the `Scorecard` button in the pitch-by-pitch header — live view and Scout (finished games).

| Time | Left column | Right column |
|---|---|---|
| 0 ms | Batter card and matchup card start fading out: `opacity 1 → 0`, **120 ms ease** (`.matchup-left--prefade`, `.game-page__context-fade`). Measured 0.29 at 129 ms. | Nothing yet. |
| **150 ms** — state flips (`setTimeout 150` in `handleScorecardFlip`) | Matchup card **removed**. Batter card **swaps** to the sidebar layout at full card opacity, its three parts starting invisible. Column starts narrowing **600 → 280 px, 1.2 s `ease`** (`transition: grid-template-columns`). | Header **swaps instantly** to the SCOREBOOK header. Sheet starts rising from below: `translateY(100%) → 0`, **0.35 s `cubic-bezier(.4,0,.2,1)`**. |
| 150 → ~530 ms | Sidebar parts fade in, staggered: batter identity `0 → 1` over **1 s ease**; inning/bases strip **1 s ease, 0.1 s delay**; strike zone **0.9 s ease, 0.25 s delay**. | Sheet travels up (measured: 79% down at 288 ms, 20% at 390 ms, settled by ~540 ms). |
| ~530 ms → 1.35 s | Column keeps narrowing; sidebar finishes fading in (zone fully in at ~1.28 s). | Sheet is in place **while the right column keeps widening** (it widens as the left narrows). The scorecard's inning window stays anchored with the live inning second from the right while the width grows, until the user scrolls/swipes. |
| **≈ 1.35 s** | Settled at 280 px. | Settled. |

What opens:
- **Team:** the batting team's sheet (the half at the play head). A team the user picks with the toggle is kept for the
  next open, until the next half-inning change resets it to the batting team.
- **Inning window:** the live inning (head's inning) second from the right.
- **Highlights:** live inning header and the current batter's row in rust.

---

## Back: clicking `← Back`

Trigger: `← Back` in the scorecard header (not shown inside the full card).

| Time | Left column | Right column |
|---|---|---|
| **0 ms** — state flips immediately (no pre-fade) | Sidebar **swaps instantly** back to the full batter card, and the matchup card **reappears instantly**, both at full opacity — **no fade-in**. Column starts widening **280 → 600 px, 1.2 s `ease`**. | Header **swaps instantly** back to the feed header. Sheet starts dropping: `translateY(0) → 100%`, **0.35 s**, revealing the feed underneath. |
| 0 → ~440 ms | Column widening. | Sheet travels down (measured 33% at 190 ms, 85% at 290 ms, gone by ~440 ms). Feed visible. |
| ~440 ms → 1.27 s | Column keeps widening; the full-width batter card and matchup card re-flow as it does. | Feed column narrowing. |
| **≈ 1.27 s** | Settled at 600 px. | Settled. |

Also on Back: an open runner-trace panel closes.

---

## Asymmetries and quirks (observed, not intended or unintended — for review)

1. **Open has a pre-fade; Back doesn't.** Open fades the old left content out (120 ms) before swapping. Back swaps
   instantly with no fade either way, so the full batter card and matchup card pop in at full opacity while the column
   is still only 280 px wide and growing.
2. **Different lengths per side.** The sheet takes 0.35 s; the column resize takes 1.2 s. On open the sheet has landed
   by ~0.5 s and then sits while the columns are still moving for another ~0.8 s; on Back the feed is fully back by
   ~0.45 s while the left column still has ~0.8 s to go.
3. **The header has no transition** — it swaps the instant the state flips (150 ms in on open, 0 ms on Back).
4. **Sidebar fade-ins are long** (0.9–1 s, staggered to 1.15 s) relative to the 0.35 s sheet.
5. **Edge case — Scout with the head before the first pitch** (a finished game when it first opens): there's no play
   yet, so the left column shows its "Waiting for updates" card and **does not change to the sidebar** in scorecard mode;
   only the matchup card disappears and the column narrows.
6. **Reduced motion is not honoured** here: none of these transitions check `prefers-reduced-motion` (the full card's
   pop-out does).

## Exact values (for anyone re-specifying)

| What | Value | Where |
|---|---|---|
| Pre-fade (open only) | `opacity: 0`, `transition: opacity 0.12s ease` | `.matchup-left--prefade`, `.game-page__context-fade` |
| State flip delay (open only) | 150 ms | `GamePage.tsx` `handleScorecardFlip` |
| Column resize | `grid-template-columns: 600px 1fr ↔ 280px 1fr`, `transition: grid-template-columns 1.2s ease` | `.game-page__hero-grid(--scorecard)` |
| Sheet slide | `transform: translateY(100%) ↔ translateY(0)`, `transition: transform 0.35s cubic-bezier(.4,0,.2,1)` | `.pbpv2__scorecard-slide(--open)` |
| Sidebar: batter identity | `animation: 1s ease both` (opacity 0 → 1) | `.matchup-left__sc-batter` |
| Sidebar: inning/bases strip | `animation: 1s ease 0.1s both` | `.matchup-left__sc-eyebrow` |
| Sidebar: strike zone | `animation: 0.9s ease 0.25s both` | `.matchup-left__sc-zone` |
| Team toggle inside the scorecard | sheet fades out 150 ms, swaps, fades in (`opacity 150ms ease`) | `PitchByPitchV2.tsx` `switchScorecardTeam` |

## Open questions for design

- Should Back mirror open (pre-fade the sidebar, then swap and fade the full card in), or is the instant swap preferred?
- Should the sheet and the column move on one clock (same duration and easing), or is the staggered feel intended?
- Should the header cross-fade rather than swap?
- What should the left column show in scorecard mode before the first pitch (quirk 5)?
- Should these transitions collapse to instant under `prefers-reduced-motion`, as the full card does?
