# Handoff — live widget: edge buttons + minimised chip

**Date:** Sep 7, 2026 · **Ungated** — no new API, no new data, no design gate.
Two small, independent fixes to the landing page's live game widget.

## Read this

`PROMPT_widget_edge_buttons.md` — two sections, either can ship alone:

1. **Carousel edge buttons must not cover the minimise button** — the 40px edge hit-areas ran
   the full card height and swallowed clicks on the minimise button. They now start below the
   header band (`SW.headerH = 52`). CSS-only in the app.
2. **Minimised chip's inning must carry the top/bottom caret** — the chip showed a bare inning
   number; it now always shows `N ▲` / `N ▼`. Also folds the dock's two duplicated hardcoded
   chips into one data-driven `LiveWidgetMini`.

## Files

| File | What it is |
|---|---|
| `PROMPT_widget_edge_buttons.md` | The spec — problem, fix, what's unchanged, acceptance |
| `scoring-widget.jsx` | Design source: `LiveWidget`, `SW`, the six slides, `LiveWidgetMini` |
| `landing.jsx` | Design source: the dock that mounts `LiveWidgetMini` |
| `shared.jsx` | Tokens (`window.T`) — needed to run the preview |
| `review-live-widget.html` | Self-contained preview: the widget + both dock chips. Open directly |

## Measured in the design source

- Edge buttons start at y 93; the minimise button bottoms out at y 87 — **6px clear**, no overlap.
- Chevron strips remain 143px tall, chevrons centered in that region.
- Chips render `1 ▲` (PIT 1, TOR 0 — top of the 1st) and `9 ▼` (HOU 8, CHC 5 — bottom of the 9th).

## App scope

`client/src/pages/dailyGames/ScoringWidget.tsx` + `ScoringWidget.css`, and the minimised-chip
markup wherever `DailyGamesPage` renders the dock. Nothing else.
