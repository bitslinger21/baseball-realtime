# Nav: fix stale "Leaders" back-label demo value — Aug 1, 2026

File: `holistic/game-v2.jsx` (`GameScreenV2`, live game-view state).

## What changed
The live game view's `PageMenu` back-item was showing a leftover demo value ("← Leaders")
from an earlier iteration — misleading, since the realistic default path to a game is from
the games list. Changed to "← Today's games", matching the pregame state and every other
screen's default.

## Port note (repeat of the standing requirement)
The mock can only show ONE static label per screen. In the real app, `backLabel`/target must
resolve from actual router history (wherever the user actually navigated from — games list,
a player page, Leaders, Standings), with "Today's games" as the fallback when there's no
history. Do not hardcode any screen's label.
