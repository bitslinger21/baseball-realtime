# Game view — at-bat transition animation (Jul 5, 2026)

A small, meaningful motion for the game-view pitch-by-pitch feed: as the play head moves to a new
at-bat, the current-AB **canvas settles into place** (fade + slight rise) and the batter identity
cross-fades. Motion reinforces the conveyor the three-zone layout already implies — it is NOT
decorative. **Ungated** (no data), value/CSS-only.

Applies to the finals/replay game view (`game-scout.jsx` `ScoutFeed`) and should carry to the live
game view (`game-v2.jsx` `PitchByPitchV2`) — both share the pinned current-AB canvas.

## Behavior
- Fires **only when the current at-bat changes** (head advances/retreats to a different AB, via
  Play, ⏭/⏮, scroll-driven head, or clicking an at-bat). It must **NOT** fire on each pitch within
  the same at-bat.
- The current-AB **canvas** (the pinned batter header + pitch-table region) plays an entrance:
  fade `0 → 1` + `translateY(9px → 0)`, `.28s cubic-bezier(.22,.61,.36,1)`.
- The **batter header** cross-fades slightly longer (`.34s ease`, opacity only) so the identity swap
  reads.
- Respect reduced motion: no animation under `@media (prefers-reduced-motion: reduce)` (keeps
  print/PDF/export static).

## Implementation (React + CSS)
Keyframes (global stylesheet / the page `<style>`):

```css
@keyframes abCanvasEnter { from { opacity:0; transform:translateY(9px); } to { opacity:1; transform:none; } }
@keyframes abHeaderEnter { from { opacity:0; } to { opacity:1; } }
.ab-canvas-enter { animation: abCanvasEnter .28s cubic-bezier(.22,.61,.36,1) both; }
.ab-header-enter { animation: abHeaderEnter .34s ease both; }
@media (prefers-reduced-motion: reduce) {
  .ab-canvas-enter, .ab-header-enter { animation: none; }
}
```

Trigger by **remounting on AB change** — put `key={currentAB.idx}` on the canvas container and give it
`className="ab-canvas-enter"`; give the batter-header row `className="ab-header-enter"`. React remounts
the subtree when the key changes (i.e. only on a new at-bat), replaying the entrance. Within an at-bat
the key is stable, so dripping pitches update in place with no animation.

```jsx
{currentAB && (
  <div key={currentAB.idx} className="ab-canvas-enter" style={{ /* the flex:1 canvas */ }}>
    <div className="ab-header-enter" style={{ /* pinned batter header */ }}> … </div>
    <div style={{ /* flex:1 scrolling pitch region */ }}> … </div>
  </div>
)}
```

(In the target app, if a global CSS reset strips `will-change`/transforms, no change needed — these
are plain opacity+translate. Keep the keyframes in a stylesheet that loads on the game route.)

## Notes / tuning
- Keep it subtle — 0.28s and 9px are deliberately small. Do not turn this into a slide-across-zones
  transition; that was explicitly rejected as fragile across the three scroll containers.
- Optional, NOT built: a completing AB visibly dropping into "Earlier," or the first pitch rows
  staggering in. Only add on request.

## Acceptance
- Advancing/retreating the head to a **different** at-bat plays the fade+rise once; the batter header
  cross-fades.
- Dripping pitches inside one at-bat do **not** re-trigger the animation.
- With `prefers-reduced-motion: reduce`, nothing animates; content renders in its final state.
- No layout shift or scroll jump beyond the intended entrance.
