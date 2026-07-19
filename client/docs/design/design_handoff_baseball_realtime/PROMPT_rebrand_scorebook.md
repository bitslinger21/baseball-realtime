# Rebrand — "Baseball Realtime" → "The Scorebook" (dev handoff, Jul 19, 2026)

Product name change + new logo lockup. **Two logo variants included — the dev should build a
toggle-able / easily swappable implementation, not hardcode one.** No layout/screen changes beyond
branding.

## What changed

- **App name:** "Baseball Realtime" → **"The Scorebook"** everywhere it appears in UI chrome, page
  `<title>`, meta tags, any header/nav branding, and app-store/PWA manifest fields if applicable.
- **Logo lockup ("C2"):** the wordmark "Scorebook" with its **first "O"/"o" replaced by the
  scorebook diamond glyph** — same diamond used in the `ScorebookCell` atom (outline diamond, 4
  bases drawn as small squares sitting on the diamond's edges, home plate included as a square like
  the others). **Two text-case variants are both still in play — not yet finalized:**
  - `logo-scorebook-7d-sentencecase.svg` — "Sc◆rebook" (sentence case)
  - `logo-scorebook-7e-allcaps.svg` — "SC◆REBOOK" (all-caps)
- **Favicon:** the diamond mark alone, on a **cream tile** (`#f4f1ea` background, `#cfc8b4` border,
  14px corner radius at 64px size — scale proportionally for other favicon sizes). Same favicon
  works for both logo-case variants. See `favicon-scorebook.svg`.

## Build note — keep both variants swappable

Since the case decision isn't locked, implement the header logo as a **single component taking a
`variant: 'sentence' | 'allcaps'` prop** (or equivalent config flag), referencing whichever SVG
matches — so flipping the final choice later is a one-line change, not a re-port. Do not inline only
one variant and delete the other's markup/asset.

**Config source — pick based on how often this needs to flip:**
- **Env var** (`VITE_LOGO_VARIANT=sentence|allcaps` in `.env`, read via
  `import.meta.env.VITE_LOGO_VARIANT`): simplest, but Vite bakes env vars in at **build time** — a
  dev server needs restarting and a production build needs a full rebuild + redeploy to pick up a
  change. Fine once the case is basically decided and this is just an occasional toggle.
- **Runtime config** (URL query param, `localStorage` flag, or a feature-flag check) if stakeholders
  need to compare the two live without a rebuild/redeploy — e.g. `?logo=allcaps` or a small settings
  toggle. Recommended while the decision is still open.

## Assets provided

- `logo-scorebook-7d-sentencecase.svg` — sentence-case wordmark lockup.
- `logo-scorebook-7e-allcaps.svg` — all-caps wordmark lockup.
- `favicon-scorebook.svg` — square favicon tile (shared by both variants). Export to the standard
  favicon size set (16/32/48/180/512px etc.) as needed for `<link rel="icon">`/`apple-touch-icon`/
  manifest icons.

## Tokens used (already in the app's token set — no new colors)

- Diamond fill: `#efeae0` (surfaceAlt) · diamond outline + base squares: `#15161a` (ink) on
  `#fcfaf6` (surface) · favicon tile: `#f4f1ea` (bg) with `#cfc8b4` (border) frame.

## Acceptance

- All user-facing occurrences of "Baseball Realtime" read "The Scorebook" (page title, any header
  branding, manifest `name`/`short_name`, meta description if it names the app).
- Favicon updated to the cream-tile diamond mark across all declared sizes.
- Logo renders via a variant-swappable implementation using both provided SVGs — confirm both
  render correctly when toggled, since the final case choice is still pending design sign-off.
