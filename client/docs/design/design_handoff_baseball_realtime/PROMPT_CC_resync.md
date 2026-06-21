# Re-ground prompt for Claude Code — paste this into a fresh session

You are in the `baseball-realtime` repo. Your last status summary was built from stale docs and is
wrong on several points. I have **verified the following against the actual code** — treat these as
ground truth and bring the docs in line.

## Verified true (confirmed in code, Jun 21, 2026)
1. **`PitchingTab` is per-player.** It takes the player id and renders a real per-`:mlbId` pitch-type
   table — no shared "Peña / 314 pitches seen" mock. → **PR 6.6 is DONE & verified in-app**, and the
   **BUG-011 lean Pitching tab is DONE** (option 2, "redesign down"). The rich five-card version is
   parked as `PitchingTabFull`, to restore when Statcast lands (handoff PR 6.5, gated).
2. **The LIVE pill is gated on `isLive`.** A final game shows no pill/follow. → **BUG-008 is FIXED**
   (PR 11 `isLive` gate). Not open.
3. **`ScorebookCell` draws both strokes** (bold PA result + lighter later-baserunning). → **F-003 is
   DONE** (PR 13). Not gated. Only F-006 (FC / spray / error attribution) stays parked.

## Do this
1. **Re-read `client/CLAUDE.md` and `MIGRATION.md` first.** Then update them (and any repo-side bug
   list) so they reflect the three verified facts above. Add a dated `## Status reconciliation —
   Jun 21, 2026` note at the top of `client/CLAUDE.md`.
2. **Renumber the duplicate `BUG-010`.** Keep `BUG-010` = game-view position reset (FIXED, PR 12).
   Give the Stats-tab "HR row shows the XBH doubles/triples note (`OT` vs `0T`)" item a new id
   (`BUG-012`, open).
3. **Record F-007 (Scout mode) as DESIGNED, pending sign-off + port** — pure client, finals only,
   no new API. Handoff lives in `PROMPT_F007_scout_mode.md` (+ the `Game Scout Mode.html` prototype).
4. **Re-issue the project status** using the corrected open frontier below.

## Corrected open frontier (what's actually left)
- **Frontend, ungated, actionable now:** F-007 Scout mode (port the prototype); BUG-001 (player↔active-game
  link); BUG-006 (History AVG running-average); BUG-012 (Stats-tab HR note).
- **Frontend, gated on backend:** PR 3.5 win-prob + leverage — design signed off; gated only on mapping
  `winProbability` + `leverageIndex` from the MLB live-feed JSON (~3 changes each: type → mapper → wire).
- **Gated on Statcast/Savant ingest (+ ToS):** PR 6.5 (restore rich Pitching tab) and F-001 #1 (rookie
  arsenal). This is the big backend decision.
- **Undesigned:** mobile breakpoints; empty/loading/error states; postgame game view; pitcher's-own-arsenal
  tab; Alerts panel.
- **Done (do not relist as open):** PRs 1–12, F-003, F-005, PR 6.6, BUG-008, the six player tabs incl.
  Upcoming (PR 9/9.5/9.6), the lean Pitching tab.

**Rule going forward:** before reporting any status, confirm it against the code (component props, the
`isLive` gate, the rendered table), not just the prose docs — that's what drifted.
