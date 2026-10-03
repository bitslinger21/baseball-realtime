# Send package: Oct 2, 2026

Copy each folder as its own subfolder into `client/docs/design/design_handoff_baseball_realtime/`. Do them in this order, one at a time: commit each one, report back, and wait for "next".

1. **Postseason bracket, rev 3**: `handoff_postseason_bracket/PROMPT_postseason_bracket.md`. Scope is ONLY the rev 3 note at the top: the current card goes 176 → 186px. Everything else already shipped.
2. **Upcoming tab, no next game**: `handoff_oct2_upcoming_empty/PROMPT_upcoming_empty.md` (rev 1). Four states: waiting between series, eliminated, off-season, starter TBD. No mock data in any state.
3. **Timezone**: `handoff_oct1_decisions/PROMPT_oct1_decisions.md`, **item 4 only**. Every game time uses the viewer's own zone with no label.
   - Item 1 (bracket) is replaced by step 1 above.
   - Item 2 (Upcoming) is SUPERSEDED by step 2 above.
   - Item 3 (Scout badge) needs no change.

Ungated, no new API.
