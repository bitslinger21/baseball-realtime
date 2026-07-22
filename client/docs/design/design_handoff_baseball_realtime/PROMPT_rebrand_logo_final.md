# Rebrand — "The Scorebook" logo + name (dev handoff, Jul 21, 2026)

You are in the `baseball-realtime` client. **Design decision, signed off** — supersedes the earlier
`handoff-updates/PROMPT_rebrand_scorebook.md` draft (which framed case + fill as open questions).

## Final mark

- **Product name:** "The Scorebook" (was "Baseball Realtime").
- **Wordmark case:** ALL-CAPS — "SC◆REBOOK" (the diamond glyph replaces the letter O).
- **Diamond glyph:** an outlined diamond (rotated square), **unfilled**, with **one home-plate
  square accent at the bottom point only** — no squares at the other three corners (1st/2nd/3rd
  bases are NOT drawn).
- **Diamond color:** **rust** (`T.accent`, `#b8421e` on light surfaces / `#c9622f` on dark
  surfaces) — not black/white/cream.
- Reference assets (in this handoff and in `holistic/foundations.jsx`'s Logo card):
  `assets/logo-rust-on-light.png` (primary, on cream `bg`) and `assets/logo-rust-on-dark.png`
  (dark-surface use — nav, footer, splash).

## Wordmark spec (recreate as SVG/CSS, don't ship the PNG as the production asset)

- Font: DM Sans, weight 800, letter-spacing -0.02em, uppercase.
- Diamond sized to sit inline at the wordmark's cap-height, vertically centered with the text baseline.
- Diamond SVG (44×44 viewBox): outer diamond `polygon points="22,41 41,22 22,3 3,22"`, stroke
  `T.accent`, stroke-width 2.5, `fill: none`. Home-plate square `polygon points="22,41 26.24,36.76
  22,32.52 17.76,36.76"`, same stroke color, stroke-width 1.8, `fill: none`.
- Text color: `T.text` on light surfaces, `T.bg`/cream on dark surfaces. Diamond stays rust on both.

## Where this replaces the old name/mark

- App header / nav brand mark (wherever "Baseball Realtime" text or any prior logo currently renders).
- Browser tab favicon — square tile version, diamond only (see `logo-scorebook-7...` favicon
  explorations for the tile treatment; rust diamond replaces the light/dark treatments shown there).
- Any loading splash / empty-state branding.
- Page `<title>` strings, meta tags, README/about copy that say "Baseball Realtime" → "The Scorebook".

## Must-not-break

- This is copy + a static mark swap — no layout, routing, or data changes.
- Don't reintroduce the parked 4-base-squares (07c) or filled-diamond variants — those were rejected.
- Keep numerals/mono rule, token set, everything else untouched.

## Acceptance

- Nav/header shows "SC◆REBOOK" (or the app's header component swap) with the rust, home-plate-only
  diamond, on both light and dark chrome as applicable.
- Favicon updated to the diamond-only mark.
- No lingering "Baseball Realtime" strings in UI-facing copy.
