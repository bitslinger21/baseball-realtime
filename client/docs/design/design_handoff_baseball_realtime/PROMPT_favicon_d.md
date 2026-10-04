# Favicon: option D (thicker, bigger diamond)

**Rev 1 · Oct 3, 2026.** Not gated. One file swap.

## Why
The shipped `client/public/favicon-scorebook.svg` uses stroke 3 in a 64-unit box. A tab draws it at 16px, which makes the stroke about 0.75px. That's thinner than a pixel, so it blurs into a faint, broken ring. D sizes the stroke for the tab: about 2px at 16px.

## Change
Replace `client/public/favicon-scorebook.svg` with the `favicon-scorebook.svg` in this folder, **verbatim**:
- **Tile:** unchanged. 62×62 at (1,1), `rx 14`, fill `#f4f1ea`, 2px `#cfc8b4` border.
- **Diamond:** fills more of the tile. It's drawn on the 44-unit logo grid, scaled ×1.22727 and offset 5,5 (so the tile padding is 5). The tips land at 8.7 / 55.3.
- **Strokes**, in diamond units: diamond **6.5**, home plate **4.5**. Rust `#b8421e`, no fill, miter joins.
- **Home plate square only.** Don't draw 1st/2nd/3rd base.

Keep the filename. `index.html` already points both `rel="icon"` and `apple-touch-icon` at it, so no markup change is needed.

## Optional
iOS ignores SVG for the home-screen icon. If you want a proper one, export this SVG to a **180×180 PNG** (`apple-touch-icon.png`) and point `apple-touch-icon` at it. The SVG stays as the tab icon.

## Acceptance
1. In a 16px browser tab, light and dark, the diamond reads as one solid rust outline, not a dotted ring.
2. At 32px the home plate square is visible.
3. No other favicon files or links are changed.

Reference: `Favicon - Thicker Outline.html` (option D, next to the shipped icon).
