# Send package: Sep 30, 2026

Audited against `client/src` @4d0abd8. Everything else from the backlog **is already in the app**. These are the only open items, in suggested order:

| # | Folder | What | Gated? |
|---|---|---|---|
| 0 | `handoff_score_format_revert/` | **Do first.** Undo the no-dash score rule: game scores go back to `HOU 8 – 5 CHC`. The bracket footer is left alone. | No |
| 1 | `handoff_postseason_bracket/` | **Small fix only:** the current matchup card is 150 → **176px** (`BK.curW` + `.pb` CSS). The live line (`● LIVE · ▲1 CWS 0 HOU 0`) clips at 150. Everything else in the prompt is already shipped. | No |
| 2 | `handoff_live_ab_badge/` | Live at-bat badge: rust donut → empty dashed `ScorebookCell` | No |
| 3 | `handoff_linescore_band/` | **Pregame band only** (§6/§7 of rev 2). Live and Scout already shipped. `PregameView.tsx` still renders the old 3-zone `PregameLineScoreBand`. | No |
| 4 | `handoff_video_clips/` | **§3 Home Following only** (card redesign + video layers). Game-page clips already shipped. | Clips feed (already live for the game page) |
| 5 | `handoff_highlights_page/` | New Highlights page | Needs `GET /clips?date=` |

**Score format (formerly item 2) is withdrawn.** Item 0 reverts it. Game scores keep the original `HOU 8 – 5 CHC` form everywhere except the bracket and series drawer. If any design file in these folders shows `HOU 8 CHC 5`, ignore that formatting.
