# Handoff — Horizontal header nav (Sep 13, 2026)

One prompt. Ungated: no new API, no new data.

**Read `PROMPT_header_nav_horizontal.md`.** Everything is in it.

## What's in this folder

| File | What it is |
|---|---|
| `PROMPT_header_nav_horizontal.md` | The spec. Bar layout, `active` rule, return rule, per-screen table, acceptance. |
| `holistic/shared.jsx` | `NAV_ITEMS`, `BrandHeader`, `PageTitle` (`returnTo`), `NavDrawer`. **The reference implementation.** |
| `holistic/landing.jsx` · `game-v2.jsx` · `player.jsx` · `teams.jsx` · `standings.jsx` · `leaders.jsx` | Each screen's header call, showing `active` / `returnTo` in situ. |
| `Team Page - Overview v2.html` · `Team Page - Schedule.html` | Hand-built static twins (`.appbar` / `.gnav`). Use the real shared header in the app. |
| `Header Nav - Horizontal Options.html` | The five explored options. Option C shipped. |
| `Header Nav - Return Rule.html` | Four worked return cases side by side. |
| `Header Nav - Two Row.html` | The rejected two-row bar — kept so it isn't re-proposed. |

## Relationship to earlier handoffs

Supersedes the *header* half of `handoff_navigation/PROMPT_header_pattern.md`
(hamburger-only bar). The two-block header structure, the slot rule and the
`PageMenu` retirement from that prompt are unchanged and already shipped.

`handoff_navigation/PROMPT_navigation_remainder.md` is still open and unaffected:
`box-sizing: border-box` on `.tp__wrap` / `.sp__hdr-inner`, and moving Leaders'
`League · MLB/AL/NL` into `PageTitle`'s `subtitleRight`.

## Deliberately not designed

Breakpoint width for the nav→hamburger swap · mobile sizing of the header ·
keyboard navigation through the nav items · the landing-date-in-route fix (§7,
flagged for the dev, not specced).
