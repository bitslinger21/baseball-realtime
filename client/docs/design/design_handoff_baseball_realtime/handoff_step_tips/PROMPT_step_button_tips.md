# Scout transport: hover text on the step buttons (Oct 21, 2026) · rev 1

> Version stamp: **rev 1, Oct 21, 2026.** If your copy has no stamp, it's stale.

**Ungated. No new API. Tiny.** The pitch-by-pitch card's header has two step groups, `[‹] bat [›]` and `[‹] ball [›]`.
Nothing tells you what the four arrow buttons do. Add hover text.

Design reference (read, don't copy): `holistic/game-scout.jsx` → `StepTip`, `BatGlyph`, and the header row in `ScoutFeed`.

## Labels

| Button | Tip + `aria-label` | Does |
|---|---|---|
| left of the bat | **Previous batter** | marker back one at-bat |
| right of the bat | **Next batter** | marker forward one at-bat |
| left of the ball | **Previous pitch** | marker back one pitch |
| right of the ball | **Next pitch** | marker forward one pitch |

The wording is "batter", not "at-bat": it's what a fan says, and the bat icon already says it.

## Tip style

- A styled tip, **not** the native `title` (too slow, unstyled, and hidden on some platforms). Remove any `title` on these
  four buttons so you don't get two tips.
- Dark ground `T.ink`, text `T.surface`, DM Sans 12px / 600, padding 5×9, radius 6, `T.sh.sm` shadow, `white-space: nowrap`.
- Placed **below** the button, centred, 6px gap. Below, because above the header is the card's top edge.
- Appears after **~250ms** hover; disappears immediately on leave and on press (so it never covers the marker as it moves).
- Also shown on **keyboard focus**, hidden on blur. `role="tooltip"`; the button keeps the same text as `aria-label`.
- `pointer-events: none`, z-index above the timeline.
- Touch: no tip (no hover). The `aria-label` carries it.

## Bat icon

The shipped icon reads as a **pencil**. Replace it with a baseball bat: knob, thin handle with grip lines, flared barrel with a
rounded cap, wood tone (`#c89a6a` fill, `#8a5f3a` outline), tilted -45°, about 22px. Port `BatGlyph` from `game-scout.jsx` as is.
The ball icon is fine.

## Also (one line)

The at-bat arrows render as blue emoji tiles (⏪ ⏩) in some browsers. Add the text-presentation selector `\uFE0E`, or use the
same plain glyphs/SVGs as the pitch arrows.

## Acceptance
- Hovering each of the four buttons shows its label below it after a brief delay; pressing hides it.
- Tabbing to a button shows the tip; a screen reader announces the label.
- No native `title` tooltip appears in addition to the styled one.
- The bat icon reads as a bat at 100% zoom.
