# Send package — Oct 19, 2026

Everything since the last handoff. **Start with `PROMPT_oct19.md`** (both prompts combined). Copy each folder as its own subfolder into `client/docs/design/design_handoff_baseball_realtime/`.

1. **`handoff_scorecard_frozen/` — rev 6.** Scorecard fit-the-card. If you built rev 4, the new items are the full-card **close cross-fade** (§5a) and §6 **Print**: both teams, sheet only, filling the page with a 1/8 in margin, no live highlights. If nothing is built yet, the whole prompt applies (frozen edges, free-sliding innings, M cell, rust batter row incl. subs, Full card + animation, Print).
2. **`handoff_series_enter_game/` — rev 1.** Series drawer: `Enter game →` on live and every future game (including if-necessary); plus a copy sweep: every remaining "Open game →" (series drawer, Highlights page, alerts) becomes `Enter game →`, one verb app-wide.
3. **`handoff_atbat_transitions/` — rev 1.** At-bat end transitions: close the at-bat on its final pitch (fixes the missing last play in Scout), pre-stage the next batter live when it isn't the 3rd out (pinch hitter re-inits), go straight to Scout on a game-ending play (incl. walk-off), and fix the due-up anchor after a caught-stealing 3rd out.
