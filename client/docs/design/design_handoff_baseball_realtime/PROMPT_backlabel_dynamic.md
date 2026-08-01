# Nav fix follow-up: back-button LABEL must be dynamic too — Aug 1, 2026

## Bug
The port's `handleBack` correctly navigates via `navigate(-1)` (fallback `navigate("/")`) —
that part is right. But the visible button TEXT is still a hardcoded `backLabel="Today's
games"` prop on every `GamePage` render, so it never changes even when the user actually
arrived from Leaders, Standings, or a player page and the click correctly returns there.

## What's needed
Derive `backLabel` from the actual entry route, not a static string:
- Track where the user came from (e.g. `location.state?.from` set on navigation, or read the
  previous route from router history/a lightweight nav-context) and map it to its display name:
  `/` → "Today's games", `/leaders` → "Leaders", `/standings` → "Standings", `/player/:id`
  → "Player" (or the player's name if available).
- Fall back to "Today's games" only when there's no known origin (direct link / fresh load).
- This applies everywhere `PageMenu`/`backLabel` is used (game view, player view, Leaders,
  Standings, Final Scorecard) — not just `GamePage`.

This was always the intent of the original nav prompts ("backLabel/target must reflect the
ACTUAL screen the user navigated from") — the navigation half shipped, the label half didn't.
