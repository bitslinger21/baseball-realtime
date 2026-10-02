# RUN ORDER: Sep 30 send package

**Rev 1 · Sep 30, 2026.** Paste this into Claude Code. All paths are relative to
`client/docs/design/design_handoff_baseball_realtime/`.

---

You are porting six design handoffs into the app. **Do them strictly in the order below, one at a time.**

For each item:
1. Read its PROMPT file in full before touching code. The `holistic/*.jsx` files in each folder are DESIGN REFERENCE. Never copy them into the app.
2. Do ONLY the scope the step names. Some prompts describe work that has already shipped; skip that.
3. Run the type-check and build, and check every acceptance line in that prompt.
4. Commit with the message given, then stop and give me a short report:
   - what changed (files)
   - which acceptance lines pass
   - anything you couldn't verify or that needs backend
5. **Wait for me to say "next"** before starting the following item.

If a step turns out to be already done in the app, say so with evidence (file and line) and move on. Don't redo it.

## 0. Score format revert (do first)
`handoff_score_format_revert/PROMPT_score_format_revert.md`
- Game scores go back to `HOU 8 – 5 CHC`.
- Leave the postseason bracket live footer and the series drawer as they are.
- This has to land before steps 4–5 so new score lines are written in the dash form.
- Commit: `revert: game scores keep the dash`

## 1. Postseason bracket: current card 150 → 176px
`handoff_postseason_bracket/PROMPT_postseason_bracket.md`
- **Scope: the width fix ONLY** (`BK.curW` + the `.pb` CSS). The rest of the prompt already shipped.
- Verify the live line `● LIVE · ▲1 CWS 0 HOU 0` no longer clips.
- Commit: `bracket: widen current card to 176px`

## 2. Live at-bat badge
`handoff_live_ab_badge/PROMPT_live_ab_badge.md`
- Replace the rust donut on the live at-bat row in the at-bat list with the empty rust-dashed `ScorebookCell` (same as the batter card's live cell).
- Commit: `game: live at-bat badge uses dashed ScorebookCell`

## 3. Pregame line-score band
`handoff_linescore_band/PROMPT_linescore_band.md`
- Read rev 2 (check the version stamp at the top).
- **Scope: pregame only (§6).** Live and Scout already use the shared `LineScoreBand`.
- Step 1: add `mode` / trigger-label / zones props to the shared band.
- Step 2: replace the old three-zone `PregameLineScoreBand` in `PregameView.tsx` with a thin wrapper around it.
- Result: a 48px sticky bar, an overlay drawer that doesn't push content, a "Line score & probables" trigger, and probable pitchers in the drawer.
- Commit: `pregame: line-score band uses the shared sticky bar + drawer`

## 4. Home Following: video clips
`handoff_video_clips/PROMPT_video_clips.md`
- **Scope: §3 Home Following only** (the card redesign plus a video layer for each clip). Game-page clips already shipped.
- Write clip score lines in the dash form from step 0.
- Commit: `home: following cards with video layers`

## 5. Highlights page (GATED)
`handoff_highlights_page/PROMPT_highlights_page.md`
- Needs `GET /clips?date=`. Check whether it exists first.
- If it does NOT exist, stop and report what the endpoint must return. Don't build against mock data.
- If it does exist, build the page, then commit: `highlights: daily highlights page`

---
When all are done, give me one summary: the six items with done / skipped-already-shipped / blocked for each, plus open backend questions.
