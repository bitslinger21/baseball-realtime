# Build PR 3.5 — Game view: Win probability + Leverage row (self-contained)

You are working in the `baseball-realtime` client (React 19 + Vite + TypeScript). The "editorial scorebook" redesign is largely landed (PRs 1–12). **Do only this PR. Touch nothing else.**

> This file is self-contained — the full spec is inline. Optional reference, if present in the handoff package: `holistic/game-v2.jsx` (the signed-off components `WinProbTimeline` + `LeverageCard`) and `design_handoff_baseball_realtime/MIGRATION.md` (PR 3.5 entry). Port the two components **verbatim** from `game-v2.jsx` — the only work here is replacing their hardcoded mock arrays with real data.

---

## What PR 3.5 is

Two half-width cards in a row, sitting **directly below `PitcherCard`** on the game view: **`WinProbTimeline`** (a split-fill win-probability line chart) and **`LeverageCard`** (a leverage-index scale bar). The **design is signed off and already built** in `holistic/game-v2.jsx`; it was split out of PR 3 only because it needs two data fields the app wasn't mapping. **This PR is that data wiring + dropping the row in.** The row currently does not render at all (feature-check stub from PR 3) — so there is no layout hole to fix, just an addition below the fold.

## The gate — and why it's small

This is **not a new integration.** Both fields **already exist in the raw MLB `feed/live` JSON**, per-play; they're just not mapped through to the client. The lift is roughly **3 backend changes each**:

1. **Type** — add the field to the play type (`MlbPlay`).
2. **Mapper** — populate it in the `MlbPlay → LiveUpdate` mapping.
3. **Wire** — expose it on `PlayUpdateWire` (the socket payload the client already consumes).

The two fields:
- **Win probability** — per-play home-team win probability. In the MLB `feed/live` JSON this lives on each play (commonly `allPlays[i].result` / win-probability-added block — locate it; do **not** assume a path, grep the raw payload). You need the **home win probability after each play** (0–100, or 0–1 → scale) to build the series, plus the **current/latest** value.
- **Leverage index** — the leverage index for the **current** moment (latest play). Same raw JSON, per-play. You also want the **max over the game so far** for the "peak today" readout (compute client-side from the series if only per-play is mapped).

If, when you open the raw payload, one of these is genuinely absent for some game states (e.g. pregame, or a provider that omits it), **gate just that card** behind a presence check — render the row with whichever card has data; if neither does, the row stays unrendered (same stub posture as today). Never fabricate a value.

## Data contract the two components consume

Port the components as-is; feed them these shapes instead of the literals currently inlined.

### `WinProbTimeline`
Replace the hardcoded `pts` array. It is an ordered series of `[t, homeWinPct]`:
- `t` — game progress (x position). Derive from play ordering; monotonic is all that matters.
- **X-axis tracks the play head — NOT a fixed 1–9 spread.** The x-domain spans only the innings **played so far** (up to the current head): a game replayed to the 6th fills the width with innings 1–6; a completed final spans 1–9. As the head advances, the axis extends. (In the component, `domainMax = last point` and `X = t => (t/domainMax)*iw`; the line's right edge + end dot sit at the head.) Do **not** render an empty 7–9 tail while replaying to the 6th — that was the reported bug.
- `homeWinPct` — **home-team** win probability at that play, **0–100** (the chart's 100%-top anchor is the home team, `TEAMS.HOU` in the mock; bind to the actual home team).
- The **last point** drives: the end-of-line dot, the header percentage, and the favored-team label. `leader = lastPct >= 50 ? home : away`, header shows `Math.round(leader.pct)%` + `leader.abbr`. Already coded — just feed real `pts` and bind the two team objects to the real home/away teams (don't leave HOU/CHC literals).
- **Y-axis labels read 100 / 50 / 100, NOT 100 / 50 / 0.** Each END is **100%** — the win probability of whichever team is anchored at that edge (top = home, bottom = away); the middle is **50** (even). Line all the way up = home 100%; all the way down = away 100%; on the midline = 50/50. (Label = `v >= 50 ? v : 100 - v`.) A bottom label of `0` reads as "away team has 100% — shown as 0," which is confusing; both ends showing 100 (with the team anchors beside them) is the fix.
- **Inning tick marks** — label **every inning** (`[1,2,3,4,5,6,7,8,9]`), filtered to those **through the head** and scaled across `domainMax`, so they fill the played width. For extra innings, extend the list to the real final inning count.
- **Remove the hardcoded narrative caption sentence** "The sharp rise in the 8th is the bases-clearing double." — it's mock prose. Keep the rest of the "How to read" caption (it's generic and correct); either drop that last sentence or, if you want to keep a callout, derive it from the largest single-play swing in the real series. Do not ship the literal.

### `LeverageCard`
Replace the four literals (`maxLev`, `cur`, `avg`, `peak`):
- `cur` — current leverage index (latest play). Drives the big number (`{cur}×`), the bar fill, and the tone pill.
- `avg` — **constant 1.0.** Leverage is normalized so 1.0 = an average situation; this is the reference marker, not data. Leave it 1.0.
- `peak` — max leverage seen this game (from the series, or a mapped season/game max).
- `maxLev` — scale ceiling. Use `Math.max(3.5, peak)` so a very high-leverage moment never overflows the bar.
- **Tone pill** (`HIGH`/`MED`/`LOW`) — derive from `cur` thresholds (e.g. `≥2.0 HIGH`, `≥1.0 MED`, else `LOW`); the mock hardcodes `HIGH`. Use `tone="accent"` for HIGH only (rust = the hot/high state), neutral otherwise.
- The plain-language line ("Runners on 1st & 2nd, 2 outs, tying run aboard") is **derived from current base/out/score state**, which you already have on the game view — build it from the live state, don't hardcode it.

## Layout

Drop the row in exactly where the design has it — below `PitcherCard`, half-and-half:

```jsx
<PitcherCard />
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>
  <WinProbTimeline />
  <LeverageCard />
</div>
```

This is the structure already in `game-v2.jsx` (`GameScreenV2`). Both are below the fold.

## Must-not-break / must-not-build
- **Numerals stay mono** with `tabular-nums` — every number in both cards uses the mono token. (Already true in the ported components; don't regress it.)
- **Rust = hot/high only.** The win-prob "leader" fill above 50% is rust because it marks the *current leader*; navy below is the trailing team. Leverage HIGH is rust. Don't recolor.
- **Port verbatim** — don't redesign the chart, the split-fill clip-paths, the axis anchors, or the leverage bar. The only change is data in, plus the team/inning/threshold bindings called out above.
- **Don't touch** the rest of the game view (line-score band, matchup, pitch-by-pitch, pitcher card, lineups tray). This is purely an additive row.
- **No new component**, no charting library — the chart is hand-built SVG and stays that way.

## Acceptance
- The `[WinProbTimeline | LeverageCard]` row renders below `PitcherCard` on a live game.
- The win-prob line **split-fills correctly around the 50% line** (leader color above, trailing below) and the **header names the team actually favored** by the latest value.
- Inning ticks match the real game length (incl. extra innings).
- The leverage bar fill, big `{cur}×` number, tone pill, and "peak today" all reflect real values; `avg` marker sits at 1.0.
- No hardcoded HOU/CHC, no "bases-clearing double" caption, no fabricated values — a card with no data simply doesn't render.
- Numerals mono throughout.

## If the fields aren't where you expect (debug checklist)
1. Dump a **raw** `feed/live` response for a mid/late-inning game and grep it for `winProb` / `leverage` (case-insensitive) — confirm the exact paths before writing the type. The CLAUDE notes assert both are present per-play; verify against a real payload.
2. Confirm you're mapping **home** win probability for the chart's top anchor (away = 100 − home).
3. Check the series is **ordered** (play index) before building `pts`; an unordered series makes the line zigzag in time.
4. For a **final** game the series is the whole game and reads correctly post-game (the cards are complete-game views) — verify it renders on finals too, not just live.

Open one PR titled **"PR 3.5 — Game view: win probability + leverage"**; in the description, call out the three-step field mapping (type → mapper → wire) for each of `winProbability` and `leverageIndex`, and note that both came from already-present `feed/live` fields.
