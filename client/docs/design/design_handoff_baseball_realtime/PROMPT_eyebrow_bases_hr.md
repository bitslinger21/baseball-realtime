# Play-state eyebrow — base fill, pip alignment + HR scorebook port bug (Jul 5, 2026)

Three items from the Jul 5 review of the game view (live `game-v2.jsx` + finals/replay
`game-scout.jsx`). Items 1–2 are **design changes** (ungated, value-only); item 3 is a **port bug** —
no design change, the design is already correct.

Source of truth: `holistic/shared.jsx` (`Bases`, `Pips`, `ScorebookCell` atoms) + `holistic/game-v2.jsx`
+ `holistic/game-scout.jsx`. Handoff copies under `design_handoff_baseball_realtime/holistic/`.

---

## 1. Occupied bases fill = RUST (both eyebrows)

The play-state eyebrow's `Bases` diamond fills a **reached** base with **`T.accent` (rust)**, matching
the game view's live/hot color language. The finals/replay eyebrow previously filled with `T.ink`
(dark) — now aligned to rust so both screens are identical.

- `<Bases on={...} size={26} fill={T.accent} empty={T.borderStrong} strokeWidth={2} />`
- Applies to `game-v2.jsx` (live + pregame eyebrows — already rust) and `game-scout.jsx` (was ink).

## 2. Empty pips + empty bases = `borderStrong` (the "pip alignment")

**The deal:** the empty (unfilled) pip circles and empty bases had **two different values across the
two screens** — the live game view used `T.textFaint` (#6f685f, darker) while the finals/replay screen
used `T.borderStrong` (#b4ae9b, lighter). Same control, two colors → they didn't match, and the darker
`textFaint` read "a bit dark" for an *empty* state. (Note `textFaint` was itself darkened in the Jul 4
contrast pass from #a39d92 to #6f685f, which is what tipped it over into looking heavy here.)

**Resolution — standardize on `borderStrong` everywhere:**
- Empty **pips**: `<Pips … emptyColor={T.borderStrong} />` (was `textFaint` in `game-v2.jsx`).
- Empty **bases**: `<Bases … empty={T.borderStrong} strokeWidth={2} />` (already `borderStrong`).
- Filled pips keep their per-count color (Balls `info` · Strikes `text` · Outs `accent`); filled bases
  are rust (item 1). Only the **empty/unfilled** outline changed.
- Rationale: an empty slot should read as a light *outline*, not a heavy dot; `borderStrong` is the
  strongest of the border tokens so it's still clearly visible on the cream surface (AA as a UI border)
  without competing with filled pips. One rule, both screens.

Also part of this pass: the B/S/O strip uses the **stacked full-word format** — `BALLS` / `STRIKES` /
`OUTS` labels (11px, 700, 0.04em, uppercase, `textMuted`) **above** their pip rows, `flex-direction:
column`, container `gap:18`, pips `size 9 gap 5`. The finals/replay eyebrow was updated to match the
signed-off game-v2 format (it previously used single-letter `B/S/O` inline).

---

## 3. PORT BUG — home-run scorebook cell renders empty (BUG-016)

**Symptom (live app, user screenshot Jul 5):** a solo home run's scorebook cell shows a **bare diamond
with a center dot** — no basepath traced, no `HR` code, no green run-shade. The marquee result renders
as a non-event.

**This is a port/data-mapping gap, NOT a design bug.** Verified Jul 5 by rendering the `ScorebookCell`
atom directly: a home run passed
`{ kind:'hit', code:'HR', reachedOnPA:4, finalBase:4, scored:true }`
traces the **full diamond in bold** (circled the bases), shows **`HR`** (centered inside for the feed's
`codeIn` mode, below otherwise), and shades the diamond **green** (`positiveSoft`). The design mock
renders this correctly in both the feed badge and the batter-card At-bats row. The atom is correct.

**Root cause:** the target-app play→`ScorebookCell`-props mapper sets `reachedOnPA`/`reached` = 0 (or
omits it) for a home run and drops `scored`. With `reached:0` the atom draws an empty out-style cell.
Same family as BUG-015 and the PR-10 enum gotcha (matching human text instead of the normalized event
enum).

**Fix (in the mapper — same one BUG-015 touches, no design change):** derive `reachedOnPA` from the
**bases earned**, never leave it 0 for a reach:

| event enum   | kind   | code  | reachedOnPA | finalBase | scored        |
|--------------|--------|-------|-------------|-----------|---------------|
| `Single`     | hit    | `1B`  | 1           | 1*        | from run data |
| `Double`     | hit    | `2B`  | 2           | 2*        | from run data |
| `Triple`     | hit    | `3B`  | 3           | 3*        | from run data |
| `HomeRun`    | hit    | `HR`  | **4**       | **4**     | **true**      |
| `Walk`       | walk   | `BB`  | 1           | 1*        | from run data |
| `HitByPitch` | hbp    | `HBP` | 1           | 1*        | from run data |
| outs         | out    | code  | 0           | 0         | false         |

\* In the pitch-by-pitch feed the PA result is all that's known, so `finalBase == reachedOnPA` (no
later baserunning). `scored` is true when the play drove/earned a run home.

**Acceptance:** a home run in the feed and in the batter-card row shows a fully-traced bold diamond
with `HR` and a green run-shade; a single traces one leg to first; an out is an empty diamond with the
out code. No completed hit renders as a bare/center-dot cell.

Tracked in `bug-list.md` **BUG-016**; the HR row is also folded into
`PROMPT_BUG015_collapsed_result.md`'s enum→props mapping.
