# Fix BUG-015 — game-view pitch-by-pitch: completed cards show only the count, not the result

**Type:** frontend port fix (target-app only — the design is already correct). **Ungated** — no new API.

## The bug
On the game view (`/game/:providerGameId`), a **completed / collapsed** pitch-by-pitch
at-bat card shows only the **ending count** (e.g. `1-2`). The play's **result is missing** —
`K`, `BB`, `HBP`, `1B`, `2B`, `6-3`, `F8`, etc.

## What it should show (matches the design — `holistic/game-v2.jsx` `PitchByPitchV2`)
Each collapsed card is a single row:

```
[inning + team dot] [result-code badge] [order] Batter · <result phrase> · <ending count>   [scoring chip if runs scored]
```

- **Result-code badge** — the small circle to the left of the name: the play's code
  (`1B` / `2B` / `K` / `BB` / `HBP` / `F8` / `6-3` / `HR`…), colored by result class:
  - hit → green (`positive`); HR → rust (`accent`); walk **or HBP** → navy (`info`); out → faint/neutral.
- **Result phrase then count** — `Michael Busch · Single to LF · 2-2`, `Ian Happ · Strikeout swinging · 1-2`,
  `Seiya Suzuki · Hit by pitch · 1-0`. The count is the *suffix*, not the whole label. Keep BOTH.
- (Live/in-progress PA legitimately shows just the running count — that's correct. This bug is about **completed** PAs.)

## Likely cause
The port renders the count suffix (and/or the badge) but drops the **result label string**.
Very likely the **PR 10 family of bug**: matching on human-readable text instead of the backend's
normalized event **enum**. Derive the result label + code from the event enum, not from a display string:

- `event` enum → label + code. Examples: `Single`→"Single"/`1B`, `Double`→"Double"/`2B`,
  `Strikeout`→"Strikeout"/`K`, `Walk`→"Walk"/`BB`, `HitByPitch`→"Hit by pitch"/`HBP`,
  `HomeRun`→"Home run"/`HR`, `Groundout`/`Flyout`→ out code from fielder detail where present
  (`6-3`,`F8`) else the truthful `OUT` (see F-005).
- The **count** comes from balls-strikes of the AB-ending pitch — keep it as the suffix.

## HBP is now a first-class result (design updated Jul 3, 2026)
`ScorebookCell` (`shared.jsx`) now supports `kind:'hbp'` / `code:'HBP'`. When you wire the badge +
label, treat **HBP like a walk**: **navy (`info`)** color class, reaches first base, and counts as a
**plate appearance, not an at-bat** (so it never increments AB in any batter line). In the scorebook
diamond it draws a **dotted** PA stroke (walk = dashed) with a hollow endpoint dot — that's already in
the atom; just pass `kind:'hbp'`.

## Acceptance
- A finished K shows `K` badge + "Strikeout…" label + count; a single shows `1B` + "Single…" + count;
  a hit-by-pitch shows a navy `HBP` badge + "Hit by pitch" + count.
- No completed card shows a bare count with no result.
- HBP never counts as an at-bat in the batter's today line.
- Live PA still shows the running count only (unchanged).

## Badge form — use the ScorebookCell atom (design updated Jul 3, 2026)
The outcome badge is the shared **`ScorebookCell`** (not a flat colored circle). It draws the
result as a scorebook diamond (base-path + code below), matching the batter-card At-bats row:
solid path to base = hit · **dashed** = walk · **dotted** = HBP · empty diamond = out; code below
disambiguates within class (`K` vs `6-3` vs `F8`). This also fixes a legibility bug the old circle
had (white code on the faint-gray out fill was near-invisible). Derive its props from the result
code — `game-v2.jsx` `sbFromCode()` is the reference: hits → `kind:'hit'` reachedOnPA=base; `BB`/`IBB`
→ `walk`; `HBP` → `hbp`; everything else → `out`/reached 0. Feed carries the PA result only, so
reachedOnPA == finalBase (no later baserunning in the feed).
- **⚠️ HR / extra-base mapping (BUG-016).** `reachedOnPA` must equal the **bases earned**, not 0:
  `1B`→1, `2B`→2, `3B`→3, **`HR`→4 with `scored:true`**. A home run mapped as `reached:0` renders a
  bare out-style diamond (no basepath, no `HR`, no green shade) — the reported live-app defect. The
  atom is correct; only the mapper drops these. Every hit sets `reachedOnPA`; `HR` additionally sets
  `finalBase:4, scored:true` so the diamond traces fully and shades green.
- **Live PA:** keep the rust ● circle — do NOT swap it for a diamond.
- **Compact `codeIn` mode (the feed uses this):** the game-view feed passes `codeIn` so the result
  code sits **inside** the diamond (surface-halo for legibility) and the inning-label + below-label
  rows are dropped — a shorter card (this is the height win vs. the first code-below port). The
  batter-card At-bats row stays **code-below** (`codeIn` off), which also keeps the two scorebook
  surfaces visually distinct.
- **Future PA (Scout mode only):** use `state="muted"`, NOT a bare empty diamond. A bare empty
  diamond already means "out", so an unplayed PA would look identical to a strikeout. Muted =
  faint-but-legible dormant diamond, no code.

