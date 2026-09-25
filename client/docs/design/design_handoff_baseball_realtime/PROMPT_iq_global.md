# Baseball IQ — one global entry point (Sep 24, 2026 · rev 2, Sep 25)

> rev 2: the band KEEPS the insight line (insight-only, no ask), rather than going empty. The brand
> diamond is now specified (§3). **The header IQ button is not in the live app yet; §1 is net-new.**

**Scope:** app-wide header + the game view's sticky line-score bar. **Ungated for the UI.** The answer
itself needs the Baseball IQ backend (`handoff_baseball_iq_backend/`); until that exists, the panel
opens with its suggested questions and a thinking/answer mock.
**Design source (copies in this folder):** `shared.jsx` (`BaseballIQButton`, `BrandHeader`, `IQDiamond`),
`game-v2.jsx` (`LineScoreBand`, `BaseballIQ`).

There are two changes, and they ship together: after this PR the app has exactly ONE way to ask
Baseball IQ, from every screen.

## 1 · ADD — the Baseball IQ button in the global header

**Where:** `BrandHeader`, in the right-hand cluster, **LEFT of search** (order: `IQ · search · settings`).
IQ is the app's own voice; search is navigation.

**Button:** 38 × 38, the same icon-button style as settings. `aria-label="Ask Baseball IQ"`,
`aria-expanded`. Open state: `accentSoft` ground + `accent` border.

**Glyph:** `IQDiamond` at 19px, rust, **with the Q-tail**. Port the SVG verbatim from `shared.jsx`:
- diamond `M12 2 L22 12 L12 22 L2 12 Z`, stroke 2, round join
- open home plate `M9.8 15.8 L14.2 15.8 L14.2 18 L12 20.2 L9.8 18 Z`, stroke 1.4, miter join, no fill
- tail `M12 22 H22.5`, stroke 2, round cap
- `overflow="visible"`, viewBox `0 0 24 24`

**Rule:** the tail follows the colour. Rust (IQ) gets the tail; any other colour (the ink brand mark)
gets none. Don't hand-roll a copy of the glyph. The logo keeps its plain diamond, and the tail is what
separates the IQ mark from the logo.

**Panel:** opens below the button, right-aligned. 460px wide, `surface` ground, 2px `accent` top border,
large shadow, z-index above page content. It overlays the page and never pushes it down.
- Header row: glyph (14) · `BASEBALL IQ` eyebrow (rust, 10.5 / 700, uppercase, 0.09em) · **scope line**
  right-aligned (12, `textMuted`, ellipsised, max 230px).
- A pill input (autofocus). Placeholder: "Ask about this page, or anything in baseball…". Enter submits.
- **Idle:** suggested questions shown as pill buttons. Clicking one asks it.
- **Thinking:** the pulsing glyph plus "Reading the record…".
- **Answered:** a big mono headline number, a unit eyebrow and a prose paragraph.
- Dismiss with Esc or an outside click. The button toggles it.

**Context is the page.** Each screen passes `iqContext` (shown as the scope line) and may pass
`iqSuggested` (3 starters). With no `iqContext`, it falls back to "Anywhere in baseball" and generic
starters.

| Screen | `iqContext` | `iqSuggested` |
|---|---|---|
| Home | `Today across the league` | default |
| Game view | `{Away} at {Home} · {inning}` (e.g. "Braves at Astros · 7th") | default for now |
| Player | player name | player-specific (e.g. "How does Peña compare to other shortstops?") |
| Leaders, Standings, Team pages, Games | omit (league-wide) | default |

The game-view context must update with the inning. Build the context from live state; don't hard-code it.

## 2 · CHANGE — the game view's dark score bar keeps the INSIGHT, loses the ASK (rev 2, Sep 25)

The 48px sticky line-score bar used to mount `BaseballIQ` on its right side: the "Ask Baseball IQ"
diamond, the expanding field, the suggested questions and the one-line insight. **Replace that mount
with `BandInsight`** (`game-v2.jsx`) in every band mode (live, final, Scout, pregame; they all share
`LineScoreBand`).

**Removed from the bar:** the ask. That means the "Ask Baseball IQ" label and diamond button, the
expanding 460px field, the suggested questions, and the answer / thinking / error states. Asking now
happens in ONE place, the header.

**Kept in the bar:** the generated insight, shown insight-only.
- **When a candidate clears the bar:** one line on the bar's right side. It shows the rust Q-tailed
  diamond (16), the `kind` eyebrow (Leverage / Streak / Rare; 10.5 / 700 uppercase, `#e2703f`) and
  the insight text (13, `#e4e4e7`, one line, ellipsised). It fades in on arrival (`iqArrive`, 0.34s)
  and never moves the score.
- **When nothing clears the bar:** **nothing renders.** There's no "Ask Baseball IQ" silence state any
  more. The permanent ask in the header fills that role, so an empty right side is correct.
- **Click:** opens the insight in full in an overlay below the bar. It's 460px, right-aligned, has a
  2px rust top border, and shows the glyph (14) + `kind` eyebrow + full text. It's read-only: no
  input, no suggested questions. Dismiss with Esc, an outside click, or clicking the line again.
  It overlays and never pushes.
- **Pregame and Scout pass no candidates**, so they render nothing (same rule as before).
- The bar stays 48px in every state.

Clean up: remove the band's `iqSuggested` / answer plumbing. Keep `iqCandidates`, which is still the
insight feed.

**Why:** with the permanent ask in the header, the ask in the band was a second copy of the same
feature on the same screen. The insight isn't a copy; it's the one surface that pushes something
about THIS moment, and the bar is the chrome that survives scrolling.

## 3 · Brand diamond vs IQ diamond (shared.jsx `IQDiamond`)
One component, two marks, keyed off colour:
- **Rust = Baseball IQ:** open home-plate outline + Q-tail.
- **Any other colour = the brand mark:** it matches the wordmark PNG. A small **rotated square** is
  nested in the bottom corner (`M12 16.4 L14.3 18.7 L12 21 L9.7 18.7 Z`, stroke 1.4, sides parallel
  to the base paths). No tail. Used by the scorecard-mode `◆ SCOREBOOK` lockup.

## Acceptance
- Every screen's global header shows the rust Q-tailed diamond left of search. Clicking it opens the
  panel with the right scope line for that page (Home / game / player / league-wide).
- The glyph matches `shared.jsx` exactly: open plate, flat tail, no filled plate, not a rectangle.
- The game view's dark bar has **no ask** in any mode. It shows the insight line only when a candidate
  exists; otherwise its right side is empty. Clicking the line shows the full insight, read-only. The
  bar still measures 48px and still sticks.
- On the game page there is exactly ONE place to ask: the header.
- The scorecard's ink `◆ SCOREBOOK` diamond matches the wordmark (rotated square, no tail).
