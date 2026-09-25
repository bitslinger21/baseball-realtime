# Baseball IQ — one global entry point (Sep 24, 2026)

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

## 2 · REMOVE — Baseball IQ from the game view's dark score bar

The 48px sticky line-score bar used to mount `BaseballIQ` on its right side (the "Ask Baseball IQ"
diamond, the expanding field, and the one-line insight). **Delete that mount** in every band mode
(live, final, Scout, pregame; they all share `LineScoreBand`).
- The bar keeps: the score, and the `Line score & leaders ▾` / `Line score & probables ▾` trigger.
- The bar's right side is simply **empty**. Don't put anything in its place.
- The bar stays 48px.
- **The generated insight line goes too.** It belonged to the same component. Whether insights come
  back to the game view (probably attached to their subject: batter card, pitcher strip) is **open and
  not designed**. Don't re-add them.
- Clean up: remove the `iqCandidates` / `iqSuggested` plumbing into the band if nothing else uses it.
  If the backend's insight generator is already wired to the band, leave the service in place but
  stop rendering it.

**Why:** with the permanent ask in the header, the ask in the band was a second copy of the same
feature on the same screen.

## Acceptance
- Every screen's global header shows the rust Q-tailed diamond left of search. Clicking it opens the
  panel with the right scope line for that page (Home / game / player / league-wide).
- The glyph matches `shared.jsx` exactly: open plate, flat tail, no filled plate, not a rectangle.
- The game view's dark bar has no Baseball IQ element in any mode, still measures 48px, and still
  sticks.
- On the game page, there is exactly ONE Baseball IQ affordance: the one in the header.
