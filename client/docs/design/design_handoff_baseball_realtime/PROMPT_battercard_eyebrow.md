# Game view — batter card + play-state eyebrow refinements (dev handoff, Jul 4, 2026)

Four self-contained, **ungated** UI changes. No new API, no data, no logic — layout/style + one
interaction. Source of truth: `holistic/shared.jsx` + `holistic/game-v2.jsx` (and the handoff copies
under `design_handoff_baseball_realtime/holistic/`).

---

## 1. Play-state eyebrow — B/S/O strip relabeled + stacked

Was an inline row: `B ●○○  S ●○  O ●●`. Now each group is **label над circles**:

```
BALLS      STRIKES      OUTS
● ○ ○       ● ○         ● ●
```

- Three groups, side by side (`flex`, `gap: 18`, `align-items: flex-end`).
- Each group = a **full-word uppercase label** ("BALLS" / "STRIKES" / "OUTS", `fontSize: 11`,
  `fontWeight: 700`, `letterSpacing: 0.04em`, `color: textMuted`) **above** the pip circles
  (`flex-direction: column`, `align-items: center`, `gap: 5`).
- Pip counts unchanged: Balls total 3, Strikes total 2, Outs total 2. Colors unchanged
  (balls = `info` navy, strikes = `text`, outs = `accent` rust).
- Applied to BOTH the live (`LineScoreBand`-adjacent `MatchupLeft`) and pregame eyebrows.

## 2. Empty circles + bases no longer faint

The empty (unfilled) pip circles and empty base diamonds were drawn in `border` (too light).

- `Pips` empty outline: `emptyColor` now **`textFaint` (#6f685f)**, pip `size: 9`, `gap: 5`.
- `Bases` empty outline: **`borderStrong`** with **`strokeWidth: 2`** (was `border` @ 1.5).

## 3. Bases — separation between the three diamonds

The three base diamonds touched at their corners. In the `Bases` atom, each diamond is now
**`size / 4.6`** (was `size / 3.6`), which opens a clear gap while keeping the same overall
footprint and edge positions (2nd top-center, 1st mid-right, 3rd mid-left).

## 4. At-bats scorebook row — selection model (`ScorebookCell` `state="active"`)

The batter card's "At-bats" row is interactive: tapping a cell replays that at-bat in the strike
zone above. The selection indicator:

- **Selected cell = rust DASHED border** (`state="active"` → `accent`, dashed, `bw: 2`).
- **The current/live AB is selected by DEFAULT** — so on load the last (live) cell shows the
  rust-dashed border and its at-bat is the one displayed in the zone.
- Tapping a **past** cell moves the rust-dashed selection there (and drives the zone + last-pitch
  strip to that AB); the live cell then drops to a **neutral dashed** outline (`live` + not selected
  → `borderStrong`, dashed).
- Atom change: border style is dashed when `active || live` (previously dashed only when `live`), so
  a selected past cell is also dashed rather than solid.

**Port note:** the shipped app renders the live cell statically (no tap-to-select), which is why the
"dashed red" cell looked off. Wire the row: default-select the current AB, tap-to-replay past ABs,
rust-dashed marks the selected one.

---

## Acceptance
- Eyebrow reads BALLS / STRIKES / OUTS as labeled stacks; empty circles + bases clearly visible.
- The three bases have visible gaps between them.
- On load, the current at-bat's scorebook cell has a rust dashed border; tapping a past cell moves it
  and updates the zone; the live cell becomes neutral dashed.
- No other sizes/colors changed — these are targeted refinements.
