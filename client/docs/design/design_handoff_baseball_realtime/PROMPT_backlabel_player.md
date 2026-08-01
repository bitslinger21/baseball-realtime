# Nav: player-view back label specificity — Aug 1, 2026

File: `holistic/player.jsx` (`PlayerScreen`).

## What changed
Back label was the generic "← Game". Changed to the actual matchup, "← Astros @ Cubs",
demonstrating the level of specificity expected.

## Port note
Reinforces `PROMPT_backlabel_dynamic.md`: the label should read the real matchup ("[Away] @
[Home]") from the game the player was reached from, not a generic "Game" placeholder — same
derive-from-actual-origin requirement as the rest of that prompt.
