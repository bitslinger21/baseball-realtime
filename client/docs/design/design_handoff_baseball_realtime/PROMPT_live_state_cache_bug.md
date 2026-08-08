# Live State Cache Bug — DailyGamesPage

## Issue

When navigating to a past date (e.g., yesterday), games briefly render as "Live" before correcting to their actual final state (Final, Completed Early, etc.). This is a visual flicker caused by stale socket state hydrating before API data confirms the true game status.

## Root cause

The DailyGamesPage likely hydrates live-game state from the WebSocket connection during initial render, before the API fetch for that date's games completes. The socket carries global state (all live games right now), not date-scoped state, so it includes live games from TODAY even when you're viewing YESTERDAY.

## Solution: API-first hydration

1. When DailyGamesPage mounts or the date changes, **fetch the game list from the API first** for that date — this includes the authoritative `gameStatus` field (Live, Scheduled, Final, etc.)
2. **Only after the API response lands**, apply socket updates (live pitch data, score changes, etc.)
3. If a socket event arrives for a game before its API data is hydrated, queue it and apply it once the API data exists
4. Do NOT render from socket state alone; socket updates are additive to API state, not the source of truth for status

## Changes needed

- `DailyGamesPage.tsx`: reorder hydration — API fetch first (includes status), socket listeners second (updates only)
- Hook or effect: use `useEffect` with date dependency; fetch API, set games, THEN listen to socket events for that date
- Consider a loading state to avoid rendering stale statuses while awaiting API

## Data flow

```
User selects date
  ↓
API fetch /games?date=YYYY-MM-DD (includes gameStatus for each)
  ↓
Render games with correct statuses
  ↓
Socket listeners active (update scores, plays, but NOT status without API confirmation)
```

No new endpoint needed; reuse existing `/games` or equivalent.
