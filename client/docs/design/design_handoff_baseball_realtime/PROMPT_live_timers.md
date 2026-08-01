# Live-updating countdown / elapsed-time chips — Aug 1, 2026

Files: `holistic/shared.jsx` (new `window.useLiveTimer`), `holistic/game-v2.jsx` (both
pregame and live `PageTitle` subtitle chips wired to it).

## What changed
The subtitle-line chips added in the prior `PROMPT_subtitle_chips.md` pass are now REAL
live timers in the design mock, not static strings:
- **Pregame:** "First pitch in Xh Ym" counts down every second toward a fixed target time,
  collapsing to "First pitch in Ym" under an hour and "First pitch any moment" at zero.
- **Live:** "M:SS elapsed" counts up every second from game start.

`window.useLiveTimer({ mode: 'countdown', target })` / `useLiveTimer({ mode: 'countup', since })`
in `shared.jsx` is a one-second `setInterval` + `Date.now()` diff — no new component, reusable
anywhere else a live timer is needed.

## Port note
Trivial port — same shape, real data:
- **Pregame countdown:** `target` = the game's actual scheduled start timestamp (already on
  the game object). No new API.
- **Live elapsed:** `since` = the actual game start/first-pitch timestamp from the live feed
  (the feed already drives everything else on this screen). No new API.
- Formatting rule to keep: hours only shown when ≥ 1h; collapse to "any moment" at zero for
  the countdown. Numerals stay mono (existing token rule).
