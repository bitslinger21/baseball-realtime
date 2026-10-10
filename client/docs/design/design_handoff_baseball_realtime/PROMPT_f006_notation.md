# F-006 · Full scorekeeping notation — spray line, FC / errors, bunts

**Rev 1 · Oct 10, 2026.** Design SIGNED OFF. Ungated: every field is already in MLB's live feed. Baseline `main` @ `ed1a8ae` + the Oct 9 fix pass.

Design reference: `Scorebook Notation (F-006).html` (frames 01–05). Source of truth for the cell is `holistic/shared.jsx` → `window.sprayPathFor`, `window.SPRAY_CELL_RMAX`, `window.ScorebookCell` (`spray` + `field` props). The scorecard box is `ScoreBox` in `holistic/notation-review.jsx` (review-only component — port its drawing into the scorecard grid, not the file). **Port the geometry verbatim; don't re-derive it** (same rule as StrikeZone).

---

## What changes, in one paragraph

Every ball put in play gets a faint **spray line** from home toward where it landed: hits and outs, including bunts. The line's style is the hit type: **ground = dotted, liner = thin straight, fly = thin arc, popup = higher arc**. A bunt gets no extra mark; it is short, so its line stops inside the infield. A **fielder's choice or error** draws the same solid path as a hit, and the code carries the difference: **`FC`**, **`E6`**, **`E6T`** (throwing). The forced runner's own cell shows only the **×** where he was put out. The spray line shows on the **scorecard grid** and the **batter-card At-bats row**, but **not** in the pitch-by-pitch feed badge (`codeIn`).

---

## Part A · Server — `poller.service.ts`

**A1 · Send `spray` on the final frame of any ball in play.**
```ts
spray?: { angle: number; dist: number; traj: string };
```
- **`angle`** = degrees from straight-away center; **−45 = 3B line, +45 = 1B line**. From the in-play event's `hitData.coordinates`: `angle = atan2(coordX − 125.42, 198.27 − coordY)` in degrees (home ≈ 125.42, 198.27 in MLB's hit-chart space).
- **`dist`** = `hitData.totalDistance` (feet). If it's missing, use `hypot(coordX − 125.42, 198.27 − coordY) × 2.495`.
- **`traj`** = `hitData.trajectory` **verbatim**: `ground_ball`, `line_drive`, `fly_ball`, `popup`, `bunt_grounder`, `bunt_popup`, `bunt_line_drive`. The existing `hitKind` (GB/LD/FB/PU) drops the three bunt values. Keep `hitKind` for its current consumers; `spray.traj` is the new source.
- Omit `spray` when nothing was put in play (K, BB, IBB, HBP, CI) or MLB has no coordinates. Never invent one.
- Add `coordinates` + `totalDistance` to the `hitData` type on `playEvents`.

**A2 · Fielder's choice / forceout → batter code `FC`.** `computeScorebookCode` returns the fielders today (`6-4`, `6U`). Return **`FC`** as the batter's code for both "Fielders Choice", "Fielders Choice Out" and "Forceout", and send the fielders separately:
```ts
scorebookSub?: string; // '6-4' — the scorecard box shows it under FC
```
The feed label stays as decided Oct 9 ("Forceout" / "Fielder's choice").

**A3 · Errors from the error credit, not `hitData.location`.** `location` is who fielded the ball, not who erred. Read the runner `credits[]`: `f_fielding_error` at position N → **`EN`**; `f_throwing_error` at N → **`ENT`**. Apply the same rule to error labels on later advances (`RunnerMove` / the cell's `advances[].label`). Fall back to `E` + location only when no error credit exists.

**A4 · Bunts: no new codes.** Bunt single = `1B`, sac bunt = `SH`, bunt out = its fielding code (already fixed in BUG-026). The short spray line says "bunt".

Accept (Part A), on the 13 audit games:
- Every ball in play has `spray`; no K / BB / HBP has one.
- Spot-check 5 hits against Baseball Savant's spray chart: same field side and roughly the same depth.
- Every Fielders Choice / Forceout batter code = `FC` with a non-empty `scorebookSub` where credits exist.
- Every error code matches the error credit's position, with `T` exactly when the credit is `f_throwing_error`.

---

## Part B · Client — the cell (`ScorebookCell.tsx`)

**B1 · Add `spray` and `field` props.** Port `sprayPathFor` + `SPRAY_CELL_RMAX` from `shared.jsx` and the `spray` / `field` handling in `ScorebookCell` exactly.
- **`field` default = `'overflow'`** (chosen Oct 10, frame 05). The diamond is **unchanged**; outfield balls run past it into the cell's margin. The cell clips (`overflow: hidden`), the svg doesn't (`overflow: visible`). The `'diamond'` and `'full'` values exist only for the review page; don't port them.
- Distance map (piecewise, because the drawn field isn't to scale): 0–130 ft fills the first `brk` of the way, and 130–400 ft fills the rest. Overflow `rMax` = `min(edge × 1.35, 44 / cos θ, 29 / |sin θ|)`, with `brk = 0.667`. Use the same numbers as `shared.jsx`.
- Drawn **under** the base paths: `textMuted`; stroke **1.6** dotted (`0.1 2.6`, round caps) for ground balls, **1.1** solid otherwise; a **1.7 r** dot at the end. Muted cells use `textFaint`.
- Fly = quadratic arc with bulge `0.2 r`; popup / bunt popup `0.34 r`. The bulge flips side with the angle.
- **Inning label gets a surface backing**: `position: relative; z-index: 1; background: <cell bg>; padding: 0 3px; border-radius: 2px`. Spray lines pass behind it.
- **`codeIn` (feed badge) ignores `spray`.** Don't pass it there, and the cell guards it anyway.

**B2 · FC / ROE kinds.** An `FC`, `E#` or `E#T` batter cell draws exactly like a hit: solid bold path, filled reach dot. No new stroke, no dashes. The code is the only difference. (Hit totals already come from `creditedHit`, not the cell.)

**B3 · Forced runner.** His cell shows only the **×** at the base where he was put out (existing `outAt`). No `FC` label and no batter reference.

## Part C · Client — scorecard grid (`ScorecardGrid` / `scorebook-cell.js` builder)

Port `ScoreBox`'s drawing into the grid's inning box:
- **Spray** with the scorecard field's own geometry: home `(50, 85.76)`, outfield = circle centre `(50, 59.75)` r `47.5`, so `rMax(θ) = 26.01·cos θ + √(676.5·cos² θ + 1579.75)`, `brk = 0.75`. Ground stroke 1.9 dotted `0.1 3.2`, otherwise 1.3; end dot r 2.
- **Reached-base codes move to the open foul ground below the 1B line: (84, 77)**, not the old foul-pole corners `(90,36) / (50,10) / (10,36)`. Those collided with the arc, the spray lines and the marker column. Codes of 3+ characters drop to **10px**. Outs and HR stay centered at (50, 60).
- **`scorebookSub`** (e.g. `6-4`) sits 11 units under the code in 8.5px `textMuted`, on the same surface halo. **Only in the scorecard box** — the batter card and feed badge have no room.
- HR draws the full bold path + green fill (as decided Oct 9 for the feed), with its spray line to the wall.

Accept (Parts B–C), on 824164 + two postseason games:
- Batter-card At-bats row: outfield hits run past the diamond and stop under the inning label. Infield grounders stay inside. Bunts stop short.
- Feed badge: unchanged (no spray), shows `FC` / `E6T` / `SH`.
- Scorecard: no label touches the arc, a foul line, a spray line or the marker column. Check 1B, 2B, 3B, E6T and FC + sub specifically.
- Forced runner: × only, in the same inning column as the batter's FC.

---

## Not in scope
- **Hit-type letters or a legend in the cell.** The line style is the whole encoding; a key, if wanted, goes in the scorecard's position-reference corner later.
- **The `'full'` (outfield-drawn) cell variant.** Reviewed and not chosen.
- **F-006 leftovers still parked:** assist chains beyond the code string, and error notation on the runner's later advance beyond `E#` / `E#T`.

## Report back
Per part: done / partial / blocked, the commit, and the acceptance results with game IDs. List any trajectory value or error credit seen that isn't covered above.
